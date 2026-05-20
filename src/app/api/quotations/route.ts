import { NextResponse } from "next/server"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import prisma from "@/lib/prisma"
import { uploadQuotationPdf } from "@/lib/sharepoint"
import { QuotationDocument } from "@/lib/pdf/QuotationDocument"
import fs from "fs"
import path from "path"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getSettings } from "@/lib/settings"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    let whereClause: any = {
      status: { not: "REVISED" }
    }
    if (session?.user && (session.user as any).role === "SALES_EXECUTIVE") {
      whereClause.preparedById = (session.user as any).id
    }

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        client: true,
        preparedBy: true,
      },
      orderBy: { quotationNumber: "desc" },
    })

    const quotationsWithRevisions = await Promise.all(
      quotations.map(async (quote) => {
        const rootId = quote.parentId || quote.id
        const revisions = await prisma.quotationRevision.findMany({
          where: { quotationId: rootId },
          orderBy: { revisionNumber: "desc" }
        })
        return {
          ...quote,
          revisions
        }
      })
    )

    return NextResponse.json(quotationsWithRevisions)
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
      status, // DRAFT, SENT, etc. — may be overridden below based on role
    } = body

    if (!clientId || !items || items.length === 0 || !paymentTerms) {
      return NextResponse.json(
        { error: "Client, payment terms, and items are required" },
        { status: 400 }
      )
    }

    // 1. Fetch Client and check access session
    const clientObj = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!clientObj) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const session = await getServerSession(authOptions)
    let creatorUser = { id: "", name: "Sales Rep", role: "SALES_EXECUTIVE" }

    if (session?.user) {
      creatorUser = {
        id: (session.user as any).id,
        name: session.user.name || "Sales Rep",
        role: (session.user as any).role || "SALES_EXECUTIVE",
      }
    } else {
      const defaultUser = await prisma.user.findFirst({
        where: { role: "SALES_EXECUTIVE" },
      })
      if (!defaultUser) {
        return NextResponse.json(
          { error: "No system user found. Please seed the database first." },
          { status: 500 }
        )
      }
      creatorUser = {
        id: defaultUser.id,
        name: defaultUser.name || "Sales Manager",
        role: defaultUser.role,
      }
    }

    // IDCs (SALES_EXECUTIVE) must go through approval for all items before PDF is downloadable
    const isIDC = creatorUser.role === "SALES_EXECUTIVE"
    const resolvedStatus = isIDC ? "PENDING_APPROVAL" : "APPROVED"

    // 2. Generate quotation number (e.g. I2223-1)
    const segment = body.customerSegment || "Direct"
    let prefix = "P"
    if (segment === "Interior") prefix = "I"
    else if (segment === "Dealer") prefix = "D"
    else if (segment === "Direct" || segment === "Online") prefix = "P"

    const allQuotes = await prisma.quotation.findMany({
      select: { quotationNumber: true }
    })

    let maxNumber = 2222
    for (const q of allQuotes) {
      const match = q.quotationNumber.match(/^[IDP](\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNumber) {
          maxNumber = num
        }
      }
    }

    const nextBaseNumber = maxNumber + 1
    const nextQuoteNo = `${prefix}${nextBaseNumber}-1`

    // Read both brand logos to base64
    let logoBase64 = ""
    try {
      const logoPath = path.join(process.cwd(), "public", "assets", "logo", "bosq-orange-bg-reg.png")
      if (fs.existsSync(logoPath)) {
        const fileBuffer = fs.readFileSync(logoPath)
        logoBase64 = `data:image/png;base64,${fileBuffer.toString("base64")}`
      }
    } catch (logoErr) {
      console.error("Failed to read logo buffer in create endpoint:", logoErr)
    }

    let aynMuskLogoBase64 = ""
    try {
      const aynMuskLogoPath = path.join(process.cwd(), "public", "assets", "logo", "AYN Musk_PNG.png")
      if (fs.existsSync(aynMuskLogoPath)) {
        const fileBuffer = fs.readFileSync(aynMuskLogoPath)
        aynMuskLogoBase64 = `data:image/png;base64,${fileBuffer.toString("base64")}`
      }
    } catch (aynMuskErr) {
      console.error("Failed to read AYN Musk logo buffer in create endpoint:", aynMuskErr)
    }

    // Generate barcode image dynamically
    let barcodeBase64 = ""
    try {
      const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(nextQuoteNo)}&scale=2&rotate=N&includetext=false`
      const res = await fetch(barcodeUrl)
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer()
        barcodeBase64 = `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`
      }
    } catch (barcodeErr) {
      console.error("Failed to generate barcode in creation:", barcodeErr)
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
      const marginVal = parseFloat(item.margin) || 0.0
      const amt = (price - disc) * qty
      calculatedSubtotal += amt

      const matchedProd = dbProducts.find((p) => p.id === item.productId)

      return {
        itemNo: idx + 1,
        productId: item.productId || null,
        description: item.description,
        specifications: item.specifications || "",
        quantity: qty,
        basePrice: parseFloat(item.basePrice) || price, // locked segment base price
        unitPrice: price,
        discount: disc,
        margin: marginVal,
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

    const companySettings = await getSettings([
      "company_name",
      "company_address",
      "company_trn"
    ])

    // 5. Generate PDF server-side using @react-pdf/renderer
    const pdfProps = {
      quotationNumber: nextQuoteNo,
      date: date || new Date().toISOString().split("T")[0],
      validityDate: validityDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      companyName: companySettings.company_name,
      companyAddress: companySettings.company_address,
      companyTrn: companySettings.company_trn,
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
      preparedBy: creatorUser.name,
      termsConditions: termsArray,
      companyLogoUrl: logoBase64 || null,
      aynMuskLogoUrl: aynMuskLogoBase64 || null,
      barcodeBase64: barcodeBase64 || null,
      clientId: clientObj.clientId || null,
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
    const sanitizedClientNameForFile = clientObj.companyName.replace(/[\/\\:\*\?"<>\|]/g, "").trim()
    const filenameBase = `${nextQuoteNo}_${sanitizedClientNameForFile}`
    let sharepointUrl = ""
    try {
      sharepointUrl = await uploadQuotationPdf(
        clientObj.companyName,
        filenameBase,
        pdfBuffer
      )
    } catch (spError) {
      console.error("Failed to upload PDF to SharePoint:", spError)
      // Fallback url
      sharepointUrl = `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(
        clientObj.companyName
      )}/Quotations/${filenameBase}.pdf`
    }

    // 7. Save Quotation and Items in Database
    const newQuotation = await prisma.quotation.create({
      data: {
        quotationNumber: nextQuoteNo,
        customerSegment: segment,
        clientId: clientObj.id,
        projectName: projectName || null,
        date: date ? new Date(date) : new Date(),
        validityDate: validityDate ? new Date(validityDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        preparedById: creatorUser.id,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        paymentTerms,
        status: resolvedStatus,
        revisionNumber: 1,
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
        userId: creatorUser.id,
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
