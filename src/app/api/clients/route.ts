import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { createClientFolder } from "@/lib/sharepoint"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { hasPermission } from "@/lib/rbac"
import { getSetting } from "@/lib/settings"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbSessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { permissionOverrides: { where: { module: "CLIENTS" } } }
    })

    if (!dbSessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check view permission dynamically
    const canView = await hasPermission(dbSessionUser.id, "CLIENTS", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view clients" }, { status: 403 })
    }

    // Resolve ownership rule
    let ownershipRule = "ALL"
    if (dbSessionUser.role !== "SUPER_ADMIN") {
      const override = dbSessionUser.permissionOverrides.find(o => o.action === "ownership")
      if (override?.ownership) {
        ownershipRule = override.ownership
      } else {
        const roleObj = await prisma.role.findFirst({
          where: { name: dbSessionUser.role },
          include: { permissions: { where: { module: "CLIENTS" } } }
        })
        const rolePerm = roleObj?.permissions[0]
        if (rolePerm?.ownership) {
          ownershipRule = rolePerm.ownership
        }
      }
    }

    const { searchParams } = new URL(request.url)
    const all = searchParams.get("all") === "true"

    let whereClause: any = {
      deletedAt: null
    }

    if (all) {
      whereClause.status = "Approved"
    } else {
      const isUnrestricted = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(dbSessionUser.role)
      if (!isUnrestricted) {
        whereClause.OR = [
          { salespersonId: dbSessionUser.id },
          { assignments: { some: { userId: dbSessionUser.id } } },
          { accessRequests: { some: { userId: dbSessionUser.id, status: "Approved" } } }
        ]
      } else {
        if (ownershipRule === "DEPARTMENT") {
          const deptUsers = await prisma.user.findMany({
            where: { department: dbSessionUser.department || "N/A" },
            select: { id: true }
          })
          const deptUserIds = deptUsers.map(u => u.id)
          whereClause.OR = [
            { salespersonId: { in: deptUserIds } },
            { assignments: { some: { userId: { in: deptUserIds } } } },
            { accessRequests: { some: { userId: { in: deptUserIds }, status: "Approved" } } }
          ]
        } else if (ownershipRule === "OWN" || ownershipRule === "ASSIGNED") {
          whereClause.OR = [
            { salespersonId: dbSessionUser.id },
            { assignments: { some: { userId: dbSessionUser.id } } },
            { accessRequests: { some: { userId: dbSessionUser.id, status: "Approved" } } }
          ]
        } else if (ownershipRule === "NONE") {
          whereClause.id = "none"
        }
      }
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      orderBy: { clientId: "asc" },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        },
        accessRequests: {
          where: { userId: dbSessionUser.id }
        }
      }
    })

    // Compute access list for department check
    const deptUsers = ownershipRule === "DEPARTMENT" ? await prisma.user.findMany({
      where: { department: dbSessionUser.department || "N/A" },
      select: { id: true }
    }) : []
    const deptUserIds = deptUsers.map(u => u.id)

    // Map clients to add isAssigned flag
    const allowRequestAgain = (await getSetting("client_allow_request_again")) !== "false"

    const clientsWithAccess = clients.map(client => {
      let isAssigned = false
      const isClientUserAssigned = client.salespersonId === dbSessionUser.id || 
                                   client.assignments.some(a => a.userId === dbSessionUser.id) ||
                                   client.accessRequests.some(r => r.userId === dbSessionUser.id && r.status === "Approved")

      if (ownershipRule === "ALL") {
        isAssigned = true
      } else if (ownershipRule === "DEPARTMENT") {
        isAssigned = deptUserIds.includes(client.salespersonId || "") ||
                     client.assignments.some(a => deptUserIds.includes(a.userId))
      } else if (ownershipRule === "OWN" || ownershipRule === "ASSIGNED") {
        isAssigned = isClientUserAssigned
      } else if (ownershipRule === "NONE") {
        isAssigned = false
      }

      return {
        ...client,
        isAssigned,
        allowRequestAgain
      }
    })

    return NextResponse.json(clientsWithAccess)
  } catch (error) {
    console.error("Failed to fetch clients:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      companyName,
      contactPerson,
      phone,
      email,
      address,
      trn,
      clientType,
      notes,
    } = body

    if (!companyName) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      )
    }

    // 0. Check for duplicate company name
    const existingClient = await prisma.client.findFirst({
      where: {
        companyName: {
          equals: companyName.trim(),
          mode: "insensitive"
        }
      }
    })

    if (existingClient) {
      return NextResponse.json(
        { error: `A client with the company name "${existingClient.companyName}" already exists.` },
        { status: 409 }
      )
    }

    // 1. Generate client ID (e.g. C-1004)
    const lastClient = await prisma.client.findFirst({
      orderBy: { clientId: "desc" },
    })

    let nextClientId = "C-1001"
    if (lastClient && lastClient.clientId.startsWith("C-")) {
      const lastNum = parseInt(lastClient.clientId.replace("C-", ""), 10)
      if (!isNaN(lastNum)) {
        nextClientId = `C-${lastNum + 1}`
      }
    }

    // 2. Create SharePoint folder (mock or real)
    let sharepointFolderId = ""
    try {
      sharepointFolderId = await createClientFolder(companyName)
    } catch (spError) {
      console.error("Failed to create SharePoint folder for client:", spError)
      // We don't crash, we just continue with empty/mock folder
      sharepointFolderId = `mock-folder-failed-${Date.now()}`
    }

    // 3. Save to database
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbSessionUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!dbSessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify create client permission
    const canCreate = await hasPermission(dbSessionUser.id, "CLIENTS", "create")
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create clients" }, { status: 403 })
    }

    const creatorUserId = dbSessionUser.id
    const userRole = dbSessionUser.role

    // Check if user has permission to approve immediately, else needs approval
    const canApprove = await hasPermission(dbSessionUser.id, "CLIENTS", "approve")
    const initialStatus = canApprove ? "Approved" : "Pending Approval"

    const newClient = await prisma.client.create({
      data: {
        clientId: nextClientId,
        companyName,
        contactPerson,
        phone,
        email,
        address,
        trn,
        clientType: clientType || "Project",
        notes,
        sharepointFolder: sharepointFolderId,
        salespersonId: creatorUserId,
        status: initialStatus,
      },
    })

    // Log Activity
    if (creatorUserId) {
      await prisma.activityLog.create({
        data: {
          userId: creatorUserId,
          action: "CREATED_CLIENT",
          entityType: "CLIENT",
          entityId: newClient.id,
          details: `Created client ${companyName} (${nextClientId})`,
        },
      })

      if (sharepointFolderId && !sharepointFolderId.startsWith("mock-")) {
        await prisma.activityLog.create({
          data: {
            userId: creatorUserId,
            action: "CREATED_SHAREPOINT_FOLDER",
            entityType: "CLIENT",
            entityId: newClient.id,
            details: `Client SharePoint folder created: Clients/${companyName}`,
          },
        })
      }
    }

    // Create notifications for Admin/Managers if pending approval
    if (initialStatus === "Pending Approval") {
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ["ADMIN", "SALES_MANAGER", "MANAGER"] },
          isActive: true
        }
      })

      if (managers.length > 0) {
        await prisma.notification.createMany({
          data: managers.map(mgr => ({
            userId: mgr.id,
            title: "New Client Pending Approval",
            message: `${companyName} (${nextClientId}) was created and requires approval.`,
            type: "CLIENT_APPROVAL",
            link: `/clients/${newClient.id}`
          }))
        })
      }
    }

    return NextResponse.json(newClient, { status: 201 })
  } catch (error) {
    console.error("Failed to create client:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
