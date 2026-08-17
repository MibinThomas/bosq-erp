import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { paymentTerms, deliveryDate, validityDate } = body

    const boq = await prisma.boq.findUnique({
      where: { id },
      include: {
        items: true,
        client: true,
        preparedBy: true
      }
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    // Map BOQ Items to Quotation Items format
    const quotationItems = boq.items.map((item: any) => ({
      productId: item.productId,
      description: item.description,
      specifications: item.specifications || "",
      productNotes: item.productNotes || "",
      productDescription: item.productDescription || "",
      customImageUrl: item.customImageUrl || null,
      quantity: item.quantity,
      unitPrice: item.unitSellingPrice || item.unitCost || 0,
      basePrice: item.unitCost && item.unitCost > 0 ? item.unitCost : (item.unitSellingPrice || 0),
      discount: 0,
      margin: item.marginPercentage || 0,
      amount: item.totalSellingPrice || ((item.unitSellingPrice || item.unitCost || 0) * item.quantity),
      categoryName: item.categoryName || "Chairs",
      chairType: item.chairType || null,
      batchHeading: item.batchHeading || null,
    }))

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    
    // Construct quotation payload matching POST /api/quotations
    const quotationPayload = {
      clientId: boq.clientId,
      projectName: boq.projectName || "Office Furnishing Project",
      date: new Date().toISOString(),
      validityDate: validityDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      deliveryDate: deliveryDate || new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      paymentTerms: paymentTerms || (boq as any).paymentTerms || "50% Advance, 50% on Delivery",
      deliveryCharge: 0,
      notes: boq.notes ? `[Converted from BOQ ${boq.boqNumber}]\n${boq.notes}` : `Converted from BOQ ${boq.boqNumber}`,
      termsConditions: boq.termsConditions,
      customerSegment: boq.customerSegment || "Project",
      preparedById: boq.preparedById || userId,
      items: quotationItems
    }

    const cookie = request.headers.get("cookie") || ""

    const qRes = await fetch(`${baseUrl}/api/quotations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookie
      },
      body: JSON.stringify(quotationPayload)
    })

    if (!qRes.ok) {
      const err = await qRes.json()
      console.error("Failed to convert BOQ to Quotation:", err)
      return NextResponse.json({ error: err.error || "Failed to generate Quotation from BOQ" }, { status: 500 })
    }

    const quotation = await qRes.json()

    // Link the Quotation to the BOQ
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { boqId: boq.id }
    })

    // Update BOQ status to CONVERTED
    await prisma.boq.update({
      where: { id: boq.id },
      data: { status: "CONVERTED" }
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: "CONVERTED_BOQ_TO_QUOTATION",
        entityType: "BOQ",
        entityId: boq.id,
        details: `Converted BOQ ${boq.boqNumber} to Quotation ${quotation.quotationNumber}`
      }
    })

    return NextResponse.json({ success: true, quotation })
  } catch (error: any) {
    console.error("Failed to convert BOQ:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
