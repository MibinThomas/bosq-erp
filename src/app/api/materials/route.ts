import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    const where: any = {
      status: "ACTIVE"
    }

    if (category && category !== "all") {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const materials = await prisma.materialFinish.findMany({
      where,
      orderBy: [
        { category: "asc" },
        { code: "asc" },
        { name: "asc" }
      ]
    })

    return NextResponse.json(materials)
  } catch (error: any) {
    console.error("GET /api/materials error:", error)
    return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    const isAuthorizedRole = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER", "DESIGN_TEAM"].includes(user.role)
    const canManage = await hasPermission(user.id, "SETTINGS", "edit")

    if (!isAuthorizedRole && !canManage) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to add materials and finishes" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, code, category, description, swatchUrl, brand } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Material name is required" }, { status: 400 })
    }

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Material code is required" }, { status: 400 })
    }

    if (!category || !category.trim()) {
      return NextResponse.json({ error: "Material category is required" }, { status: 400 })
    }

    const cleanCode = code.trim().toUpperCase()

    // Check unique code constraint
    const existing = await prisma.materialFinish.findUnique({
      where: { code: cleanCode }
    })

    if (existing) {
      return NextResponse.json({ error: `Material code "${cleanCode}" already exists` }, { status: 409 })
    }

    const material = await prisma.materialFinish.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        category: category.trim(),
        description: description ? description.trim() : null,
        swatchUrl: swatchUrl || null,
        brand: brand ? brand.trim() : null,
        status: "ACTIVE"
      }
    })

    return NextResponse.json(material, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/materials error:", error)
    return NextResponse.json({ error: error.message || "Failed to create material" }, { status: 500 })
  }
}
