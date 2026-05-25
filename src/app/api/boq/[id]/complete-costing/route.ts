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
    const userName = (session?.user as any)?.name || "Estimator"

    const boq = await prisma.boq.findUnique({
      where: { id },
      include: { preparedBy: true }
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    // Update BOQ status
    const updatedBoq = await prisma.boq.update({
      where: { id },
      data: { status: "COSTING_COMPLETED" }
    })

    // Log the completion activity
    await prisma.activityLog.create({
      data: {
        action: "COSTING_COMPLETED",
        entityType: "BOQ",
        entityId: boq.id,
        details: `Costing completed for BOQ ${boq.boqNumber} by ${userName}. Notifying Interior Design Consultant.`,
        userId: userId || boq.preparedById
      }
    })

    // Ideally, here we would also send an email or push notification to boq.preparedBy (the IDC)

    return NextResponse.json(updatedBoq)
  } catch (error: any) {
    console.error("Failed to mark costing completed:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
