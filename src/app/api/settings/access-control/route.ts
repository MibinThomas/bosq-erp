import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

// Helper function to check if the session is Super Admin or Admin
async function getAuthenticatedUser(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.email) {
    return null
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })
  return user
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    // Get roles & permissions
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
      },
      orderBy: { name: "asc" }
    })

    // Get users for permission overrides
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        permissionOverrides: true,
      },
      orderBy: { name: "asc" }
    })

    // Get logs (unrestricted for Super Admin, filter out Target Super Admins or Operator Super Admins for standard admins)
    let logs = []
    if (user.role === "SUPER_ADMIN") {
      logs = await prisma.accessControlLog.findMany({
        include: {
          user: { select: { name: true, email: true } },
          targetUser: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    } else {
      // Standard Admin cannot view access logs targeting or performed by Super Admins
      logs = await prisma.accessControlLog.findMany({
        where: {
          user: { role: { not: "SUPER_ADMIN" } },
          OR: [
            { targetUser: null },
            { targetUser: { role: { not: "SUPER_ADMIN" } } }
          ]
        },
        include: {
          user: { select: { name: true, email: true } },
          targetUser: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    }

    return NextResponse.json({ roles, users, logs })
  } catch (error) {
    console.error("GET /api/settings/access-control failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    const body = await request.json()
    const { action, roleName, description, baseRoleId } = body

    if (action === "create_role") {
      if (!roleName) {
        return NextResponse.json({ error: "Role name is required" }, { status: 400 })
      }

      // Check duplicate role
      const normalizedRoleName = roleName.toUpperCase().replace(/\s+/g, "_")
      const existing = await prisma.role.findUnique({
        where: { name: normalizedRoleName }
      })
      if (existing) {
        return NextResponse.json({ error: "Role already exists" }, { status: 400 })
      }

      // Create new role
      const newRole = await prisma.role.create({
        data: {
          name: normalizedRoleName,
          description: description || `Custom role ${roleName}`,
          isSystem: false,
        }
      })

      // Default permissions
      const allModules = [
        "DASHBOARD", "CLIENTS", "PRODUCTS", "QUOTATIONS", "BOQS", "PURCHASE_ORDERS",
        "REPORTS", "USER_MANAGEMENT", "SETTINGS", "PRICING_MARKUP", "ACCESS_CONTROL",
        "NOTIFICATIONS", "SHAREPOINT", "SYSTEM_CONFIGURATION"
      ]

      let sourcePermissions: any[] = []
      if (baseRoleId) {
        sourcePermissions = await prisma.rolePermission.findMany({
          where: { roleId: baseRoleId }
        })
      }

      for (const m of allModules) {
        const basePerm = sourcePermissions.find(p => p.module === m)
        await prisma.rolePermission.create({
          data: {
            roleId: newRole.id,
            module: m,
            view: basePerm ? basePerm.view : false,
            create: basePerm ? basePerm.create : false,
            edit: basePerm ? basePerm.edit : false,
            delete: basePerm ? basePerm.delete : false,
            approve: basePerm ? basePerm.approve : false,
            reject: basePerm ? basePerm.reject : false,
            export: basePerm ? basePerm.export : false,
            downloadPdf: basePerm ? basePerm.downloadPdf : false,
            uploadFiles: basePerm ? basePerm.uploadFiles : false,
            share: basePerm ? basePerm.share : false,
            manage: basePerm ? basePerm.manage : false,
            ownership: basePerm ? basePerm.ownership : "ALL",
            approvalLimit: basePerm ? basePerm.approvalLimit : null,
            costPriceVisible: basePerm ? basePerm.costPriceVisible : false,
            dealerPriceVisible: basePerm ? basePerm.dealerPriceVisible : false,
            marginVisible: basePerm ? basePerm.marginVisible : false,
            profitVisible: basePerm ? basePerm.profitVisible : false,
            markupVisible: basePerm ? basePerm.markupVisible : false
          }
        })
      }

      // Log action
      await prisma.accessControlLog.create({
        data: {
          userId: user.id,
          action: "CREATE_ROLE",
          details: `Created custom role ${normalizedRoleName} (copied from: ${baseRoleId || "none"})`
        }
      })

      return NextResponse.json({ success: true, role: newRole })
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 })
  } catch (error) {
    console.error("POST /api/settings/access-control failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    const body = await request.json()
    const { type, roleId, permissions, targetUserId, overrides } = body

    if (type === "update_role") {
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      })

      if (!role) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 })
      }

      // Protection: ADMIN cannot modify SUPER_ADMIN role
      if (role.name === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden: Only Super Admin can modify SUPER_ADMIN permissions" }, { status: 403 })
      }

      // Bulk update permissions
      for (const p of permissions) {
        const existing = await prisma.rolePermission.findFirst({
          where: { roleId, module: p.module }
        })

        const dataPayload = {
          view: p.view ?? false,
          create: p.create ?? false,
          edit: p.edit ?? false,
          delete: p.delete ?? false,
          approve: p.approve ?? false,
          reject: p.reject ?? false,
          export: p.export ?? false,
          downloadPdf: p.downloadPdf ?? false,
          uploadFiles: p.uploadFiles ?? false,
          share: p.share ?? false,
          manage: p.manage ?? false,
          ownership: p.ownership ?? "ALL",
          approvalLimit: p.approvalLimit !== undefined ? (p.approvalLimit === "" || p.approvalLimit === null ? null : parseFloat(p.approvalLimit)) : null,
          costPriceVisible: p.costPriceVisible ?? false,
          dealerPriceVisible: p.dealerPriceVisible ?? false,
          marginVisible: p.marginVisible ?? false,
          profitVisible: p.profitVisible ?? false,
          markupVisible: p.markupVisible ?? false,
        }

        if (existing) {
          await prisma.rolePermission.update({
            where: { id: existing.id },
            data: dataPayload
          })
        } else {
          await prisma.rolePermission.create({
            data: {
              roleId,
              module: p.module,
              ...dataPayload
            }
          })
        }
      }

      await prisma.accessControlLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_ROLE_PERMISSIONS",
          details: `Updated permissions for role ${role.name}`
        }
      })

      return NextResponse.json({ success: true })
    }

    if (type === "update_overrides") {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId }
      })

      if (!targetUser) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 })
      }

      // Protection: ADMIN cannot modify SUPER_ADMIN overrides
      if (targetUser.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden: Only Super Admin can modify SUPER_ADMIN overrides" }, { status: 403 })
      }

      // Clear existing overrides for this user
      await prisma.userPermissionOverride.deleteMany({
        where: { userId: targetUserId }
      })

      // Insert new overrides
      for (const o of overrides) {
        await prisma.userPermissionOverride.create({
          data: {
            userId: targetUserId,
            module: o.module,
            action: o.action,
            value: o.value,
            ownership: o.ownership || null,
            approvalLimit: o.approvalLimit !== undefined && o.approvalLimit !== null && o.approvalLimit !== "" ? parseFloat(o.approvalLimit) : null,
          }
        })
      }

      await prisma.accessControlLog.create({
        data: {
          userId: user.id,
          targetUserId: targetUserId,
          action: "UPDATE_USER_OVERRIDES",
          details: `Updated permission overrides for user ${targetUser.name || targetUser.email}`
        }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid Type" }, { status: 400 })
  } catch (error) {
    console.error("PUT /api/settings/access-control failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get("roleId")

    if (!roleId) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 })
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId }
    })

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    if (role.isSystem) {
      return NextResponse.json({ error: "Forbidden: Cannot delete system default roles" }, { status: 403 })
    }

    // Delete role (RolePermissions cascade delete)
    await prisma.role.delete({
      where: { id: roleId }
    })

    await prisma.accessControlLog.create({
      data: {
        userId: user.id,
        action: "DELETE_ROLE",
        details: `Deleted custom role ${role.name}`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/settings/access-control failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
