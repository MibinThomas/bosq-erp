"use client"

import { useState, useRef, useEffect } from "react"
import { 
  X, 
  FileSpreadsheet, 
  Check, 
  Loader2, 
  ArrowRight,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Upload,
  Info,
  CheckCircle,
  FileCheck2,
  FileWarning
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { read, write, utils } from "xlsx"

interface BulkUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ParsedClient {
  rowIndex?: number
  clientId: string
  companyName: string
  contactPerson: string
  phone: string
  email: string
  address: string
  trn: string
  clientType: string
  priceCategory: string
  notes: string
  assignedConsultant: string
}

export function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1) // 1: Upload File, 2: Review & Fix Errors, 3: Confirm & Import, 4: Success
  const [headers, setHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [clients, setClients] = useState<ParsedClient[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const [dbUsers, setDbUsers] = useState<any[]>([])
  const [systemSettings, setSystemSettings] = useState<Record<string, string>>({})
  const [importResult, setImportResult] = useState<any | null>(null)
  const [dbClients, setDbClients] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)

  const [uploadedFileMeta, setUploadedFileMeta] = useState<{
    fileName: string
    fileSize: string
    totalRows: number
    clientsDetected: number
    uploadedAt: string
  } | null>(null)

  const [validationErrors, setValidationErrors] = useState<{ row: number; column: string; message: string; key: string }[]>([])
  const [validationWarnings, setValidationWarnings] = useState<{ row: number; column: string; message: string; key: string }[]>([])
  const [filterStatus, setFilterStatus] = useState<"all" | "errors" | "ready">("all")
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  const CSV_HEADERS = [
    "Client ID", 
    "Company Name", 
    "Contact Person", 
    "Phone", 
    "Email", 
    "Address", 
    "TRN", 
    "Client Type", 
    "Price Category",
    "Notes", 
    "Assigned Interior Design Consultant"
  ]

  const serializeToCSVCell = (val: any) => {
    if (val === null || val === undefined) return '""'
    const str = String(val)
    return `"${str.replace(/"/g, '""')}"`
  }

  const downloadExistingClientsCSV = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setExporting(true)
    try {
      const res = await fetch("/api/clients?all=true")
      if (!res.ok) throw new Error("Failed to fetch clients")
      const clientsList = await res.json()

      const rows = clientsList.map((c: any) => {
        let assignedConsultant = ""
        if (c.assignments && c.assignments.length > 0) {
          assignedConsultant = c.assignments.map((a: any) => a.user?.name).join(", ")
        } else if (c.salesperson?.name) {
          assignedConsultant = c.salesperson.name
        }
        return [
          c.clientId || "",
          c.companyName || "",
          c.contactPerson || "",
          c.phone || "",
          c.email || "",
          c.address || "",
          c.trn || "",
          c.clientType || "",
          c.priceCategory || "",
          c.notes || "",
          assignedConsultant
        ]
      })

      const csvContent = [
        CSV_HEADERS.join(","),
        ...rows.map((r: any[]) => r.map(serializeToCSVCell).join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", "bosq_existing_clients.csv")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`Exported ${clientsList.length} clients successfully!`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to export clients.")
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setHeaders([])
      setCsvRows([])
      setMappings({})
      setClients([])
      setImportResult(null)
      setUploadedFileMeta(null)
      setValidationErrors([])
      setValidationWarnings([])
      setFilterStatus("all")
      setExpandedRows({})

      // Fetch active users to validate assignments
      fetch("/api/users/sales-agents")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setDbUsers(data)
          }
        })
        .catch(err => console.error("Failed to fetch users for validation", err))

      // Fetch existing clients to check duplicates
      fetch("/api/clients?all=true")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setDbClients(data)
          }
        })
        .catch(err => console.error("Failed to fetch clients for validation", err))

      // Fetch system settings
      fetch("/api/settings/system")
        .then(res => res.json())
        .then(data => {
          if (data && typeof data === "object") {
            setSystemSettings(data)
          }
        })
        .catch(err => console.error("Failed to fetch system settings", err))

      // Restore Saved Draft if exists
      try {
        const savedDraftClients = localStorage.getItem("bosq_importer_draft_clients")
        const savedDraftMappings = localStorage.getItem("bosq_importer_draft_mappings")
        if (savedDraftClients && savedDraftMappings) {
          const parsed = JSON.parse(savedDraftClients)
          const maps = JSON.parse(savedDraftMappings)
          setClients(parsed)
          setMappings(maps)
          validateClientsData(parsed, maps)
          setStep(2)
          toast.info("Restored client uploader draft from local storage.")
        }
      } catch (e) {
        console.error("Failed to restore draft", e)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  // Generate and download a formatted Excel import template
  const downloadSampleExcel = (e: React.MouseEvent) => {
    e.stopPropagation()
    const headers = [
      "Client ID", 
      "Company Name", 
      "Contact Person", 
      "Phone", 
      "Email", 
      "Address", 
      "TRN", 
      "Client Type", 
      "Price Category",
      "Notes", 
      "Assigned Interior Design Consultant"
    ]
    const rows = [
      [
        "C-1001", 
        "Acme Corporation", 
        "John Doe", 
        "+971 50 123 4567", 
        "john@acme.com", 
        "Office 402, Downtown Dubai, UAE", 
        "100123456789012", 
        "Project", 
        "P PRICE",
        "Important VIP client", 
        "John Consultant"
      ],
      [
        "C-1002", 
        "Tech Innovators", 
        "Jane Smith", 
        "+971 4 987 6543", 
        "jane@tech.com", 
        "Dubai Silicon Oasis, UAE", 
        "100987654321098", 
        "Dealer", 
        "D PRICE",
        "Bulk purchaser", 
        "Jane Executive"
      ],
    ]
    
    // Create worksheet
    const worksheet = utils.aoa_to_sheet([headers, ...rows])
    
    // Set column widths for better UX
    worksheet["!cols"] = [
      { wch: 12 }, // Client ID
      { wch: 30 }, // Company Name
      { wch: 20 }, // Contact Person
      { wch: 18 }, // Phone
      { wch: 25 }, // Email
      { wch: 40 }, // Address
      { wch: 18 }, // TRN
      { wch: 15 }, // Client Type
      { wch: 15 }, // Price Category
      { wch: 35 }, // Notes
      { wch: 25 }, // Assigned Interior Design Consultant
    ]

    // Create workbook and append sheet
    const workbook = utils.book_new()
    utils.book_append_sheet(workbook, worksheet, "Client Import Template")
    
    // Generate buffer and trigger download
    const excelBuffer = write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "BOSQ_Client_Import_Template.xlsx")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Excel import template downloaded!")
  }

  const processImportData = (fileHeaders: string[], fileRows: string[][], fileName: string, fileSize: number) => {
    const initialMappings: Record<string, string> = {}
    const targetFields = [
      { key: "clientId", synonyms: ["id", "clientid", "customerid", "code", "clientcode"] },
      { key: "companyName", synonyms: ["company", "name", "companyname", "client", "customer", "clientname"] },
      { key: "contactPerson", synonyms: ["contact", "person", "contactperson", "attention"] },
      { key: "phone", synonyms: ["phone", "mobile", "tel", "contactnumber"] },
      { key: "email", synonyms: ["email", "e-mail", "mail"] },
      { key: "address", synonyms: ["address", "location", "city", "street"] },
      { key: "trn", synonyms: ["trn", "tax", "vat", "taxnumber"] },
      { key: "clientType", synonyms: ["type", "clienttype", "category", "segment"] },
      { key: "priceCategory", synonyms: ["pricecategory", "price", "pricing", "price category"] },
      { key: "notes", synonyms: ["notes", "remarks", "comments", "details"] },
      { key: "assignedConsultant", synonyms: ["consultant", "assigneddesignconsultant", "salesperson", "designconsultant", "salesexecutive", "sales"] }
    ]

    fileHeaders.forEach(header => {
      const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "")
      const matched = targetFields.find(field => 
        field.key.toLowerCase() === cleanHeader || 
        field.synonyms.some(syn => {
          const cleanSyn = syn.replace(/[^a-z0-9]/g, "")
          return cleanHeader === cleanSyn
        })
      )
      if (matched) {
        initialMappings[matched.key] = header
      }
    })

    const mappedCount = Object.keys(initialMappings).length
    if (mappedCount === 0) {
      toast.error("Could not auto-detect any columns! Please map columns manually under 'Advanced Column Mapping'.")
    } else {
      toast.success(`Auto-mapped ${mappedCount} columns successfully.`)
    }

    setMappings(initialMappings)

    const parsedClients: ParsedClient[] = fileRows.map((row, idx) => {
      const getVal = (fieldKey: string) => {
        const colHeader = initialMappings[fieldKey]
        if (!colHeader) return ""
        const colIdx = fileHeaders.indexOf(colHeader)
        return colIdx !== -1 ? String(row[colIdx] || "").trim() : ""
      }

      return {
        rowIndex: idx + 2,
        clientId: getVal("clientId"),
        companyName: getVal("companyName"),
        contactPerson: getVal("contactPerson"),
        phone: getVal("phone"),
        email: getVal("email"),
        address: getVal("address"),
        trn: getVal("trn"),
        clientType: getVal("clientType") || "Project",
        priceCategory: getVal("priceCategory"),
        notes: getVal("notes"),
        assignedConsultant: getVal("assignedConsultant"),
      }
    })

    setClients(parsedClients)
    validateClientsData(parsedClients, initialMappings)

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return "0 Bytes"
      const k = 1024
      const sizes = ["Bytes", "KB", "MB"]
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    setUploadedFileMeta({
      fileName,
      fileSize: formatBytes(fileSize),
      totalRows: fileRows.length + 1,
      clientsDetected: fileRows.length,
      uploadedAt: new Date().toLocaleString()
    })
  }

  const handleSpreadsheetFile = (file: File) => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
    const isCsv = file.name.endsWith(".csv")

    if (!isExcel && !isCsv) {
      toast.error("Please upload a valid CSV or Excel (.xlsx) file.")
      return
    }

    const reader = new FileReader()

    const processParsedData = (parsed: any[][]) => {
      if (parsed.length < 2) {
        toast.error("The spreadsheet is empty or has no data rows.")
        return
      }

      const cleanParsed = parsed.map(row => 
        row.map(cell => (cell !== null && cell !== undefined) ? String(cell).trim() : "")
      ).filter(row => row.length > 0 && row.some(cell => cell !== ""))

      if (cleanParsed.length < 2) {
        toast.error("No valid data rows found in spreadsheet.")
        return
      }

      const fileHeaders = cleanParsed[0]
      const fileRows = cleanParsed.slice(1)

      setHeaders(fileHeaders)
      setCsvRows(fileRows)

      processImportData(fileHeaders, fileRows, file.name, file.size)
    }

    if (isExcel) {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = read(data, { type: "array" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const parsed: any[][] = utils.sheet_to_json(worksheet, { header: 1 })
        processParsedData(parsed)
      }
      reader.readAsArrayBuffer(file)
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string
        const workbook = read(text, { type: "string" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const parsed: any[][] = utils.sheet_to_json(worksheet, { header: 1 })
        processParsedData(parsed)
      }
      reader.readAsText(file)
    }
  }

  const validateClientsData = (items: ParsedClient[], activeMappings?: Record<string, string>) => {
    const currentMappings = activeMappings || mappings
    const errorsList: { row: number; column: string; message: string; key: string }[] = []
    const warningsList: { row: number; column: string; message: string; key: string }[] = []

    const seenCompanies = new Map<string, number[]>() // company -> rows
    const seenEmails = new Map<string, number[]>() // email -> rows
    const seenPhones = new Map<string, number[]>() // phone -> rows

    items.forEach((c, idx) => {
      const csvRowNum = c.rowIndex || (idx + 2)

      // 1. Company Name Required
      if (!c.companyName) {
        errorsList.push({
          row: csvRowNum,
          column: currentMappings["companyName"] || "Company Name",
          message: "Company Name is required.",
          key: "companyName"
        })
      } else {
        const companyTrimmed = c.companyName.trim().toLowerCase()
        // Duplicate within file
        if (!seenCompanies.has(companyTrimmed)) {
          seenCompanies.set(companyTrimmed, [csvRowNum])
        } else {
          seenCompanies.get(companyTrimmed)!.push(csvRowNum)
        }

        // Duplicate in database
        const dbDuplicate = dbClients.find(
          dbc => dbc.companyName.trim().toLowerCase() === companyTrimmed && dbc.clientId !== c.clientId
        )
        if (dbDuplicate) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["companyName"] || "Company Name",
            message: `Company name already exists in database with Client ID ${dbDuplicate.clientId}`,
            key: "companyName"
          })
        }
      }

      // 2. Email format & duplicate
      if (c.email && c.email.trim() !== "") {
        const emailTrimmed = c.email.trim()
        const emailKey = emailTrimmed.toLowerCase()
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

        if (!emailRegex.test(emailTrimmed)) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["email"] || "Email",
            message: "Invalid email format.",
            key: "email"
          })
        } else {
          // Duplicate within file
          if (!seenEmails.has(emailKey)) {
            seenEmails.set(emailKey, [csvRowNum])
          } else {
            seenEmails.get(emailKey)!.push(csvRowNum)
          }

          // Duplicate in database
          const dbDuplicate = dbClients.find(
            dbc => dbc.email && dbc.email.trim().toLowerCase() === emailKey && dbc.companyName.trim().toLowerCase() !== c.companyName?.trim().toLowerCase()
          )
          if (dbDuplicate) {
            errorsList.push({
              row: csvRowNum,
              column: currentMappings["email"] || "Email",
              message: `Email already registered in database to: ${dbDuplicate.companyName}`,
              key: "email"
            })
          }
        }
      }

      // 3. Phone format & duplicate
      if (c.phone && String(c.phone).trim() !== "") {
        const phoneTrimmed = String(c.phone).trim()
        const phoneKey = phoneTrimmed.toLowerCase()
        const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/

        if (!phoneRegex.test(phoneTrimmed)) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["phone"] || "Phone",
            message: "Invalid phone number format.",
            key: "phone"
          })
        } else {
          // Duplicate within file
          if (!seenPhones.has(phoneKey)) {
            seenPhones.set(phoneKey, [csvRowNum])
          } else {
            seenPhones.get(phoneKey)!.push(csvRowNum)
          }

          // Duplicate in database
          const dbDuplicate = dbClients.find(
            dbc => dbc.phone && dbc.phone.trim().toLowerCase() === phoneKey && dbc.companyName.trim().toLowerCase() !== c.companyName?.trim().toLowerCase()
          )
          if (dbDuplicate) {
            errorsList.push({
              row: csvRowNum,
              column: currentMappings["phone"] || "Phone",
              message: `Phone number already registered in database to: ${dbDuplicate.companyName}`,
              key: "phone"
            })
          }
        }
      }

      // 4. Client Type validation
      const allowedTypes = ["Project", "Interior", "Dealer", "Special"]
      if (c.clientType && c.clientType.trim() !== "") {
        const matchedType = allowedTypes.find(t => t.toLowerCase() === c.clientType.trim().toLowerCase())
        if (!matchedType) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["clientType"] || "Client Type",
            message: "Invalid client type. Allowed: Dealer, Interior, Project, Special",
            key: "clientType"
          })
        }
      }
      
      // Price Category Validation
      const allowedPrices = ["P PRICE", "D PRICE", "I PRICE"]
      if (c.priceCategory && c.priceCategory.trim() !== "") {
        const matchedPrice = allowedPrices.find(p => p.toLowerCase() === c.priceCategory.trim().toLowerCase())
        if (!matchedPrice) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["priceCategory"] || "Price Category",
            message: "Invalid Price Category. Allowed: P PRICE, D PRICE, I PRICE",
            key: "priceCategory"
          })
        }
      }

      // 5. TRN validation
      if (c.trn && String(c.trn).trim() !== "") {
        const trnTrimmed = String(c.trn).trim()
        if (!/^\d{15}$/.test(trnTrimmed)) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["trn"] || "TRN",
            message: "Invalid TRN format. Must be exactly 15 digits.",
            key: "trn"
          })
        }
      }

      // 6. Assigned Interior Design Consultant validation
      if (!c.assignedConsultant || c.assignedConsultant.trim() === "") {
        const assignToUploader = systemSettings["client_assign_to_uploader"] !== "false"
        if (assignToUploader) {
          warningsList.push({
            row: csvRowNum,
            column: currentMappings["assignedConsultant"] || "Assigned Interior Design Consultant",
            message: "Blank assigned consultant, will default to uploading user.",
            key: "assignedConsultant"
          })
        }
      } else {
        const matchedUser = dbUsers.find(
          u => u.name && u.name.trim().toLowerCase() === c.assignedConsultant.trim().toLowerCase()
        )
        if (!matchedUser) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["assignedConsultant"] || "Assigned Interior Design Consultant",
            message: "Interior Design consultant not found in ERP users.",
            key: "assignedConsultant"
          })
        } else if (matchedUser.isActive === false) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["assignedConsultant"] || "Assigned Interior Design Consultant",
            message: "Interior Design consultant is inactive.",
            key: "assignedConsultant"
          })
        } else {
          const allowSalesExec = systemSettings["client_allow_sales_executive_assignment"] !== "false"
          const allowedRoles = ["INTERIOR_DESIGN_CONSULTANT"]
          if (allowSalesExec) {
            allowedRoles.push("SALES_EXECUTIVE")
          }
          if (!allowedRoles.includes(matchedUser.role)) {
            errorsList.push({
              row: csvRowNum,
              column: currentMappings["assignedConsultant"] || "Assigned Interior Design Consultant",
              message: `User role (${matchedUser.role.replace(/_/g, " ")}) is not permitted for client assignment.`,
              key: "assignedConsultant"
            })
          }
        }
      }
    })

    // Duplicate within file checks
    seenCompanies.forEach((rows, company) => {
      if (rows.length > 1) {
        rows.forEach(r => {
          errorsList.push({
            row: r,
            column: currentMappings["companyName"] || "Company Name",
            message: `Duplicate Company Name '${company.toUpperCase()}' found in upload file.`,
            key: "companyName"
          })
        })
      }
    })

    seenEmails.forEach((rows, email) => {
      if (rows.length > 1) {
        rows.forEach(r => {
          errorsList.push({
            row: r,
            column: currentMappings["email"] || "Email",
            message: `Duplicate Email '${email}' found in upload file.`,
            key: "email"
          })
        })
      }
    })

    seenPhones.forEach((rows, phone) => {
      if (rows.length > 1) {
        rows.forEach(r => {
          errorsList.push({
            row: r,
            column: currentMappings["phone"] || "Phone",
            message: `Duplicate Phone '${phone}' found in upload file.`,
            key: "phone"
          })
        })
      }
    })

    setValidationErrors(errorsList)
    setValidationWarnings(warningsList)
  }

  const recalculateClients = (updatedMappings: Record<string, string>) => {
    setMappings(updatedMappings)
    const parsedClients: ParsedClient[] = csvRows.map((row, idx) => {
      const getVal = (fieldKey: string) => {
        const colHeader = updatedMappings[fieldKey]
        if (!colHeader) return ""
        const colIdx = headers.indexOf(colHeader)
        return colIdx !== -1 ? String(row[colIdx] || "").trim() : ""
      }

      return {
        rowIndex: idx + 2,
        clientId: getVal("clientId"),
        companyName: getVal("companyName"),
        contactPerson: getVal("contactPerson"),
        phone: getVal("phone"),
        email: getVal("email"),
        address: getVal("address"),
        trn: getVal("trn"),
        clientType: getVal("clientType") || "Project",
        priceCategory: getVal("priceCategory"),
        notes: getVal("notes"),
        assignedConsultant: getVal("assignedConsultant"),
      }
    })

    setClients(parsedClients)
    validateClientsData(parsedClients, updatedMappings)
    setStep(2)
  }

  const handleClientFieldChange = (index: number, key: keyof ParsedClient, value: any) => {
    const updated = [...clients]
    updated[index] = { ...updated[index], [key]: value }
    setClients(updated)
    validateClientsData(updated)
  }

  const handleFixError = (rowNum: number, fieldKey: string) => {
    const idx = clients.findIndex(c => c.rowIndex === rowNum)
    if (idx !== -1) {
      setExpandedRows(prev => ({ ...prev, [idx]: true }))
      setTimeout(() => {
        const cardElement = document.getElementById(`client-card-${idx}`)
        if (cardElement) {
          cardElement.scrollIntoView({ behavior: "smooth", block: "center" })
        }
        const inputId = `input-${idx}-${fieldKey}`
        const inputElement = document.getElementById(inputId)
        if (inputElement) {
          inputElement.focus()
        }
      }, 150)
    }
  }

  const handleDeleteClient = (index: number) => {
    const updated = clients.filter((_, idx) => idx !== index)
    setClients(updated)
    validateClientsData(updated)
    toast.success("Client removed from import list.")
  }

  const handleSaveDraft = () => {
    try {
      localStorage.setItem("bosq_importer_draft_clients", JSON.stringify(clients))
      localStorage.setItem("bosq_importer_draft_mappings", JSON.stringify(mappings))
      toast.success("Draft client upload progress saved to local storage!")
    } catch (err) {
      toast.error("Failed to save draft.")
    }
  }

  const handleImport = async () => {
    setUploading(true)
    try {
      const finalizedClients = clients.filter((c, idx) => {
        const hasErrors = validationErrors.some(err => err.row === (c.rowIndex || idx + 2))
        return !hasErrors
      })

      if (finalizedClients.length === 0) {
        toast.error("No valid clients to import. Please resolve the errors first.")
        setUploading(false)
        return
      }

      const BATCH_SIZE = 10
      const totalClients = finalizedClients.length
      setUploadProgress({ current: 0, total: totalClients })

      let totalSuccessCount = 0
      let totalFailCount = 0
      let totalWarningCount = 0
      let allErrors: any[] = []
      let allWarnings: any[] = []
      let lastErrorFileBase64 = ""

      for (let i = 0; i < totalClients; i += BATCH_SIZE) {
        const chunk = finalizedClients.slice(i, i + BATCH_SIZE)
        
        const res = await fetch("/api/clients/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clients: chunk })
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || `Bulk import failed at batch starting row ${i + 1}`)
        }

        const data = await res.json()

        if (data.summary) {
          totalSuccessCount += (data.summary.successCount || 0)
          totalFailCount += (data.summary.failCount || 0)
          totalWarningCount += (data.summary.warningCount || 0)
        }

        if (data.errors && Array.isArray(data.errors)) {
          allErrors.push(...data.errors)
        }
        if (data.warnings && Array.isArray(data.warnings)) {
          allWarnings.push(...data.warnings)
        }
        if (data.errorFileBase64) {
          lastErrorFileBase64 = data.errorFileBase64
        }

        setUploadProgress({ current: Math.min(i + BATCH_SIZE, totalClients), total: totalClients })
      }

      // Clear draft on success
      localStorage.removeItem("bosq_importer_draft_clients")
      localStorage.removeItem("bosq_importer_draft_mappings")

      setImportResult({
        success: true,
        summary: {
          successCount: totalSuccessCount,
          failCount: totalFailCount,
          warningCount: totalWarningCount
        },
        errors: allErrors,
        warnings: allWarnings,
        errorFileBase64: lastErrorFileBase64
      })

      setStep(4)
      toast.success(`Successfully imported ${totalSuccessCount} clients!`)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to import clients. Please verify data formats.")
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  const handleDownloadErrorReport = () => {
    if (!importResult?.errorFileBase64) return
    
    const byteCharacters = atob(importResult.errorFileBase64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "Bulk_Upload_Error_Report.xlsx")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Error report downloaded!")
  }

  const handleReuploadCorrected = () => {
    setStep(1)
    setHeaders([])
    setCsvRows([])
    setMappings({})
    setClients([])
    setImportResult(null)
    setUploadedFileMeta(null)
    toast.info("Please select the corrected Excel report file.")
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 100)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSpreadsheetFile(e.dataTransfer.files[0])
    }
  }

  // Summary counts
  const totalDetected = clients.length
  const totalErrors = Array.from(new Set(validationErrors.map(err => err.row))).length
  const totalWarnings = Array.from(new Set(validationWarnings.map(wrn => wrn.row))).length
  const totalValid = totalDetected - totalErrors

  const existingClientCompanies = dbClients.map(c => c.companyName.toLowerCase().trim())
  const existingClientIds = dbClients.map(c => c.clientId.toLowerCase().trim())

  const createCount = clients.filter((c, idx) => {
    const hasErrors = validationErrors.some(e => e.row === (c.rowIndex || idx + 2))
    if (hasErrors) return false
    const isExistingCompany = existingClientCompanies.includes(c.companyName.toLowerCase().trim())
    const isExistingId = c.clientId ? existingClientIds.includes(c.clientId.toLowerCase().trim()) : false
    return !isExistingCompany && !isExistingId
  }).length

  const updateCount = clients.filter((c, idx) => {
    const hasErrors = validationErrors.some(e => e.row === (c.rowIndex || idx + 2))
    if (hasErrors) return false
    const isExistingCompany = existingClientCompanies.includes(c.companyName.toLowerCase().trim())
    const isExistingId = c.clientId ? existingClientIds.includes(c.clientId.toLowerCase().trim()) : false
    return isExistingCompany || isExistingId
  }).length

  const skipCount = totalErrors

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-hidden">
      <div className="relative w-[90vw] max-w-[1400px] h-[90vh] bg-card rounded-2xl border shadow-2xl flex flex-col overflow-hidden bg-white dark:bg-zinc-950 dark:border-zinc-800">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-zinc-850 shrink-0">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
              <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />
              Bulk Client Importer
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Enterprise-grade wizard to upload client spreadsheet records, map schemas, and assign consultants.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-900">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Stepper progress */}
        <div className="flex items-center px-8 py-3.5 bg-zinc-50 border-b dark:bg-zinc-900/50 dark:border-zinc-850 text-xs font-semibold gap-5 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center border font-bold text-xs ${
              step === 1 ? "bg-blue-600 border-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-650"
            }`}>1</span>
            <span className={step === 1 ? "text-zinc-800 dark:text-zinc-100 font-bold" : "text-zinc-400"}>Upload File</span>
          </div>
          <ArrowRight className="h-3 w-3 text-zinc-300" />
          
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center border font-bold text-xs ${
              step === 2 ? "bg-blue-600 border-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-650"
            }`}>2</span>
            <span className={step === 2 ? "text-zinc-800 dark:text-zinc-100 font-bold" : "text-zinc-400"}>Review &amp; Fix Errors</span>
          </div>
          <ArrowRight className="h-3 w-3 text-zinc-300" />

          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center border font-bold text-xs ${
              step === 3 && !importResult ? "bg-blue-600 border-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-650"
            }`}>3</span>
            <span className={step === 3 && !importResult ? "text-zinc-800 dark:text-zinc-100 font-bold" : "text-zinc-400"}>Confirm &amp; Import</span>
          </div>

          {importResult && (
            <>
              <ArrowRight className="h-3 w-3 text-zinc-300" />
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full flex items-center justify-center border font-bold text-xs bg-blue-600 border-blue-600 text-white">4</span>
                <span className="text-zinc-800 dark:text-zinc-100 font-bold">Import Results</span>
              </div>
            </>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-zinc-55/30 dark:bg-zinc-950/20">
          
          {/* STEP 1: UPLOAD FILE */}
          {step === 1 && (
            <div className="space-y-6 max-w-4xl mx-auto py-6">
              
              {!uploadedFileMeta ? (
                <div 
                  className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    dragActive 
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/10" 
                      : "border-zinc-300 hover:border-blue-500/50 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/30"
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".csv, .xlsx, .xls"
                    onChange={(e) => e.target.files?.[0] && handleSpreadsheetFile(e.target.files[0])}
                  />
                  
                  <div className="h-24 w-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center dark:bg-blue-950/40 mb-6 shadow-inner border border-blue-100 dark:border-zinc-800 animate-pulse">
                    <Upload className="h-12 w-12 text-blue-600" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-205">Drag &amp; Drop Spreadsheet Here</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                    Upload a CSV or Excel (.xlsx) file containing client database directory. Schema columns auto-map.
                  </p>
                  
                  <div className="flex gap-3 mt-6">
                    <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md transition-all">
                      Browse File
                    </Button>
                  </div>

                  <div className="mt-8 flex gap-6 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                    <span>Formats: CSV, XLSX, XLS</span>
                    <span>•</span>
                    <span>Max size: 10MB</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white border dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-8 shadow-lg max-w-2xl mx-auto space-y-6 flex flex-col items-center text-center animate-in zoom-in duration-150">
                  <div className="h-16 w-16 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-full flex items-center justify-center border border-green-150 dark:border-green-900/30 shadow-inner">
                    <Check className="h-8 w-8 animate-bounce" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase bg-zinc-100 dark:bg-zinc-850 px-2 py-1 rounded border dark:border-zinc-800">
                      {uploadedFileMeta.fileName}
                    </span>
                    <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                      {uploadedFileMeta.clientsDetected} Clients Detected
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Uploaded on {uploadedFileMeta.uploadedAt} • Size: {uploadedFileMeta.fileSize}
                    </p>
                  </div>

                  <div className="flex gap-3 w-full max-w-md">
                    <Button 
                      variant="outline" 
                      onClick={() => setUploadedFileMeta(null)}
                      className="flex-1 border-zinc-250 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-semibold"
                    >
                      Upload Different File
                    </Button>
                    <Button 
                      onClick={() => setStep(2)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
                    >
                      Continue <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Download templates */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border rounded-2xl dark:bg-zinc-900 dark:border-zinc-800 shadow-sm gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Looking for a starter CSV template or existing database?</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Generate a blank headers template or download a backup copy of the current active ERP clients catalog to perform bulk updates.</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={downloadSampleExcel}
                    className="border-zinc-250 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                    Download Sample Template
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={downloadExistingClientsCSV}
                    disabled={exporting}
                    className="border-zinc-250 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                    )}
                    Download Existing Clients
                  </Button>
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: REVIEW & FIX ERRORS */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start h-full pb-6">
              
              {/* Left pane for validation errors and cards */}
              <div className="lg:col-span-3 space-y-6 h-full overflow-y-auto pr-1">
                
                {/* Validation Center alert panel */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50/50 border border-red-200 dark:bg-red-950/10 dark:border-red-900/30 rounded-2xl p-5 shadow-sm space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-red-200/50 dark:border-red-900/20 pb-2">
                      <h3 className="text-sm font-bold text-red-800 dark:text-red-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 animate-pulse text-red-500" />
                        {validationErrors.length} Column Issues Need Attention
                      </h3>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-white/40 dark:bg-black/20 divide-y dark:divide-zinc-800 text-[11px] text-red-700 dark:text-red-400 font-medium">
                      {validationErrors.map((err, i) => (
                        <div key={`err-${i}`} className="py-1.5 flex items-center justify-between gap-1.5">
                          <div className="flex items-start gap-1.5">
                            <AlertCircle size={12} className="shrink-0 mt-0.5 text-red-500" />
                            <span><strong>Row {err.row}:</strong> {err.message}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleFixError(err.row, err.key)}
                            className="h-5 px-2 text-[9px] font-bold text-red-750 hover:bg-red-100 hover:text-red-800 dark:text-red-440 dark:hover:bg-red-950/40 uppercase tracking-wider cursor-pointer"
                          >
                            Fix
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cards list */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Client Entries</h3>
                    
                    <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-850 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setFilterStatus("all")}
                        className={`px-3 py-1 rounded-md transition-all ${filterStatus === "all" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
                      >
                        All ({totalDetected})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterStatus("errors")}
                        className={`px-3 py-1 rounded-md transition-all ${filterStatus === "errors" ? "bg-red-500 text-white shadow-sm" : "text-zinc-500 hover:text-red-500"}`}
                      >
                        Errors ({totalErrors})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterStatus("ready")}
                        className={`px-3 py-1 rounded-md transition-all ${filterStatus === "ready" ? "bg-green-600 text-white shadow-sm" : "text-zinc-500 hover:text-green-600"}`}
                      >
                        Ready ({totalValid})
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 pb-4">
                    {clients
                      .map((c, idx) => ({ c, idx }))
                      .filter(({ c, idx }) => {
                        const csvRowNum = c.rowIndex || (idx + 2)
                        const hasErrors = validationErrors.some(err => err.row === csvRowNum)
                        if (filterStatus === "errors") return hasErrors
                        if (filterStatus === "ready") return !hasErrors
                        return true
                      })
                      .map(({ c, idx }) => {
                        const csvRowNum = c.rowIndex || (idx + 2)
                        const rowErrors = validationErrors.filter(err => err.row === csvRowNum)
                        const rowWarnings = validationWarnings.filter(wrn => wrn.row === csvRowNum)
                        const isExpanded = !!expandedRows[idx]

                        return (
                          <div 
                            key={idx} 
                            id={`client-card-${idx}`}
                            className={`bg-white border rounded-2xl dark:bg-zinc-900 dark:border-zinc-800 shadow-sm transition-all overflow-hidden ${
                              rowErrors.length > 0 ? "border-red-300 dark:border-red-950/40" :
                              rowWarnings.length > 0 ? "border-amber-300 dark:border-amber-950/40" :
                              "hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            {/* Card Core Row */}
                            <div className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                              
                              {/* Client ID */}
                              <div className="w-24 shrink-0 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Client ID</label>
                                <div className="relative">
                                  <input 
                                    id={`input-${idx}-clientId`}
                                    className={`w-full border rounded-lg px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 font-mono focus:ring-blue-500 ${
                                      rowErrors.some(e => e.key === "clientId") ? "border-red-500 bg-red-950/20 text-red-500 font-bold" : ""
                                    }`}
                                    value={c.clientId}
                                    placeholder="Auto"
                                    onChange={(e) => handleClientFieldChange(idx, "clientId", e.target.value)}
                                  />
                                  {c.clientId && existingClientIds.includes(c.clientId.toLowerCase().trim()) && (
                                    <span className="absolute -top-3.5 right-0 text-[8px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-1 py-0.5 rounded leading-none border border-blue-200 dark:border-blue-900/30">
                                      Exists
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Company Name */}
                              <div className="flex-1 min-w-[150px] space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Company Name</label>
                                  {c.companyName && existingClientCompanies.includes(c.companyName.toLowerCase().trim()) && (
                                    <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-1 py-0.5 rounded leading-none border border-blue-200 dark:border-blue-900/30">
                                      Exists
                                    </span>
                                  )}
                                </div>
                                <input 
                                  id={`input-${idx}-companyName`}
                                  className={`w-full border rounded-lg px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 font-bold focus:ring-blue-500 ${
                                    rowErrors.some(e => e.key === "companyName") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                                  }`}
                                  value={c.companyName}
                                  onChange={(e) => handleClientFieldChange(idx, "companyName", e.target.value)}
                                />
                              </div>

                              {/* Contact Person */}
                              <div className="w-36 shrink-0 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Contact Person</label>
                                <input 
                                  id={`input-${idx}-contactPerson`}
                                  className={`w-full border rounded-lg px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus:ring-blue-500 ${
                                    rowErrors.some(e => e.key === "contactPerson") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                                  }`}
                                  value={c.contactPerson}
                                  onChange={(e) => handleClientFieldChange(idx, "contactPerson", e.target.value)}
                                />
                              </div>

                              {/* Phone */}
                              <div className="w-36 shrink-0 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Phone</label>
                                <input 
                                  id={`input-${idx}-phone`}
                                  className={`w-full border rounded-lg px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 font-mono text-right focus:ring-blue-500 ${
                                    rowErrors.some(e => e.key === "phone") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                                  }`}
                                  value={c.phone}
                                  onChange={(e) => handleClientFieldChange(idx, "phone", e.target.value)}
                                />
                              </div>

                              {/* Client Type */}
                              <div className="w-28 shrink-0 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Client Type</label>
                                <select 
                                  id={`input-${idx}-clientType`}
                                  className={`w-full h-7 rounded-lg border bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 px-2 py-0 text-xs shadow-sm focus:ring-blue-500 ${
                                    rowErrors.some(e => e.key === "clientType") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                                  }`}
                                  value={c.clientType}
                                  onChange={(e) => handleClientFieldChange(idx, "clientType", e.target.value)}
                                >
                                  <option value="Dealer">Dealer</option>
                                  <option value="Interior">Interior</option>
                                  <option value="Project">Project</option>
                                  <option value="Special">Special</option>
                                </select>
                              </div>

                              {/* Status Badge */}
                              <div className="shrink-0 flex flex-col items-center justify-center space-y-1 w-14">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Status</span>
                                {rowErrors.length > 0 ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-red-100 text-red-750 dark:bg-red-950/20 dark:text-red-400 font-bold text-[9px] border border-red-200 dark:border-red-900/30 shadow-sm animate-pulse">
                                    Error
                                  </span>
                                ) : rowWarnings.length > 0 ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-bold text-[9px] border border-amber-200 dark:border-amber-900/30 shadow-sm">
                                    Warning
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-455 font-bold text-[9px] border border-green-200 dark:border-green-900/30 shadow-sm">
                                    ✓ Ready
                                  </span>
                                )}
                              </div>

                              {/* Collapse & Delete */}
                              <div className="shrink-0 flex items-center gap-1.5 self-end mb-1">
                                <button
                                  type="button"
                                  onClick={() => setExpandedRows(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                  className="p-1.5 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-650 dark:text-zinc-300 dark:border-zinc-800 transition-all flex items-center gap-1 cursor-pointer text-[10px] font-semibold"
                                >
                                  {isExpanded ? (
                                    <>Collapse <ChevronUp size={12} /></>
                                  ) : (
                                    <>View Details <ChevronDown size={12} /></>
                                  )}
                                </button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClient(idx)}
                                  className="h-8 w-8 text-zinc-450 hover:text-red-650 dark:hover:text-red-400"
                                  title="Skip Client"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>

                            {/* Details Drawer */}
                            {isExpanded && (
                              <div className="p-5 bg-zinc-50/50 dark:bg-zinc-900/40 border-t dark:border-zinc-800 text-xs grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top duration-150">
                                
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Email</label>
                                  <input
                                    id={`input-${idx}-email`}
                                    className={`w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-blue-500 ${
                                      rowErrors.some(e => e.key === "email") ? "border-red-500 bg-red-950/20 text-red-500 font-bold" : ""
                                    }`}
                                    value={c.email}
                                    placeholder="e.g. contact@acme.com"
                                    onChange={(e) => handleClientFieldChange(idx, "email", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">TRN (15-digit tax code)</label>
                                  <input
                                    id={`input-${idx}-trn`}
                                    className={`w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-blue-500 font-mono ${
                                      rowErrors.some(e => e.key === "trn") ? "border-red-500 bg-red-950/20 text-red-500 font-bold" : ""
                                    }`}
                                    value={c.trn}
                                    placeholder="e.g. 100123456789012"
                                    onChange={(e) => handleClientFieldChange(idx, "trn", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Assigned Interior Design Consultant</label>
                                  <input
                                    id={`input-${idx}-assignedConsultant`}
                                    className={`w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-blue-500 ${
                                      rowErrors.some(e => e.key === "assignedConsultant") ? "border-red-500 bg-red-950/20 text-red-500 font-bold" : 
                                      rowWarnings.some(e => e.key === "assignedConsultant") ? "border-amber-500" : ""
                                    }`}
                                    value={c.assignedConsultant}
                                    placeholder="e.g. John Consultant"
                                    onChange={(e) => handleClientFieldChange(idx, "assignedConsultant", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1 md:col-span-2">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Address</label>
                                  <textarea
                                    id={`input-${idx}-address`}
                                    className="w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-blue-500 resize-none h-12"
                                    value={c.address}
                                    placeholder="Office location details..."
                                    onChange={(e) => handleClientFieldChange(idx, "address", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Notes</label>
                                  <textarea
                                    id={`input-${idx}-notes`}
                                    className="w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-blue-500 resize-none h-12"
                                    value={c.notes}
                                    placeholder="Key client profile reminders..."
                                    onChange={(e) => handleClientFieldChange(idx, "notes", e.target.value)}
                                  />
                                </div>

                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>

              </div>

              {/* Right sticky sidebar */}
              <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-0 h-full overflow-y-auto pr-1">
                
                {/* Summary panel */}
                <div className="bg-white border rounded-2xl p-5 dark:bg-zinc-900 dark:border-zinc-800 shadow-md space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider border-b dark:border-zinc-800 pb-2">
                    Import Summary
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-550 font-medium">Clients Found:</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{totalDetected}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-550 font-medium">Clients Ready:</span>
                      <span className="font-bold text-green-600 dark:text-green-455">{totalValid}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-550 font-medium">With Errors:</span>
                      <span className={`font-bold ${totalErrors > 0 ? "text-red-500 animate-pulse" : "text-zinc-700 dark:text-zinc-350"}`}>
                        {totalErrors}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/40 rounded-xl text-[10px] text-blue-800 dark:text-blue-400 leading-relaxed flex items-start gap-1.5">
                    <Info size={14} className="shrink-0 mt-0.5 animate-pulse text-blue-550" />
                    <span>Interior Design consultant mappings are validated against current active users directory.</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t dark:border-zinc-850">
                    <Button 
                      onClick={() => setStep(3)}
                      disabled={totalValid === 0}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 shadow-md flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Proceed to Import ({totalValid} Ready) <ArrowRight size={14} />
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleSaveDraft}
                      className="w-full text-xs py-2.5 border-zinc-250 hover:bg-zinc-50 dark:border-zinc-805 dark:hover:bg-zinc-900 cursor-pointer text-zinc-700 dark:text-zinc-300 font-semibold bg-white"
                    >
                      Save Draft
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setUploadedFileMeta(null)
                        setClients([])
                        setStep(1)
                      }}
                      className="w-full text-xs text-zinc-450 hover:text-zinc-650"
                    >
                      Upload Different File
                    </Button>
                  </div>
                </div>

                {/* Collapsible advanced mappings */}
                <div className="border rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
                  <details className="group">
                    <summary className="flex items-center justify-between p-4 font-bold text-xs text-zinc-750 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer select-none">
                      <span>Advanced Column Mapping</span>
                      <ChevronDown size={14} className="transition-all group-open:rotate-180" />
                    </summary>
                    <div className="p-4 border-t dark:border-zinc-800 space-y-4 max-h-[300px] overflow-y-auto">
                      {[
                        { key: "clientId", label: "Client ID", required: false },
                        { key: "companyName", label: "Company Name", required: true },
                        { key: "contactPerson", label: "Contact Person", required: false },
                        { key: "phone", label: "Phone", required: false },
                        { key: "email", label: "Email", required: false },
                        { key: "address", label: "Address", required: false },
                        { key: "trn", label: "TRN", required: false },
                        { key: "clientType", label: "Client Type", required: false },
                        { key: "notes", label: "Notes", required: false },
                        { key: "assignedConsultant", label: "Assigned Interior Design Consultant", required: false }
                      ].map((field) => (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <select 
                            className="w-full h-8 text-[11px] rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-250 focus:ring-blue-500"
                            value={mappings[field.key] || ""}
                            onChange={(e) => recalculateClients({ ...mappings, [field.key]: e.target.value })}
                          >
                            <option value="">-- Unmapped --</option>
                            {headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>

              </div>

            </div>
          )}

          {/* STEP 3: CONFIRM & IMPORT */}
          {step === 3 && !importResult && (
            <div className="max-w-xl mx-auto py-10 space-y-6 text-center animate-in zoom-in duration-150">
              <div className="h-16 w-16 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-full flex items-center justify-center border border-blue-100 dark:border-zinc-850 mx-auto">
                <AlertTriangle className="h-8 w-8 text-blue-500" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">Ready to Import Clients</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Verify the final breakdown of actions before writing the client records to the database.
                </p>
              </div>

              {/* Breakdown Card */}
              <div className="bg-white border rounded-2xl p-6 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm text-left max-w-md mx-auto divide-y dark:divide-zinc-800 text-xs">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-zinc-550 font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500" /> Create New Clients
                  </span>
                  <span className="font-bold text-green-600 dark:text-green-455">{createCount} Clients</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-zinc-550 font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> Update Existing Clients
                  </span>
                  <span className="font-bold text-blue-500">{updateCount} Clients</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-zinc-555 font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Skip (Unresolved Errors)
                  </span>
                  <span className="font-bold text-red-600 dark:text-red-400">{skipCount} Clients</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 max-w-md mx-auto pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(2)}
                  className="flex-1 border-zinc-250 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-semibold bg-white"
                >
                  Back to Review
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={uploading || totalValid === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {uploading ? (
                    <>Importing {uploadProgress ? `(${uploadProgress.current}/${uploadProgress.total})` : ""} <Loader2 className="h-4 w-4 animate-spin" /></>
                  ) : (
                    <>Import Clients</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: IMPORT RESULTS SUMMARY */}
          {importResult && (
            <div className="space-y-6">
              <div className="p-6 bg-slate-900/40 rounded-2xl border space-y-4">
                <h3 className="text-lg font-bold text-foreground">Upload Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-500">{importResult.summary?.successCount || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Successfully Imported</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-500">{importResult.summary?.failCount || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Failed Rows</p>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-500">{importResult.summary?.warningCount || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Warnings</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {importResult.errorFileBase64 && (
                    <Button 
                      onClick={handleDownloadErrorReport}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Download Error File
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={handleReuploadCorrected}
                    className="border-muted hover:bg-muted/50 flex items-center gap-2 cursor-pointer"
                  >
                    Re-upload Corrected File
                  </Button>
                </div>
              </div>

              {/* Error details list */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    Row-Level Errors Details ({importResult.errors.length})
                  </h4>
                  <div className="border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm border-collapse text-left">
                      <thead className="bg-muted/80 sticky top-0 border-b">
                        <tr>
                          <th className="p-3 text-xs font-bold w-16 text-center">Row</th>
                          <th className="p-3 text-xs font-bold w-48">Column</th>
                          <th className="p-3 text-xs font-bold w-48">Value</th>
                          <th className="p-3 text-xs font-bold text-red-500">Error Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((err: any, idx: number) => (
                          <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="p-3 text-center font-mono">{err.row}</td>
                            <td className="p-3 font-semibold">{err.column.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}</td>
                            <td className="p-3 font-mono text-xs max-w-[150px] truncate text-muted-foreground" title={err.value}>{err.value || <span className="italic">blank</span>}</td>
                            <td className="p-3 text-red-500 text-xs">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Warning details list */}
              {importResult.warnings && importResult.warnings.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-yellow-500 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    Validation Warnings ({importResult.warnings.length})
                  </h4>
                  <div className="border rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
                    <table className="w-full text-sm border-collapse text-left">
                      <thead className="bg-muted/80 sticky top-0 border-b">
                        <tr>
                          <th className="p-3 text-xs font-bold w-16 text-center">Row</th>
                          <th className="p-3 text-xs font-bold w-48">Column</th>
                          <th className="p-3 text-xs font-bold w-48">Value</th>
                          <th className="p-3 text-xs font-bold text-yellow-500">Warning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.warnings.map((warn: any, idx: number) => (
                          <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="p-3 text-center font-mono">{warn.row}</td>
                            <td className="p-3 font-semibold">{warn.column.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}</td>
                            <td className="p-3 font-mono text-xs max-w-[150px] truncate text-muted-foreground" title={warn.value}>{warn.value || <span className="italic">blank</span>}</td>
                            <td className="p-3 text-yellow-500 text-xs">{warn.warning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button 
                  onClick={() => {
                    onSuccess()
                    onClose()
                  }} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Close & Refresh Clients List
                </Button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Step 4: Success Screen */}
      {step === 4 && importResult && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="flex flex-col items-center max-w-lg w-full bg-card border rounded-2xl shadow-xl p-8 text-center space-y-6">
            
            {/* Success Icon */}
            <div className="h-24 w-24 bg-green-500/10 text-green-500 border-4 border-green-500/20 rounded-full flex items-center justify-center animate-bounce shadow-inner">
              <CheckCircle size={56} className="animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-3xl font-bold text-foreground tracking-tight">Clients Imported Successfully</h3>
              <p className="text-muted-foreground">
                The client data has been synchronized and stored in the database.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 w-full pt-2">
              <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl border">
                <span className="text-3xl font-bold text-primary">{importResult.summary?.successCount || 0}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Total Imported</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl border">
                <span className="text-3xl font-bold text-green-600">{importResult.summary?.successCount || 0}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">New Created</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl border">
                <span className="text-3xl font-bold text-blue-600">0</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Updated</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl border">
                <span className={`text-3xl font-bold ${(importResult.summary?.failCount || 0) > 0 ? 'text-red-500' : 'text-zinc-500'}`}>{importResult.summary?.failCount || 0}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Skipped / Failed</span>
              </div>
            </div>

            <div className="flex flex-col w-full gap-3 pt-4">
              {importResult.summary?.failCount && importResult.summary.failCount > 0 ? (
                <Button
                  onClick={handleDownloadErrorReport}
                  variant="destructive"
                  className="w-full h-12 text-md font-bold shadow-md"
                >
                  Download Skipped Records
                </Button>
              ) : null}
              <Button
                onClick={() => {
                  onSuccess()
                  onClose()
                }}
                className="w-full h-12 text-md font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              >
                View Clients
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1)
                    setHeaders([])
                    setCsvRows([])
                    setMappings({})
                    setClients([])
                    setImportResult(null)
                    setUploadedFileMeta(null)
                  }}
                  className="w-full h-11"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Import Another File
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onSuccess()
                    onClose()
                  }}
                  className="w-full h-11"
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
