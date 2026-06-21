import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { uploadClientDocument } from "@/lib/sharepoint"
import path from "path"
import { hasPermission } from "@/lib/rbac"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canView = await hasPermission((session.user as any).id, "CLIENTS", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view clients" }, { status: 403 })
    }

    const documents = await prisma.clientDocument.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Failed to fetch client documents:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canEdit = await hasPermission((session.user as any).id, "CLIENTS", "edit")
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit clients" }, { status: 403 })
    }

    const client = await prisma.client.findUnique({
      where: { id }
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const title = formData.get("title") as string
    const documentType = formData.get("documentType") as string

    if (!file || !title || !documentType) {
      return NextResponse.json({ error: "Missing required fields (file, title, documentType)" }, { status: 400 })
    }

    const ext = file.name ? path.extname(file.name).toLowerCase() : ""
    const fileNameBase = file.name || `${title}${ext}`
    
    // Convert to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to SharePoint
    const { webUrl, id: sharepointId } = await uploadClientDocument(
      client.companyName,
      fileNameBase,
      buffer
    )

    // Save to database
    const document = await prisma.clientDocument.create({
      data: {
        clientId: client.id,
        title,
        documentType,
        sharepointUrl: webUrl,
        sharepointId,
        fileExtension: ext,
        fileSize: file.size,
        uploadedBy: (session.user as any).id,
        uploadedByName: session.user.name
      }
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "UPLOADED_DOCUMENT",
        entityType: "CLIENT",
        entityId: client.id,
        details: `Uploaded ${documentType} document: ${title}`,
      },
    })

    return NextResponse.json(document)
  } catch (error: any) {
    console.error("Upload failed:", error)
    return NextResponse.json({ error: error.message || "Failed to upload document" }, { status: 500 })
  }
}
