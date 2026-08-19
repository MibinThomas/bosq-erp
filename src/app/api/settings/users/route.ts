import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { hashPassword } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    const isSuperAdmin = userRole === "SUPER_ADMIN"
    const canView = isSuperAdmin || (await hasPermission(userId, "USER_MANAGEMENT", "view"))
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view users" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get("includeDeleted") === "true"

    const users = await prisma.user.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        department: true,
        designation: true,
        employeeId: true,
        status: true,
        isActive: true,
        image: true,
        signature: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            boqs: true,
            quotations: true,
            clientAssignments: true,
            activities: true
          }
        }
      }
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error("GET /api/settings/users failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const creatorUserId = (session.user as any).id
    const creatorRole = (session.user as any).role
    const isSuperAdmin = creatorRole === "SUPER_ADMIN"

    const canCreate = isSuperAdmin || (await hasPermission(creatorUserId, "USER_MANAGEMENT", "create"))
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create users" }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role, phone, department, designation, employeeId } = body

    if ((role === "SUPER_ADMIN" || role === "ADMIN" || role === "SALES_MANAGER" || role === "MANAGER") && creatorRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Super Admin can assign Super Admin, Admin, or Manager roles" }, { status: 403 })
    }

    if (!name || !email || !password || !role || !phone) {
      return NextResponse.json({ error: "Name, email, password, role, and contact number are required" }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    const hashedPassword = hashPassword(password)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        phone,
        department: department || null,
        designation: designation || null,
        employeeId: employeeId || null,
        isActive: true,
        status: "Active"
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        employeeId: true,
        isActive: true,
        status: true,
        createdAt: true,
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: creatorUserId,
        action: "CREATED_USER",
        entityType: "USER",
        entityId: newUser.id,
        details: `Created new user ${name} (${email}) with role ${role}`
      }
    })

    return NextResponse.json(newUser)
  } catch (error) {
    console.error("POST /api/settings/users failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const deleterUserId = (session.user as any).id
    const deleterRole = (session.user as any).role
    const isSuperAdmin = deleterRole === "SUPER_ADMIN"

    const canDelete = isSuperAdmin || (await hasPermission(deleterUserId, "USER_MANAGEMENT", "delete"))
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete users" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (id === deleterUserId) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id }
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if ((user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "SALES_MANAGER" || user.role === "MANAGER") && deleterRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Super Admin can delete admin or manager accounts" }, { status: 403 })
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, status: "Inactive" }
    })

    await prisma.activityLog.create({
      data: {
        userId: deleterUserId,
        action: "DELETED_USER",
        entityType: "USER",
        entityId: id,
        details: `Soft-deleted user ${user.name} (${user.email})`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/settings/users failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
