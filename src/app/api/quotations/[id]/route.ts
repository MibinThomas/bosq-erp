import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { uploadQuotationPdf } from "@/lib/sharepoint"
import { QuotationDocument } from "@/lib/pdf/QuotationDocument"
import fs from "fs"
import path from "path"
import { getSettings } from "@/lib/settings"

// Get single quotation with items and revisions history
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
        revisions: {
          orderBy: { revisionNumber: "desc" }
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

// Update quotation status OR process a full revision
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const existingQuotation = await prisma.quotation.findFirst({
      where: {
        OR: [
          { id: id },
          { quotationNumber: id }
        ]
      },
      include: {
        client: true,
        items: true,
      }
    })

    if (!existingQuotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      )
    }

    // Default user for logs
    const defaultUser = await prisma.user.findFirst({
      where: { role: "SALES_EXECUTIVE" },
    })
    const logUserId = defaultUser?.id || ""

    // CASE 1: FULL REVISION REQUEST
    if (body.isRevision === true) {
      const {
        items,
        projectName,
        deliveryDate,
        paymentTerms,
        deliveryCharge,
        notes,
        revisionNotes,
      } = body

      if (!items || items.length === 0) {
        return NextResponse.json(
          { error: "Items array is required to revise quotation" },
          { status: 400 }
        )
      }

      // Prefetch products catalog details to render image & category inside the PDF
      const productIds = items.map((i: any) => i.productId).filter(Boolean)
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { category: true }
      })

      // Calculate new financial totals
      let calculatedSubtotal = 0
      const quotationItemsToCreate = items.map((item: any, idx: number) => {
        const qty = parseInt(item.quantity) || 1
        const price = parseFloat(item.unitPrice) || 0
        const disc = parseFloat(item.discount) || 0
        const amt = (price - disc) * qty
        calculatedSubtotal += amt

        const matchedProd = dbProducts.find((p) => p.id === item.productId)

        return {
          itemNo: idx + 1,
          productId: item.productId || null,
          description: item.description,
          specifications: item.specifications || "",
          quantity: qty,
          unitPrice: price,
          discount: disc,
          amount: amt,
          imageUrl: matchedProd?.imageUrl || null,
          categoryName: matchedProd?.category?.name || "OFFICE FURNITURE",
        }
      })

      const calculatedVat = calculatedSubtotal * 0.05
      const charge = parseFloat(deliveryCharge) || 0
      const calculatedGrandTotal = calculatedSubtotal + calculatedVat + charge

      // Fetch Terms & Conditions
      const dbTerms = await prisma.termsCondition.findMany({
        where: { isDefault: true },
      })
      const termsArray = dbTerms.map((t) => `${t.title}: ${t.content}`)
      if (termsArray.length === 0) {
        termsArray.push(
          "Validity: This quotation is valid for 30 days from date of issue.",
          "Delivery: Delivery within 4-6 weeks of order approval.",
          "Warranty: All structural elements carry a 5-year warranty."
        )
      }

      // Read logo to base64
      let logoBase64 = ""
      try {
        const logoPath = path.join(process.cwd(), "public", "assets", "logo", "logo.png")
        if (fs.existsSync(logoPath)) {
          const fileBuffer = fs.readFileSync(logoPath)
          logoBase64 = `data:image/png;base64,${fileBuffer.toString("base64")}`
        }
      } catch (logoErr) {
        console.error("Failed to read logo buffer in revision:", logoErr)
      }

      const nextRevNo = existingQuotation.revisionNumber + 1

      const companySettings = await getSettings([
        "company_name",
        "company_address",
        "company_trn"
      ])

      // Construct Revised PDF props (e.g. quote number I1951-R1)
      const pdfProps = {
        quotationNumber: `${existingQuotation.quotationNumber}-R${nextRevNo}`,
        date: new Date().toISOString().split("T")[0],
        validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        companyName: companySettings.company_name,
        companyAddress: companySettings.company_address,
        companyTrn: companySettings.company_trn,
        clientName: existingQuotation.client.companyName,
        clientContact: existingQuotation.client.contactPerson || "Valued Customer",
        clientPhone: existingQuotation.client.phone || "",
        clientEmail: existingQuotation.client.email || "",
        clientAddress: existingQuotation.client.address || "Dubai, UAE",
        clientTrn: existingQuotation.client.trn,
        projectName: projectName || existingQuotation.projectName || "Office Furnishing Project",
        paymentTerms: paymentTerms || existingQuotation.paymentTerms,
        deliveryDate: deliveryDate || "TBD",
        subtotal: calculatedSubtotal,
        vatAmount: calculatedVat,
        deliveryCharge: charge,
        grandTotal: calculatedGrandTotal,
        preparedBy: defaultUser?.name || "Sales Rep",
        termsConditions: termsArray,
        companyLogoUrl: logoBase64 || null,
        items: quotationItemsToCreate,
      }

      let pdfBuffer: Buffer
      try {
        pdfBuffer = await renderToBuffer(
          React.createElement(QuotationDocument, pdfProps) as any
        )
      } catch (pdfError) {
        console.error("Failed to compile revised PDF buffer:", pdfError)
        return NextResponse.json(
          { error: "Failed to generate revised PDF document" },
          { status: 500 }
        )
      }

      // Upload revised PDF to SharePoint
      let sharepointUrl = existingQuotation.sharepointUrl || ""
      try {
        sharepointUrl = await uploadQuotationPdf(
          existingQuotation.client.companyName,
          `${existingQuotation.quotationNumber}-R${nextRevNo}`,
          pdfBuffer
        )
      } catch (spError) {
        console.error("Failed to upload revised PDF to SharePoint:", spError)
      }

      // Execute atomic transaction for revision
      const updatedQuotation = await prisma.$transaction(async (tx) => {
        // 1. Create Revision log history
        await tx.quotationRevision.create({
          data: {
            quotationId: existingQuotation.id,
            revisionNumber: nextRevNo,
            previousTotal: existingQuotation.grandTotal,
            newTotal: calculatedGrandTotal,
            notes: revisionNotes || "Revised quotation details",
          }
        })

        // 2. Delete old items
        await tx.quotationItem.deleteMany({
          where: { quotationId: existingQuotation.id }
        })

        // 3. Insert new items
        await tx.quotationItem.createMany({
          data: quotationItemsToCreate.map((item: any) => ({
            quotationId: existingQuotation.id,
            productId: item.productId,
            itemNo: item.itemNo,
            description: item.description,
            specifications: item.specifications,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            amount: item.amount,
          }))
        })

        // 4. Update core Quotation fields
        return await tx.quotation.update({
          where: { id: existingQuotation.id },
          data: {
            revisionNumber: nextRevNo,
            projectName: projectName || null,
            deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
            paymentTerms,
            notes: notes || null,
            subtotal: calculatedSubtotal,
            vatAmount: calculatedVat,
            deliveryCharge: charge,
            grandTotal: calculatedGrandTotal,
            sharepointUrl,
            status: "REVISED",
          },
          include: {
            client: true,
            items: true,
            revisions: true,
          }
        })
      })

      // Log Activity
      if (logUserId) {
        await prisma.activityLog.create({
          data: {
            userId: logUserId,
            action: "REVISED_QUOTATION",
            entityType: "QUOTATION",
            entityId: updatedQuotation.id,
            details: `Revised quotation ${existingQuotation.quotationNumber} to Rev ${nextRevNo}. Notes: ${revisionNotes}`,
          },
        })
      }

      return NextResponse.json(updatedQuotation)
    }

    // CASE 2: NORMAL STATUS/NOTES UPDATE (PO RECEIVED, STATUS CHANGES, etc.)
    const { status, poStatus, paymentStatus, notes } = body
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
        revisions: true,
      }
    })

    // Log Activity
    if (logUserId) {
      await prisma.activityLog.create({
        data: {
          userId: logUserId,
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
