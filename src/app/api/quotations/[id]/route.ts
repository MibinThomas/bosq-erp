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
import { authOptions } from "@/lib/authOptions"
import { getLogoBase64, getWatermarkBase64, getAynMuskLogoBase64, getPromotionalImageBase64, getCompanySealBase64 } from "@/lib/pdf/logoCache"
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
        client: {
          include: {
            documents: {
              orderBy: { createdAt: "desc" }
            }
          }
        },
        boq: {
          include: {
            preparedBy: {
              select: { id: true, name: true, email: true, designation: true, role: true, phone: true }
            },
            estimator: {
              select: { id: true, name: true, email: true, designation: true, role: true, phone: true }
            },
            items: true
          }
        },
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
        preparedBy: {
          select: { id: true, name: true, email: true, designation: true, role: true, phone: true }
        },
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

    const sharepointFiles = await prisma.sharePointFile.findMany({
      where: {
        OR: [
          { entityType: "QUOTATION", entityId: quotation.id },
          { entityType: "CLIENT", entityId: quotation.clientId },
          ...(quotation.boqId ? [{ entityType: "BOQ", entityId: quotation.boqId }] : [])
        ]
      },
      orderBy: { createdAt: "desc" }
    })

    const clientDocs = (quotation.client as any)?.documents || []
    const supportingDocuments = [
      ...sharepointFiles.map(f => ({
        id: f.id,
        title: f.fileName,
        documentType: `SharePoint (${f.entityType})`,
        url: f.fileUrl,
        createdAt: f.createdAt,
        source: "SHAREPOINT"
      })),
      ...clientDocs.map((d: any) => ({
        id: d.id,
        title: d.title,
        documentType: d.documentType || "Client Document",
        url: d.sharepointUrl,
        fileSize: d.fileSize,
        uploadedByName: d.uploadedByName,
        createdAt: d.createdAt,
        source: "CLIENT_DOCUMENT"
      }))
    ]

    const logoBase64 = await getLogoBase64()
    const aynMuskLogoBase64 = await getAynMuskLogoBase64()
    const barcodeBase64 = generateCode128DataUri(quotation.quotationNumber)

    const sanitizedItems = userRole === "INTERIOR_DESIGN_CONSULTANT"
      ? quotation.items.map(item => ({
          ...item,
          materialCost: 0,
          laborCost: 0,
          overheadCost: 0,
          transportCost: 0,
          installationCost: 0,
          unitCost: 0,
          marginPercentage: 0
        }))
      : quotation.items

    return NextResponse.json({
      ...quotation,
      items: sanitizedItems,
      revisions,
      seriesQuotations,
      supportingDocuments,
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
    
    const originalQuotation = await prisma.quotation.findFirst({
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

    if (!originalQuotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      )
    }

    let existingQuotation = originalQuotation

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

    // Helper function to verify quote ownership or assignment
    const canManageQuotationSeries = async () => {
      if (!["SALES_EXECUTIVE", "INTERIOR_DESIGN_CONSULTANT"].includes(logUserRole)) {
        return true
      }
      const rootId = existingQuotation.parentId || existingQuotation.id
      const rootQuotation = existingQuotation.parentId
        ? await prisma.quotation.findUnique({ where: { id: rootId } })
        : existingQuotation

      const isOwnerOrCreator = 
        existingQuotation.preparedById === logUserId ||
        existingQuotation.salesAgentId === logUserId ||
        rootQuotation?.preparedById === logUserId ||
        rootQuotation?.salesAgentId === logUserId

      if (isOwnerOrCreator) return true

      const targetClientId = existingQuotation.clientId
      const clientObj = await prisma.client.findUnique({ where: { id: targetClientId } })
      const isClientSalesperson = clientObj?.salespersonId === logUserId
      const assignmentCount = await prisma.clientAssignment.count({
        where: { clientId: targetClientId, userId: logUserId }
      })
      const hasApprovedRequest = await prisma.clientAccessRequest.findFirst({
        where: { clientId: targetClientId, userId: logUserId, status: "Approved" }
      })

      return isClientSalesperson || assignmentCount > 0 || !!hasApprovedRequest
    }

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

    let finalPreparedById = body.preparedById || existingQuotation.preparedById
    const finalPreparedByUser = await prisma.user.findUnique({
      where: { id: finalPreparedById }
    }) || existingQuotation.preparedBy

    // CASE 4.5: CHANGE QUOTATION STATUS (Comprehensive sales pipeline & lifecycle status flow)
    if (body.action === "CHANGE_STATUS") {
      const { newStatus, remarks } = body
      if (!newStatus) {
        return NextResponse.json({ error: "Missing newStatus parameter" }, { status: 400 })
      }

      const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(logUserRole)
      const isSalesExecutiveWithPermission = logUserRole === "SALES_EXECUTIVE" && (
        dbSessionUser?.permissionOverrides.find(o => o.action === "canConfirmQuotation")?.value ?? rolePerm?.canConfirmQuotation ?? false
      )
      const isAuthorized = isManagerOrAdmin || isSalesExecutiveWithPermission

      // Enforce transition rules
      const VALID_TRANSITIONS: Record<string, string[]> = {
        DRAFT: ["SUBMITTED", "UNDER_REVIEW", "SENT_TO_CLIENT", "CLIENT_APPROVED", "CANCELLED"],
        SUBMITTED: ["UNDER_REVIEW", "SENT_TO_CLIENT", "CANCELLED"],
        UNDER_REVIEW: ["SENT_TO_CLIENT", "REVISED", "CANCELLED"],
        REVISED: ["SENT_TO_CLIENT", "CANCELLED"],
        SENT_TO_CLIENT: ["CLIENT_REVIEWING", "CLIENT_APPROVED", "CLIENT_REJECTED", "CANCELLED"],
        CLIENT_REVIEWING: ["CLIENT_APPROVED", "CLIENT_REJECTED", "CANCELLED"],
        CLIENT_APPROVED: ["CLIENT_CONFIRMED", "CANCELLED"],
        CLIENT_CONFIRMED: ["PO_RECEIVED", "UNDER_PRODUCTION", "CANCELLED"],
        CLIENT_REJECTED: ["LOST", "REVISED", "CANCELLED"],
        UNDER_PRODUCTION: ["READY_FOR_DELIVERY", "CANCELLED"],
        READY_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
        DELIVERED: ["PO_RECEIVED", "COMPLETED", "CANCELLED"],
        PO_RECEIVED: ["UNDER_PRODUCTION", "READY_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED"],
        COMPLETED: ["CANCELLED"],
        CANCELLED: ["DRAFT", "SUBMITTED"],
        LOST: ["DRAFT", "SUBMITTED"]
      }

      const isSuperAdminOrAdmin = ["SUPER_ADMIN", "ADMIN"].includes(logUserRole)
      const allowedTransitions = VALID_TRANSITIONS[existingQuotation.status] || [
        "DRAFT", "SUBMITTED", "UNDER_REVIEW", "SENT_TO_CLIENT", "CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_RECEIVED", "CANCELLED"
      ]

      if (!allowedTransitions.includes(newStatus) && !isSuperAdminOrAdmin) {
        return NextResponse.json({ error: `Invalid status transition from ${existingQuotation.status} to ${newStatus}` }, { status: 400 })
      }

      // Enforce roles & permission checks
      const restrictedStatuses = [
        "CLIENT_CONFIRMED",
        "PO_RECEIVED",
        "UNDER_PRODUCTION",
        "READY_FOR_DELIVERY",
        "DELIVERED",
        "COMPLETED"
      ]

      if (restrictedStatuses.includes(newStatus) && !isAuthorized) {
        return NextResponse.json({ error: "Unauthorized: Downstream status changes require Manager or Admin authorization" }, { status: 403 })
      }

      // Update status and write activity log
      const updatedQuotation = await prisma.$transaction(async (tx) => {
        const rootId = existingQuotation.parentId || existingQuotation.id

        if (newStatus === "CLIENT_CONFIRMED") {
          // 1. Mark all other quotations in this series as REVISED
          await tx.quotation.updateMany({
            where: {
              OR: [
                { id: rootId },
                { parentId: rootId }
              ],
              id: { not: existingQuotation.id }
            },
            data: { status: "REVISED" }
          })

          // 2. Migrate/upsert assignments to the confirmed revision
          const seriesQuotes = await tx.quotation.findMany({
            where: {
              OR: [
                { id: rootId },
                { parentId: rootId }
              ]
            },
            select: { id: true }
          })
          const seriesQuoteIds = seriesQuotes.map(q => q.id)

          const existingAssignments = await tx.quotationAssignment.findMany({
            where: {
              quotationId: { in: seriesQuoteIds }
            }
          })
          
          const uniqueAssignmentsMap = new Map()
          for (const a of existingAssignments) {
            if (!uniqueAssignmentsMap.has(a.userId)) {
              uniqueAssignmentsMap.set(a.userId, a)
            }
          }
          const uniqueAssignments = Array.from(uniqueAssignmentsMap.values())

          await tx.quotationAssignment.deleteMany({
            where: { quotationId: existingQuotation.id }
          })

          if (uniqueAssignments.length > 0) {
            await tx.quotationAssignment.createMany({
              data: uniqueAssignments.map(a => ({
                quotationId: existingQuotation.id,
                userId: a.userId,
                allowEdit: a.allowEdit,
                allowRevisionApproval: a.allowRevisionApproval,
                allowPricingVisibility: a.allowPricingVisibility
              }))
            })
          }
        }

        // Create activity log
        await tx.activityLog.create({
          data: {
            userId: logUserId,
            action: newStatus === "CLIENT_CONFIRMED" ? "CLIENT_CONFIRMED_QUOTATION" : "CHANGE_STATUS",
            entityType: "QUOTATION",
            entityId: existingQuotation.id,
            details: newStatus === "CLIENT_CONFIRMED"
              ? `Confirmed quotation revision ${existingQuotation.quotationNumber} as the Final Quotation. Status updated to Client Confirmed. Remarks: ${remarks || "None"}`
              : isSuperAdminOrAdmin && !allowedTransitions.includes(newStatus)
                ? `Admin Override: Status of ${existingQuotation.quotationNumber} changed from ${existingQuotation.status} to ${newStatus}. Remarks: ${remarks || "None"}`
                : `Status of ${existingQuotation.quotationNumber} changed from ${existingQuotation.status} to ${newStatus}. Remarks: ${remarks || "None"}`,
            createdAt: new Date()
          }
        })

        // Update status of the quotation
        return await tx.quotation.update({
          where: { id: existingQuotation.id },
          data: {
            status: newStatus,
            updatedAt: new Date()
          }
        })
      }, { maxWait: 15000, timeout: 30000 })

      return NextResponse.json(updatedQuotation)
    }

    // CASE 6: SUPER ADMIN RENAME REVISION
    if (body.action === "RENAME_REVISION") {
      if (logUserRole !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden: Only Super Admin can rename revisions" }, { status: 403 })
      }

      const { newQuotationNumber, newRevisionNotes } = body

      if (!newQuotationNumber || !newQuotationNumber.trim()) {
        return NextResponse.json({ error: "Quotation number is required" }, { status: 400 })
      }

      const trimmedNum = newQuotationNumber.trim()

      if (trimmedNum !== existingQuotation.quotationNumber) {
        const conflict = await prisma.quotation.findFirst({
          where: {
            quotationNumber: trimmedNum,
            id: { not: existingQuotation.id }
          }
        })
        if (conflict) {
          return NextResponse.json({ error: `Quotation number "${trimmedNum}" is already in use by another record.` }, { status: 400 })
        }
      }

      const oldNum = existingQuotation.quotationNumber

      const updated = await prisma.$transaction(async (tx) => {
        const qUpdated = await tx.quotation.update({
          where: { id: existingQuotation.id },
          data: {
            quotationNumber: trimmedNum,
          }
        })

        if (newRevisionNotes !== undefined) {
          const rootId = existingQuotation.parentId || existingQuotation.id
          await tx.quotationRevision.updateMany({
            where: {
              quotationId: rootId,
              revisionNumber: existingQuotation.revisionNumber
            },
            data: {
              notes: newRevisionNotes.trim()
            }
          })
        }

        await tx.activityLog.create({
          data: {
            userId: logUserId,
            action: "RENAME_QUOTATION_REVISION",
            entityType: "QUOTATION",
            entityId: existingQuotation.id,
            details: `Super Admin renamed quotation revision from ${oldNum} to ${trimmedNum}.${newRevisionNotes !== undefined ? ` Revision notes updated.` : ""}`,
          }
        })

        return qUpdated
      })

      return NextResponse.json(updated)
    }

    // CASE 5: CONFIRM CLIENT-APPROVED REVISION AS FINAL QUOTATION
    if (body.action === "CONFIRM_FINAL") {
      const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER", "SALES_EXECUTIVE", "INTERIOR_DESIGN_CONSULTANT"].includes(logUserRole)
      
      if (!isManagerOrAdmin) {
        return NextResponse.json({ error: "Unauthorized: You do not have permission to confirm revisions as Final Quotation" }, { status: 403 })
      }

      const rootId = existingQuotation.parentId || existingQuotation.id

      const confirmedQuotation = await prisma.$transaction(async (tx) => {
        // 1. Mark all other quotations in this series as REVISED
        await tx.quotation.updateMany({
          where: {
            OR: [
              { id: rootId },
              { parentId: rootId }
            ],
            id: { not: existingQuotation.id }
          },
          data: { status: "REVISED" }
        })

        // 2. Mark the selected revision as CLIENT_CONFIRMED
        const updated = await tx.quotation.update({
          where: { id: existingQuotation.id },
          data: { status: "CLIENT_CONFIRMED" },
          include: { client: true, items: true, revisions: true }
        })

        // 3. Migrate/upsert assignments to the confirmed revision
        const seriesQuotes = await tx.quotation.findMany({
          where: {
            OR: [
              { id: rootId },
              { parentId: rootId }
            ]
          },
          select: { id: true }
        })
        const seriesQuoteIds = seriesQuotes.map(q => q.id)

        const existingAssignments = await tx.quotationAssignment.findMany({
          where: {
            quotationId: { in: seriesQuoteIds }
          }
        })
        
        const uniqueAssignmentsMap = new Map()
        for (const a of existingAssignments) {
          if (!uniqueAssignmentsMap.has(a.userId)) {
            uniqueAssignmentsMap.set(a.userId, a)
          }
        }
        const uniqueAssignments = Array.from(uniqueAssignmentsMap.values())

        await tx.quotationAssignment.deleteMany({
          where: { quotationId: existingQuotation.id }
        })

        if (uniqueAssignments.length > 0) {
          await tx.quotationAssignment.createMany({
            data: uniqueAssignments.map(a => ({
              quotationId: existingQuotation.id,
              userId: a.userId,
              allowEdit: a.allowEdit,
              allowRevisionApproval: a.allowRevisionApproval,
              allowPricingVisibility: a.allowPricingVisibility
            }))
          })
        }

        // 4. Log activity
        await tx.activityLog.create({
          data: {
            userId: logUserId,
            action: "CLIENT_CONFIRMED_QUOTATION",
            entityType: "QUOTATION",
            entityId: updated.id,
            details: `Confirmed quotation revision ${updated.quotationNumber} as the Final Quotation. Status updated to Client Confirmed. Client: ${updated.client.companyName}`,
          }
        })

        return updated
      }, { maxWait: 15000, timeout: 30000 })

      return NextResponse.json(confirmedQuotation)
    }

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
      if (!(await canManageQuotationSeries())) {
        return NextResponse.json({ error: "Unauthorized: You can only revise your own or assigned quotations" }, { status: 403 })
      }

      const rootId = existingQuotation.parentId || existingQuotation.id
      const resolvedStatus = body.status || "SUBMITTED"

      // Lock / Idempotency Check: Check if a draft revision already exists for this parent root
      // created by the same user within the last 15 minutes ONLY when auto-saving a DRAFT revision.
      // When publishing an official revision (status !== "DRAFT"), ALWAYS create a brand new revision record!
      if (resolvedStatus === "DRAFT") {
        const existingDraftRevision = await prisma.quotation.findFirst({
          where: {
            parentId: rootId,
            status: "DRAFT",
            preparedById: logUserId,
            createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }
          },
          include: {
            client: true,
            items: true,
            preparedBy: true,
          },
          orderBy: { createdAt: "desc" }
        })

        if (existingDraftRevision) {
          // Update the existing draft revision in-place instead of creating another revision record
          existingQuotation = existingDraftRevision
          body.isRevision = false
          body.isUpdate = true
        }
      }
    }

    if (body.isRevision === true) {
      const {
        items,
        projectName,
        deliveryDate,
        paymentTerms,
        notes,
        revisionNotes,
        includeSalesAgent,
        includeCompanySeal,
        includeMaterialsFinishes,
        selectedMaterials,
        salesAgentId,
        salesAgentName,
        salesAgentContactNumber,
        salesAgentTitle,
        salesAgentEmail,
        specialDiscountType,
        specialDiscountValue,
        specialDiscountReason,
        vatMode,
        additionalCharges,
        disclaimer,
        disclaimerTitle,
        termsConditions,
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

      const resolvedStatus = body.status || "DRAFT"

      // Calculate new financial totals using strict order
      const rawRevisionItems = await Promise.all(items.map(async (item: any, idx: number) => {
        const parsedQty = parseInt(item.quantity)
        const qty = isNaN(parsedQty) ? 1 : parsedQty
        const price = parseFloat(item.unitPrice) || 0
        const disc = parseFloat(item.discount) || 0
        const marginVal = parseFloat(item.margin) || 0.0
        const amt = (price - disc) * qty

        const matchedProd = dbProducts.find((p) => p.id === item.productId)
        
        const rawImageUrl = item.customImageUrl || item.imageUrl || matchedProd?.imageUrl || null;
        // Skip resolution for drafts
        const resolvedImage = resolvedStatus !== "DRAFT" ? await resolveImageUrl(rawImageUrl) : null;

        return {
          itemNo: idx + 1,
          sortOrder: idx + 1,
          productId: item.productId || null,
          description: item.description || "",
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
          batchHeading: item.batchHeading || null,
        }
      }))

      // Deduplicate / merge identical item entries
      const quotationItemsToCreate: typeof rawRevisionItems = []
      rawRevisionItems.forEach((item) => {
        const itemKey = `${(item.batchHeading || "").trim().toLowerCase()}|${(item.productId || item.description || "").trim().toLowerCase()}|${item.unitPrice}|${(item.specifications || "").trim()}|${(item.productDescription || "").trim().toLowerCase()}`
        const existingIdx = quotationItemsToCreate.findIndex((d) => {
          const dKey = `${(d.batchHeading || "").trim().toLowerCase()}|${(d.productId || d.description || "").trim().toLowerCase()}|${d.unitPrice}|${(d.specifications || "").trim()}|${(d.productDescription || "").trim().toLowerCase()}`
          return dKey === itemKey
        })

        if (existingIdx > -1) {
          const existing = quotationItemsToCreate[existingIdx]
          const mergedQty = existing.quantity + item.quantity
          const mergedAmt = (existing.unitPrice - existing.discount) * mergedQty
          quotationItemsToCreate[existingIdx] = {
            ...existing,
            quantity: mergedQty,
            amount: mergedAmt,
          }
        } else {
          quotationItemsToCreate.push({ ...item })
        }
      })

      // Re-index item numbers and calculate accurate subtotal
      let subtotal = 0
      quotationItemsToCreate.forEach((item, idx) => {
        item.itemNo = idx + 1
        item.sortOrder = idx + 1
        subtotal += item.amount
      })

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
        grandTotal = Math.round(taxableAmount)
      } else {
        vatAmount = taxableAmount * 0.05
        grandTotal = Math.round(taxableAmount + vatAmount)
      }

      // Fetch Terms & Conditions
      let termsArray: string[] = []
      let storedTermsConditions: string | null = null

      if (Array.isArray(termsConditions) && termsConditions.length > 0) {
        termsArray = termsConditions.map((t: any) => typeof t === "string" ? t : `${t.title ? t.title + ": " : ""}${t.content || ""}`.trim()).filter(Boolean)
        storedTermsConditions = JSON.stringify(termsArray)
      } else if (typeof termsConditions === "string" && termsConditions.trim()) {
        try {
          const parsed = JSON.parse(termsConditions)
          if (Array.isArray(parsed) && parsed.length > 0) {
            termsArray = parsed.map((t: any) => typeof t === "string" ? t : `${t.title ? t.title + ": " : ""}${t.content || ""}`.trim()).filter(Boolean)
          }
        } catch (e) {
          termsArray = termsConditions.split("\n").map((s: string) => s.trim()).filter(Boolean)
        }
        storedTermsConditions = JSON.stringify(termsArray)
      } else if (existingQuotation.termsConditions) {
        try {
          const parsed = JSON.parse(existingQuotation.termsConditions)
          if (Array.isArray(parsed) && parsed.length > 0) {
            termsArray = parsed.map((t: any) => typeof t === "string" ? t : `${t.title ? t.title + ": " : ""}${t.content || ""}`.trim()).filter(Boolean)
            storedTermsConditions = existingQuotation.termsConditions
          }
        } catch (e) {
          termsArray = existingQuotation.termsConditions.split("\n").map((s: string) => s.trim()).filter(Boolean)
          storedTermsConditions = JSON.stringify(termsArray)
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
      const logoBase64 = await getLogoBase64()
      const watermarkBase64 = await getWatermarkBase64()
      const aynMuskLogoBase64 = await getAynMuskLogoBase64()
      const companySealBase64 = await getCompanySealBase64()
      const promotionalImageBase64 = await getPromotionalImageBase64()
      const barcodeBase64 = generateCode128DataUri(revQuoteNum)

      const companySettings = await getSettings([
        "company_name",
        "company_address",
        "company_trn",
        "company_bank_details",
        "company_disclaimer_title",
        "company_disclaimer",
      ])

      // Construct Revised PDF props (e.g. quote number P2231-1)
      const targetClientId = body.clientId || existingQuotation.clientId
      const revisionClient = (await prisma.client.findUnique({ where: { id: targetClientId } })) || existingQuotation.client

      const finalPreparedById = body.preparedById || revisionClient.salespersonId || existingQuotation.preparedById || logUserId
      const dbPreparedUser = await prisma.user.findUnique({ where: { id: finalPreparedById } })
      const finalPreparedByUser = dbPreparedUser || {
        id: logUserId,
        name: session?.user?.name || "Sales Rep",
        phone: null,
        email: session?.user?.email || null,
        designation: null,
        role: logUserRole,
        signature: null
      }

      // Resolve material swatch images for revision PDF
      const rawSelectedMaterialsRev = Array.isArray(selectedMaterials) ? selectedMaterials : []
      const docSelectedMaterialsRev = await Promise.all(
        rawSelectedMaterialsRev.map(async (mat: any) => ({
          ...mat,
          swatchUrl: mat.swatchUrl ? await resolveImageUrl(mat.swatchUrl) : null,
          referenceImageUrl: mat.referenceImageUrl ? await resolveImageUrl(mat.referenceImageUrl) : null,
        }))
      )

      const pdfProps = {
        quotationNumber: revQuoteNum,
        date: new Date().toISOString().split("T")[0],
        validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        companyName: companySettings.company_name,
        companyAddress: companySettings.company_address,
        companyTrn: companySettings.company_trn,
        clientName: revisionClient.companyName,
        clientContact: revisionClient.contactPerson || "-",
        clientPhone: revisionClient.phone || "",
        clientEmail: revisionClient.email || "",
        clientAddress: revisionClient.address || "Dubai, UAE",
        clientTrn: revisionClient.trn,
        projectName: projectName || existingQuotation.projectName || "Office Furnishing Project",
        paymentTerms: paymentTerms || existingQuotation.paymentTerms,
        deliveryDate: deliveryDate || "TBD",
        subtotal: subtotal,
        vatAmount: vatAmount,
        deliveryCharge: totalAdditionalCost,
        grandTotal: grandTotal,
        preparedBy: finalPreparedByUser.name || "Sales Rep",
        preparedByContact: finalPreparedByUser.phone || null,
        preparedByEmail: finalPreparedByUser.email || null,
        preparedByDesignation: finalPreparedByUser.designation || null,
        preparedByRole: finalPreparedByUser.role || null,
        preparedBySignatureUrl: finalPreparedByUser.signature || null,
        includeSalesAgent: !!includeSalesAgent,
        includeCompanySeal: includeCompanySeal ?? true,
        includeMaterialsFinishes: !!includeMaterialsFinishes,
        selectedMaterials: docSelectedMaterialsRev,
        salesAgentName: includeSalesAgent ? (salesAgentName || null) : null,
        salesAgentTitle: includeSalesAgent ? (salesAgentTitle || null) : null,
        salesAgentEmail: includeSalesAgent ? (salesAgentEmail || null) : null,
        salesAgentContactNumber: includeSalesAgent ? (salesAgentContactNumber || null) : null,
        termsConditions: termsArray,
        companyLogoUrl: logoBase64 || null,
        aynMuskLogoUrl: aynMuskLogoBase64 || null,
        companySealUrl: companySealBase64 || null,
        barcodeBase64: barcodeBase64 || null,
        watermarkUrl: watermarkBase64 || null,
        promotionalImageUrl: promotionalImageBase64,
        bankDetails: companySettings.company_bank_details || null,
        disclaimerTitle: disclaimerTitle || existingQuotation.disclaimerTitle || companySettings.company_disclaimer_title || "Disclaimers",
        disclaimer: disclaimer || existingQuotation.disclaimer || companySettings.company_disclaimer || null,
        clientId: revisionClient.clientId || null,
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
          const qFolder = revQuoteNum.match(/^([IDP]\d+)/)?.[1] || revQuoteNum.split("-")[0]
          sharepointUrl = `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(
            existingQuotation.client.companyName
          )}/Quotations/${qFolder}/${filenameBase}.pdf`
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
            preparedById: finalPreparedById,
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
            disclaimerTitle: disclaimerTitle || existingQuotation.disclaimerTitle || null,
            disclaimer: disclaimer || existingQuotation.disclaimer || null,
            termsConditions: storedTermsConditions,
            includeSalesAgent: !!includeSalesAgent,
            includeCompanySeal: includeCompanySeal ?? true,
            includeMaterialsFinishes: !!includeMaterialsFinishes,
            selectedMaterials: Array.isArray(selectedMaterials) ? (selectedMaterials as any) : [],
            salesAgentId: includeSalesAgent ? (salesAgentId || null) : null,
            salesAgentName: includeSalesAgent ? (salesAgentName || null) : null,
            salesAgentContactNumber: includeSalesAgent ? (salesAgentContactNumber || null) : null,
            salesAgentTitle: includeSalesAgent ? (salesAgentTitle || null) : null,
            salesAgentEmail: includeSalesAgent ? (salesAgentEmail || null) : null,
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
      if (!(await canManageQuotationSeries())) {
        return NextResponse.json({ error: "Unauthorized: You can only update your own or assigned quotations" }, { status: 403 })
      }

      const {
        items,
        projectName,
        deliveryDate,
        paymentTerms,
        notes,
        clientId,
        customerSegment,
        includeSalesAgent,
        includeCompanySeal,
        includeMaterialsFinishes,
        selectedMaterials,
        salesAgentId,
        salesAgentName,
        salesAgentContactNumber,
        salesAgentTitle,
        salesAgentEmail,
        specialDiscountType,
        specialDiscountValue,
        specialDiscountReason,
        vatMode,
        additionalCharges,
        disclaimer,
        disclaimerTitle,
        termsConditions,
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

      // Calculate financial totals using strict order
      const rawUpdateItems = await Promise.all(items.map(async (item: any, idx: number) => {
        const parsedQty = parseInt(item.quantity)
        const qty = isNaN(parsedQty) ? 1 : parsedQty
        const price = parseFloat(item.unitPrice) || 0
        const disc = parseFloat(item.discount) || 0
        const marginVal = parseFloat(item.margin) || 0.0
        const amt = (price - disc) * qty

        const matchedProd = dbProducts.find((p) => p.id === item.productId)

        const rawImageUrl = item.customImageUrl || item.imageUrl || matchedProd?.imageUrl || null;
        // Skip resolution for drafts
        const resolvedImage = resolvedStatus !== "DRAFT" ? await resolveImageUrl(rawImageUrl) : null;

        return {
          itemNo: idx + 1,
          sortOrder: idx + 1,
          productId: item.productId || null,
          description: item.description || "",
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
          batchHeading: item.batchHeading || null,
          costingStatus: item.costingStatus || "NOT_REQUIRED",
        }
      }))

      // Deduplicate / merge identical item entries
      const quotationItemsToCreate: typeof rawUpdateItems = []
      rawUpdateItems.forEach((item) => {
        const itemKey = `${(item.batchHeading || "").trim().toLowerCase()}|${(item.productId || item.description || "").trim().toLowerCase()}|${item.unitPrice}|${(item.specifications || "").trim()}|${(item.productDescription || "").trim().toLowerCase()}`
        const existingIdx = quotationItemsToCreate.findIndex((d) => {
          const dKey = `${(d.batchHeading || "").trim().toLowerCase()}|${(d.productId || d.description || "").trim().toLowerCase()}|${d.unitPrice}|${(d.specifications || "").trim()}|${(d.productDescription || "").trim().toLowerCase()}`
          return dKey === itemKey
        })

        if (existingIdx > -1) {
          const existing = quotationItemsToCreate[existingIdx]
          const mergedQty = existing.quantity + item.quantity
          const mergedAmt = (existing.unitPrice - existing.discount) * mergedQty
          quotationItemsToCreate[existingIdx] = {
            ...existing,
            quantity: mergedQty,
            amount: mergedAmt,
          }
        } else {
          quotationItemsToCreate.push({ ...item })
        }
      })

      // Re-index item numbers and calculate accurate subtotal
      let subtotal = 0
      quotationItemsToCreate.forEach((item, idx) => {
        item.itemNo = idx + 1
        item.sortOrder = idx + 1
        subtotal += item.amount
      })

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
        grandTotal = Math.round(taxableAmount)
      } else {
        vatAmount = taxableAmount * 0.05
        grandTotal = Math.round(taxableAmount + vatAmount)
      }

      // Read brand logo to base64 (only if not draft)
      const logoBase64 = await getLogoBase64()
      const watermarkBase64 = await getWatermarkBase64()
      const aynMuskLogoBase64 = await getAynMuskLogoBase64()
      const companySealBase64 = await getCompanySealBase64()
      const promotionalImageBase64 = await getPromotionalImageBase64()
      const barcodeBase64 = generateCode128DataUri(existingQuotation.quotationNumber)

      const companySettings = await getSettings([
        "company_name",
        "company_address",
        "company_trn",
        "company_bank_details",
        "company_disclaimer_title",
        "company_disclaimer",
      ])

      // Re-fetch client in case it changed
      const currentClient = await prisma.client.findUnique({
        where: { id: clientId || existingQuotation.clientId }
      })
      if (!currentClient) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 })
      }

      // Construct PDF props
      let termsArray: string[] = []
      let storedTermsConditions: string | null = null

      if (Array.isArray(termsConditions) && termsConditions.length > 0) {
        termsArray = termsConditions.map((t: any) => typeof t === "string" ? t : `${t.title ? t.title + ": " : ""}${t.content || ""}`.trim()).filter(Boolean)
        storedTermsConditions = JSON.stringify(termsArray)
      } else if (typeof termsConditions === "string" && termsConditions.trim()) {
        try {
          const parsed = JSON.parse(termsConditions)
          if (Array.isArray(parsed) && parsed.length > 0) {
            termsArray = parsed.map((t: any) => typeof t === "string" ? t : `${t.title ? t.title + ": " : ""}${t.content || ""}`.trim()).filter(Boolean)
          }
        } catch (e) {
          termsArray = termsConditions.split("\n").map((s: string) => s.trim()).filter(Boolean)
        }
        storedTermsConditions = JSON.stringify(termsArray)
      } else if (existingQuotation.termsConditions) {
        try {
          const parsed = JSON.parse(existingQuotation.termsConditions)
          if (Array.isArray(parsed) && parsed.length > 0) {
            termsArray = parsed.map((t: any) => typeof t === "string" ? t : `${t.title ? t.title + ": " : ""}${t.content || ""}`.trim()).filter(Boolean)
            storedTermsConditions = existingQuotation.termsConditions
          }
        } catch (e) {
          termsArray = existingQuotation.termsConditions.split("\n").map((s: string) => s.trim()).filter(Boolean)
          storedTermsConditions = JSON.stringify(termsArray)
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

      // Resolve material swatch images for update PDF
      const rawSelectedMaterialsUpd = Array.isArray(selectedMaterials) ? selectedMaterials : []
      const docSelectedMaterialsUpd = await Promise.all(
        rawSelectedMaterialsUpd.map(async (mat: any) => ({
          ...mat,
          swatchUrl: mat.swatchUrl ? await resolveImageUrl(mat.swatchUrl) : null,
          referenceImageUrl: mat.referenceImageUrl ? await resolveImageUrl(mat.referenceImageUrl) : null,
        }))
      )

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
        preparedByEmail: finalPreparedByUser.email || null,
        preparedByDesignation: finalPreparedByUser.designation || null,
        preparedByRole: finalPreparedByUser.role || null,
        preparedBySignatureUrl: finalPreparedByUser.signature || null,
        includeSalesAgent: !!includeSalesAgent,
        includeCompanySeal: includeCompanySeal ?? true,
        includeMaterialsFinishes: !!includeMaterialsFinishes,
        selectedMaterials: docSelectedMaterialsUpd,
        salesAgentName: includeSalesAgent ? (salesAgentName || null) : null,
        salesAgentTitle: includeSalesAgent ? (salesAgentTitle || null) : null,
        salesAgentEmail: includeSalesAgent ? (salesAgentEmail || null) : null,
        salesAgentContactNumber: includeSalesAgent ? (salesAgentContactNumber || null) : null,
        termsConditions: termsArray,
        companyLogoUrl: logoBase64 || null,
        aynMuskLogoUrl: aynMuskLogoBase64 || null,
        companySealUrl: companySealBase64 || null,
        barcodeBase64: barcodeBase64 || null,
        watermarkUrl: watermarkBase64 || null,
        promotionalImageUrl: promotionalImageBase64,
        bankDetails: companySettings.company_bank_details || null,
        disclaimerTitle: disclaimerTitle || existingQuotation.disclaimerTitle || companySettings.company_disclaimer_title || "Disclaimers",
        disclaimer: disclaimer || existingQuotation.disclaimer || companySettings.company_disclaimer || null,
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
            disclaimerTitle: disclaimerTitle || null,
            disclaimer: disclaimer || null,
            termsConditions: storedTermsConditions,
            includeSalesAgent: !!includeSalesAgent,
            includeCompanySeal: includeCompanySeal ?? true,
            includeMaterialsFinishes: !!includeMaterialsFinishes,
            selectedMaterials: Array.isArray(selectedMaterials) ? (selectedMaterials as any) : [],
            salesAgentId: includeSalesAgent ? (salesAgentId || null) : null,
            salesAgentName: includeSalesAgent ? (salesAgentName || null) : null,
            salesAgentContactNumber: includeSalesAgent ? (salesAgentContactNumber || null) : null,
            salesAgentTitle: includeSalesAgent ? (salesAgentTitle || null) : null,
            salesAgentEmail: includeSalesAgent ? (salesAgentEmail || null) : null,
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
    if (!(await canManageQuotationSeries())) {
      return NextResponse.json({ error: "Unauthorized: You can only update your own or assigned quotations" }, { status: 403 })
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
    if (body.quotationNumber && ["SUPER_ADMIN", "ADMIN"].includes(logUserRole)) {
      updateData.quotationNumber = body.quotationNumber.trim()
    }

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
  } catch (error: any) {
    console.error("Failed to update quotation:", error)
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}

// Rename / Edit Quotation Number (Super Admin & Admin feature)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!dbUser || !["SUPER_ADMIN", "ADMIN"].includes(dbUser.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admin can edit quotation numbers" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { quotationNumber } = body

    if (!quotationNumber || typeof quotationNumber !== "string" || !quotationNumber.trim()) {
      return NextResponse.json(
        { error: "Quotation number is required" },
        { status: 400 }
      )
    }

    const newQuotationNumber = quotationNumber.trim()

    const existingQuotation = await prisma.quotation.findFirst({
      where: {
        OR: [
          { id: id },
          { quotationNumber: id }
        ]
      }
    })

    if (!existingQuotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      )
    }

    // Check for duplicate quotation number if changed
    if (newQuotationNumber !== existingQuotation.quotationNumber) {
      const duplicate = await prisma.quotation.findFirst({
        where: {
          quotationNumber: newQuotationNumber,
          id: { not: existingQuotation.id }
        }
      })

      if (duplicate) {
        return NextResponse.json(
          { error: `Quotation number "${newQuotationNumber}" is already in use by another quotation.` },
          { status: 409 }
        )
      }
    }

    const updatedQuotation = await prisma.quotation.update({
      where: { id: existingQuotation.id },
      data: { quotationNumber: newQuotationNumber }
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: dbUser.id,
        action: "EDITED_QUOTATION_NUMBER",
        entityType: "QUOTATION",
        entityId: updatedQuotation.id,
        details: `Super Admin updated quotation number from ${existingQuotation.quotationNumber} to ${newQuotationNumber}`,
      }
    })

    return NextResponse.json(updatedQuotation)
  } catch (error: any) {
    console.error("Failed to update quotation number:", error)
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}

// DELETE handler for Super Admin deleting a single revision or entire quotation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = (session.user as any).role || ""
    if (userRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admin can delete quotation revisions" },
        { status: 403 }
      )
    }

    const targetQuote = await prisma.quotation.findUnique({
      where: { id },
      include: { client: true }
    })

    if (!targetQuote) {
      return NextResponse.json({ error: "Quotation revision not found" }, { status: 404 })
    }

    const rootId = targetQuote.parentId || targetQuote.id

    const seriesQuotes = await prisma.quotation.findMany({
      where: {
        OR: [
          { id: rootId },
          { parentId: rootId }
        ]
      },
      orderBy: { createdAt: "desc" }
    })

    await prisma.$transaction(async (tx) => {
      if (!targetQuote.parentId) {
        // Root quotation is deleted: soft-delete the root quote and all child revisions/copies
        await tx.quotation.updateMany({
          where: {
            OR: [
              { id: targetQuote.id },
              { parentId: targetQuote.id }
            ]
          },
          data: { deletedAt: new Date() }
        })
      } else {
        // Single child revision/copy is deleted
        await tx.quotation.update({
          where: { id: targetQuote.id },
          data: { deletedAt: new Date() }
        })

        const remainingSeries = seriesQuotes.filter(q => q.id !== targetQuote.id)
        if (remainingSeries.length > 0) {
          const hasActiveOrConfirmed = remainingSeries.some(q => ["CLIENT_CONFIRMED", "CLIENT_APPROVED", "SUBMITTED", "DRAFT"].includes(q.status))
          if (!hasActiveOrConfirmed) {
            await tx.quotation.update({
              where: { id: remainingSeries[0].id },
              data: { status: "SUBMITTED" }
            })
          }
        }
      }

      await tx.activityLog.create({
        data: {
          userId: (session.user as any).id,
          action: "DELETE_QUOTATION_REVISION",
          entityType: "QUOTATION",
          entityId: targetQuote.id,
          details: `Super Admin deleted revision ${targetQuote.quotationNumber} (Revision #${targetQuote.revisionNumber}) for client ${targetQuote.client.companyName}.`,
        }
      })
    })

    return NextResponse.json({ success: true, message: `Revision ${targetQuote.quotationNumber} deleted successfully.` })
  } catch (error: any) {
    console.error("Error deleting quotation revision:", error)
    return NextResponse.json({ error: error.message || "Failed to delete quotation revision" }, { status: 500 })
  }
}
