export const maxDuration = 300; // 5 minutes timeout for bulk operations
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { createClientFolder } from "@/lib/sharepoint"
import { getSettings } from "@/lib/settings"
import ExcelJS from "exceljs"
import { hasPermission } from "@/lib/rbac"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id

    const canBulkUpload = await hasPermission(userId, "CLIENTS", "uploadFiles")
    if (!canBulkUpload) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to bulk upload clients" }, { status: 403 })
    }

    const body = await request.json()
    const { clients } = body

    if (!clients || !Array.isArray(clients)) {
      return NextResponse.json(
        { error: "Clients array is required" },
        { status: 400 }
      )
    }

    // Get creator user id
    const creatorUserId: string = (session.user as any).id

    // Get settings configurations
    const systemConfig = await getSettings([
      "client_assign_to_uploader",
      "client_allow_sales_executive_assignment",
      "client_allow_admin_assignment",
      "client_default_admin_user_id"
    ])
    const assignToUploader = systemConfig["client_assign_to_uploader"] !== "false"
    const allowSalesExec = systemConfig["client_allow_sales_executive_assignment"] !== "false"

    // Fetch existing clients to check duplicates (O(1) maps)
    const dbClients = await prisma.client.findMany({
      where: { deletedAt: null }
    })

    // Fetch active users for Interior design consultant validation
    const dbUsers = await prisma.user.findMany({
      where: { deletedAt: null }
    })

    // Resolve fallback admin user ID
    let fallbackAdminUserId: string | null = null

    const creatorUser = dbUsers.find(u => u.id === creatorUserId)
    if (creatorUser && creatorUser.role === "ADMIN" && creatorUser.isActive && !creatorUser.deletedAt) {
      fallbackAdminUserId = creatorUser.id
    }

    if (!fallbackAdminUserId) {
      const defaultAdminConfig = systemConfig["client_default_admin_user_id"]
      if (defaultAdminConfig) {
        const matchedConfigAdmin = dbUsers.find(u => 
          (u.id === defaultAdminConfig || 
           u.email?.toLowerCase() === defaultAdminConfig.toLowerCase() || 
           u.name?.toLowerCase() === defaultAdminConfig.toLowerCase()) &&
          u.role === "ADMIN" && u.isActive && !u.deletedAt
        )
        if (matchedConfigAdmin) {
          fallbackAdminUserId = matchedConfigAdmin.id
        }
      }
    }

    if (!fallbackAdminUserId) {
      const firstActiveAdmin = dbUsers.find(u => u.role === "ADMIN" && u.isActive && !u.deletedAt)
      if (firstActiveAdmin) {
        fallbackAdminUserId = firstActiveAdmin.id
      }
    }

    if (!fallbackAdminUserId) {
      const firstActiveSuperAdmin = dbUsers.find(u => u.role === "SUPER_ADMIN" && u.isActive && !u.deletedAt)
      if (firstActiveSuperAdmin) {
        fallbackAdminUserId = firstActiveSuperAdmin.id
      }
    }

    if (!fallbackAdminUserId) {
      fallbackAdminUserId = creatorUserId
    }

    const clientByCompany = new Map(dbClients.map(c => [c.companyName.trim().toLowerCase(), c]))
    const clientByEmail = new Map()
    const clientByPhone = new Map()
    const clientByClientId = new Map()
    dbClients.forEach(c => {
      clientByClientId.set(c.clientId.trim().toUpperCase(), c)
      if (c.email) clientByEmail.set(c.email.trim().toLowerCase(), c)
      if (c.phone) clientByPhone.set(c.phone.trim().toLowerCase(), c)
    })

    const userByName = new Map(dbUsers.map(u => [u.name?.trim().toLowerCase() || "", u]))

    // Count occurrences within the uploaded file to flag internal duplicates
    const companyOccurrences = new Map<string, number>()
    const emailOccurrences = new Map<string, number>()
    const phoneOccurrences = new Map<string, number>()

    clients.forEach((c: any) => {
      if (c.companyName) {
        const key = c.companyName.trim().toLowerCase()
        companyOccurrences.set(key, (companyOccurrences.get(key) || 0) + 1)
      }
      if (c.email) {
        const key = c.email.trim().toLowerCase()
        emailOccurrences.set(key, (emailOccurrences.get(key) || 0) + 1)
      }
      if (c.phone) {
        const key = c.phone.trim().toLowerCase()
        phoneOccurrences.set(key, (phoneOccurrences.get(key) || 0) + 1)
      }
    })

    // Get max client ID to generate new ones safely
    let maxNumber = 1000
    for (const c of dbClients) {
      const match = c.clientId.match(/^C-(\d+)/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNumber) {
          maxNumber = num
        }
      }
    }
    let nextNum = maxNumber + 1

    const processedRows: any[] = []
    const validNewClientsToCreate: any[] = []
    
    let stats = {
      totalReceived: clients.length,
      newCreated: 0,
      existingSkipped: 0,
      duplicatesInFile: 0,
      failedRecords: 0,
      sharepointCreated: 0
    }

    // Pass 1: Validate and Identify Status (New vs Existing vs Failed vs Dup)
    const processedCompanyKeys = new Set<string>()

    for (let idx = 0; idx < clients.length; idx++) {
      const clientData = clients[idx]
      const {
        clientId,
        companyName,
        contactPerson,
        phone,
        email,
        address,
        trn,
        clientType,
        priceCategory,
        notes,
        assignedConsultant
      } = clientData

      const rowIndex = clientData.rowIndex || (idx + 2)
      const cellIssues: { columnKey: string; type: "error" | "warning"; message: string }[] = []

      // 1. Validate Company Name
      let companyKey = ""
      if (!companyName || companyName.trim() === "") {
        cellIssues.push({ columnKey: "companyName", type: "error", message: "Company name is a required field" })
      } else {
        companyKey = companyName.trim().toLowerCase()
        
        // Check if already processed in this file (internal duplicate)
        if (processedCompanyKeys.has(companyKey)) {
          cellIssues.push({ columnKey: "companyName", type: "error", message: "Duplicate company name in upload file" })
        }
      }

      // 2. Validate Email
      if (email && email.trim() !== "") {
        const emailTrimmed = email.trim()
        const emailKey = emailTrimmed.toLowerCase()
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

        if (!emailRegex.test(emailTrimmed)) {
          cellIssues.push({ columnKey: "email", type: "error", message: "Invalid email format" })
        }
      }

      // 3. Validate Phone
      if (phone && String(phone).trim() !== "") {
        const phoneTrimmed = String(phone).trim()
        const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/
        if (!phoneRegex.test(phoneTrimmed)) {
          cellIssues.push({ columnKey: "phone", type: "error", message: "Invalid phone number format" })
        }
      }

      // 4. Validate Client Type
      const allowedTypes = ["Dealer", "Interior", "Project", "Special"]
      let normalizedClientType = "Project"
      if (clientType && clientType.trim() !== "") {
        const matchedType = allowedTypes.find(t => t.toLowerCase() === clientType.trim().toLowerCase())
        if (!matchedType) {
          cellIssues.push({ columnKey: "clientType", type: "error", message: "Invalid client type. Allowed: Dealer, Interior, Project, Special" })
        } else {
          normalizedClientType = matchedType
        }
      }

      // 5. Validate TRN
      if (trn && String(trn).trim() !== "") {
        const trnTrimmed = String(trn).trim()
        if (!/^\d{15}$/.test(trnTrimmed)) {
          cellIssues.push({ columnKey: "trn", type: "error", message: "Invalid TRN format. Must be exactly 15 digits" })
        }
      }

      // 6. Validate Consultant
      let assignedConsultantUserId: string | null = null
      if (!assignedConsultant || assignedConsultant.trim() === "") {
        assignedConsultantUserId = fallbackAdminUserId
      } else {
        const matchedUser = userByName.get(assignedConsultant.trim().toLowerCase())
        if (!matchedUser) {
          assignedConsultantUserId = fallbackAdminUserId
        } else if (matchedUser.isActive === false) {
          cellIssues.push({ columnKey: "assignedConsultant", type: "error", message: "Interior Design consultant is inactive" })
        } else {
          const allowedRoles = ["INTERIOR_DESIGN_CONSULTANT", "SALES_MANAGER", "MANAGER"]
          if (allowSalesExec) allowedRoles.push("SALES_EXECUTIVE")
          if (systemConfig["client_allow_admin_assignment"] !== "false") allowedRoles.push("ADMIN", "SUPER_ADMIN")

          if (!allowedRoles.includes(matchedUser.role)) {
            cellIssues.push({ columnKey: "assignedConsultant", type: "error", message: `User role (${matchedUser.role}) not permitted` })
          } else {
            assignedConsultantUserId = matchedUser.id
          }
        }
      }

      // Check Existing Logic
      let isExisting = false
      if (companyKey) {
        if (clientByCompany.has(companyKey)) {
          isExisting = true
        } else if (clientId && clientByClientId.has(clientId.trim().toUpperCase())) {
          isExisting = true
        }
      }

      const hasErrors = cellIssues.some(i => i.type === "error")

      let finalStatus = "SUCCESS" // assume new
      let errorMessage = cellIssues.map(i => `${i.columnKey}: ${i.message}`).join("; ")

      if (hasErrors) {
        if (cellIssues.some(i => i.message === "Duplicate company name in upload file")) {
          finalStatus = "DUPLICATE_IN_FILE"
          stats.duplicatesInFile++
        } else {
          finalStatus = "FAILED"
          stats.failedRecords++
        }
      } else if (isExisting) {
        finalStatus = "EXISTING_SKIPPED"
        stats.existingSkipped++
        errorMessage = "Client already exists in database (skipped)"
      } else {
        // It's a valid new client
        processedCompanyKeys.add(companyKey) // Mark to catch dupes further down
        
        // Generate new client ID if not provided or conflicted
        let finalClientId = clientId ? clientId.trim().toUpperCase() : `C-${nextNum.toString().padStart(4, "0")}`
        if (!clientId) nextNum++
        
        validNewClientsToCreate.push({
          ...clientData,
          rowIndex,
          finalClientId,
          companyName: companyName.trim(),
          normalizedClientType,
          assignedConsultantUserId
        })
      }

      processedRows.push({
        ...clientData,
        rowIndex,
        status: finalStatus,
        errorMessage,
        cellIssues
      })
    }

    // Pass 2: Create SharePoint Folders for VALID NEW clients concurrently
    const CHUNK_SIZE = 15;
    for (let i = 0; i < validNewClientsToCreate.length; i += CHUNK_SIZE) {
      const chunk = validNewClientsToCreate.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async (clientData) => {
        try {
          const spId = await createClientFolder(clientData.companyName);
          clientData._sharepointFolderId = spId;
          stats.sharepointCreated++
        } catch (e) {
          console.error(`Failed to pre-create SharePoint folder for ${clientData.companyName}:`, e);
          clientData._sharepointFolderId = `mock-folder-failed-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        }
      }));
    }

    // Pass 3: Database Insertion (Transaction)
    if (validNewClientsToCreate.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const clientData of validNewClientsToCreate) {
          const savedClient = await tx.client.create({
            data: {
              clientId: clientData.finalClientId,
              companyName: clientData.companyName,
              contactPerson: clientData.contactPerson || null,
              phone: clientData.phone || null,
              email: clientData.email || null,
              address: clientData.address || null,
              trn: clientData.trn || null,
              clientType: clientData.normalizedClientType,
              priceCategory: clientData.priceCategory || null,
              notes: clientData.notes || null,
              sharepointFolder: clientData._sharepointFolderId,
              salespersonId: clientData.assignedConsultantUserId,
              status: "Approved",
            }
          })

          stats.newCreated++

          if (clientData.assignedConsultantUserId) {
            await tx.clientAssignment.create({
              data: {
                clientId: savedClient.id,
                userId: clientData.assignedConsultantUserId,
                isPrimary: true,
                allowAllQuotations: true,
                allowQuotationEdit: true,
                allowRevisionApproval: true,
                allowBoqAccess: true,
                allowPricingVisibility: false
              }
            })

            if (clientData.assignedConsultantUserId !== creatorUserId) {
              await tx.notification.create({
                data: {
                  userId: clientData.assignedConsultantUserId,
                  title: "New Client Assigned",
                  message: `You have been assigned to client ${savedClient.companyName} (${savedClient.clientId}) from bulk upload.`,
                  type: "CLIENT_APPROVAL",
                  link: `/clients/${savedClient.id}`
                }
              })
            }
          }

          await tx.activityLog.create({
            data: {
              userId: creatorUserId,
              action: "CREATED_CLIENT",
              entityType: "CLIENT",
              entityId: savedClient.id,
              details: `Bulk imported client ${clientData.companyName} (${clientData.finalClientId})`,
            },
          })
        }
      })
    }

    // Generate downloadable error report spreadsheet for EVERYTHING that wasn't successfully created
    let errorFileBase64 = ""
    const reportRows = processedRows.filter(r => r.status !== "SUCCESS")
    
    if (reportRows.length > 0) {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Upload Report")

      worksheet.columns = [
        { header: "Row", key: "row", width: 10 },
        { header: "Status", key: "status", width: 25 },
        { header: "Company Name", key: "companyName", width: 30 },
        { header: "Client ID", key: "clientId", width: 15 },
        { header: "Email", key: "email", width: 25 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Reason", key: "reason", width: 60 }
      ]

      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } }

      reportRows.forEach((rowData) => {
        const row = worksheet.addRow({
          row: rowData.rowIndex,
          status: rowData.status,
          companyName: rowData.companyName || "",
          clientId: rowData.clientId || "",
          email: rowData.email || "",
          phone: rowData.phone || "",
          reason: rowData.errorMessage || ""
        })

        // Color coding based on status
        let bgColor = "FFFFFFFF"
        let fontColor = "FF000000"

        if (rowData.status === "FAILED") {
          bgColor = "FFFFC7CE" // Red
          fontColor = "FF9C0006"
        } else if (rowData.status === "EXISTING_SKIPPED") {
          bgColor = "FFE2EFDA" // Green
          fontColor = "FF375623"
        } else if (rowData.status === "DUPLICATE_IN_FILE") {
          bgColor = "FFFFEB9C" // Yellow
          fontColor = "FF9C6500"
        }

        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } }
          cell.font = { color: { argb: fontColor } }
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      errorFileBase64 = Buffer.from(buffer).toString("base64")
    }

    return NextResponse.json({
      success: true,
      stats,
      errorFileBase64
    })

  } catch (error: any) {
    console.error("Failed to bulk import clients:", error)
    return NextResponse.json(
      { error: error?.message || String(error) || "Internal Server Error" },
      { status: 500 }
    )
  }
}
