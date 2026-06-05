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
import sharp from "sharp"
import { resolveImageUrl } from "@/lib/pdf/resolveImage"
import { hasPermission } from "@/lib/rbac"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbSessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { permissionOverrides: { where: { module: "QUOTATIONS" } } }
    })

    if (!dbSessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check view permission dynamically
    const canView = await hasPermission(dbSessionUser.id, "QUOTATIONS", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view quotations" }, { status: 403 })
    }

    // Resolve ownership rule
    let ownershipRule = "ALL"
    if (dbSessionUser.role !== "SUPER_ADMIN") {
      const override = dbSessionUser.permissionOverrides.find(o => o.action === "ownership")
      if (override?.ownership) {
        ownershipRule = override.ownership
      } else {
        const roleObj = await prisma.role.findFirst({
          where: { name: dbSessionUser.role },
          include: { permissions: { where: { module: "QUOTATIONS" } } }
        })
        const rolePerm = roleObj?.permissions[0]
        if (rolePerm?.ownership) {
          ownershipRule = rolePerm.ownership
        }
      }
    }

    let whereClause: any = {
      status: { not: "REVISED" },
      deletedAt: null
    }

    if (ownershipRule === "OWN") {
      whereClause.preparedById = dbSessionUser.id
    } else if (ownershipRule === "DEPARTMENT") {
      const deptUsers = await prisma.user.findMany({
        where: { department: dbSessionUser.department || "N/A" },
        select: { id: true }
      })
      const deptUserIds = deptUsers.map(u => u.id)
      whereClause.preparedById = { in: deptUserIds }
    } else if (ownershipRule === "ASSIGNED") {
      whereClause.OR = [
        { preparedById: dbSessionUser.id },
        { salesAgentId: dbSessionUser.id }
      ]
    } else if (ownershipRule === "NONE") {
      return NextResponse.json({ data: [], totalCount: 0, totalPages: 0, currentPage: 1 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "50", 10)

    const totalCount = await prisma.quotation.count({ where: whereClause })

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        client: true,
        preparedBy: true,
      },
      orderBy: { quotationNumber: "desc" },
      skip: (page - 1) * limit,
      take: limit,
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

    return NextResponse.json({
      data: quotationsWithRevisions,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    })
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
      salesAgentId,
      salesAgentName,
      salesAgentContactNumber,
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
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbSessionUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!dbSessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canCreate = await hasPermission(dbSessionUser.id, "QUOTATIONS", "create")
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create quotations" }, { status: 403 })
    }

    let creatorUser = { id: "", name: "Sales Rep", role: "SALES_EXECUTIVE", phone: null as string | null }

    if (session.user) {
      const userRole = (session.user as any).role || "SALES_EXECUTIVE"
      let finalId = (session.user as any).id
      
      if ((userRole === "ADMIN" || userRole === "SALES_MANAGER") && body.preparedById) {
        finalId = body.preparedById
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: finalId }
      })

      if (dbUser) {
        creatorUser = {
          id: dbUser.id,
          name: dbUser.name || "Sales Rep",
          role: dbUser.role,
          phone: dbUser.phone
        }
      } else {
        creatorUser = {
          id: finalId,
          name: session.user.name || "Sales Rep",
          role: userRole,
          phone: null
        }
      }
    }

    // Determine resolved status dynamically based on approve permission
    const canApprove = await hasPermission(creatorUser.id, "QUOTATIONS", "approve")
    const resolvedStatus = canApprove ? "APPROVED" : "PENDING_APPROVAL"

    // 2. Generate quotation number (e.g. I2223-1)
    let nextQuoteNo = body.quotationNumber
    const segment = body.customerSegment || "Direct"
    
    if (!nextQuoteNo) {
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
      nextQuoteNo = `${prefix}${nextBaseNumber}`
    }

    // Read both brand logos to base64
    let logoBase64 = ""
    try {
      const logoPath = path.join(process.cwd(), "public", "assets", "logo", "BOSQ R LOGO.svg")
      if (fs.existsSync(logoPath)) {
        const fileBuffer = fs.readFileSync(logoPath)
        const pngBuffer = await sharp(fileBuffer).png().toBuffer()
        logoBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`
      }
    } catch (logoErr) {
      console.error("Failed to read logo buffer in create endpoint:", logoErr)
    }

    let watermarkBase64 = ""
    try {
      const watermarkPath = path.join(process.cwd(), "public", "assets", "logo", "Watermark.svg")
      if (fs.existsSync(watermarkPath)) {
        const fileBuffer = fs.readFileSync(watermarkPath)
        const pngBuffer = await sharp(fileBuffer).png().toBuffer()
        watermarkBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`
      }
    } catch (watermarkErr) {
      console.error("Failed to generate watermark in create endpoint:", watermarkErr)
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
    const quotationItemsToCreate = await Promise.all(items.map(async (item: any, idx: number) => {
      const qty = parseInt(item.quantity) || 1
      const price = parseFloat(item.unitPrice) || 0
      const disc = parseFloat(item.discount) || 0
      const marginVal = parseFloat(item.margin) || 0.0
      const amt = (price - disc) * qty
      calculatedSubtotal += amt

      const matchedProd = dbProducts.find((p) => p.id === item.productId)
      
      const rawImageUrl = item.customImageUrl || item.imageUrl || matchedProd?.imageUrl || null;
      const resolvedImage = await resolveImageUrl(rawImageUrl);

      return {
        itemNo: idx + 1,
        productId: item.productId || null,
        description: item.description,
        specifications: item.specifications || "",
        productNotes: item.productNotes || null,
        customImageUrl: item.customImageUrl || null,
        quantity: qty,
        basePrice: parseFloat(item.basePrice) || price, // locked segment base price
        unitPrice: price,
        discount: disc,
        margin: marginVal,
        amount: amt,
        imageUrl: resolvedImage,
        categoryName: matchedProd?.category?.name || "OFFICE FURNITURE",
        chairType: matchedProd?.chairType || null,
      }
    }))

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
      preparedByContact: creatorUser.phone,
      salesAgentName: salesAgentName || null,
      termsConditions: termsArray,
      companyLogoUrl: logoBase64 || null,
      aynMuskLogoUrl: aynMuskLogoBase64 || null,
      barcodeBase64: barcodeBase64 || null,
      watermarkUrl: watermarkBase64 || null,
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
        salesAgentId: salesAgentId || null,
        salesAgentName: salesAgentName || null,
        salesAgentContactNumber: salesAgentContactNumber || null,
        items: {
          create: quotationItemsToCreate.map((item: any) => ({
            itemNo: item.itemNo,
            productId: item.productId,
            description: item.description,
            specifications: item.specifications,
            productNotes: item.productNotes,
            customImageUrl: item.imageUrl,
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

    // Notify Managers/Admins
    const managers = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "SALES_MANAGER"] },
        isActive: true,
        id: { not: creatorUser.id }
      }
    })

    if (managers.length > 0) {
      await prisma.notification.createMany({
        data: managers.map(mgr => ({
          userId: mgr.id,
          title: resolvedStatus === "PENDING_APPROVAL" ? "Quotation Pending Approval" : "New Quotation Created",
          message: `Quotation ${nextQuoteNo} for ${clientObj.companyName} was created by ${creatorUser.name || 'a user'}.`,
          type: "QUOTATION_UPDATE",
          link: `/quotations` // Could link to specific quotation if there's a view page
        }))
      })
    }

    return NextResponse.json(newQuotation, { status: 201 })
  } catch (error) {
    console.error("Failed to create quotation:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
