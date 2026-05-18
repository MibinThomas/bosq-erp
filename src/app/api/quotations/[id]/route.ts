import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// Get single quotation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const quotation = await prisma.quotation.findFirst({
      where: {
        OR: [
          { id: id },
          { quotationNumber: id }
        ]
      },
      include: {
        client: true,
        items: {
          orderBy: { itemNo: "asc" }
        },
        preparedBy: true,
      },
    })

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(quotation)
  } catch (error) {
    console.error("Failed to fetch quotation:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

// Update quotation status or details
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, poStatus, paymentStatus, notes } = body

    const existingQuotation = await prisma.quotation.findFirst({
      where: {
        OR: [
          { id: id },
          { quotationNumber: id }
        ]
      }
    })

    if (!existingQuotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (status) updateData.status = status
    if (poStatus) updateData.poStatus = poStatus
    if (paymentStatus) updateData.paymentStatus = paymentStatus
    if (notes !== undefined) updateData.notes = notes

    const updatedQuotation = await prisma.quotation.update({
      where: { id: existingQuotation.id },
      data: updateData,
      include: {
        client: true,
        items: true,
      }
    })

    // Log Activity
    const defaultUser = await prisma.user.findFirst({
      where: { role: "SALES_EXECUTIVE" },
    })

    if (defaultUser) {
      await prisma.activityLog.create({
        data: {
          userId: defaultUser.id,
          action: "UPDATED_QUOTATION",
          entityType: "QUOTATION",
          entityId: updatedQuotation.id,
          details: `Updated quotation ${existingQuotation.quotationNumber} fields: ${Object.keys(updateData).join(", ")}`,
        },
      })
    }

    return NextResponse.json(updatedQuotation)
  } catch (error) {
    console.error("Failed to update quotation:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
