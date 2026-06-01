import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { createClientFolder } from "@/lib/sharepoint"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    let whereClause: any = { deletedAt: null }
    // We allow fetching all active clients to ensure dropdowns work correctly across roles

    const clients = await prisma.client.findMany({
      where: whereClause,
      orderBy: { clientId: "asc" },
    })
    return NextResponse.json(clients)
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
    let creatorUserId: string | null = null
    let userRole = "SALES_EXECUTIVE"
    
    if (session?.user) {
      creatorUserId = (session.user as any).id
      userRole = (session.user as any).role || "SALES_EXECUTIVE"
    } else {
      const defaultUser = await prisma.user.findFirst({
        where: { role: "SALES_EXECUTIVE" },
      })
      creatorUserId = defaultUser?.id || null
    }

    const isApprovedImmediately = ["ADMIN", "SALES_MANAGER"].includes(userRole)
    const initialStatus = isApprovedImmediately ? "Approved" : "Pending Approval"

    const newClient = await prisma.client.create({
      data: {
        clientId: nextClientId,
        companyName,
        contactPerson,
        phone,
        email,
        address,
        trn,
        clientType: clientType || "Direct",
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
