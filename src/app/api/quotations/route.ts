import { NextResponse } from "next/server"
// Force turbopack recompile
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
import { resolveImageUrl } from "@/lib/pdf/resolveImage"
import { hasPermission } from "@/lib/rbac"
import { getLogoBase64, getWatermarkBase64, getAynMuskLogoBase64, getPromotionalImageBase64 } from "@/lib/pdf/logoCache"
import { generateCode128DataUri } from "@/lib/pdf/barcode"

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
    if (["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(dbSessionUser.role)) {
      ownershipRule = "ALL"
    } else {
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

    const isExcludedFromOwnershipLimit = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(dbSessionUser.role)

    let whereClause: any = {
      status: { not: "REVISED" },
      deletedAt: null
    }

    if (!isExcludedFromOwnershipLimit) {
      whereClause.OR = [
        { preparedById: dbSessionUser.id },
        { salesAgentId: dbSessionUser.id },
        { assignments: { some: { userId: dbSessionUser.id } } },
        { client: { salespersonId: dbSessionUser.id } },
        { client: { assignments: { some: { userId: dbSessionUser.id } } } },
        { client: { accessRequests: { some: { userId: dbSessionUser.id, status: "Approved" } } } }
      ]
    } else if (ownershipRule !== "ALL") {
      if (ownershipRule === "OWN") {
        whereClause.OR = [
          { preparedById: dbSessionUser.id },
          { client: { assignments: { some: { userId: dbSessionUser.id, allowAllQuotations: true } } } },
          { assignments: { some: { userId: dbSessionUser.id } } }
        ]
      } else if (ownershipRule === "DEPARTMENT") {
        const deptUsers = await prisma.user.findMany({
          where: { department: dbSessionUser.department || "N/A" },
          select: { id: true }
        })
        const deptUserIds = deptUsers.map(u => u.id)
        whereClause.OR = [
          { preparedById: { in: deptUserIds } },
          { client: { assignments: { some: { userId: { in: deptUserIds }, allowAllQuotations: true } } } },
          { assignments: { some: { userId: { in: deptUserIds } } } }
        ]
      } else if (ownershipRule === "ASSIGNED") {
        whereClause.OR = [
          { preparedById: dbSessionUser.id },
          { salesAgentId: dbSessionUser.id },
          { client: { assignments: { some: { userId: dbSessionUser.id, allowAllQuotations: true } } } },
          { assignments: { some: { userId: dbSessionUser.id } } }
        ]
      } else if (ownershipRule === "NONE") {
        return NextResponse.json({ data: [], totalCount: 0, totalPages: 0, currentPage: 1 })
      }
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    const search = searchParams.get("search") || ""
    const filterStatus = searchParams.get("status") || ""
    const filterSegment = searchParams.get("customerSegment") || ""
    const filterPoStatus = searchParams.get("poStatus") || ""
    const sortBy = searchParams.get("sortBy") || "quotationNumber"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const andConditions: any[] = []

    if (search) {
      andConditions.push({
        OR: [
          { quotationNumber: { contains: search, mode: "insensitive" } },
          { projectName: { contains: search, mode: "insensitive" } },
          { client: { companyName: { contains: search, mode: "insensitive" } } }
        ]
      })
    }

    if (filterStatus) {
      andConditions.push({ status: filterStatus })
    }

    if (filterSegment) {
      andConditions.push({ customerSegment: filterSegment })
    }

    if (filterPoStatus) {
      andConditions.push({ poStatus: filterPoStatus })
    }

    const finalWhere = {
      ...whereClause,
      ...(andConditions.length > 0 ? { AND: andConditions } : {})
    }

    const totalCount = await prisma.quotation.count({ where: finalWhere })

    let orderBy: any = {}
    if (sortBy === "client") {
      orderBy = { client: { companyName: sortOrder } }
    } else if (sortBy === "preparedBy") {
      orderBy = { preparedBy: { name: sortOrder } }
    } else {
      orderBy = { [sortBy]: sortOrder }
    }

    const quotations = await prisma.quotation.findMany({
      where: finalWhere,
      include: {
        client: true,
        preparedBy: true,
      },
      orderBy,
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
      notes,
      status, // DRAFT, SENT, etc. — may be overridden below based on role
      salesAgentId,
      salesAgentName,
      salesAgentContactNumber,
      specialDiscountType,
      specialDiscountValue,
      specialDiscountReason,
      vatMode,
      additionalCharges,
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
      where: { email: session.user.email },
      include: { permissionOverrides: { where: { module: "QUOTATIONS" } } }
    })

    if (!dbSessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canCreate = await hasPermission(dbSessionUser.id, "QUOTATIONS", "create")
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create quotations" }, { status: 403 })
    }

    // Validate if the user is assigned to this client or has full access (Admin/Super Admin/Manager)
    const isExcludedFromAssignmentCheck = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(dbSessionUser.role)
    if (!isExcludedFromAssignmentCheck) {
      let hasAccess = false

      let ownershipRule = "ASSIGNED" // Default for restricted roles like Sales Executive
      if (dbSessionUser.role === "SALES_MANAGER") {
        const clientsRoleObj = await prisma.role.findFirst({
          where: { name: dbSessionUser.role },
          include: { permissions: { where: { module: "CLIENTS" } } }
        })
        const clientsRolePerm = clientsRoleObj?.permissions[0]
        
        const clientsOverride = await prisma.userPermissionOverride.findUnique({
          where: {
            userId_module_action: {
              userId: dbSessionUser.id,
              module: "CLIENTS",
              action: "ownership"
            }
          }
        })

        if (clientsOverride?.ownership) {
          ownershipRule = clientsOverride.ownership
        } else if (clientsRolePerm?.ownership) {
          ownershipRule = clientsRolePerm.ownership
        } else {
          ownershipRule = "ALL" // Default for Sales Manager is ALL
        }
      }

      if (ownershipRule === "ALL") {
        hasAccess = true
      } else if (ownershipRule === "DEPARTMENT") {
        const deptUsers = await prisma.user.findMany({
          where: { department: dbSessionUser.department || "N/A" },
          select: { id: true }
        })
        const deptUserIds = deptUsers.map(u => u.id)
        
        const assignmentCount = await prisma.clientAssignment.count({
          where: {
            clientId: clientObj.id,
            userId: { in: deptUserIds }
          }
        })
        hasAccess = deptUserIds.includes(clientObj.salespersonId || "") || assignmentCount > 0
      } else if (ownershipRule === "OWN" || ownershipRule === "ASSIGNED") {
        const assignmentCount = await prisma.clientAssignment.count({
          where: {
            clientId: clientObj.id,
            userId: dbSessionUser.id
          }
        })
        const hasApprovedRequest = await prisma.clientAccessRequest.findFirst({
          where: { clientId: clientObj.id, userId: dbSessionUser.id, status: "Approved" }
        })
        hasAccess = clientObj.salespersonId === dbSessionUser.id || assignmentCount > 0 || !!hasApprovedRequest
      }

      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden: You are not assigned to this client and cannot create a quotation for them." }, { status: 403 })
      }
    }

    // RBAC validation checks for new pricing controls
    const isSuperAdmin = dbSessionUser.role === "SUPER_ADMIN"
    const discountOverride = dbSessionUser.permissionOverrides.find(o => o.action === "maxDiscountPercent")
    const roleObj = await prisma.role.findFirst({
      where: { name: dbSessionUser.role },
      include: { permissions: { where: { module: "QUOTATIONS" } } }
    })
    const rolePerm = roleObj?.permissions[0]

    const allowedMaxDiscount = isSuperAdmin ? 100 : (discountOverride?.maxDiscountPercent ?? rolePerm?.maxDiscountPercent ?? 0)
    const allowedCanOverrideVat = isSuperAdmin ? true : (dbSessionUser.permissionOverrides.find(o => o.action === "canOverrideVat")?.value ?? rolePerm?.canOverrideVat ?? false)
    const allowedCanAddCustomCharges = true; // Always allow creator to add custom charges on new quotes

    // Special discount permission validation check removed to allow all roles to apply unlimited discount

    // Validate VAT Mode Override
    const resolvedVatMode = vatMode || "EXCLUDING"
    // Removed VAT override restriction to allow any user to select Exclude Tax

    // Validate Additional Costs
    const parsedAdditionalCharges = Array.isArray(additionalCharges) ? additionalCharges : []
    const hasCustomCharges = parsedAdditionalCharges.some(c => (parseFloat(c.amount) || 0) > 0)
    if (hasCustomCharges && !allowedCanAddCustomCharges) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to add additional costs" }, { status: 403 })
    }

    let creatorUser = { id: "", name: "Sales Rep", role: "SALES_EXECUTIVE", designation: null as string | null, phone: null as string | null, signature: null as string | null }

    if (session.user) {
      const userRole = (session.user as any).role || "SALES_EXECUTIVE"
      let finalId = (session.user as any).id
      
      if (["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(userRole) && body.preparedById) {
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
          designation: dbUser.designation || null,
          phone: dbUser.phone,
          signature: dbUser.signature || null
        }
      } else {
        creatorUser = {
          id: finalId,
          name: session.user.name || "Sales Rep",
          role: userRole,
          designation: null,
          phone: null,
          signature: null
        }
      }
    }
    const loggedInUserId = (session?.user as any)?.id;

    // All quotations are immediately set to DRAFT (Quote Created) status.
    const resolvedStatus = status || "DRAFT"

    let nextQuoteNo = body.quotationNumber
    let usedBaseNumber = 0
    const segment = body.customerSegment || "Project"
    
    if (!nextQuoteNo) {
      let prefix = "P"
      if (segment === "Interior") prefix = "I"
      else if (segment === "Dealer") prefix = "D"
      else if (segment === "Project" || segment === "Special") prefix = "P"

      let tracker = await prisma.sequenceTracker.findUnique({ where: { type: "QUOTATION_BASE" } })
      let maxNumber = 3670

      if (tracker) {
        maxNumber = tracker.lastValue
      } else {
        const allQuotes = await prisma.quotation.findMany({
          select: { quotationNumber: true }
        })
        for (const q of allQuotes) {
          const match = q.quotationNumber.match(/^[IDP](\d+)/)
          if (match) {
            const num = parseInt(match[1], 10)
            if (num > maxNumber) {
              maxNumber = num
            }
          }
        }
      }

      usedBaseNumber = maxNumber + 1
      nextQuoteNo = `${prefix}${usedBaseNumber}-1`
    } else {
      // Validate that the manually provided quotation number is unique
      const existingQuotation = await prisma.quotation.findFirst({
        where: { quotationNumber: nextQuoteNo }
      })
      if (existingQuotation) {
        return NextResponse.json(
          { error: `Quotation number "${nextQuoteNo}" already exists.` },
          { status: 409 }
        )
      }
    }
    // Read both brand logos to base64 (only if not draft)
    let logoBase64 = ""
    let watermarkBase64 = ""
    let aynMuskLogoBase64 = ""
    let barcodeBase64 = ""
    let promotionalImageBase64: string | null = null

    if (resolvedStatus !== "DRAFT") {
      logoBase64 = await getLogoBase64()
      watermarkBase64 = await getWatermarkBase64()
      aynMuskLogoBase64 = await getAynMuskLogoBase64()
      promotionalImageBase64 = await getPromotionalImageBase64()
      barcodeBase64 = generateCode128DataUri(nextQuoteNo)
    }

    // Prefetch products catalog details to render image & category inside the PDF
    const productIds = items.map((i: any) => i.productId).filter(Boolean)
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true }
    })

    // Validate out-of-stock products for Interior Design Consultants
    const userRole = (session?.user as any)?.role || ""
    if (userRole === "INTERIOR_DESIGN_CONSULTANT") {
      const outOfStockItems = items.filter((item: any) => {
        const prod = dbProducts.find((p) => p.id === item.productId)
        return prod && (prod.stock ?? 0) <= 0
      })
      if (outOfStockItems.length > 0) {
        const prodNames = outOfStockItems
          .map((item: any) => {
            const p = dbProducts.find((p) => p.id === item.productId)
            return p?.productName || item.description || item.productId
          })
          .join(", ")
        return NextResponse.json(
          { error: `The following out-of-stock product(s) cannot be added to a quotation: ${prodNames}` },
          { status: 400 }
        )
      }
    }

    // 3. Calculate financial totals using strict order
    let subtotal = 0
    const quotationItemsToCreate = await Promise.all(items.map(async (item: any, idx: number) => {
      const qty = parseInt(item.quantity) || 1
      const price = parseFloat(item.unitPrice) || 0
      const disc = parseFloat(item.discount) || 0
      const marginVal = parseFloat(item.margin) || 0.0
      const amt = (price - disc) * qty
      subtotal += amt

      const matchedProd = dbProducts.find((p) => p.id === item.productId)
      
      const rawImageUrl = item.customImageUrl || item.imageUrl || matchedProd?.imageUrl || null;
      // Only resolve image URL if not draft
      const resolvedImage = resolvedStatus !== "DRAFT" ? await resolveImageUrl(rawImageUrl) : null;

      return {
        itemNo: idx + 1,
        productId: item.productId || null,
        description: item.description,
        specifications: item.specifications || "",
        productNotes: item.productNotes || null,
        customImageUrl: rawImageUrl,
        quantity: qty,
        basePrice: parseFloat(item.basePrice) || price, // locked segment base price
        unitPrice: price,
        discount: disc,
        margin: marginVal,
        amount: amt,
        imageUrl: resolvedImage,
        categoryName: item.categoryName || matchedProd?.category?.name || "OFFICE FURNITURE",
        chairType: item.chairType || matchedProd?.chairType || null,
        productDescription: item.productDescription || matchedProd?.description || null,
        dimensions: matchedProd?.dimensions || null,
        warranty: matchedProd?.warranty || null,
        batchHeading: item.batchHeading || null,
      }
    }))

    // Calculate total additional cost
    let totalAdditionalCost = 0
    parsedAdditionalCharges.forEach((c: any) => {
      totalAdditionalCost += parseFloat(c.amount) || 0
    })

    // Validate Special Discount Limit
    const discountVal = parseFloat(specialDiscountValue) || 0
    let discountAmt = 0
    let appliedDiscountPercent = 0
    if (discountVal > 0) {
      if (specialDiscountType === "PERCENTAGE") {
        appliedDiscountPercent = discountVal
        discountAmt = (subtotal + totalAdditionalCost) * (discountVal / 100)
      } else if (specialDiscountType === "FIXED") {
        const baseForDiscount = subtotal + totalAdditionalCost
        appliedDiscountPercent = baseForDiscount > 0 ? (discountVal / baseForDiscount) * 100 : 0
        discountAmt = discountVal
      }
    }

    // Discount limit check removed

    // Calculate Taxable Amount, VAT, and Grand Total
    const taxableAmount = Math.max(0, subtotal + totalAdditionalCost - discountAmt)
    let vatAmount = 0
    let grandTotal = 0

    if (resolvedVatMode === "INCLUDING") {
      vatAmount = (taxableAmount * 0.05) / 1.05
      grandTotal = taxableAmount
    } else {
      vatAmount = taxableAmount * 0.05
      grandTotal = taxableAmount + vatAmount
    }

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
      subtotal: subtotal,
      vatAmount: vatAmount,
      deliveryCharge: totalAdditionalCost,
      grandTotal: grandTotal,
      preparedBy: creatorUser.name,
      preparedByContact: creatorUser.phone,
      preparedByDesignation: creatorUser.designation,
      preparedByRole: creatorUser.role,
      preparedBySignatureUrl: creatorUser.signature || null,
      salesAgentName: salesAgentName || null,
      termsConditions: termsArray,
      companyLogoUrl: logoBase64 || null,
      aynMuskLogoUrl: aynMuskLogoBase64 || null,
      barcodeBase64: barcodeBase64 || null,
      watermarkUrl: watermarkBase64 || null,
      promotionalImageUrl: promotionalImageBase64,
      clientId: clientObj.clientId || null,
      items: quotationItemsToCreate,
      vatMode: resolvedVatMode,
      specialDiscountType: specialDiscountType || null,
      specialDiscountValue: discountVal,
      specialDiscountReason: specialDiscountReason || null,
      discount: discountAmt,
      additionalCharges: parsedAdditionalCharges,
    }

    let sharepointUrl = ""
    if (resolvedStatus !== "DRAFT") {
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
        subtotal: subtotal,
        discount: discountAmt,
        deliveryCharge: totalAdditionalCost,
        vatAmount: vatAmount,
        grandTotal: grandTotal,
        specialDiscountType: specialDiscountType || null,
        specialDiscountValue: discountVal,
        specialDiscountReason: specialDiscountReason || null,
        vatMode: resolvedVatMode,
        additionalCharges: parsedAdditionalCharges as any,
        sharepointUrl,
        notes: notes || null,
        salesAgentId: salesAgentId || null,
        salesAgentName: salesAgentName || null,
        salesAgentContactNumber: salesAgentContactNumber || null,
        items: {
          create: quotationItemsToCreate.map((item: any, idx: number) => ({
            itemNo: item.itemNo,
            sortOrder: idx + 1,
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
        assignments: {
          create: loggedInUserId && loggedInUserId !== creatorUser.id ? [
            {
              userId: loggedInUserId,
              allowEdit: true,
              allowRevisionApproval: true,
              allowPricingVisibility: true,
            }
          ] : []
        },
      },
      include: {
        client: true,
        items: true,
        revisions: true,
      }
    })

    if (usedBaseNumber > 0) {
      await prisma.sequenceTracker.upsert({
        where: { type: "QUOTATION_BASE" },
        update: { lastValue: usedBaseNumber },
        create: { type: "QUOTATION_BASE", lastValue: usedBaseNumber, description: "Base quotation number sequence" }
      })
    }

    // Assign Creator Explicitly
    try {
      await prisma.activityLog.create({
        data: {
          userId: creatorUser.id,
          action: "CREATED_QUOTATION",
          entityType: "QUOTATION",
          entityId: newQuotation.id,
          details: `Created quotation ${nextQuoteNo} for client ${clientObj.companyName} with amount AED ${grandTotal.toFixed(2)}`,
        },
      })
    } catch (logError) {
      console.error("Failed to write creation activity log:", logError)
    }

    // Notify Managers/Admins
    const managers = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "SALES_MANAGER", "MANAGER"] },
        isActive: true,
        id: { not: creatorUser.id }
      }
    })

    if (managers.length > 0) {
      await prisma.notification.createMany({
        data: managers.map(mgr => ({
          userId: mgr.id,
          title: "New Quotation Created",
          message: `Quotation ${nextQuoteNo} for ${clientObj.companyName} was created by ${creatorUser.name || 'a user'}.`,
          type: "QUOTATION_UPDATE",
          link: `/quotations` // Could link to specific quotation if there's a view page
        }))
      })
    }

    return NextResponse.json(newQuotation, { status: 201 })
  } catch (error: any) {
    console.error("Failed to create quotation:", error)
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
