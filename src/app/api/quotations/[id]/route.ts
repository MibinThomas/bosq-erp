import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { uploadQuotationPdf } from "@/lib/sharepoint"
import { QuotationDocument } from "@/lib/pdf/QuotationDocument"
import fs from "fs"
import path from "path"
import { getSettings } from "@/lib/settings"
import { resolveImageUrl } from "@/lib/pdf/resolveImage"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getLogoBase64, getWatermarkBase64, getAynMuskLogoBase64 } from "@/lib/pdf/logoCache"
import { generateCode128DataUri } from "@/lib/pdf/barcode"

// Get single quotation with items and revisions history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
          orderBy: [
            { sortOrder: "asc" },
            { itemNo: "asc" }
          ],
          include: { 
            product: {
              include: { category: true }
            }
          }
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

    const userRole = (session.user as any).role || ""
    const isUnrestricted = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(userRole)
    if (!isUnrestricted) {
      const currentUserId = (session.user as any).id
      
      let hasAccess = false
      if (quotation.preparedById === currentUserId) {
        hasAccess = true
      } else {
        const quotationAssignment = await prisma.quotationAssignment.findFirst({
          where: { quotationId: quotation.id, userId: currentUserId }
        })
        if (quotationAssignment) {
          hasAccess = true
        } else {
          const clientAssignment = await prisma.clientAssignment.findFirst({
            where: { clientId: quotation.clientId, userId: currentUserId }
          })
          if (clientAssignment) {
            hasAccess = true
          }
          if (!hasAccess && quotation.client.salespersonId === currentUserId) {
            hasAccess = true
          }
          if (!hasAccess) {
            const hasApprovedRequest = await prisma.clientAccessRequest.findFirst({
              where: { clientId: quotation.clientId, userId: currentUserId, status: "Approved" }
            })
            if (hasApprovedRequest) {
              hasAccess = true
            }
          }
        }
      }

      if (!hasAccess) {
        return NextResponse.json(
          { error: "Forbidden: You do not have access to view this quotation" },
          { status: 403 }
        )
      }
    }

    const rootId = quotation.parentId || quotation.id
    const revisions = await prisma.quotationRevision.findMany({
      where: { quotationId: rootId },
      orderBy: { revisionNumber: "desc" }
    })

    const seriesQuotations = await prisma.quotation.findMany({
      where: {
        OR: [
          { id: rootId },
          { parentId: rootId }
        ]
      },
      orderBy: { revisionNumber: "asc" },
      include: {
        preparedBy: {
          select: { name: true }
        }
      }
    })

    const logoBase64 = await getLogoBase64()
    const aynMuskLogoBase64 = await getAynMuskLogoBase64()
    const barcodeBase64 = generateCode128DataUri(quotation.quotationNumber)

    return NextResponse.json({
      ...quotation,
      revisions,
      seriesQuotations,
      companyLogoUrl: logoBase64 || null,
      aynMuskLogoUrl: aynMuskLogoBase64 || null,
      barcodeBase64: barcodeBase64 || null,
    })
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
        preparedBy: true,
      }
    })

    if (!existingQuotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      )
    }

    // Resolve log user from session (prefer actual session user, fallback to first exec)
    const session = await getServerSession(authOptions)
    let logUserId = (session?.user as any)?.id || ""
    let logUserRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
    let defaultUser: any = null
    if (logUserId) {
      defaultUser = await prisma.user.findUnique({ where: { id: logUserId } })
    }
    
    if (!defaultUser) {
      defaultUser = await prisma.user.findFirst({ where: { role: "SALES_EXECUTIVE" } })
      if (!defaultUser) {
        defaultUser = await prisma.user.findFirst()
      }
      logUserId = defaultUser?.id || ""
      logUserRole = defaultUser?.role || "SALES_EXECUTIVE"
    } else {
      logUserRole = defaultUser.role
    }

    // Fetch dbSessionUser with overrides
    const dbSessionUser = await prisma.user.findUnique({
      where: { id: logUserId },
      include: { permissionOverrides: { where: { module: "QUOTATIONS" } } }
    })

    const isEditingOrCreate = body.isRevision === true || body.isUpdate === true
    if (isEditingOrCreate) {
      const targetClientId = body.clientId || existingQuotation.clientId
      const clientObj = await prisma.client.findUnique({ where: { id: targetClientId } })
      if (!clientObj) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 })
      }

      if (dbSessionUser) {
        const isExcludedFromAssignmentCheck = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(dbSessionUser.role)
        if (!isExcludedFromAssignmentCheck) {
          let hasAccess = false
          let ownershipRule = "ASSIGNED"

          if (dbSessionUser.role === "SALES_MANAGER" || dbSessionUser.role === "MANAGER") {
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
              ownershipRule = "ALL"
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
                clientId: targetClientId,
                userId: { in: deptUserIds }
              }
            })
            hasAccess = deptUserIds.includes(clientObj.salespersonId || "") || assignmentCount > 0
          } else if (ownershipRule === "OWN" || ownershipRule === "ASSIGNED") {
            const assignmentCount = await prisma.clientAssignment.count({
              where: {
                clientId: targetClientId,
                userId: dbSessionUser.id
              }
            })
            const hasApprovedRequest = await prisma.clientAccessRequest.findFirst({
              where: { clientId: targetClientId, userId: dbSessionUser.id, status: "Approved" }
            })
            hasAccess = clientObj.salespersonId === dbSessionUser.id || assignmentCount > 0 || !!hasApprovedRequest
          }

          if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden: You are not assigned to this client and cannot create or update a quotation for them." }, { status: 403 })
          }
        }
      }
    }
    
    // RBAC validation checks for new pricing controls
    const isSuperAdmin = dbSessionUser ? dbSessionUser.role === "SUPER_ADMIN" : false
    const discountOverride = dbSessionUser?.permissionOverrides.find(o => o.action === "maxDiscountPercent")
    const roleObj = dbSessionUser ? await prisma.role.findFirst({
      where: { name: dbSessionUser.role },
      include: { permissions: { where: { module: "QUOTATIONS" } } }
    }) : null
    const rolePerm = roleObj?.permissions[0]

    const allowedMaxDiscount = isSuperAdmin ? 100 : (discountOverride?.maxDiscountPercent ?? rolePerm?.maxDiscountPercent ?? 0)
    const allowedCanOverrideVat = isSuperAdmin ? true : (dbSessionUser?.permissionOverrides.find(o => o.action === "canOverrideVat")?.value ?? rolePerm?.canOverrideVat ?? false)
    const isCreator = existingQuotation.preparedById === logUserId
    const isRevision = body.isRevision === true || body.action === "REVISE"
    const allowedCanAddCustomCharges = isSuperAdmin || isCreator || isRevision ? true : (dbSessionUser?.permissionOverrides.find(o => o.action === "canAddCustomCharges")?.value ?? rolePerm?.canAddCustomCharges ?? false)

    // Special discount permission validation check removed to allow all roles to update and apply unlimited discount

    // Determine the actual PreparedBy user (could be changed by admin/manager)
    let finalPreparedById = existingQuotation.preparedById
    if (["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(logUserRole) && body.preparedById) {
      finalPreparedById = body.preparedById
    }
    const finalPreparedByUser = await prisma.user.findUnique({
      where: { id: finalPreparedById }
    }) || existingQuotation.preparedBy

    // CASE 4: CLIENT CONFIRMS/APPROVES QUOTATION
    if (body.action === "CLIENT_CONFIRM" || body.status === "CLIENT_APPROVED") {
      const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(logUserRole)
      const isSalesExecutiveWithPermission = logUserRole === "SALES_EXECUTIVE" && (
        dbSessionUser?.permissionOverrides.find(o => o.action === "canConfirmQuotation")?.value ?? rolePerm?.canConfirmQuotation ?? false
      )
      const isCreator = existingQuotation.preparedById === logUserId
      const isAuthorized = isManagerOrAdmin || isSalesExecutiveWithPermission || isCreator
      
      if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized: You do not have permission to approve quotations" }, { status: 403 })
      }

      const rootId = existingQuotation.parentId || existingQuotation.id
      const forceReplace = body.forceReplace === true

      // Find if there is already an approved quotation in this series
      const alreadyConfirmed = await prisma.quotation.findFirst({
        where: {
          OR: [
            { id: rootId },
            { parentId: rootId }
          ],
          status: "CLIENT_APPROVED",
          id: { not: existingQuotation.id }
        }
      })

      if (alreadyConfirmed && !forceReplace) {
        return NextResponse.json({
          error: "ALREADY_CONFIRMED",
          confirmedQuotationNumber: alreadyConfirmed.quotationNumber
        }, { status: 400 })
      }

      const confirmedQuotation = await prisma.$transaction(async (tx) => {
        let previousConfirmedNo = ""
        if (alreadyConfirmed) {
          previousConfirmedNo = alreadyConfirmed.quotationNumber
          await tx.quotation.update({
            where: { id: alreadyConfirmed.id },
            data: { status: "REVISED" }
          })
        }

        const updated = await tx.quotation.update({
          where: { id: existingQuotation.id },
          data: { status: "CLIENT_APPROVED" },
          include: { client: true, items: true, revisions: true }
        })

        await tx.activityLog.create({
          data: {
            userId: logUserId,
            action: "CLIENT_APPROVED_QUOTATION",
            entityType: "QUOTATION",
            entityId: updated.id,
            details: `Marked quotation revision ${updated.quotationNumber} as Client Approved. Client: ${updated.client.companyName}${previousConfirmedNo ? ` (Replaced previous approved revision ${previousConfirmedNo})` : ""}`,
          }
        })

        return updated
      }, { maxWait: 15000, timeout: 30000 })

      return NextResponse.json(confirmedQuotation)
    }

    // CASE 1: FULL REVISION REQUEST
    if (body.isRevision === true) {
      if (logUserRole === "SALES_EXECUTIVE" && existingQuotation.preparedById !== logUserId) {
        return NextResponse.json({ error: "Unauthorized: You can only revise your own quotations" }, { status: 403 })
      }
      const {
        items,
        projectName,
        deliveryDate,
        paymentTerms,
        notes,
        revisionNotes,
        salesAgentId,
        salesAgentName,
        salesAgentContactNumber,
        specialDiscountType,
        specialDiscountValue,
        specialDiscountReason,
        vatMode,
        additionalCharges,
      } = body

      // Validate VAT Mode Override
      const resolvedVatMode = vatMode || "EXCLUDING"
      // Removed VAT override restriction to allow any user to select Exclude Tax

      // Validate Additional Costs
      const parsedAdditionalCharges = Array.isArray(additionalCharges) ? additionalCharges : []
      const hasCustomCharges = parsedAdditionalCharges.some(c => (parseFloat(c.amount) || 0) > 0)
      if (hasCustomCharges && !allowedCanAddCustomCharges) {
        return NextResponse.json({ error: "Forbidden: You do not have permission to add additional costs" }, { status: 403 })
      }

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

      const resolvedStatus = "DRAFT"

      // Calculate new financial totals using strict order
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
        // Skip resolution for drafts
        const resolvedImage = resolvedStatus !== "DRAFT" ? await resolveImageUrl(rawImageUrl) : null;

        return {
          itemNo: idx + 1,
          sortOrder: idx + 1,
          productId: item.productId || null,
          description: item.description,
          specifications: item.specifications || "",
          productNotes: item.productNotes || null,
          customImageUrl: rawImageUrl,
          quantity: qty,
          basePrice: parseFloat(item.basePrice) || price,
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

      const rootId = existingQuotation.parentId || existingQuotation.id
      const rootQuotation = await prisma.quotation.findUnique({
        where: { id: rootId },
        include: { revisions: true }
      })

      const maxRev = rootQuotation 
        ? Math.max(1, ...rootQuotation.revisions.map(r => r.revisionNumber), existingQuotation.revisionNumber)
        : existingQuotation.revisionNumber
      const nextRevNo = maxRev + 1

      const rootNumMatch = existingQuotation.quotationNumber.match(/^([IDP]\d+)/)
      const baseQuoteNo = rootNumMatch ? rootNumMatch[1] : existingQuotation.quotationNumber.split("-")[0]
      const revQuoteNum = `${baseQuoteNo}-${nextRevNo}`

      // Read both brand logos to base64 (only if not draft)
      let logoBase64 = ""
      let watermarkBase64 = ""
      let aynMuskLogoBase64 = ""
      let barcodeBase64 = ""

      if (resolvedStatus !== "DRAFT") {
        logoBase64 = await getLogoBase64()
        watermarkBase64 = await getWatermarkBase64()
        aynMuskLogoBase64 = await getAynMuskLogoBase64()
        barcodeBase64 = generateCode128DataUri(revQuoteNum)
      }

      const companySettings = await getSettings([
        "company_name",
        "company_address",
        "company_trn"
      ])

      // Construct Revised PDF props (e.g. quote number P2231-1)
      const pdfProps = {
        quotationNumber: revQuoteNum,
        date: new Date().toISOString().split("T")[0],
        validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        companyName: companySettings.company_name,
        companyAddress: companySettings.company_address,
        companyTrn: companySettings.company_trn,
        clientName: existingQuotation.client.companyName,
        clientContact: existingQuotation.client.contactPerson || "-",
        clientPhone: existingQuotation.client.phone || "",
        clientEmail: existingQuotation.client.email || "",
        clientAddress: existingQuotation.client.address || "Dubai, UAE",
        clientTrn: existingQuotation.client.trn,
        projectName: projectName || existingQuotation.projectName || "Office Furnishing Project",
        paymentTerms: paymentTerms || existingQuotation.paymentTerms,
        deliveryDate: deliveryDate || "TBD",
        subtotal: subtotal,
        vatAmount: vatAmount,
        deliveryCharge: totalAdditionalCost,
        grandTotal: grandTotal,
        preparedBy: finalPreparedByUser.name || "Sales Rep",
        preparedByContact: finalPreparedByUser.phone || null,
        preparedByDesignation: finalPreparedByUser.designation || null,
        preparedByRole: finalPreparedByUser.role || null,
        salesAgentName: salesAgentName || existingQuotation.salesAgentName || null,
        termsConditions: termsArray,
        companyLogoUrl: logoBase64 || null,
        aynMuskLogoUrl: aynMuskLogoBase64 || null,
        barcodeBase64: barcodeBase64 || null,
        watermarkUrl: watermarkBase64 || null,
        clientId: existingQuotation.client.clientId || null,
        items: quotationItemsToCreate,
        vatMode: resolvedVatMode,
        specialDiscountType: specialDiscountType || null,
        specialDiscountValue: discountVal,
        specialDiscountReason: specialDiscountReason || null,
        discount: discountAmt,
        additionalCharges: parsedAdditionalCharges,
      }

      let pdfBuffer: Buffer
      let sharepointUrl = ""
      if (resolvedStatus !== "DRAFT") {
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
        const sanitizedClientNameForFile = existingQuotation.client.companyName.replace(/[\/\\:\*\?"<>\|]/g, "").trim()
        const filenameBase = `${revQuoteNum}_${sanitizedClientNameForFile}`
        try {
          sharepointUrl = await uploadQuotationPdf(
            existingQuotation.client.companyName,
            filenameBase,
            pdfBuffer
          )
        } catch (spError) {
          console.error("Failed to upload revised PDF to SharePoint:", spError)
          sharepointUrl = `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(
            existingQuotation.client.companyName
          )}/Quotations/${filenameBase}.pdf`
        }
      }

      // Execute atomic transaction for revision (create a new quotation record, keep the old one)
      const updatedQuotation = await prisma.$transaction(async (tx) => {
        // 1. Create Revision log history linked to parent root
        await tx.quotationRevision.create({
          data: {
            quotationId: rootId,
            revisionNumber: nextRevNo,
            previousTotal: existingQuotation.grandTotal,
            newTotal: grandTotal,
            notes: revisionNotes || "Revised quotation details",
          }
        })

        // 2. Update previous copy status to "REVISED"
        await tx.quotation.update({
          where: { id: existingQuotation.id },
          data: { status: "REVISED" }
        })

        // 3. Create brand new quotation revision record
        return await tx.quotation.create({
          data: {
            quotationNumber: revQuoteNum,
            customerSegment: existingQuotation.customerSegment,
            clientId: existingQuotation.clientId,
            projectId: existingQuotation.projectId,
            projectName: projectName || existingQuotation.projectName || null,
            date: new Date(),
            validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            preparedById: existingQuotation.preparedById,
            deliveryDate: deliveryDate ? new Date(deliveryDate) : existingQuotation.deliveryDate,
            paymentTerms: paymentTerms || existingQuotation.paymentTerms,
            status: resolvedStatus,
            revisionNumber: nextRevNo,
            poStatus: "PENDING",
            paymentStatus: "UNPAID",
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
            notes: notes || existingQuotation.notes || null,
            salesAgentId: salesAgentId || existingQuotation.salesAgentId || null,
            salesAgentName: salesAgentName || existingQuotation.salesAgentName || null,
            salesAgentContactNumber: salesAgentContactNumber || existingQuotation.salesAgentContactNumber || null,
            parentId: rootId,
            items: {
              create: quotationItemsToCreate.map((item: any) => ({
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
            revisions: true,
          }
        })
      }, { maxWait: 15000, timeout: 30000 })


      // Log Activity
      try {
        if (logUserId) {
          await prisma.activityLog.create({
            data: {
              userId: logUserId,
              action: "REVISED_QUOTATION",
              entityType: "QUOTATION",
              entityId: updatedQuotation.id,
              details: `Revised quotation ${existingQuotation.quotationNumber} to ${revQuoteNum}. Notes: ${revisionNotes}`,
            },
          })
        }
      } catch (logError) {
        console.error("Failed to write revised quotation activity log:", logError)
      }

      return NextResponse.json(updatedQuotation)
    }

    // CASE 3: DIRECT UPDATE OF CURRENT DRAFT
    if (body.isUpdate === true) {
      if (logUserRole === "SALES_EXECUTIVE" && existingQuotation.preparedById !== logUserId) {
        return NextResponse.json({ error: "Unauthorized: You can only update your own quotations" }, { status: 403 })
      }

      const {
        items,
        projectName,
        deliveryDate,
        paymentTerms,
        notes,
        clientId,
        customerSegment,
        salesAgentId,
        salesAgentName,
        salesAgentContactNumber,
        specialDiscountType,
        specialDiscountValue,
        specialDiscountReason,
        vatMode,
        additionalCharges,
      } = body

      // Validate VAT Mode Override
      const resolvedVatMode = vatMode || "EXCLUDING"
      // Removed VAT override restriction to allow any user to select Exclude Tax

      // Validate Additional Costs
      const parsedAdditionalCharges = Array.isArray(additionalCharges) ? additionalCharges : []
      const hasCustomCharges = parsedAdditionalCharges.some(c => (parseFloat(c.amount) || 0) > 0)
      if (hasCustomCharges && !allowedCanAddCustomCharges) {
        return NextResponse.json({ error: "Forbidden: You do not have permission to add additional costs" }, { status: 403 })
      }

      if (!items || items.length === 0) {
        return NextResponse.json(
          { error: "Items array is required to update quotation" },
          { status: 400 }
        )
      }

      const resolvedStatus = body.status || existingQuotation.status

      // Prefetch products catalog details
      const productIds = items.map((i: any) => i.productId).filter(Boolean)
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { category: true }
      })

      // Calculate financial totals using strict order
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
        // Skip resolution for drafts
        const resolvedImage = resolvedStatus !== "DRAFT" ? await resolveImageUrl(rawImageUrl) : null;

        return {
          itemNo: idx + 1,
          sortOrder: idx + 1,
          productId: item.productId || null,
          description: item.description,
          specifications: item.specifications || "",
          productNotes: item.productNotes || null,
          customImageUrl: rawImageUrl,
          quantity: qty,
          basePrice: parseFloat(item.basePrice) || price,
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

      // Read brand logo to base64 (only if not draft)
      let logoBase64 = ""
      let watermarkBase64 = ""
      let aynMuskLogoBase64 = ""
      let barcodeBase64 = ""

      if (resolvedStatus !== "DRAFT") {
        logoBase64 = await getLogoBase64()
        watermarkBase64 = await getWatermarkBase64()
        aynMuskLogoBase64 = await getAynMuskLogoBase64()
        barcodeBase64 = generateCode128DataUri(existingQuotation.quotationNumber)
      }

      const companySettings = await getSettings([
        "company_name",
        "company_address",
        "company_trn"
      ])

      // Re-fetch client in case it changed
      const currentClient = await prisma.client.findUnique({
        where: { id: clientId || existingQuotation.clientId }
      })
      if (!currentClient) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 })
      }

      // Construct PDF props
      const termsArray = [
        "Validity: This quotation is valid for 30 days from date of issue.",
        "Delivery: Delivery within 4-6 weeks of order approval.",
        "Warranty: All structural elements carry a 5-year warranty."
      ]

      const pdfProps = {
        quotationNumber: existingQuotation.quotationNumber,
        date: new Date(existingQuotation.date).toISOString().split("T")[0],
        validityDate: new Date(existingQuotation.validityDate).toISOString().split("T")[0],
        companyName: companySettings.company_name,
        companyAddress: companySettings.company_address,
        companyTrn: companySettings.company_trn,
        clientName: currentClient.companyName,
        clientContact: currentClient.contactPerson || "-",
        clientPhone: currentClient.phone || "",
        clientEmail: currentClient.email || "",
        clientAddress: currentClient.address || "Dubai, UAE",
        clientTrn: currentClient.trn,
        projectName: projectName || existingQuotation.projectName || "Office Furnishing Project",
        paymentTerms: paymentTerms || existingQuotation.paymentTerms,
        deliveryDate: deliveryDate || "TBD",
        subtotal: subtotal,
        vatAmount: vatAmount,
        deliveryCharge: totalAdditionalCost,
        grandTotal: grandTotal,
        preparedBy: finalPreparedByUser.name || "Sales Rep",
        preparedByContact: finalPreparedByUser.phone || null,
        preparedByDesignation: finalPreparedByUser.designation || null,
        preparedByRole: finalPreparedByUser.role || null,
        salesAgentName: salesAgentName || existingQuotation.salesAgentName || null,
        termsConditions: termsArray,
        companyLogoUrl: logoBase64 || null,
        aynMuskLogoUrl: aynMuskLogoBase64 || null,
        barcodeBase64: barcodeBase64 || null,
        watermarkUrl: watermarkBase64 || null,
        clientId: currentClient.clientId || null,
        items: quotationItemsToCreate,
        vatMode: resolvedVatMode,
        specialDiscountType: specialDiscountType || null,
        specialDiscountValue: discountVal,
        specialDiscountReason: specialDiscountReason || null,
        discount: discountAmt,
        additionalCharges: parsedAdditionalCharges,
      }

      let sharepointUrl = existingQuotation.sharepointUrl || ""

      if (resolvedStatus !== "DRAFT") {
        let pdfBuffer: Buffer
        try {
          pdfBuffer = await renderToBuffer(
            React.createElement(QuotationDocument, pdfProps) as any
          )
        } catch (pdfError) {
          console.error("Failed to compile updated PDF buffer:", pdfError)
          return NextResponse.json(
            { error: "Failed to generate updated PDF document" },
            { status: 500 }
          )
        }

        const sanitizedClientNameForFile = currentClient.companyName.replace(/[\/\\:\*\?"<>\|]/g, "").trim()
        const filenameBase = `${existingQuotation.quotationNumber}_${sanitizedClientNameForFile}`
        try {
          sharepointUrl = await uploadQuotationPdf(
            currentClient.companyName,
            filenameBase,
            pdfBuffer
          )
        } catch (spError) {
          console.error("Failed to upload updated PDF to SharePoint:", spError)
          sharepointUrl = existingQuotation.sharepointUrl || ""
        }
      }

      // Execute transaction to delete and recreate items, and update parent quotation
      const updatedQuotation = await prisma.$transaction(async (tx) => {
        // 1. Delete existing items
        await tx.quotationItem.deleteMany({
          where: { quotationId: existingQuotation.id }
        })

        // 2. Update parent quotation
        return await tx.quotation.update({
          where: { id: existingQuotation.id },
          data: {
            clientId: clientId || existingQuotation.clientId,
            preparedById: finalPreparedById,
            customerSegment: customerSegment || existingQuotation.customerSegment,
            projectName: projectName || null,
            deliveryDate: deliveryDate ? new Date(deliveryDate) : existingQuotation.deliveryDate,
            paymentTerms: paymentTerms || existingQuotation.paymentTerms,
            status: resolvedStatus,
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
            salesAgentId: salesAgentId || existingQuotation.salesAgentId || null,
            salesAgentName: salesAgentName || existingQuotation.salesAgentName || null,
            salesAgentContactNumber: salesAgentContactNumber || existingQuotation.salesAgentContactNumber || null,
            items: {
              create: quotationItemsToCreate.map((item: any) => ({
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
            revisions: true,
          }
        })
      }, { maxWait: 15000, timeout: 30000 })

      // Log Activity
      try {
        if (logUserId) {
          await prisma.activityLog.create({
            data: {
              userId: logUserId,
              action: "UPDATED_QUOTATION",
              entityType: "QUOTATION",
              entityId: updatedQuotation.id,
              details: `Updated quotation draft details for ${existingQuotation.quotationNumber}`,
            },
          })
        }
      } catch (logError) {
        console.error("Failed to write updated quotation activity log:", logError)
      }

      return NextResponse.json(updatedQuotation)
    }

    // CASE 2: NORMAL STATUS/NOTES UPDATE (PO RECEIVED, STATUS CHANGES, etc.)
    const { status, poStatus, paymentStatus, notes } = body
    if (logUserRole === "SALES_EXECUTIVE" && existingQuotation.preparedById !== logUserId) {
      return NextResponse.json({ error: "Unauthorized: You can only update your own quotations" }, { status: 403 })
    }

    // Block forward transition to PO/Production if not client approved
    const targetStatuses = ["PO_CONVERTED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED", "PRODUCTION", "INVOICE", "INVOICED"]
    const isMovingForward = (status && targetStatuses.includes(status)) || poStatus === "RECEIVED"
    
    if (isMovingForward && existingQuotation.status !== "CLIENT_APPROVED") {
      return NextResponse.json({
        error: "FORBIDDEN_WORKFLOW",
        message: "Only the Client Approved quotation can be transitioned to PO, Production, or Billing workflows. Please mark this revision as Client Approved first."
      }, { status: 400 })
    }

    // Everyone can update the status of their own quotations without role limitations.
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
    try {
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
    } catch (logError) {
      console.error("Failed to write normal quotation update activity log:", logError)
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
