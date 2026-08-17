import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const categories = await prisma.productCategory.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canCreate = await hasPermission(userId, "PRODUCTS", "manage")
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage product categories" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      )
    }

    const cleanName = name.trim()

    // Check if category already exists
    const existing = await prisma.productCategory.findFirst({
      where: { name: { equals: cleanName, mode: "insensitive" } },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Category "${cleanName}" already exists.` },
        { status: 400 }
      )
    }

    const newCategory = await prisma.productCategory.create({
      data: {
        name: cleanName,
        description: description?.trim() || `${cleanName} category`,
      },
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "CREATED_CATEGORY",
        entityType: "PRODUCT",
        entityId: newCategory.id,
        details: `Created category ${cleanName}`,
      },
    })

    return NextResponse.json(newCategory, { status: 201 })
  } catch (error) {
    console.error("Failed to create category:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
