import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { createClientFolder } from "@/lib/sharepoint"

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
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
    // Default to the first User (or we can lookup salesUser)
    const defaultUser = await prisma.user.findFirst({
      where: { role: "SALES_EXECUTIVE" },
    })

    const newClient = await prisma.client.create({
      data: {
        clientId: nextClientId,
        companyName,
        contactPerson,
        phone,
        email,
        address,
        trn,
        clientType: clientType || "Corporate",
        notes,
        sharepointFolder: sharepointFolderId,
        salespersonId: defaultUser?.id || null,
      },
    })

    // Log Activity
    if (defaultUser) {
      await prisma.activityLog.create({
        data: {
          userId: defaultUser.id,
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
