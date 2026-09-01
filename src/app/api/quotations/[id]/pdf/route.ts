import { NextResponse } from "next/server"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { QuotationDocument } from "@/lib/pdf/QuotationDocument"
import fs from "fs"
import path from "path"
import { getSettings } from "@/lib/settings"
import { resolveImageUrl } from "@/lib/pdf/resolveImage"
import { getLogoBase64, getWatermarkBase64, getAynMuskLogoBase64, getPromotionalImageBase64, getCompanySealBase64 } from "@/lib/pdf/logoCache"
import { generateCode128DataUri } from "@/lib/pdf/barcode"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const logoBase64 = await getLogoBase64()
    const aynMuskLogoBase64 = await getAynMuskLogoBase64()
    const companySealBase64 = await getCompanySealBase64()
    const watermarkBase64 = await getWatermarkBase64()
    const promotionalImageBase64 = await getPromotionalImageBase64()
    const systemSettings = await getSettings(["company_bank_details", "company_disclaimer_title", "company_disclaimer"])

    // Fetch the quotation with all relations
    const quotation = await prisma.quotation.findFirst({
      where: {
        OR: [
          { id: id },
          { quotationNumber: id }
        ]
      },
      include: {
        client: true,
        preparedBy: true,
        items: {
          orderBy: [
            { sortOrder: "asc" },
            { itemNo: "asc" }
          ],
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      },
    })

    if (!quotation) {
      return new Response("Quotation not found", { status: 404 })
    }

    const session = await getServerSession(authOptions)
    if (!session) {
      return new Response("Unauthorized", { status: 401 })
    }

    const userRole = (session.user as any).role
    const userId = (session.user as any).id

    const { searchParams } = new URL(request.url)
    const isPreview = searchParams.get("preview") === "true"

    if (!isPreview && quotation.status === "DRAFT") {
      return new Response("Downloading draft quotations is disabled. Downloads are only available once a quotation is created, submitted, or approved.", { status: 403 })
    }

    const isUnrestricted = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(userRole)
    if (!isUnrestricted) {
      let hasAccess = false
      if (quotation.preparedById === userId || quotation.salesAgentId === userId) {
        hasAccess = true
      } else {
        const quotationAssignment = await prisma.quotationAssignment.findFirst({
          where: { quotationId: quotation.id, userId: userId }
        })
        if (quotationAssignment) {
          hasAccess = true
        } else {
          const clientAssignment = await prisma.clientAssignment.findFirst({
            where: { clientId: quotation.clientId, userId: userId }
          })
          if (clientAssignment) {
            hasAccess = true
          }
          if (!hasAccess && quotation.client.salespersonId === userId) {
            hasAccess = true
          }
          if (!hasAccess) {
            const hasApprovedRequest = await prisma.clientAccessRequest.findFirst({
              where: { clientId: quotation.clientId, userId: userId, status: "Approved" }
            })
            if (hasApprovedRequest) {
              hasAccess = true
            }
          }
        }
      }

      if (!hasAccess) {
        return new Response("Unauthorized access to this quotation", { status: 403 })
      }
    }

    // Generate barcode image dynamically
    const cleanQuotationNum = (quotation.quotationNumber || "").replace(/\s+Copy.*$/gi, "").trim()
    const barcodeBase64 = generateCode128DataUri(cleanQuotationNum)


    // Get Terms & Conditions
    let termsArray: string[] = []
    if (quotation.termsConditions) {
      try {
        const parsed = JSON.parse(quotation.termsConditions)
        if (Array.isArray(parsed) && parsed.length > 0) {
          termsArray = parsed.map(t => typeof t === "string" ? t : `${t.title ? t.title + ": " : ""}${t.content || ""}`.trim())
        }
      } catch (e) {
        if (typeof quotation.termsConditions === "string" && quotation.termsConditions.trim()) {
          termsArray = quotation.termsConditions.split("\n").map(s => s.trim()).filter(Boolean)
        }
      }
    }

    if (termsArray.length === 0) {
      const dbTerms = await prisma.termsCondition.findMany({
        where: { isDefault: true },
      })
      termsArray = dbTerms.map((t) => `${t.title}: ${t.content}`)
    }

    if (termsArray.length === 0) {
      termsArray = [
        "Validity: This quotation is valid for 30 days from date of issue.",
        "Delivery: Delivery within 4-6 weeks of order approval.",
        "Warranty: All structural elements carry a 5-year warranty."
      ]
    }

    // Convert items format for QuotationDocument
    const rawDocItems = await Promise.all(quotation.items.map(async (item) => ({
      itemNo: item.itemNo,
      description: item.description,
      productDescription: item.productDescription || item.product?.description || null,
      specifications: item.specifications,
      productNotes: item.productNotes,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      amount: item.amount,
      imageUrl: await resolveImageUrl(item.customImageUrl || item.product?.imageUrl),
      categoryName: item.categoryName || item.product?.category?.name || "OFFICE FURNITURE",
      chairType: item.chairType || item.product?.chairType || null,
      dimensions: item.product?.dimensions || null,
      warranty: item.product?.warranty || null,
      batchHeading: item.batchHeading || null,
    })))

    // Deduplicate / merge identical items
    const docItems: typeof rawDocItems = []
    rawDocItems.forEach((item) => {
      const itemKey = `${(item.batchHeading || "").trim().toLowerCase()}|${(item.description || "").trim().toLowerCase()}|${item.unitPrice}|${(item.specifications || "").trim()}|${(item.productDescription || "").trim().toLowerCase()}`
      const existingIdx = docItems.findIndex((d) => {
        const dKey = `${(d.batchHeading || "").trim().toLowerCase()}|${(d.description || "").trim().toLowerCase()}|${d.unitPrice}|${(d.specifications || "").trim()}|${(d.productDescription || "").trim().toLowerCase()}`
        return dKey === itemKey
      })

      if (existingIdx > -1) {
        const existing = docItems[existingIdx]
        const mergedQty = existing.quantity + item.quantity
        const mergedAmt = existing.amount + item.amount
        docItems[existingIdx] = {
          ...existing,
          quantity: mergedQty,
          amount: mergedAmt,
        }
      } else {
        docItems.push({ ...item })
      }
    })

    const companySettings = await getSettings([
      "company_name",
      "company_address",
      "company_trn"
    ])

    // Process selectedMaterials swatches for PDF
    const rawSelectedMaterials = Array.isArray((quotation as any).selectedMaterials)
      ? (quotation as any).selectedMaterials
      : []

    const docSelectedMaterials = await Promise.all(
      rawSelectedMaterials.map(async (mat: any) => ({
        ...mat,
        swatchUrl: mat.swatchUrl ? await resolveImageUrl(mat.swatchUrl) : null,
        referenceImageUrl: mat.referenceImageUrl ? await resolveImageUrl(mat.referenceImageUrl) : null,
      }))
    )

    // Construct PDF props
    const pdfProps = {
      quotationNumber: cleanQuotationNum,
      date: quotation.date.toISOString().split("T")[0],
      validityDate: quotation.validityDate.toISOString().split("T")[0],
      companyName: companySettings.company_name,
      companyAddress: companySettings.company_address,
      companyTrn: companySettings.company_trn,
      clientName: quotation.client.companyName,
      clientContact: quotation.client.contactPerson || "-",
      clientPhone: quotation.client.phone || "",
      clientEmail: quotation.client.email || "",
      clientAddress: quotation.client.address || "Dubai, UAE",
      clientTrn: quotation.client.trn,
      projectName: quotation.projectName || "Office Furnishing Project",
      paymentTerms: quotation.paymentTerms || "50% Advance, 50% on Delivery",
      deliveryDate: quotation.deliveryDate ? quotation.deliveryDate.toISOString().split("T")[0] : "TBD",
      subtotal: quotation.subtotal,
      vatAmount: quotation.vatAmount,
      deliveryCharge: quotation.deliveryCharge,
      grandTotal: quotation.grandTotal,
      preparedBy: quotation.preparedBy?.name || "Sales Executive",
      preparedByContact: quotation.preparedBy?.phone || null,
      preparedByEmail: quotation.preparedBy?.email || null,
      preparedByDesignation: quotation.preparedBy?.designation || null,
      preparedByRole: quotation.preparedBy?.role || null,
      preparedBySignatureUrl: quotation.preparedBy?.signature || null,
      includeSalesAgent: (quotation as any).includeSalesAgent ?? false,
      includeCompanySeal: (quotation as any).includeCompanySeal ?? true,
      includeCategoryName: (quotation as any).includeCategoryName ?? true,
      includeSectionHeadings: (quotation as any).includeSectionHeadings ?? true,
      includeMaterialsFinishes: !!((quotation as any).includeMaterialsFinishes),
      selectedMaterials: docSelectedMaterials,
      salesAgentName: (quotation as any).includeSalesAgent ? (quotation.salesAgentName || null) : null,
      salesAgentTitle: (quotation as any).includeSalesAgent ? ((quotation as any).salesAgentTitle || null) : null,
      salesAgentEmail: (quotation as any).includeSalesAgent ? ((quotation as any).salesAgentEmail || null) : null,
      salesAgentContactNumber: (quotation as any).includeSalesAgent ? ((quotation as any).salesAgentContactNumber || null) : null,
      termsConditions: termsArray,
      companyLogoUrl: logoBase64 || null,
      aynMuskLogoUrl: aynMuskLogoBase64 || null,
      companySealUrl: companySealBase64 || null,
      barcodeBase64: barcodeBase64 || null,
      watermarkUrl: watermarkBase64 || null,
      promotionalImageUrl: promotionalImageBase64,
      bankDetails: systemSettings.company_bank_details || null,
      disclaimerTitle: quotation.disclaimerTitle || systemSettings.company_disclaimer_title || "Disclaimers",
      disclaimer: quotation.disclaimer || systemSettings.company_disclaimer || null,
      clientId: quotation.client?.clientId || (quotation as any).clientId || null,
      items: docItems,
      vatMode: (quotation.vatMode === "INCLUDING" ? "INCLUDING" : "EXCLUDING") as "EXCLUDING" | "INCLUDING",
      specialDiscountType: (quotation.specialDiscountType === "PERCENTAGE" ? "PERCENTAGE" : quotation.specialDiscountType === "FIXED" ? "FIXED" : null) as "PERCENTAGE" | "FIXED" | null,
      specialDiscountValue: quotation.specialDiscountValue || 0,
      specialDiscountReason: quotation.specialDiscountReason || null,
      discount: quotation.discount || 0,
      additionalCharges: (quotation.additionalCharges as any) || [],
      commonRemark: quotation.commonRemark || null,
      commonRemarkHighlight: !!quotation.commonRemarkHighlight,
      commonRemarkStyle: quotation.commonRemarkStyle || "AMBER",
      status: quotation.status,
    }

    // Compile PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(QuotationDocument, pdfProps) as any
    )

    const sanitizedClientName = quotation.client.companyName.replace(/[\/\\:\*\?"<>\|]/g, "").trim()
    const filename = quotation.status === "CLIENT_APPROVED"
      ? `${cleanQuotationNum}_ClientApproved_${sanitizedClientName}.pdf`
      : `${cleanQuotationNum}_${sanitizedClientName}.pdf`

    // Return PDF Stream
    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    })
  } catch (error) {
    console.error("Failed to generate PDF for download:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
