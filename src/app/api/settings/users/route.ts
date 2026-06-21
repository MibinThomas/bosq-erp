import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { hashPassword } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canView = await hasPermission(userId, "USER_MANAGEMENT", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view users" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        department: true,
        isActive: true,
        createdAt: true,
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

    const canCreate = await hasPermission(creatorUserId, "USER_MANAGEMENT", "create")
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create users" }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role, phone, department } = body

    if ((role === "SUPER_ADMIN" || role === "ADMIN" || role === "SALES_MANAGER" || role === "MANAGER") && creatorRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Super Admin can assign Super Admin, Admin, or Manager roles" }, { status: 403 })
    }

    if (!name || !email || !password || !role || !phone) {
      return NextResponse.json({ error: "Name, email, password, role, and contact number are required" }, { status: 400 })
    }

    const roleRecord = await prisma.role.findUnique({
      where: { name: role }
    })
    if (!roleRecord) {
      return NextResponse.json({ error: `The assigned role '${role}' does not exist in the database system roles.` }, { status: 400 })
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
        department
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    })

    // Log this activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "CREATED_USER",
        entityType: "USER",
        entityId: newUser.id,
        details: `Created new user ${name} with role ${role}`
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

    const canDelete = await hasPermission(deleterUserId, "USER_MANAGEMENT", "delete")
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete users" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (id === (session.user as any).id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
    }

    // Verify user exists
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
      data: { deletedAt: new Date(), isActive: false }
    })

    // Log this activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "DELETED_USER",
        entityType: "USER",
        entityId: id,
        details: `Deleted user ${user.name} (${user.email})`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/settings/users failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
