import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { canAccessBoq } from "@/lib/data-scope"

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

    if (!boq || boq.deletedAt) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }
    if (!(await canAccessBoq(userId, boq.id))) {
      return NextResponse.json({ error: "Forbidden: You do not have access to this BOQ" }, { status: 403 })
    }

    // Only a completed costing can be sent back for revision (conditional, so concurrent clicks are safe)
    const result = await prisma.boq.updateMany({
      where: { id, status: "COSTING_COMPLETED" },
      data: {
        status: "NEEDS_REVISION",
        notes: revisionNotes ? `[Revision Request]: ${revisionNotes}\n\n${boq.notes || ""}` : boq.notes
      }
    })
    if (result.count === 0) {
      return NextResponse.json(
        { error: "A costing revision can only be requested once the estimator has completed the costing." },
        { status: 409 }
      )
    }
    const updatedBoq = await prisma.boq.findUnique({ where: { id } })

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
