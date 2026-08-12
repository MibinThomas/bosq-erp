import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { hasPermission } from "@/lib/rbac"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const userRole = (session.user as any).role || ""
    const isSuperAdmin = userRole === "SUPER_ADMIN"

    const canEdit = isSuperAdmin || (await hasPermission(userId, "PRODUCTS", "edit")) || (await hasPermission(userId, "PRODUCTS", "manage"))
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit product categories" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    const cleanName = name.trim()

    // Check if category exists
    const category = await prisma.productCategory.findUnique({
      where: { id }
    })

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Check if another category already has this name
    const existing = await prisma.productCategory.findFirst({
      where: {
        name: { equals: cleanName, mode: "insensitive" },
        id: { not: id }
      }
    })

    if (existing) {
      return NextResponse.json({ error: `Category "${cleanName}" already exists.` }, { status: 400 })
    }

    const updatedCategory = await prisma.productCategory.update({
      where: { id },
      data: {
        name: cleanName,
        description: description !== undefined ? description.trim() : category.description
      }
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATED_CATEGORY",
        entityType: "PRODUCT",
        entityId: id,
        details: `Updated category from "${category.name}" to "${cleanName}"`
      }
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error("Failed to update category:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const userRole = (session.user as any).role || ""
    const isSuperAdmin = userRole === "SUPER_ADMIN"

    const canDelete = isSuperAdmin || (await hasPermission(userId, "PRODUCTS", "delete")) || (await hasPermission(userId, "PRODUCTS", "manage"))
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete product categories" }, { status: 403 })
    }

    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } }
      }
    })

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    if (category._count.products > 0) {
      // Find or create fallback 'General' category
      let fallbackCat = await prisma.productCategory.findUnique({
        where: { name: "General" }
      })

      if (!fallbackCat) {
        fallbackCat = await prisma.productCategory.create({
          data: { name: "General", description: "Default fallback category" }
        })
      }

      // Reassign products to General
      await prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: fallbackCat.id }
      })
    }

    await prisma.productCategory.delete({
      where: { id }
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: "DELETED_CATEGORY",
        entityType: "PRODUCT",
        entityId: id,
        details: `Deleted category "${category.name}"`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete category:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
