import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { deleteClientDocument } from "@/lib/sharepoint"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string, documentId: string }> }
) {
  try {
    const { id, documentId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Admin/Super Admin can delete documents" }, { status: 403 })
    }

    const document = await prisma.clientDocument.findUnique({
      where: { id: documentId }
    })

    if (!document || document.clientId !== id) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Delete from SharePoint if we have an ID
    if (document.sharepointId) {
      await deleteClientDocument(document.sharepointId)
    }

    // Delete from DB
    await prisma.clientDocument.delete({
      where: { id: documentId }
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "DELETED_DOCUMENT",
        entityType: "CLIENT",
        entityId: id,
        details: `Deleted document: ${document.title}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete document failed:", error)
    return NextResponse.json({ error: error.message || "Failed to delete document" }, { status: 500 })
  }
}
