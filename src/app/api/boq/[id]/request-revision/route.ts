import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    const userName = (session?.user as any)?.name || "User"

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { revisionNotes } = body

    const boq = await prisma.boq.findUnique({
      where: { id },
      include: { preparedBy: true, estimator: true }
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    // Update BOQ status to NEEDS_REVISION
    const updatedBoq = await prisma.boq.update({
      where: { id },
      data: {
        status: "NEEDS_REVISION",
        notes: revisionNotes ? `[Revision Request]: ${revisionNotes}\n\n${boq.notes || ""}` : boq.notes
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: "REQUESTED_BOQ_REVISION",
        entityType: "BOQ",
        entityId: id,
        details: `Costing revision requested for BOQ ${boq.boqNumber} by ${userName}. Notes: ${revisionNotes || "No notes provided"}`
      }
    })

    return NextResponse.json({ success: true, boq: updatedBoq })
  } catch (error: any) {
    console.error("Failed to request BOQ revision:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
