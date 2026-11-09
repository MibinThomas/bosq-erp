import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { canAccessBoq } from "@/lib/data-scope"
import { boqCostBreakdown, boqUnitCost, priceFromMargin, segmentMarginPct } from "@/lib/boq-costing"
import { POST as createQuotation } from "@/app/api/quotations/route"

/** A BOQ can be converted from these statuses (matches the BOQ editor's Convert buttons). */
const CONVERTIBLE_STATUSES = ["DRAFT", "NEEDS_REVISION", "COSTING_COMPLETED"]

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

    const boq = await prisma.boq.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: { orderBy: { itemNo: "asc" } },
        quotations: { where: { deletedAt: null }, select: { id: true, quotationNumber: true }, take: 1 },
      }
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }
    if (!(await canAccessBoq(userId, boq.id))) {
      return NextResponse.json({ error: "Forbidden: You do not have access to this BOQ" }, { status: 403 })
    }
    if (boq.status === "CONVERTED") {
      const existing = boq.quotations[0]
      return NextResponse.json(
        {
          error: existing
            ? `This BOQ was already converted to quotation ${existing.quotationNumber}.`
            : "This BOQ was already converted to a quotation.",
          quotation: existing || null,
        },
        { status: 409 }
      )
    }
    if (!CONVERTIBLE_STATUSES.includes(boq.status)) {
      return NextResponse.json(
        { error: "This BOQ is with the estimator for costing. Convert it once costing is completed." },
        { status: 409 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { paymentTerms, deliveryDate, validityDate } = body
    const costed = boq.status === "COSTING_COMPLETED"

    // Default margin for costed lines: the customer segment's tier from Settings → Pricing
    const pricingSetting = await prisma.systemSetting.findUnique({ where: { key: "PRICING_PERCENTAGES" } })
    let tiers: any = null
    try { tiers = pricingSetting ? JSON.parse(pricingSetting.value) : null } catch { tiers = null }
    const defaultMarginPct = segmentMarginPct(tiers, boq.customerSegment)

    // BOQ lines → quotation lines. Costed lines carry the estimator's cost as the reference price
    // (the consultant adds the margin on the quotation) plus the full cost breakdown.
    const quotationItems = boq.items.map((item) => {
      const cost = item.unitCost || boqUnitCost(item)
      const isCostedLine = costed && item.isCostingRequired && cost > 0

      let unitPrice: number
      if (isCostedLine) {
        // Keep a price the consultant already set on the BOQ; otherwise start at the segment margin
        unitPrice = (item.marginPercentage || 0) > 0 && item.unitSellingPrice > cost
          ? item.unitSellingPrice
          : priceFromMargin(cost, defaultMarginPct)
      } else {
        unitPrice = item.unitSellingPrice || item.unitCost || 0
      }
      const breakdown = boqCostBreakdown(item)

      return {
        productId: item.productId,
        description: item.description,
        specifications: item.specifications || "",
        productNotes: item.productNotes || "",
        productDescription: item.productDescription || "",
        customImageUrl: item.customImageUrl || null,
        quantity: item.quantity,
        unitPrice,
        basePrice: isCostedLine ? cost : unitPrice,
        discount: 0,
        // Quotation form markup (price = base × (1 + markup))
        margin: isCostedLine ? Number((((unitPrice - cost) / cost) * 100).toFixed(2)) : item.marginPercentage || 0,
        amount: Number((unitPrice * item.quantity).toFixed(2)),
        categoryName: item.categoryName || "Chairs",
        chairType: item.chairType || null,
        batchHeading: item.batchHeading || null,
        unitCost: cost,
        // The quotation costing workspace shows two columns: everything except hardware, and hardware.
        // The full six-way split travels in costBreakdown.
        materialCost: Math.max(0, Number((cost - breakdown.hardware).toFixed(2))),
        laborCost: breakdown.hardware,
        overheadCost: 0,
        transportCost: 0,
        installationCost: 0,
        costBreakdown: isCostedLine ? breakdown : null,
        marginPercentage: isCostedLine ? Number((((unitPrice - cost) / unitPrice) * 100).toFixed(2)) : item.marginPercentage || 0,
        estimatorUnitPrice: isCostedLine ? cost : 0,
        costingStatus: isCostedLine ? "COSTING_COMPLETED" : "NOT_REQUIRED",
      }
    })

    // Claim the BOQ first, so a double click or a second user can't convert it twice
    const claimed = await prisma.boq.updateMany({
      where: { id: boq.id, status: boq.status },
      data: { status: "CONVERTED" },
    })
    if (claimed.count === 0) {
      return NextResponse.json({ error: "This BOQ was just converted or changed by someone else. Refresh and try again." }, { status: 409 })
    }

    // Create the quotation in-process with the normal create logic (numbering, permissions,
    // validation). No HTTP round trip, so the user's session cookie never leaves the server.
    let quotation: any
    try {
      const createRes = await createQuotation(new Request(new URL("/api/quotations", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: boq.clientId,
          projectName: boq.projectName || "Office Furnishing Project",
          date: new Date().toISOString(),
          validityDate: validityDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          deliveryDate: deliveryDate || new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          paymentTerms: paymentTerms || "50% Advance, 50% on Delivery",
          deliveryCharge: 0,
          notes: boq.notes ? `[Converted from BOQ ${boq.boqNumber}]\n${boq.notes}` : `Converted from BOQ ${boq.boqNumber}`,
          termsConditions: boq.termsConditions,
          customerSegment: boq.customerSegment || "Project",
          preparedById: boq.preparedById || userId,
          items: quotationItems,
          postersAuto: true, // posters for the BOQ's products are added automatically
          posterIds: [],
        }),
      }))
      quotation = await createRes.json().catch(() => ({}))
      if (!createRes.ok) {
        throw Object.assign(new Error(quotation?.error || "Failed to generate Quotation from BOQ"), { status: createRes.status })
      }
    } catch (err: any) {
      // Release the BOQ so the user can fix the problem and try again
      await prisma.boq.update({ where: { id: boq.id }, data: { status: boq.status } }).catch(() => {})
      console.error("Failed to convert BOQ to Quotation:", err)
      const status = err?.status && err.status < 500 ? err.status : 500
      return NextResponse.json({ error: err?.message || "Failed to generate Quotation from BOQ" }, { status })
    }

    await prisma.$transaction([
      prisma.quotation.update({ where: { id: quotation.id }, data: { boqId: boq.id } }),
      prisma.activityLog.create({
        data: {
          userId,
          action: "CONVERTED_BOQ_TO_QUOTATION",
          entityType: "BOQ",
          entityId: boq.id,
          details: `Converted BOQ ${boq.boqNumber} to Quotation ${quotation.quotationNumber}`
        }
      }),
    ])

    return NextResponse.json({ success: true, quotation })
  } catch (error: any) {
    console.error("Failed to convert BOQ:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
