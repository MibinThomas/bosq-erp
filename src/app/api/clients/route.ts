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

    // Check view permission dynamically (allow CLIENTS, BOQS, QUOTATIONS modules and ESTIMATOR role)
    const canViewClients = await hasPermission(dbSessionUser.id, "CLIENTS", "view")
    const canViewBoqs = await hasPermission(dbSessionUser.id, "BOQS", "view")
    const canViewQuotations = await hasPermission(dbSessionUser.id, "QUOTATIONS", "view")
    const isEstimatorRole = dbSessionUser.role === "ESTIMATOR"

    const canView = canViewClients || canViewBoqs || canViewQuotations || isEstimatorRole
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view clients" }, { status: 403 })
    }

    // Check role-based admin/manager status
    const isManagerialRole = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(dbSessionUser.role)
    const userOverride = dbSessionUser.permissionOverrides.find(o => o.action === "ownership")
    
    // Admin & Managerial users can view all clients. Other users only see assigned clients (unless explicit user-level override is ALL or fetching all options).
    const { searchParams } = new URL(request.url)
    const all = searchParams.get("all") === "true"

    const canViewAllClients = isManagerialRole || userOverride?.ownership === "ALL" || isEstimatorRole || all

    let whereClause: any = {
      deletedAt: null
    }

    if (all) {
      whereClause.status = "Approved"
    } else {
      // Apply strict assigned-client filter for non-managerial users on Clients page list
      if (!canViewAllClients) {
        whereClause.OR = [
          { salespersonId: dbSessionUser.id },
          { assignments: { some: { userId: dbSessionUser.id } } },
          { accessRequests: { some: { userId: dbSessionUser.id, status: "Approved" } } }
        ]
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

    // Map clients to add isAssigned flag
    const allowRequestAgain = (await getSetting("client_allow_request_again")) !== "false"

    const clientsWithAccess = clients.map(client => {
      const isClientUserAssigned = client.salespersonId === dbSessionUser.id || 
                                   client.assignments.some(a => a.userId === dbSessionUser.id) ||
                                   client.accessRequests.some(r => r.userId === dbSessionUser.id && r.status === "Approved")

      const isAssigned = canViewAllClients || isClientUserAssigned

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
    let tracker = await prisma.sequenceTracker.findUnique({
      where: { type: "CLIENT_BASE" }
    })
    
    let maxNumber = 1000

    if (tracker) {
      maxNumber = tracker.lastValue
    } else {
      const allClients = await prisma.client.findMany({
        select: { clientId: true }
      })
      for (const c of allClients) {
        const match = c.clientId.match(/^[A-Za-z-]*(\d+)$/i)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      }
    }
    
    const usedBaseNumber = maxNumber + 1
    
    let prefix = "P"
    const resolvedType = clientType || "Project"
    if (resolvedType.toLowerCase() === "interior") {
      prefix = "I"
    } else if (resolvedType.toLowerCase() === "dealer") {
      prefix = "D"
    } else if (resolvedType.toLowerCase() === "project" || resolvedType.toLowerCase() === "special") {
      prefix = "P"
    }

    const nextClientId = `${prefix}${String(usedBaseNumber).padStart(4, "0")}`

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

    // All clients created by any authorized user are immediately Approved and auto-assigned
    const initialStatus = "Approved"

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

    // Automatically assign the creator to the client
    if (creatorUserId) {
      await prisma.clientAssignment.create({
        data: {
          clientId: newClient.id,
          userId: creatorUserId,
          isPrimary: true,
          allowAllQuotations: true,
          allowQuotationEdit: true,
          allowRevisionApproval: true,
          allowBoqAccess: true,
          allowPricingVisibility: false
        }
      })
    }


    if (usedBaseNumber > 1000) {
      await prisma.sequenceTracker.upsert({
        where: { type: "CLIENT_BASE" },
        update: { lastValue: usedBaseNumber },
        create: { type: "CLIENT_BASE", lastValue: usedBaseNumber, description: "Base client ID sequence" }
      })
    }

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



    return NextResponse.json(newClient, { status: 201 })
  } catch (error) {
    console.error("Failed to create client:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
