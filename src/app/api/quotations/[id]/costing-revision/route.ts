import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

// POST /api/quotations/[id]/costing-revision
// Request Costing Revision (IDC sends quotation back to Estimator with mandatory reason)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { revisionReason } = body || {}

    if (!revisionReason || typeof revisionReason !== "string" || !revisionReason.trim()) {
      return NextResponse.json(
        { error: "A mandatory comment/reason is required to request a costing revision." },
        { status: 400 }
      )
    }

    const existingQuote = await prisma.quotation.findUnique({
      where: { id },
      include: {
        assignedEstimator: true,
        preparedBy: true,
      },
    })

    if (!existingQuote) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
    }

    const updatedQuote = await prisma.quotation.update({
      where: { id },
      data: {
        costingStatus: "COSTING_REVISION_REQUESTED",
        revisionRequestedAt: new Date(),
        revisionRequestedById: (session.user as any).id,
        revisionReason: revisionReason.trim(),
        costingRevisionCycles: {
          increment: 1,
        },
      },
      include: {
        preparedBy: true,
        sentToCostingBy: true,
        costedBy: true,
        revisionRequestedBy: true,
        assignedEstimator: true,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "QUOTATION_COSTING_REVISION_REQUESTED",
        entityType: "QUOTATION",
        entityId: id,
        details: `Requested costing revision for ${existingQuote.quotationNumber}. Reason: "${revisionReason.trim()}"`,
      },
    })

    // Notify Estimator if assigned
    if (existingQuote.assignedEstimatorId) {
      await prisma.notification.create({
        data: {
          userId: existingQuote.assignedEstimatorId,
          title: "Costing Revision Requested",
          message: `${session.user.name || "IDC"} requested a costing revision for Quotation ${existingQuote.quotationNumber}. Reason: "${revisionReason.trim()}"`,
          type: "COSTING_REVISION_REQUESTED",
          link: `/quotations/new?editId=${id}`,
        },
      })
    }

    return NextResponse.json({
      message: "Costing revision requested successfully",
      quotation: updatedQuote,
    })
  } catch (error: any) {
    console.error("Error requesting costing revision:", error)
    return NextResponse.json(
      { error: error.message || "Failed to request costing revision" },
      { status: 500 }
    )
  }
}

// PUT /api/quotations/[id]/costing-revision
// Reopen Costing / Return to Costing (Changes status back to COSTING_IN_PROGRESS)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { notes } = body || {}

    const existingQuote = await prisma.quotation.findUnique({
      where: { id },
      include: {
        assignedEstimator: true,
      },
    })

    if (!existingQuote) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
    }

    const updatedQuote = await prisma.quotation.update({
      where: { id },
      data: {
        costingStatus: "COSTING_IN_PROGRESS",
      },
      include: {
        preparedBy: true,
        sentToCostingBy: true,
        costedBy: true,
        revisionRequestedBy: true,
        assignedEstimator: true,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "QUOTATION_COSTING_REOPENED",
        entityType: "QUOTATION",
        entityId: id,
        details: `Reopened costing for ${existingQuote.quotationNumber}.${notes ? ` Notes: "${notes}"` : ""}`,
      },
    })

    if (existingQuote.assignedEstimatorId) {
      await prisma.notification.create({
        data: {
          userId: existingQuote.assignedEstimatorId,
          title: "Costing Reopened",
          message: `Costing process for Quotation ${existingQuote.quotationNumber} has been reopened by ${session.user.name || "User"}.`,
          type: "COSTING_REOPENED",
          link: `/quotations/new?editId=${id}`,
        },
      })
    }

    return NextResponse.json({
      message: "Costing reopened successfully",
      quotation: updatedQuote,
    })
  } catch (error: any) {
    console.error("Error reopening costing:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reopen costing" },
      { status: 500 }
    )
  }
}
