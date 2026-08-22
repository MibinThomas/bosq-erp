import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    const canCreate = await hasPermission(userId, "QUOTATIONS", "create")
    if (!canCreate) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to create quotations" },
        { status: 403 }
      )
    }

    const { id } = await params
    const sourceQuotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
        client: true,
      },
    })

    if (!sourceQuotation) {
      return NextResponse.json({ error: "Source quotation not found" }, { status: 404 })
    }

    // Check ownership / consultant access for SALES_EXECUTIVE & INTERIOR_DESIGN_CONSULTANT
    if (["SALES_EXECUTIVE", "INTERIOR_DESIGN_CONSULTANT"].includes(userRole)) {
      const rootId = sourceQuotation.parentId || sourceQuotation.id
      const rootQuotation = sourceQuotation.parentId
        ? await prisma.quotation.findUnique({ where: { id: rootId } })
        : sourceQuotation

      const isOwnerOrCreator = 
        sourceQuotation.preparedById === userId ||
        sourceQuotation.salesAgentId === userId ||
        rootQuotation?.preparedById === userId ||
        rootQuotation?.salesAgentId === userId

      const isClientSalesperson = sourceQuotation.client?.salespersonId === userId
      const assignmentCount = await prisma.clientAssignment.count({
        where: { clientId: sourceQuotation.clientId, userId }
      })
      const hasApprovedRequest = await prisma.clientAccessRequest.findFirst({
        where: { clientId: sourceQuotation.clientId, userId, status: "Approved" }
      })

      const canCopy = isOwnerOrCreator || isClientSalesperson || assignmentCount > 0 || !!hasApprovedRequest
      if (!canCopy) {
        return NextResponse.json(
          { error: "Unauthorized: You can only copy your own or assigned quotations" },
          { status: 403 }
        )
      }
    }

    const sourceNumber = sourceQuotation.quotationNumber.replace(/\s+Copy.*$/gi, "").trim()

    // Find all existing quotations with quotationNumber matching sourceNumber or sourceNumber + " Copy ..."
    const existingQuotesWithBase = await prisma.quotation.findMany({
      where: {
        quotationNumber: {
          startsWith: sourceNumber,
        },
      },
      select: {
        quotationNumber: true,
      },
    })

    let maxCopyNum = 0
    const copyPattern = new RegExp(`^${sourceNumber.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s+Copy\\s+(\\d+)$`, "i")

    for (const q of existingQuotesWithBase) {
      const match = q.quotationNumber.match(copyPattern)
      if (match) {
        const copyNum = parseInt(match[1], 10)
        if (copyNum > maxCopyNum) {
          maxCopyNum = copyNum
        }
      }
    }

    const nextCopyNum = maxCopyNum + 1
    const newQuotationNumber = `${sourceNumber} Copy ${nextCopyNum}`
    const rootId = sourceQuotation.parentId || sourceQuotation.id

    // Create copy quotation and items in database
    const newQuotation = await prisma.quotation.create({
      data: {
        quotationNumber: newQuotationNumber,
        parentId: rootId,
        customerSegment: sourceQuotation.customerSegment,
        clientId: sourceQuotation.clientId,
        projectId: sourceQuotation.projectId,
        projectName: sourceQuotation.projectName,
        date: new Date(),
        validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        preparedById: sourceQuotation.preparedById || userId,
        deliveryDate: sourceQuotation.deliveryDate,
        paymentTerms: sourceQuotation.paymentTerms,
        status: "DRAFT",
        revisionNumber: sourceQuotation.revisionNumber,
        poStatus: "PENDING",
        paymentStatus: "UNPAID",
        subtotal: sourceQuotation.subtotal,
        discount: sourceQuotation.discount,
        deliveryCharge: sourceQuotation.deliveryCharge,
        vatAmount: sourceQuotation.vatAmount,
        grandTotal: sourceQuotation.grandTotal,
        specialDiscountType: sourceQuotation.specialDiscountType,
        specialDiscountValue: sourceQuotation.specialDiscountValue,
        specialDiscountReason: sourceQuotation.specialDiscountReason,
        vatMode: sourceQuotation.vatMode,
        additionalCharges: sourceQuotation.additionalCharges as any,
        notes: sourceQuotation.notes ? `[Copied from ${sourceNumber}] ${sourceQuotation.notes}` : `Copied from ${sourceNumber}`,
        disclaimerTitle: sourceQuotation.disclaimerTitle,
        disclaimer: sourceQuotation.disclaimer,
        commonRemark: sourceQuotation.commonRemark,
        commonRemarkHighlight: sourceQuotation.commonRemarkHighlight,
        termsConditions: sourceQuotation.termsConditions,
        salesAgentId: sourceQuotation.salesAgentId,
        salesAgentName: sourceQuotation.salesAgentName,
        salesAgentContactNumber: sourceQuotation.salesAgentContactNumber,
        salesAgentTitle: sourceQuotation.salesAgentTitle,
        salesAgentEmail: sourceQuotation.salesAgentEmail,
        items: {
          create: sourceQuotation.items.map((item) => ({
            itemNo: item.itemNo,
            sortOrder: item.sortOrder,
            productId: item.productId,
            description: item.description,
            specifications: item.specifications,
            productNotes: item.productNotes,
            customImageUrl: item.customImageUrl,
            productDescription: item.productDescription,
            categoryName: item.categoryName,
            chairType: item.chairType,
            batchHeading: item.batchHeading,
            quantity: item.quantity,
            basePrice: item.basePrice,
            unitPrice: item.unitPrice,
            discount: item.discount,
            margin: item.margin,
            amount: item.amount,
          })),
        },
      },
      include: {
        client: true,
        items: true,
      },
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: "CREATED_QUOTATION_COPY",
        entityType: "QUOTATION",
        entityId: newQuotation.id,
        details: `Created quotation copy ${newQuotation.quotationNumber} from source ${sourceNumber} for client ${sourceQuotation.client.companyName}`,
      },
    })

    return NextResponse.json(newQuotation)
  } catch (error: any) {
    console.error("POST /api/quotations/[id]/copy failed:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to create quotation copy" },
      { status: 500 }
    )
  }
}
