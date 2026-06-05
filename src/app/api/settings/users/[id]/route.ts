import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { hashPassword } from "@/lib/auth"

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can modify users" },
        { status: 403 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id }
    })
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Admins cannot edit Super Admin, Admin, or Manager accounts
    if ((targetUser.role === "SUPER_ADMIN" || targetUser.role === "ADMIN" || targetUser.role === "SALES_MANAGER") && userRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admin can modify admin or manager accounts" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, role, password, phone, department, designation, isActive } = body

    // Enforce role assignment rules: Only Super Admin can assign or change Super Admin, Admin, or Manager roles
    if (role !== undefined && role !== targetUser.role) {
      if ((role === "SUPER_ADMIN" || role === "ADMIN" || role === "SALES_MANAGER") && userRole !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Forbidden: Only Super Admin can assign Super Admin, Admin, or Manager roles" },
          { status: 403 }
        )
      }
    }

    // Only Super Admin can change password (reset access) or toggle active status
    if (userRole !== "SUPER_ADMIN") {
      if (password && password.trim() !== "") {
        return NextResponse.json(
          { error: "Forbidden: Only Super Admin can reset user access (passwords)" },
          { status: 403 }
        )
      }
      if (isActive !== undefined && isActive !== targetUser.isActive) {
        return NextResponse.json(
          { error: "Forbidden: Only Super Admin can enable or disable user accounts" },
          { status: 403 }
        )
      }
    }

    if (!name || !email || !role || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const updateData: any = {
      name,
      email,
      role,
      phone,
      department,
      designation,
      isActive
    }

    if (password && password.trim() !== "") {
      const hashedPassword = hashPassword(password)
      updateData.password = hashedPassword
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        department: true,
        designation: true,
        isActive: true,
        createdAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error("Failed to update user:", error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update user account" },
      { status: 500 }
    )
  }
}
