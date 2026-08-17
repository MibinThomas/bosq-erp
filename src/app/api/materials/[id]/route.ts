import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
        { error: "Forbidden: You do not have permission to edit materials and finishes" },
        { status: 403 }
      )
    }

    const existingMaterial = await prisma.materialFinish.findUnique({
      where: { id }
    })

    if (!existingMaterial) {
      return NextResponse.json({ error: "Material finish not found" }, { status: 404 })
    }

    const body = await request.json()
    const { name, code, category, description, swatchUrl, brand, status } = body

    if (code && code.trim().toUpperCase() !== existingMaterial.code) {
      const codeCheck = await prisma.materialFinish.findUnique({
        where: { code: code.trim().toUpperCase() }
      })
      if (codeCheck && codeCheck.id !== id) {
        return NextResponse.json({ error: `Material code "${code.trim().toUpperCase()}" already exists` }, { status: 409 })
      }
    }

    const updated = await prisma.materialFinish.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existingMaterial.name,
        code: code !== undefined ? code.trim().toUpperCase() : existingMaterial.code,
        category: category !== undefined ? category.trim() : existingMaterial.category,
        description: description !== undefined ? (description ? description.trim() : null) : existingMaterial.description,
        swatchUrl: swatchUrl !== undefined ? swatchUrl : existingMaterial.swatchUrl,
        brand: brand !== undefined ? (brand ? brand.trim() : null) : existingMaterial.brand,
        status: status !== undefined ? status : existingMaterial.status,
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("PUT /api/materials/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to update material" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
        { error: "Forbidden: You do not have permission to delete materials" },
        { status: 403 }
      )
    }

    await prisma.materialFinish.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: "Material deleted successfully" })
  } catch (error: any) {
    console.error("DELETE /api/materials/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete material" }, { status: 500 })
  }
}
