import { NextResponse } from "next/server"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import prisma from "@/lib/prisma"
import { uploadQuotationPdf } from "@/lib/sharepoint"
import { QuotationDocument } from "@/lib/pdf/QuotationDocument"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    const quotations = await prisma.quotation.findMany({
      include: {
        client: true,
        preparedBy: true,
      },
      orderBy: { quotationNumber: "desc" },
    })
    return NextResponse.json(quotations)
  } catch (error) {
    console.error("Failed to fetch quotations:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      clientId,
      projectName,
      date,
      validityDate,
      deliveryDate,
      paymentTerms,
      items,
      deliveryCharge,
      notes,
      status, // DRAFT, SENT, etc.
    } = body

    if (!clientId || !items || items.length === 0 || !paymentTerms) {
      return NextResponse.json(
        { error: "Client, payment terms, and items are required" },
        { status: 400 }
      )
    }

    // 1. Fetch Client and default salesperson
    const clientObj = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!clientObj) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const defaultUser = await prisma.user.findFirst({
      where: { role: "SALES_EXECUTIVE" },
    })

    if (!defaultUser) {
      return NextResponse.json(
        { error: "No system user found. Please seed the database first." },
        { status: 500 }
      )
    }

    // 2. Generate quotation number (e.g. I1952)
    const lastQuote = await prisma.quotation.findFirst({
      orderBy: { quotationNumber: "desc" },
    })

    let nextQuoteNo = "I1951"
    if (lastQuote && lastQuote.quotationNumber.startsWith("I")) {
      const lastNum = parseInt(lastQuote.quotationNumber.replace("I", ""), 10)
      if (!isNaN(lastNum)) {
        nextQuoteNo = `I${lastNum + 1}`
      }
    }

    // Read brand logo to base64
    let logoBase64 = ""
    try {
      const logoPath = path.join(process.cwd(), "public", "assets", "logo", "logo.png")
      if (fs.existsSync(logoPath)) {
        const fileBuffer = fs.readFileSync(logoPath)
        logoBase64 = `data:image/png;base64,${fileBuffer.toString("base64")}`
      }
    } catch (logoErr) {
      console.error("Failed to read logo buffer in create endpoint:", logoErr)
    }

    // Prefetch products catalog details to render image & category inside the PDF
    const productIds = items.map((i: any) => i.productId).filter(Boolean)
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true }
    })

    // 3. Calculate financial totals
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

    // 4. Get Default Terms & Conditions for the PDF
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

    // 5. Generate PDF server-side using @react-pdf/renderer
    const pdfProps = {
      quotationNumber: nextQuoteNo,
      date: date || new Date().toISOString().split("T")[0],
      validityDate: validityDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      companyName: "BOSQ Office Furniture",
      companyAddress: "Dubai Design District, Dubai, UAE",
      companyTrn: "100012345678903",
      clientName: clientObj.companyName,
      clientContact: clientObj.contactPerson || "Valued Customer",
      clientPhone: clientObj.phone || "",
      clientEmail: clientObj.email || "",
      clientAddress: clientObj.address || "Dubai, UAE",
      clientTrn: clientObj.trn,
      projectName: projectName || "Office Furnishing Project",
      paymentTerms,
      deliveryDate: deliveryDate || "TBD",
      subtotal: calculatedSubtotal,
      vatAmount: calculatedVat,
      deliveryCharge: charge,
      grandTotal: calculatedGrandTotal,
      preparedBy: defaultUser.name || "Sales Manager",
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
      console.error("Failed to compile React PDF Document:", pdfError)
      return NextResponse.json(
        { error: "Failed to generate quotation PDF" },
        { status: 500 }
      )
    }

    // 6. Upload PDF to SharePoint folder
    let sharepointUrl = ""
    try {
      sharepointUrl = await uploadQuotationPdf(
        clientObj.companyName,
        nextQuoteNo,
        pdfBuffer
      )
    } catch (spError) {
      console.error("Failed to upload PDF to SharePoint:", spError)
      // Fallback url
      sharepointUrl = `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(
        clientObj.companyName
      )}/Quotations/${nextQuoteNo}.pdf`
    }

    // 7. Save Quotation and Items in Database
    const newQuotation = await prisma.quotation.create({
      data: {
        quotationNumber: nextQuoteNo,
        clientId: clientObj.id,
        projectName: projectName || null,
        date: date ? new Date(date) : new Date(),
        validityDate: validityDate ? new Date(validityDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        preparedById: defaultUser.id,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        paymentTerms,
        status: status || "SENT",
        subtotal: calculatedSubtotal,
        discount: 0.0,
        deliveryCharge: charge,
        vatAmount: calculatedVat,
        grandTotal: calculatedGrandTotal,
        sharepointUrl,
        notes: notes || null,
        items: {
          create: quotationItemsToCreate.map((item: any) => ({
            itemNo: item.itemNo,
            productId: item.productId,
            description: item.description,
            specifications: item.specifications,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
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
        userId: defaultUser.id,
        action: "CREATED_QUOTATION",
        entityType: "QUOTATION",
        entityId: newQuotation.id,
        details: `Created quotation ${nextQuoteNo} for client ${clientObj.companyName} with amount AED ${calculatedGrandTotal.toFixed(2)}`,
      },
    })

    return NextResponse.json(newQuotation, { status: 201 })
  } catch (error) {
    console.error("Failed to create quotation:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
