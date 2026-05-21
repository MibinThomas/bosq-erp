"use client"

import { useState, useRef } from "react"
import { 
  X, 
  FileSpreadsheet, 
  Check, 
  Loader2, 
  ArrowRight,
  Sparkles,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { read, utils } from "xlsx"

interface BulkUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ParsedClient {
  clientId: string
  companyName: string
  contactPerson: string
  phone: string
  email: string
  address: string
  trn: string
  clientType: string
  notes: string
}

export function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Upload, 2: Map Columns, 3: Preview
  const [headers, setHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [clients, setClients] = useState<ParsedClient[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Generate and download a clean CSV import template
  const downloadSampleCSV = (e: React.MouseEvent) => {
    e.stopPropagation()
    const headers = ["Client ID", "Company Name", "Contact Person", "Phone", "Email", "Address", "TRN", "Client Type", "Notes"]
    const rows = [
      ["C-1001", "Acme Corporation", "John Doe", "+123456789", "john@acme.com", "123 Business Rd", "123456789012345", "Direct", "Important client"],
      ["C-1002", "Tech Innovators", "Jane Smith", "+987654321", "jane@tech.com", "456 Tech Park", "987654321098765", "Dealer", "Bulk purchaser"],
    ]
    
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "bosq_client_import_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Import template downloaded!")
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

      // Clean rows and format cell values
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

      // Auto-suggest mappings based on common names
      const initialMappings: Record<string, string> = {}
      const targetFields = [
        { key: "clientId", synonyms: ["id", "clientid", "customerid", "code"] },
        { key: "companyName", synonyms: ["company", "name", "companyname", "client", "customer"] },
        { key: "contactPerson", synonyms: ["contact", "person", "contactperson", "attention"] },
        { key: "phone", synonyms: ["phone", "mobile", "tel", "contactnumber"] },
        { key: "email", synonyms: ["email", "e-mail", "mail"] },
        { key: "address", synonyms: ["address", "location", "city", "street"] },
        { key: "trn", synonyms: ["trn", "tax", "vat", "taxnumber"] },
        { key: "clientType", synonyms: ["type", "clienttype", "category", "segment"] },
        { key: "notes", synonyms: ["notes", "remarks", "comments", "details"] }
      ]

      fileHeaders.forEach(header => {
        const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "")
        const matched = targetFields.find(field => 
          field.key.toLowerCase() === cleanHeader || 
          field.synonyms.some(syn => cleanHeader.includes(syn))
        )
        if (matched) {
          initialMappings[matched.key] = header
        }
      })

      setMappings(initialMappings)
      setStep(2)
      toast.success("Spreadsheet parsed successfully!")
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

  const handleColumnMapping = () => {
    // Validate required fields (Company Name is essential)
    if (!mappings["companyName"]) {
      toast.error("Please map at least the Company Name column.")
      return
    }

    // Convert CSV rows to client objects using mapped columns
    const parsedClients: ParsedClient[] = csvRows.map(row => {
      const getVal = (fieldKey: string) => {
        const colHeader = mappings[fieldKey]
        if (!colHeader) return ""
        const colIdx = headers.indexOf(colHeader)
        return colIdx !== -1 ? row[colIdx] : ""
      }

      return {
        clientId: getVal("clientId"),
        companyName: getVal("companyName"),
        contactPerson: getVal("contactPerson"),
        phone: getVal("phone"),
        email: getVal("email"),
        address: getVal("address"),
        trn: getVal("trn"),
        clientType: getVal("clientType") || "Direct",
        notes: getVal("notes")
      }
    }).filter(c => c.companyName)

    setClients(parsedClients)
    setStep(3)
  }

  const handleImport = async () => {
    setUploading(true)
    try {
      const res = await fetch("/api/clients/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clients })
      })

      if (!res.ok) throw new Error("Bulk import failed")
      const data = await res.json()

      toast.success(`Successfully imported ${data.count} clients!`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Failed to import clients. Please verify data formats.")
    } finally {
      setUploading(false)
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              Bulk Client Importer
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload your client list spreadsheet and map columns.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Steps Progress */}
        <div className="flex items-center px-8 py-3 bg-muted/40 border-b text-xs font-semibold gap-4 select-none">
          <span className={`px-2 py-1 rounded-full ${step === 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            1. Upload Spreadsheet
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className={`px-2 py-1 rounded-full ${step === 2 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            2. Map Schema Columns
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className={`px-2 py-1 rounded-full ${step === 3 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            3. Preview & Import
          </span>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: UPLOAD SPREADSHEET */}
          {step === 1 && (
            <div className="space-y-6 py-4">
              <div 
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  dragActive ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50 hover:bg-muted/30"
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
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 shadow-inner">
                  <FileSpreadsheet className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Drag & Drop Client List</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Support standard CSV or Excel (.xlsx) client listings.
                </p>
                <Button className="mt-4 bg-primary hover:bg-primary/90">
                  Select Spreadsheet File
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border">
                <div>
                  <h4 className="font-semibold text-sm">Need an import template?</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Download a sample CSV file pre-configured with the ideal headers and sample clients.</p>
                </div>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={downloadSampleCSV}
                  className="border-primary/20 hover:bg-primary/5 hover:border-primary/45 text-primary text-xs shrink-0 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download Sample CSV
                </Button>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex gap-3 text-xs text-primary leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Pro-Tip for SharePoint Client Lists:</p>
                  You can upload your downloaded Excel spreadsheet (**xlsx**) directly without saving as CSV! Our dynamic mapper will automatically read your columns and map them perfectly.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="p-4 bg-secondary/35 rounded-xl text-sm border">
                🔍 **Dynamic Header Mapper**: Select which spreadsheet column header matches each system client property below.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "clientId", label: "Client ID", required: false },
                  { key: "companyName", label: "Company Name", required: true },
                  { key: "contactPerson", label: "Contact Person", required: false },
                  { key: "phone", label: "Phone", required: false },
                  { key: "email", label: "Email", required: false },
                  { key: "address", label: "Address", required: false },
                  { key: "trn", label: "TRN", required: false },
                  { key: "clientType", label: "Client Type (Direct, Dealer, etc)", required: false }
                ].map((field) => (
                  <div key={field.key} className="space-y-2 p-3 border rounded-xl bg-card/50 shadow-inner">
                    <label className="text-xs font-bold flex items-center justify-between">
                      <span>{field.label} {field.required && <span className="text-destructive">*</span>}</span>
                      {mappings[field.key] && (
                        <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5">
                          <Check className="h-3 w-3" /> Auto-Mapped
                        </span>
                      )}
                    </label>
                    <select 
                      className="w-full h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm"
                      value={mappings[field.key] || ""}
                      onChange={(e) => setMappings({ ...mappings, [field.key]: e.target.value })}
                    >
                      <option value="">-- Choose Column --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={handleColumnMapping} className="bg-primary">
                  Map & Preview List <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === 3 && (
            <div className="space-y-6">
              
              {/* Table Preview */}
              <div className="border rounded-xl overflow-hidden max-h-[450px] overflow-y-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead className="bg-muted/80 sticky top-0 border-b z-10">
                    <tr>
                      <th className="p-3 text-xs font-bold w-24">ID</th>
                      <th className="p-3 text-xs font-bold">Company Name</th>
                      <th className="p-3 text-xs font-bold">Contact Person</th>
                      <th className="p-3 text-xs font-bold">Phone</th>
                      <th className="p-3 text-xs font-bold">Email</th>
                      <th className="p-3 text-xs font-bold">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-2 font-mono">
                          <input 
                            className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent"
                            value={c.clientId}
                            placeholder="Auto"
                            onChange={(e) => {
                              const updated = [...clients]
                              updated[idx].clientId = e.target.value
                              setClients(updated)
                            }}
                          />
                        </td>
                        <td className="p-2 font-semibold">
                          <input 
                            className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent font-semibold"
                            value={c.companyName}
                            onChange={(e) => {
                              const updated = [...clients]
                              updated[idx].companyName = e.target.value
                              setClients(updated)
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent"
                            value={c.contactPerson}
                            onChange={(e) => {
                              const updated = [...clients]
                              updated[idx].contactPerson = e.target.value
                              setClients(updated)
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent"
                            value={c.phone}
                            onChange={(e) => {
                              const updated = [...clients]
                              updated[idx].phone = e.target.value
                              setClients(updated)
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent"
                            value={c.email}
                            onChange={(e) => {
                              const updated = [...clients]
                              updated[idx].email = e.target.value
                              setClients(updated)
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent"
                            value={c.clientType}
                            onChange={(e) => {
                              const updated = [...clients]
                              updated[idx].clientType = e.target.value
                              setClients(updated)
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Step Footer */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(2)} disabled={uploading}>
                  Back
                </Button>
                <Button onClick={handleImport} className="bg-primary" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing Clients...
                    </>
                  ) : (
                    <>
                      Import {clients.length} Clients
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
