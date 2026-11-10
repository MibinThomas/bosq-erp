import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"
import { generateShortDescription, isPlaceholderDescription } from "@/lib/short-descriptions"

// Generates short quotation descriptions for catalogue products.
// POST { mode: "missing" | "all", apply?: boolean }
//   mode "missing" — only products whose description is empty or a placeholder (name, first spec line…)
//   mode "all"     — every product (overwrites edited descriptions)
//   apply false    — preview: counts and sample changes, nothing written
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canManage = await hasPermission(userId, "PRODUCTS", "manage")
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage products" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const mode: "missing" | "all" = body.mode === "all" ? "all" : "missing"
    const apply = body.apply === true

    // Model masters group variants and are never added to quotations themselves
    const products = await prisma.product.findMany({
      where: { deletedAt: null, isMaster: false },
      select: {
        id: true,
        productCode: true,
        productName: true,
        description: true,
        specifications: true,
        chairType: true,
        dimensions: true,
        availableColors: true,
        variantAttributes: true,
        category: { select: { name: true } },
        parentProduct: { select: { productName: true } },
      },
      orderBy: { productCode: "asc" },
    })

    const changes = products
      .filter((p) => mode === "all" || isPlaceholderDescription(p))
      .map((p) => ({ id: p.id, productCode: p.productCode, productName: p.productName, before: p.description || "", after: generateShortDescription(p) }))
      .filter((c) => c.after && c.after !== c.before)

    if (apply && changes.length > 0) {
      const BATCH = 100
      for (let i = 0; i < changes.length; i += BATCH) {
        await prisma.$transaction(
          changes.slice(i, i + BATCH).map((c) => prisma.product.update({ where: { id: c.id }, data: { description: c.after } }))
        )
      }
      await prisma.activityLog.create({
        data: {
          userId,
          action: "GENERATED_DESCRIPTIONS",
          entityType: "PRODUCT",
          entityId: "ALL_PRODUCTS",
          details: `Generated short descriptions for ${changes.length} product(s) (${mode === "all" ? "all products" : "missing/placeholder only"})`,
        },
      })
    }

    return NextResponse.json({
      mode,
      applied: apply,
      totalProducts: products.length,
      count: changes.length,
      samples: changes.slice(0, 12),
    })
  } catch (error) {
    console.error("Failed to generate product descriptions:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
