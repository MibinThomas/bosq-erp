import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
// We would ideally import the Quotation creation logic or hit it directly.
// For the sake of this endpoint, we'll re-implement the subset of POST /api/quotations needed
// or we can just fetch the BOQ and then make an internal POST request to the quotations API.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id

    const body = await request.json()
    const { paymentTerms, deliveryDate, validityDate } = body

    const boq = await prisma.boq.findUnique({
      where: { id },
      include: {
        items: true,
        client: true
      }
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    if (boq.status !== "COSTING_COMPLETED" && boq.status !== "APPROVED") {
      // Allow conversion if it's already costed.
      // But we won't strictly block here, just a check.
    }

    // Map BOQ Items to Quotation Items format
    const quotationItems = boq.items.map((item) => ({
      productId: item.productId,
      description: item.description,
      specifications: item.specifications || "",
      customImageUrl: item.customImageUrl || null,
      quantity: item.quantity,
      unitPrice: item.unitSellingPrice,
      basePrice: item.unitSellingPrice,
      discount: 0,
      margin: item.marginPercentage,
      amount: item.totalSellingPrice
    }))

    // We will call the existing Quotation API to handle PDF generation, numbering, etc.
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    
    // We pass the payload matching what the Quotation POST expects.
    const quotationPayload = {
      quotationNumber: boq.boqNumber,
      clientId: boq.clientId,
      projectName: boq.projectName,
      date: new Date().toISOString(),
      validityDate: validityDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      deliveryDate: deliveryDate,
      paymentTerms: paymentTerms || "TBD",
      deliveryCharge: 0,
      notes: boq.notes,
      termsConditions: boq.termsConditions,
      customerSegment: boq.customerSegment,
      preparedById: boq.preparedById, // Keeps the original BOQ preparer
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
      return NextResponse.json({ error: "Failed to generate Quotation from BOQ" }, { status: 500 })
    }

    const quotation = await qRes.json()

    // Link the Quotation to the BOQ
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { boqId: boq.id }
    })

    // Update BOQ status
    await prisma.boq.update({
      where: { id: boq.id },
      data: { status: "CONVERTED" }
    })

    // Trigger Excel export to the Quotation folder (fire and forget or await)
    try {
      fetch(`${baseUrl}/api/boq/${boq.id}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": cookie
        },
        body: JSON.stringify({ 
          quotationNumber: quotation.quotationNumber,
          quotationGroupFolder: quotation.quotationNumber.split("-")[0]
        })
      })
    } catch (e) {
      console.error("Failed to trigger BOQ export during conversion:", e)
    }

    return NextResponse.json({ success: true, quotation })
  } catch (error) {
    console.error("Failed to convert BOQ:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
