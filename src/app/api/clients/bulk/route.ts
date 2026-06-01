import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import { createClientFolder } from "@/lib/sharepoint"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || ((session.user as any).role !== "ADMIN" && (session.user as any).role !== "SALES_MANAGER")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const body = await request.json()
    const { clients } = body

    if (!clients || !Array.isArray(clients)) {
      return NextResponse.json(
        { error: "Clients array is required" },
        { status: 400 }
      )
    }

    const createdClients = []
    
    // Get creator user id
    const creatorUserId: string = (session.user as any).id

    // 1. Get the last client ID to generate new ones
    const lastClient = await prisma.client.findFirst({
      orderBy: { clientId: "desc" },
    })

    let nextNum = 1
    if (lastClient && lastClient.clientId.startsWith("C-")) {
      const lastNumPart = parseInt(lastClient.clientId.replace("C-", ""), 10)
      if (!isNaN(lastNumPart)) {
        nextNum = lastNumPart + 1
      }
    }

    // Process clients sequentially
    for (const clientData of clients) {
      const {
        clientId,
        companyName,
        contactPerson,
        phone,
        email,
        address,
        trn,
        clientType,
        notes,
      } = clientData

      if (!companyName) {
        continue // Skip invalid rows gracefully
      }

      // 2. Check for duplicate by companyName or use provided Client ID
      let finalClientId = clientId ? clientId.trim() : null
      
      const existingClient = await prisma.client.findFirst({
        where: {
          companyName: {
            equals: companyName.trim(),
            mode: "insensitive"
          }
        }
      })
      
      if (existingClient && (!finalClientId || existingClient.clientId !== finalClientId)) {
        // Update the existing client instead of creating a duplicate
        finalClientId = existingClient.clientId
      } else if (!finalClientId) {
        // Generate new client ID
        finalClientId = `C-${nextNum.toString().padStart(4, "0")}`
        nextNum++
      }

      // 3. Create SharePoint folder (mock or real)
      let sharepointFolderId = ""
      try {
        sharepointFolderId = await createClientFolder(companyName)
      } catch (spError) {
        console.error("Failed to create SharePoint folder for client:", spError)
        // We don't crash, we just continue with empty/mock folder
        sharepointFolderId = `mock-folder-failed-${Date.now()}`
      }

      // 4. Upsert client
      const savedClient = await prisma.client.upsert({
        where: { clientId: finalClientId },
        update: {
          companyName: companyName.trim(),
          contactPerson: contactPerson || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          trn: trn || null,
          clientType: clientType || "Direct",
          notes: notes || null,
          status: "Approved",
        },
        create: {
          clientId: finalClientId,
          companyName: companyName.trim(),
          contactPerson: contactPerson || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          trn: trn || null,
          clientType: clientType || "Direct",
          notes: notes || null,
          sharepointFolder: sharepointFolderId,
          salespersonId: creatorUserId,
          status: "Approved",
        },
      })

      createdClients.push(savedClient)

      // Log Activity
      await prisma.activityLog.create({
        data: {
          userId: creatorUserId,
          action: "CREATED_CLIENT",
          entityType: "CLIENT",
          entityId: savedClient.id,
          details: `Bulk imported client ${companyName} (${finalClientId})`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      count: createdClients.length,
      clients: createdClients,
    })
  } catch (error) {
    console.error("Failed to bulk import clients:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
