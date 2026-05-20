import { NextResponse } from "next/server"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../auth/[...nextauth]/route"
import { QuotationDocument } from "@/lib/pdf/QuotationDocument"
import fs from "fs"
import path from "path"
import { getSettings } from "@/lib/settings"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Read both brand logos to base64
    let logoBase64 = ""
    try {
      const logoPath = path.join(process.cwd(), "public", "assets", "logo", "bosq logo.jpg")
      if (fs.existsSync(logoPath)) {
        const fileBuffer = fs.readFileSync(logoPath)
        logoBase64 = `data:image/jpeg;base64,${fileBuffer.toString("base64")}`
      }
    } catch (logoErr) {
      console.error("Failed to read logo buffer:", logoErr)
    }

    let aynMuskLogoBase64 = ""
    try {
      const aynMuskLogoPath = path.join(process.cwd(), "public", "assets", "logo", "AYN Musk_PNG.png")
      if (fs.existsSync(aynMuskLogoPath)) {
        const fileBuffer = fs.readFileSync(aynMuskLogoPath)
        aynMuskLogoBase64 = `data:image/png;base64,${fileBuffer.toString("base64")}`
      }
    } catch (aynMuskErr) {
      console.error("Failed to read AYN Musk logo buffer:", aynMuskErr)
    }

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
        items: {
          orderBy: { itemNo: "asc" },
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        },
        preparedBy: true,
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

    if (userRole === "SALES_EXECUTIVE") {
      if (quotation.preparedById !== userId) {
        return new Response("Unauthorized access to this quotation", { status: 403 })
      }
      if (quotation.status === "PENDING_APPROVAL") {
        return new Response("Download is disabled pending manager approval", { status: 403 })
      }
    }

    // Generate barcode image dynamically
    let barcodeBase64 = ""
    try {
      const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(quotation.quotationNumber)}&scale=2&rotate=N&includetext=false`
      const res = await fetch(barcodeUrl)
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer()
        barcodeBase64 = `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`
      }
    } catch (barcodeErr) {
      console.error("Failed to generate barcode:", barcodeErr)
    }

    // Get Terms & Conditions
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

    // Convert items format for QuotationDocument
    const docItems = quotation.items.map((item) => ({
      itemNo: item.itemNo,
      description: item.description,
      specifications: item.specifications,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      amount: item.amount,
      imageUrl: item.customImageUrl || item.product?.imageUrl || null,
      categoryName: item.product?.category?.name || "OFFICE FURNITURE",
    }))

    const companySettings = await getSettings([
      "company_name",
      "company_address",
      "company_trn"
    ])

    // Construct PDF props
    const pdfProps = {
      quotationNumber: quotation.quotationNumber,
      date: quotation.date.toISOString().split("T")[0],
      validityDate: quotation.validityDate.toISOString().split("T")[0],
      companyName: companySettings.company_name,
      companyAddress: companySettings.company_address,
      companyTrn: companySettings.company_trn,
      clientName: quotation.client.companyName,
      clientContact: quotation.client.contactPerson || "Valued Customer",
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
      preparedBy: quotation.preparedBy.name || "Sales Executive",
      termsConditions: termsArray,
      companyLogoUrl: logoBase64 || null,
      aynMuskLogoUrl: aynMuskLogoBase64 || null,
      barcodeBase64: barcodeBase64 || null,
      clientId: quotation.client.clientId || null,
      items: docItems,
    }

    // Compile PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(QuotationDocument, pdfProps) as any
    )

    const sanitizedClientName = quotation.client.companyName.replace(/[\/\\:\*\?"<>\|]/g, "").trim()
    const filename = `${quotation.quotationNumber}_${sanitizedClientName}.pdf`

    // Return PDF Stream
    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Failed to generate PDF for download:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
