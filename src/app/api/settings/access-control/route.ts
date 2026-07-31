import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

let isMigrated = false

// Helper function to dynamically auto-run SQL migrations on load
async function ensureDbSchema() {
  if (isMigrated) return
  try {
    // 1. Add columns to User table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "employeeId" TEXT,
      ADD COLUMN IF NOT EXISTS "territories" TEXT,
      ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'Active';
    `)
    
    // 2. Backfill status from isActive if it was null
    await prisma.$executeRawUnsafe(`
      UPDATE "User"
      SET "status" = CASE WHEN "isActive" = true THEN 'Active' ELSE 'Inactive' END
      WHERE "status" IS NULL;
    `)

    // 3. Add canApplySpecialDiscount column to RolePermission and UserPermissionOverride tables
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "RolePermission" 
      ADD COLUMN IF NOT EXISTS "canApplySpecialDiscount" BOOLEAN DEFAULT false;
    `)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "UserPermissionOverride" 
      ADD COLUMN IF NOT EXISTS "canApplySpecialDiscount" BOOLEAN DEFAULT false;
    `)

    isMigrated = true
    console.log("Access control database migrations executed successfully.")
  } catch (error) {
    console.error("Access control database migrations failed:", error)
  }
}

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
    await ensureDbSchema()
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
        employeeId: true,
        territories: true,
        status: true,
        isActive: true,
        createdAt: true,
        permissionOverrides: true,
        clientAssignments: {
          include: {
            client: {
              select: {
                id: true,
                companyName: true,
                clientId: true,
              }
            }
          }
        }
      },
      orderBy: { name: "asc" }
    })

    // Get all clients for assignments mapping
    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        companyName: true,
        clientId: true,
        salespersonId: true,
      },
      orderBy: { companyName: "asc" }
    })

    // Get client access requests
    const clientAccessRequests = await prisma.clientAccessRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            clientId: true,
            salespersonId: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          }
        }
      }
    })

    // Get system settings for approvals
    const systemSettings = await prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: "approval_control_"
        }
      }
    })

    // Calculate Access Control Dashboard Stats
    const totalUsers = await prisma.user.count({ where: { deletedAt: null } })
    const activeUsers = await prisma.user.count({ where: { deletedAt: null, status: "Active" } })
    const pendingRequests = await prisma.clientAccessRequest.count({ where: { status: "Requested" } })
    const suspendedUsers = await prisma.user.count({ where: { deletedAt: null, status: "Suspended" } })
    const totalRoles = await prisma.role.count()

    const recentlyAddedUsers = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        status: true,
        createdAt: true,
      }
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
        take: 150,
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
        take: 150,
      })
    }

    return NextResponse.json({
      roles,
      users,
      clients,
      clientAccessRequests,
      systemSettings,
      stats: {
        totalUsers,
        activeUsers,
        pendingRequests,
        suspendedUsers,
        totalRoles
      },
      recentlyAddedUsers,
      logs
    })
  } catch (error) {
    console.error("GET /api/settings/access-control failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureDbSchema()
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
            markupVisible: basePerm ? basePerm.markupVisible : false,
            canConfirmQuotation: basePerm ? basePerm.canConfirmQuotation : false,
            canApplySpecialDiscount: basePerm ? basePerm.canApplySpecialDiscount : false,
            canOverrideVat: basePerm ? basePerm.canOverrideVat : false,
            canAddCustomCharges: basePerm ? basePerm.canAddCustomCharges : false,
            maxDiscountPercent: basePerm ? basePerm.maxDiscountPercent : 0,
          }
        })
      }

      // Fetch the full role with permissions to return
      const createdRole = await prisma.role.findUnique({
        where: { id: newRole.id },
        include: { permissions: true }
      })

      // Log action
      await prisma.accessControlLog.create({
        data: {
          userId: user.id,
          action: "CREATE_ROLE",
          details: `Created custom role ${normalizedRoleName} (copied from: ${baseRoleId || "none"})`
        }
      })

      return NextResponse.json({ success: true, role: createdRole })
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 })
  } catch (error) {
    console.error("POST /api/settings/access-control failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}


export async function PUT(request: Request) {
  try {
    await ensureDbSchema()
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

      if (role.name === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden: Only Super Admin can modify SUPER_ADMIN permissions" }, { status: 403 })
      }

      // Fetch pre-update permissions to compare diffs
      const prePermissions = await prisma.rolePermission.findMany({
        where: { roleId }
      })

      // Bulk update permissions
      const changesList: string[] = []

      for (const p of permissions) {
        const existing = prePermissions.find(ep => ep.module === p.module)

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
          canConfirmQuotation: p.canConfirmQuotation ?? false,
          canApplySpecialDiscount: p.canApplySpecialDiscount ?? false,
          canOverrideVat: p.canOverrideVat ?? false,
          canAddCustomCharges: p.canAddCustomCharges ?? false,
          maxDiscountPercent: p.maxDiscountPercent !== undefined ? (p.maxDiscountPercent === "" || p.maxDiscountPercent === null ? 0 : parseFloat(p.maxDiscountPercent)) : 0,
        }

        if (existing) {
          const diffs: string[] = []
          for (const [key, val] of Object.entries(dataPayload)) {
            const oldVal = (existing as any)[key]
            if (oldVal !== val) {
              diffs.push(`${key}: ${oldVal} -> ${val}`)
            }
          }
          if (diffs.length > 0) {
            changesList.push(`${p.module} (${diffs.join(", ")})`)
          }

          await prisma.rolePermission.update({
            where: { id: existing.id },
            data: dataPayload
          })
        } else {
          changesList.push(`${p.module} (created new permission set)`)
          await prisma.rolePermission.create({
            data: {
              roleId,
              module: p.module,
              ...dataPayload
            }
          })
        }
      }

      const logDetails = changesList.length > 0
        ? `Updated permissions for role ${role.name}. Changes: ${changesList.join("; ")}`
        : `Updated permissions for role ${role.name} (no changes detected)`

      await prisma.accessControlLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_ROLE_PERMISSIONS",
          details: logDetails.substring(0, 1000)
        }
      })

      return NextResponse.json({ success: true })
    }

    if (type === "update_role_details") {
      const { roleName, description } = body
      if (!roleName) return NextResponse.json({ error: "Role name is required" }, { status: 400 })

      const role = await prisma.role.findUnique({ where: { id: roleId } })
      if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 })

      const normalizedRoleName = roleName.toUpperCase().replace(/\s+/g, "_")
      if (role.isSystem && role.name !== normalizedRoleName) {
        return NextResponse.json({ error: "Cannot rename a system role" }, { status: 403 })
      }

      if (role.name !== normalizedRoleName) {
        const existing = await prisma.role.findUnique({ where: { name: normalizedRoleName } })
        if (existing) {
          return NextResponse.json({ error: "Role name already exists" }, { status: 400 })
        }
      }

      const updatedRole = await prisma.role.update({
        where: { id: roleId },
        data: {
          name: normalizedRoleName,
          description: description || ""
        },
        include: { permissions: true }
      })

      await prisma.accessControlLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_ROLE_DETAILS",
          details: `Updated role details for ${normalizedRoleName}`
        }
      })

      return NextResponse.json({ success: true, role: updatedRole })
    }

    if (type === "update_overrides") {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId }
      })

      if (!targetUser) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 })
      }

      if (targetUser.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden: Only Super Admin can modify SUPER_ADMIN overrides" }, { status: 403 })
      }

      // Fetch pre-update overrides to compare diffs
      const preOverrides = await prisma.userPermissionOverride.findMany({
        where: { userId: targetUserId }
      })

      // Clear existing overrides for this user
      await prisma.userPermissionOverride.deleteMany({
        where: { userId: targetUserId }
      })

      // Insert new overrides
      const newOverridesDetails: string[] = []
      for (const o of overrides) {
        const dataPayload = {
          userId: targetUserId,
          module: o.module,
          action: o.action,
          value: o.value,
          ownership: o.ownership || null,
          approvalLimit: o.approvalLimit !== undefined && o.approvalLimit !== null && o.approvalLimit !== "" ? parseFloat(o.approvalLimit) : null,
          maxDiscountPercent: o.maxDiscountPercent !== undefined && o.maxDiscountPercent !== null && o.maxDiscountPercent !== "" ? parseFloat(o.maxDiscountPercent) : null,
        }

        await prisma.userPermissionOverride.create({
          data: dataPayload
        })

        newOverridesDetails.push(`${o.module}.${o.action}=${o.value}`)
      }

      // Compare old overrides with new overrides
      const oldOverridesList = preOverrides.map(o => `${o.module}.${o.action}=${o.value}`).join(", ")
      const newOverridesList = newOverridesDetails.join(", ")
      const logDetails = `Updated overrides for ${targetUser.name || targetUser.email}. Previous: [${oldOverridesList || "none"}], New: [${newOverridesList || "none"}]`

      await prisma.accessControlLog.create({
        data: {
          userId: user.id,
          targetUserId: targetUserId,
          action: "UPDATE_USER_OVERRIDES",
          details: logDetails.substring(0, 1000)
        }
      })

      return NextResponse.json({ success: true })
    }

    if (type === "update_user_profile") {
      const { targetUserId, name, email, role, department, employeeId, status, clientAssignments } = body

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId }
      })

      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      if (targetUser.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden: Only Super Admin can update SUPER_ADMIN profile" }, { status: 403 })
      }

      // Update user details
      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          name,
          email,
          role,
          department,
          employeeId,
          status,
          isActive: status === "Active",
        }
      })

      // Update client assignments if provided
      if (clientAssignments && Array.isArray(clientAssignments)) {
        // Delete non-primary assignments for this user
        await prisma.clientAssignment.deleteMany({
          where: { userId: targetUserId, isPrimary: false }
        })

        // Add new assignments as secondary
        for (const clientId of clientAssignments) {
          // If the user is primary owner, keep it primary. Otherwise, upsert as secondary.
          const isPrimaryOwner = await prisma.client.findFirst({
            where: { id: clientId, salespersonId: targetUserId }
          })

          await prisma.clientAssignment.upsert({
            where: {
              clientId_userId: {
                clientId,
                userId: targetUserId
              }
            },
            create: {
              clientId,
              userId: targetUserId,
              isPrimary: !!isPrimaryOwner,
              allowAllQuotations: true,
              allowQuotationEdit: true,
              allowRevisionApproval: false,
              allowBoqAccess: true,
              allowPricingVisibility: true
            },
            update: {
              isPrimary: !!isPrimaryOwner
            }
          })
        }
      }

      await prisma.accessControlLog.create({
        data: {
          userId: user.id,
          targetUserId: targetUserId,
          action: "UPDATE_USER_PROFILE",
          details: `Updated info for ${name || email}. Role: ${role}, Dept: ${department}, ID: ${employeeId}, Status: ${status}`
        }
      })

      return NextResponse.json({ success: true, user: updated })
    }

    if (type === "transfer_client") {
      const { clientId, fromUserId, toUserId } = body

      const client = await prisma.client.findUnique({
        where: { id: clientId }
      })

      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 })
      }

      await prisma.$transaction(async (tx) => {
        // 1. Remove previous owner assignments for this client
        if (fromUserId) {
          await tx.clientAssignment.deleteMany({
            where: { clientId, userId: fromUserId }
          })
        }

        // 2. Set new salespersonId
        await tx.client.update({
          where: { id: clientId },
          data: { salespersonId: toUserId }
        })

        // 3. Upsert primary client assignment for toUserId
        await tx.clientAssignment.upsert({
          where: {
            clientId_userId: {
              clientId,
              userId: toUserId
            }
          },
          create: {
            clientId,
            userId: toUserId,
            isPrimary: true,
            allowAllQuotations: true,
            allowQuotationEdit: true,
            allowRevisionApproval: true,
            allowBoqAccess: true,
            allowPricingVisibility: true
          },
          update: {
            isPrimary: true,
            allowAllQuotations: true,
            allowQuotationEdit: true,
            allowRevisionApproval: true,
            allowBoqAccess: true,
            allowPricingVisibility: true
          }
        })

        // 4. Notify new owner
        await tx.notification.create({
          data: {
            userId: toUserId,
            title: "Client Assigned to You",
            message: `Client "${client.companyName}" has been reassigned to you as primary owner.`,
            type: "CLIENT_ASSIGNED",
            link: `/clients/${clientId}`
          }
        })

        // 5. Add to general activity logs
        await tx.activityLog.create({
          data: {
            userId: user.id,
            action: "TRANSFER_CLIENT",
            entityType: "CLIENT",
            entityId: clientId,
            details: `Transferred client "${client.companyName}" ownership from salesperson ID ${fromUserId || "none"} to ID ${toUserId}`
          }
        })
      })

      await prisma.accessControlLog.create({
        data: {
          userId: user.id,
          action: "TRANSFER_CLIENT",
          details: `Transferred client ${client.companyName} from user ID ${fromUserId || "none"} to user ID ${toUserId}`
        }
      })

      return NextResponse.json({ success: true })
    }

    if (type === "remove_client_access") {
      const { clientId, userId: targetUserId } = body

      const client = await prisma.client.findUnique({
        where: { id: clientId }
      })

      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 })
      }

      await prisma.$transaction(async (tx) => {
        // Delete the assignment
        await tx.clientAssignment.deleteMany({
          where: { clientId, userId: targetUserId }
        })

        // If this user was primary salesperson, reset salespersonId
        if (client.salespersonId === targetUserId) {
          await tx.client.update({
            where: { id: clientId },
            data: { salespersonId: null }
          })
        }

        // Notify user
        await tx.notification.create({
          data: {
            userId: targetUserId,
            title: "Client Access Removed",
            message: `Your assignment access to client "${client.companyName}" has been revoked.`,
            type: "CLIENT_ACCESS_REVOKED"
          }
        })
      })

      await prisma.accessControlLog.create({
        data: {
          userId: user.id,
          targetUserId: targetUserId,
          action: "REMOVE_CLIENT_ACCESS",
          details: `Removed access to client ${client.companyName} for user ID ${targetUserId}`
        }
      })

      return NextResponse.json({ success: true })
    }

    if (type === "update_approval_settings") {
      const { settings } = body // Object maps e.g. "approval_control_client_creation" to "true"/"false"

      for (const [key, value] of Object.entries(settings)) {
        await prisma.systemSetting.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) }
        })
      }

      await prisma.accessControlLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_APPROVAL_SETTINGS",
          details: `Updated global workflow approval toggles`
        }
      })

      return NextResponse.json({ success: true })
    }

    if (type === "process_access_request") {
      const { requestId, action, rejectionReason, assignmentType, newOwnerId } = body

      const accessRequest = await prisma.clientAccessRequest.findUnique({
        where: { id: requestId },
        include: { client: true, user: true }
      })

      if (!accessRequest) {
        return NextResponse.json({ error: "Access request not found" }, { status: 404 })
      }

      const clientName = accessRequest.client.companyName
      const userName = accessRequest.user.name || accessRequest.user.email || "Consultant"

      if (action === "Approve") {
        await prisma.$transaction(async (tx) => {
          await tx.clientAccessRequest.update({
            where: { id: requestId },
            data: { status: "Approved" }
          })

          if (assignmentType === "primary") {
            await tx.client.update({
              where: { id: accessRequest.clientId },
              data: { salespersonId: accessRequest.userId }
            })
            await tx.clientAssignment.upsert({
              where: {
                clientId_userId: {
                  clientId: accessRequest.clientId,
                  userId: accessRequest.userId
                }
              },
              create: {
                clientId: accessRequest.clientId,
                userId: accessRequest.userId,
                isPrimary: true,
                allowAllQuotations: true,
                allowQuotationEdit: true,
                allowRevisionApproval: true,
                allowBoqAccess: true,
                allowPricingVisibility: true
              },
              update: {
                isPrimary: true,
                allowAllQuotations: true,
                allowQuotationEdit: true,
                allowRevisionApproval: true,
                allowBoqAccess: true,
                allowPricingVisibility: true
              }
            })
          } else {
            await tx.clientAssignment.upsert({
              where: {
                clientId_userId: {
                  clientId: accessRequest.clientId,
                  userId: accessRequest.userId
                }
              },
              create: {
                clientId: accessRequest.clientId,
                userId: accessRequest.userId,
                isPrimary: false,
                allowAllQuotations: true,
                allowQuotationEdit: true,
                allowRevisionApproval: false,
                allowBoqAccess: true,
                allowPricingVisibility: true
              },
              update: {
                isPrimary: false,
                allowAllQuotations: true,
                allowQuotationEdit: true,
                allowBoqAccess: true,
                allowPricingVisibility: true
              }
            })
          }

          // Create notification for requested user
          await tx.notification.create({
            data: {
              userId: accessRequest.userId,
              title: "Access Request Approved",
              message: `Your access request for "${clientName}" has been approved.`,
              type: "CLIENT_ACCESS_APPROVED",
              link: `/quotations/new?clientId=${accessRequest.clientId}`
            }
          })
        })

        await prisma.accessControlLog.create({
          data: {
            userId: user.id,
            targetUserId: accessRequest.userId,
            action: "APPROVE_ACCESS_REQUEST",
            details: `Approved access request for ${userName} to client ${clientName} (${assignmentType || "secondary"} assignment)`
          }
        })

        return NextResponse.json({ success: true })
      }

      if (action === "Reject") {
        await prisma.$transaction(async (tx) => {
          await tx.clientAccessRequest.update({
            where: { id: requestId },
            data: { 
              status: "Rejected",
              rejectionReason: rejectionReason || null
            }
          })

          await tx.notification.create({
            data: {
              userId: accessRequest.userId,
              title: "Access Request Rejected",
              message: `Your access request for "${clientName}" was rejected.${
                rejectionReason ? ` Reason: ${rejectionReason}` : ""
              }`,
              type: "CLIENT_ACCESS_REJECTED"
            }
          })
        })

        await prisma.accessControlLog.create({
          data: {
            userId: user.id,
            targetUserId: accessRequest.userId,
            action: "REJECT_ACCESS_REQUEST",
            details: `Rejected access request for ${userName} to client ${clientName}.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`
          }
        })

        return NextResponse.json({ success: true })
      }

      if (action === "Reassign") {
        if (!newOwnerId) {
          return NextResponse.json({ error: "New Owner ID is required for Reassign action" }, { status: 400 })
        }

        await prisma.$transaction(async (tx) => {
          // 1. Update the request status
          await tx.clientAccessRequest.update({
            where: { id: requestId },
            data: { status: "Approved" }
          })

          // 2. Transfer client to newOwnerId (reassign client primary owner)
          await tx.client.update({
            where: { id: accessRequest.clientId },
            data: { salespersonId: newOwnerId }
          })

          await tx.clientAssignment.upsert({
            where: {
              clientId_userId: {
                clientId: accessRequest.clientId,
                userId: newOwnerId
              }
            },
            create: {
              clientId: accessRequest.clientId,
              userId: newOwnerId,
              isPrimary: true,
              allowAllQuotations: true,
              allowQuotationEdit: true,
              allowRevisionApproval: true,
              allowBoqAccess: true,
              allowPricingVisibility: true
            },
            update: {
              isPrimary: true,
              allowAllQuotations: true,
              allowQuotationEdit: true,
              allowRevisionApproval: true,
              allowBoqAccess: true,
              allowPricingVisibility: true
            }
          })

          // 3. Keep original requesting user as secondary client assignment
          await tx.clientAssignment.upsert({
            where: {
              clientId_userId: {
                clientId: accessRequest.clientId,
                userId: accessRequest.userId
              }
            },
            create: {
              clientId: accessRequest.clientId,
              userId: accessRequest.userId,
              isPrimary: false,
              allowAllQuotations: true,
              allowQuotationEdit: true,
              allowRevisionApproval: false,
              allowBoqAccess: true,
              allowPricingVisibility: true
            },
            update: {
              isPrimary: false,
              allowAllQuotations: true,
              allowQuotationEdit: true,
              allowBoqAccess: true,
              allowPricingVisibility: true
            }
          })

          // 4. Notify requesting user
          await tx.notification.create({
            data: {
              userId: accessRequest.userId,
              title: "Access Request Approved (Reassigned)",
              message: `Your access request for "${clientName}" has been approved. The client was reassigned to a new primary owner.`,
              type: "CLIENT_ACCESS_APPROVED",
              link: `/quotations/new?clientId=${accessRequest.clientId}`
            }
          })

          // 5. Notify new owner
          await tx.notification.create({
            data: {
              userId: newOwnerId,
              title: "Client Reassigned to You",
              message: `Client "${clientName}" has been reassigned to you as primary owner.`,
              type: "CLIENT_ASSIGNED",
              link: `/clients/${accessRequest.clientId}`
            }
          })
        })

        await prisma.accessControlLog.create({
          data: {
            userId: user.id,
            action: "REASSIGN_ACCESS_REQUEST",
            details: `Reassigned client ${clientName} to new owner ID ${newOwnerId} while approving requester ID ${accessRequest.userId}`
          }
        })

        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ error: "Invalid Type" }, { status: 400 })
  } catch (error) {
    console.error("PUT /api/settings/access-control failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureDbSchema()
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
