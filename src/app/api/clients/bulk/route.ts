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

    // Resolve fallback admin user ID based on priority list:
    // 1. Uploading Admin user, if uploader is Admin
    // 2. Default Admin user configured in Settings
    // 3. First active Admin user
    // 4. Super Admin (only if no Admin exists)
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
    dbClients.forEach(c => {
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

    // 1. Get the last client ID to generate new ones
    const lastClient = await prisma.client.findFirst({
      orderBy: { clientId: "desc" },
    })

    let nextNum = 1
    if (lastClient && lastClient.clientId.startsWith("C-")) {
      const lastNumPart = parseInt(lastClient.clientId.replace("C-", ""), 10)
      if (!isNaN(lastNumPart)) {
        nextNum = lastNumPart + 1
      }
    }

    const createdClients = []
    const failedRowsList: any[] = []
    const warningRowsList: any[] = []
    const processedRows: any[] = []

    let successCount = 0
    let failCount = 0
    let warningCount = 0

    // PRE-CREATE SharePoint Folders Concurrently in Chunks of 15 to prevent timeouts
    const CHUNK_SIZE = 15;
    for (let i = 0; i < clients.length; i += CHUNK_SIZE) {
      const chunk = clients.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async (clientData) => {
        if (!clientData.companyName || clientData.companyName.trim() === "") return;
        
        const companyKey = clientData.companyName.trim().toLowerCase();
        const existingClient = clientByCompany.get(companyKey);
        
        let spId = existingClient?.sharepointFolder || "";
        if (!spId) {
          try {
            spId = await createClientFolder(clientData.companyName.trim());
          } catch (e) {
            console.error("Failed to pre-create SharePoint folder:", e);
            spId = `mock-folder-failed-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          }
        }
        clientData._sharepointFolderId = spId;
      }));
    }

    // Validate and process rows
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

      // Spreadsheet row index (2-indexed: Row 1 is header, Row 2 is first data row)
      const rowIndex = clientData.rowIndex || (idx + 2)

      const cellIssues: { columnKey: string; type: "error" | "warning"; message: string }[] = []

      // 1. Validate Company Name
      if (!companyName || companyName.trim() === "") {
        cellIssues.push({ columnKey: "companyName", type: "error", message: "Company name is a required field" })
      } else {
        const companyTrimmed = companyName.trim()
        const companyKey = companyTrimmed.toLowerCase()

        // Duplicate within file
        if ((companyOccurrences.get(companyKey) || 0) > 1) {
          cellIssues.push({ columnKey: "companyName", type: "error", message: "Duplicate company name in upload file" })
        }
        
        // Duplicate in database (Check if exists under different clientId)
        const matchedDbClient = clientByCompany.get(companyKey)
        if (matchedDbClient) {
          const finalClientId = clientId ? clientId.trim() : null
          if (finalClientId && matchedDbClient.clientId !== finalClientId) {
            cellIssues.push({ columnKey: "companyName", type: "error", message: `Company name already exists with Client ID ${matchedDbClient.clientId}` })
          }
        }
      }

      // 2. Validate Email format & duplicate
      if (email && email.trim() !== "") {
        const emailTrimmed = email.trim()
        const emailKey = emailTrimmed.toLowerCase()
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

        if (!emailRegex.test(emailTrimmed)) {
          cellIssues.push({ columnKey: "email", type: "error", message: "Invalid email format" })
        }

        if ((emailOccurrences.get(emailKey) || 0) > 1) {
          cellIssues.push({ columnKey: "email", type: "error", message: "Duplicate email in upload file" })
        }

        const matchedDbClient = clientByEmail.get(emailKey)
        if (matchedDbClient) {
          const matchedCompanyKey = matchedDbClient.companyName.trim().toLowerCase()
          if (!companyName || matchedCompanyKey !== companyName.trim().toLowerCase()) {
            cellIssues.push({ columnKey: "email", type: "error", message: `Email already registered to client: ${matchedDbClient.companyName}` })
          }
        }
      }

      // 3. Validate Phone format & duplicate
      if (phone && String(phone).trim() !== "") {
        const phoneTrimmed = String(phone).trim()
        const phoneKey = phoneTrimmed.toLowerCase()
        const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/

        if (!phoneRegex.test(phoneTrimmed)) {
          cellIssues.push({ columnKey: "phone", type: "error", message: "Invalid phone number format" })
        }

        if ((phoneOccurrences.get(phoneKey) || 0) > 1) {
          cellIssues.push({ columnKey: "phone", type: "error", message: "Duplicate phone number in upload file" })
        }

        const matchedDbClient = clientByPhone.get(phoneKey)
        if (matchedDbClient) {
          const matchedCompanyKey = matchedDbClient.companyName.trim().toLowerCase()
          if (!companyName || matchedCompanyKey !== companyName.trim().toLowerCase()) {
            cellIssues.push({ columnKey: "phone", type: "error", message: `Phone number already registered to client: ${matchedDbClient.companyName}` })
          }
        }
      }

      // 4. Validate Client Type
      const allowedTypes = ["Dealer", "Interior", "Project", "Special"]
      let normalizedClientType = "Project"
      if (clientType && clientType.trim() !== "") {
        const matchedType = allowedTypes.find(t => t.toLowerCase() === clientType.trim().toLowerCase())
        if (!matchedType) {
          cellIssues.push({
            columnKey: "clientType",
            type: "error",
            message: "Invalid client type. Allowed: Dealer, Interior, Project, Special"
          })
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

      // 6. Validate Interior Design Consultant
      let assignedConsultantUserId: string | null = null
      if (!assignedConsultant || assignedConsultant.trim() === "") {
        assignedConsultantUserId = fallbackAdminUserId
        const fallbackUser = dbUsers.find(u => u.id === fallbackAdminUserId)
        const fallbackName = fallbackUser?.name || "Admin"
        cellIssues.push({
          columnKey: "assignedConsultant",
          type: "warning",
          message: `Blank assigned consultant, assigned to ${fallbackName} by default`
        })
      } else {
        const matchedUser = userByName.get(assignedConsultant.trim().toLowerCase())
        if (!matchedUser) {
          assignedConsultantUserId = fallbackAdminUserId
          const fallbackUser = dbUsers.find(u => u.id === fallbackAdminUserId)
          const fallbackName = fallbackUser?.name || "Admin"
          cellIssues.push({ 
            columnKey: "assignedConsultant", 
            type: "warning", 
            message: `Interior Design consultant '${assignedConsultant}' not found. Automatically assigned to ${fallbackName}.` 
          })
        } else if (matchedUser.isActive === false) {
          cellIssues.push({ columnKey: "assignedConsultant", type: "error", message: "Interior Design consultant is inactive" })
        } else {
          const allowedRoles = ["INTERIOR_DESIGN_CONSULTANT"]
          if (allowSalesExec) {
            allowedRoles.push("SALES_EXECUTIVE")
          }
          // Always allow managers/admins as per the requirement
          allowedRoles.push("SALES_MANAGER", "MANAGER")
          
          const allowAdminAssign = systemConfig["client_allow_admin_assignment"] !== "false"
          if (allowAdminAssign) {
            allowedRoles.push("ADMIN", "SUPER_ADMIN")
          }

          if (!allowedRoles.includes(matchedUser.role)) {
            cellIssues.push({
              columnKey: "assignedConsultant",
              type: "error",
              message: `User role (${matchedUser.role.replace(/_/g, " ")}) is not permitted for client assignment`
            })
          } else {
            assignedConsultantUserId = matchedUser.id
          }
        }
      }

      const hasErrors = cellIssues.some(issue => issue.type === "error")
      const hasWarnings = cellIssues.some(issue => issue.type === "warning")

      let errorMessage = ""
      if (hasErrors) {
        errorMessage = cellIssues
          .filter(issue => issue.type === "error")
          .map(issue => `${issue.columnKey}: ${issue.message}`)
          .join("; ")
      } else if (hasWarnings) {
        errorMessage = cellIssues
          .filter(issue => issue.type === "warning")
          .map(issue => `${issue.columnKey}: ${issue.message}`)
          .join("; ")
      }

      // Record detailed logs of parsed row
      const processedRow = {
        ...clientData,
        rowIndex,
        cellIssues,
        hasErrors,
        hasWarnings,
        errorMessage
      }
      processedRows.push(processedRow)

      if (hasErrors) {
        failCount++
        failedRowsList.push({
          row: rowIndex,
          column: cellIssues.find(i => i.type === "error")?.columnKey || "Row",
          value: clientData[cellIssues.find(i => i.type === "error")?.columnKey || ""] || "",
          error: cellIssues.filter(i => i.type === "error").map(i => i.message).join(", ")
        })
        continue
      }

      if (hasWarnings) {
        warningCount++
        warningRowsList.push({
          row: rowIndex,
          column: cellIssues.find(i => i.type === "warning")?.columnKey || "Row",
          value: clientData[cellIssues.find(i => i.type === "warning")?.columnKey || ""] || "",
          warning: cellIssues.filter(i => i.type === "warning").map(i => i.message).join(", ")
        })
      } else {
        successCount++
      }

      // 1. Prepare SharePoint folder (Created concurrently during pre-processing)
      let finalClientId = clientId ? clientId.trim() : null
      const existingClient = clientByCompany.get(companyName.trim().toLowerCase())
      
      if (existingClient && (!finalClientId || existingClient.clientId !== finalClientId)) {
        finalClientId = existingClient.clientId
      } else if (!finalClientId) {
        finalClientId = `C-${nextNum.toString().padStart(4, "0")}`
        nextNum++
      }

      let sharepointFolderId = clientData._sharepointFolderId || existingClient?.sharepointFolder || ""

      // 2. Create / Update Client in Transaction (if valid)
      await prisma.$transaction(async (tx) => {
        const savedClient = await tx.client.upsert({
          where: { clientId: finalClientId },
          update: {
            companyName: companyName.trim(),
            contactPerson: contactPerson || null,
            phone: phone || null,
            email: email || null,
            address: address || null,
            trn: trn || null,
            clientType: normalizedClientType,
            priceCategory: priceCategory || null,
            notes: notes || null,
            status: "Approved",
            salespersonId: assignedConsultantUserId || undefined
          },
          create: {
            clientId: finalClientId,
            companyName: companyName.trim(),
            contactPerson: contactPerson || null,
            phone: phone || null,
            email: email || null,
            address: address || null,
            trn: trn || null,
            clientType: normalizedClientType,
            priceCategory: priceCategory || null,
            notes: notes || null,
            sharepointFolder: sharepointFolderId,
            salespersonId: assignedConsultantUserId,
            status: "Approved",
          },
        })

        createdClients.push(savedClient)

        // Keep Assignments synchronized
        if (assignedConsultantUserId) {
          // Delete existing assignments for client to avoid duplication
          await tx.clientAssignment.deleteMany({
            where: { clientId: savedClient.id }
          })

          // Create new primary assignment
          await tx.clientAssignment.create({
            data: {
              clientId: savedClient.id,
              userId: assignedConsultantUserId,
              isPrimary: true,
              allowAllQuotations: true,
              allowQuotationEdit: true,
              allowRevisionApproval: true,
              allowBoqAccess: true,
              allowPricingVisibility: false
            }
          })

          // Send notification if assigned consultant is not the uploader
          if (assignedConsultantUserId !== creatorUserId) {
            await tx.notification.create({
              data: {
                userId: assignedConsultantUserId,
                title: "New Client Assigned",
                message: `You have been assigned to client ${savedClient.companyName} (${savedClient.clientId}) from bulk upload.`,
                type: "CLIENT_APPROVAL",
                link: `/clients/${savedClient.id}`
              }
            })
          }
        }

        // Log Activity
        await tx.activityLog.create({
          data: {
            userId: creatorUserId,
            action: "CREATED_CLIENT",
            entityType: "CLIENT",
            entityId: savedClient.id,
            details: `Bulk imported client ${companyName} (${finalClientId})`,
          },
        })
      })
    }

    // Generate downloadable error report spreadsheet with exceljs
    let errorFileBase64 = ""
    if (failCount > 0 || warningCount > 0) {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Client Import Report")

      // Headers config
      worksheet.columns = [
        { header: "Client ID", key: "clientId", width: 12 },
        { header: "Company Name", key: "companyName", width: 30 },
        { header: "Contact Person", key: "contactPerson", width: 20 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Email", key: "email", width: 25 },
        { header: "Address", key: "address", width: 40 },
        { header: "TRN", key: "trn", width: 18 },
        { header: "Client Type", key: "clientType", width: 15 },
        { header: "Notes", key: "notes", width: 35 },
        { header: "Assigned Interior Design Consultant", key: "assignedConsultant", width: 25 },
        { header: "Upload Error", key: "uploadError", width: 40 }
      ]

      // Header row styling
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F4E78" } // Professional dark blue
      } as ExcelJS.Fill

      // Styles for highlights
      const errorFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFC7CE" } // Light red background
      }
      const errorFont: Partial<ExcelJS.Font> = {
        color: { argb: "FF9C0006" } // Dark red text
      }
      const warningFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFEB9C" } // Light yellow background
      }
      const warningFont: Partial<ExcelJS.Font> = {
        color: { argb: "FF9C6500" } // Dark yellow text
      }

      // Add all rows with conditional highlighting and cell notes
      processedRows.forEach((rowData) => {
        const row = worksheet.addRow({
          clientId: rowData.clientId || "",
          companyName: rowData.companyName || "",
          contactPerson: rowData.contactPerson || "",
          phone: rowData.phone || "",
          email: rowData.email || "",
          address: rowData.address || "",
          trn: rowData.trn || "",
          clientType: rowData.clientType || "",
          notes: rowData.notes || "",
          assignedConsultant: rowData.assignedConsultant || "",
          uploadError: rowData.errorMessage || ""
        })

        // Style the cells that triggered errors or warnings
        rowData.cellIssues.forEach((issue: any) => {
          // Find the column index based on columnKey
          const colIndex = worksheet.columns.findIndex(col => col.key === issue.columnKey)
          if (colIndex !== -1) {
            const cell = row.getCell(colIndex + 1) // 1-indexed cell
            if (issue.type === "error") {
              cell.fill = errorFill
              cell.font = errorFont
              cell.note = `❌ ${issue.message}`
            } else if (issue.type === "warning") {
              cell.fill = warningFill
              cell.font = warningFont
              cell.note = `⚠ ${issue.message}`
            }
          }
        })

        // Style the 'Upload Error' column cell
        const errorCellIndex = worksheet.columns.findIndex(col => col.key === "uploadError")
        if (errorCellIndex !== -1) {
          const errCell = row.getCell(errorCellIndex + 1)
          if (rowData.hasErrors) {
            errCell.font = { color: { argb: "FFD00000" }, bold: true }
          } else if (rowData.hasWarnings) {
            errCell.font = { color: { argb: "FFB07000" }, bold: true }
          }
        }
      })

      const buffer = await workbook.xlsx.writeBuffer()
      errorFileBase64 = Buffer.from(buffer).toString("base64")
    }

    return NextResponse.json({
      success: true,
      summary: {
        successCount,
        failCount,
        warningCount
      },
      errors: failedRowsList,
      warnings: warningRowsList,
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
