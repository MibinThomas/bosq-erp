import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hashPassword } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    const isSuperAdmin = userRole === "SUPER_ADMIN"
    const canView = isSuperAdmin || (await hasPermission(userId, "USER_MANAGEMENT", "view")) || userId === id
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: Cannot view user details" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        designation: true,
        employeeId: true,
        image: true,
        signature: true,
        role: true,
        status: true,
        isActive: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        permissionOverrides: true,
        _count: {
          select: {
            boqs: true,
            quotations: true,
            clientAssignments: true,
            activities: true
          }
        },
        activities: {
          take: 20,
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("GET /api/settings/users/[id] failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    const isSuperAdmin = userRole === "SUPER_ADMIN"

    const canEdit = isSuperAdmin || (await hasPermission(userId, "USER_MANAGEMENT", "edit"))
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: Permission denied" }, { status: 403 })
    }

    const body = await request.json()
    if (body.action === "restore") {
      const restored = await prisma.user.update({
        where: { id },
        data: {
          deletedAt: null,
          isActive: true,
          status: "Active"
        }
      })

      await prisma.activityLog.create({
        data: {
          userId,
          action: "RESTORED_USER",
          entityType: "USER",
          entityId: id,
          details: `Restored soft-deleted user ${restored.name} (${restored.email})`
        }
      })

      return NextResponse.json({ success: true, user: restored })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("POST /api/settings/users/[id] failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

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

    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    const isSuperAdmin = userRole === "SUPER_ADMIN"

    const canEdit = isSuperAdmin || (await hasPermission(userId, "USER_MANAGEMENT", "edit")) || userId === id
    if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to modify users" },
        { status: 403 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id }
    })
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Admins cannot edit Super Admin, Admin, or Manager accounts unless Super Admin
    if ((targetUser.role === "SUPER_ADMIN" || targetUser.role === "ADMIN" || targetUser.role === "SALES_MANAGER" || targetUser.role === "MANAGER") && userRole !== "SUPER_ADMIN" && userId !== id) {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admin can modify admin or manager accounts" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, role, password, phone, department, designation, employeeId, isActive, image, signature } = body

    // Enforce role assignment rules: Only Super Admin can assign or change Super Admin, Admin, or Manager roles
    if (role !== undefined && role !== targetUser.role) {
      if ((role === "SUPER_ADMIN" || role === "ADMIN" || role === "SALES_MANAGER" || role === "MANAGER") && userRole !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Forbidden: Only Super Admin can assign Super Admin, Admin, or Manager roles" },
          { status: 403 }
        )
      }
    }

    // Only Super Admin or Admin can change password (reset access) or toggle active status
    if (!isSuperAdmin && userRole !== "ADMIN") {
      if (password && password.trim() !== "") {
        return NextResponse.json(
          { error: "Forbidden: Only Admin/Super Admin can reset user access (passwords)" },
          { status: 403 }
        )
      }
      if (isActive !== undefined && isActive !== targetUser.isActive) {
        return NextResponse.json(
          { error: "Forbidden: Only Admin/Super Admin can enable or disable user accounts" },
          { status: 403 }
        )
      }
    }

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const updateData: any = {
      name,
      email,
      phone: phone || null,
      department: department || null,
      designation: designation || null,
      employeeId: employeeId || null,
      ...(image !== undefined ? { image } : {}),
      ...(signature !== undefined ? { signature } : {}),
      ...(role ? { role } : {}),
      ...(isActive !== undefined ? { isActive, status: isActive ? "Active" : "Inactive" } : {})
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
        employeeId: true,
        isActive: true,
        status: true,
        createdAt: true
      }
    })

    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATED_USER",
        entityType: "USER",
        entityId: id,
        details: `Updated user account details for ${name} (${email})`
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
