"use client"

import { useState, useRef, useEffect } from "react"
import { 
  X, 
  FileSpreadsheet, 
  Check, 
  Loader2, 
  Upload,
  AlertCircle,
  AlertTriangle,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { read, write, utils } from "xlsx"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface QuotationBulkUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ParsedQuotation {
  rowIndex?: number
  quotationNumber: string
  revisionNumber: string
  clientId: string
  preparedByEmail: string
  projectName: string
  date: string
  validityDate: string
  status: string
  grandTotal: string
  notes: string
  salesAgentName: string
}

export function QuotationBulkUploadModal({ isOpen, onClose, onSuccess }: QuotationBulkUploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Upload, 2: Review & Import, 3: Success
  const [quotations, setQuotations] = useState<ParsedQuotation[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  
  const [importResult, setImportResult] = useState<any | null>(null)
  const [validationErrors, setValidationErrors] = useState<{ row: number; quotationNumber: string; error: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const CSV_HEADERS = [
    "Quotation Number", 
    "Revision Number", 
    "Client ID or Name", 
    "Prepared By Email", 
    "Project Name", 
    "Date", 
    "Validity Date", 
    "Status", 
    "Grand Total",
    "Notes", 
    "Sales Agent Name"
  ]

  const downloadSampleExcel = (e: React.MouseEvent) => {
    e.stopPropagation()
    const sampleData = [
      {
        "Quotation Number": "D1000",
        "Revision Number": "0",
        "Client ID or Name": "C-1001",
        "Prepared By Email": "john@bosq.ae",
        "Project Name": "Office Fitout",
        "Date": "2024-01-15",
        "Validity Date": "2024-02-15",
        "Status": "APPROVED",
        "Grand Total": "15000",
        "Notes": "Historical import",
        "Sales Agent Name": "Jane Doe"
      },
      {
        "Quotation Number": "D1000",
        "Revision Number": "1",
        "Client ID or Name": "C-1001",
        "Prepared By Email": "john@bosq.ae",
        "Project Name": "Office Fitout",
        "Date": "2024-01-20",
        "Validity Date": "2024-02-20",
        "Status": "APPROVED",
        "Grand Total": "15500",
        "Notes": "Added extra chairs",
        "Sales Agent Name": "Jane Doe"
      }
    ]

    const ws = utils.json_to_sheet(sampleData)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, "Quotations")
    
    // Add some styling (column widths)
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, 
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 30 }, { wch: 20 }
    ]

    const wbout = write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "BOSQ_Quotation_Import_Template.xlsx")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Excel import template downloaded!")
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0])
    }
  }

  const processFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer()
      const workbook = read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
      
      if (jsonData.length < 2) {
        toast.error("File appears to be empty or missing data rows")
        return
      }

      const headers = jsonData[0].map(h => String(h).trim())
      const rows = jsonData.slice(1).filter(r => r.length > 0 && r.some(cell => cell !== undefined && cell !== ""))
      
      // Auto-map columns based on template
      const colMap: Record<string, number> = {}
      headers.forEach((h, i) => { colMap[h] = i })

      const parsedQuotations: ParsedQuotation[] = rows.map((row, index) => {
        return {
          rowIndex: index + 2, // 1-based + header
          quotationNumber: String(row[colMap["Quotation Number"]] || ""),
          revisionNumber: String(row[colMap["Revision Number"]] || "0"),
          clientId: String(row[colMap["Client ID or Name"]] || ""),
          preparedByEmail: String(row[colMap["Prepared By Email"]] || ""),
          projectName: String(row[colMap["Project Name"]] || ""),
          date: String(row[colMap["Date"]] || ""),
          validityDate: String(row[colMap["Validity Date"]] || ""),
          status: String(row[colMap["Status"]] || "DRAFT"),
          grandTotal: String(row[colMap["Grand Total"]] || "0"),
          notes: String(row[colMap["Notes"]] || ""),
          salesAgentName: String(row[colMap["Sales Agent Name"]] || "")
        }
      }).filter(q => q.quotationNumber !== "")

      setQuotations(parsedQuotations)
      setStep(2)
      toast.success(`Successfully parsed ${parsedQuotations.length} quotations`)
    } catch (error) {
      console.error(error)
      toast.error("Failed to parse file. Please ensure it's a valid Excel/CSV.")
    }
  }

  const handleImport = async () => {
    setUploading(true)
    setValidationErrors([])
    setImportResult(null)

    try {
      const response = await fetch("/api/quotations/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotations })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || "Import failed")
      }

      setImportResult(data)
      if (data.errors && data.errors.length > 0) {
        setValidationErrors(data.errors)
        toast.warning(`Imported ${data.successCount}, but ${data.failedCount} failed.`)
      } else {
        toast.success(`Successfully imported ${data.successCount} quotations!`)
      }
      setStep(3)
      onSuccess() // Refresh list in background
    } catch (error: any) {
      toast.error(error.message || "Failed to process import")
    } finally {
      setUploading(false)
    }
  }

  const downloadErrorExcel = () => {
    if (validationErrors.length === 0) return

    const errorData = validationErrors.map(err => ({
      "Row Index": err.row,
      "Quotation Number": err.quotationNumber,
      "Error Message": err.error
    }))

    const ws = utils.json_to_sheet(errorData)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, "Errors")
    
    ws['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 60 }]

    const wbout = write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "Quotation_Import_Errors.xlsx")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Error report downloaded!")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 relative">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-orange-500" />
              Bulk Import Quotations
            </h2>
            <p className="text-sm text-slate-400 mt-1">Upload historical quotation data via Excel</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Import Template</p>
                  <p className="text-xs text-slate-400">Download the required Excel format for importing quotations.</p>
                </div>
                <Button onClick={downloadSampleExcel} variant="outline" className="border-orange-500/30 hover:bg-orange-500/10 text-orange-400">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div 
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all ${
                  dragActive ? 'border-orange-500 bg-orange-500/5' : 'border-slate-700 hover:border-slate-600 bg-slate-950/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                />
                <div className="h-16 w-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-inner border border-slate-800">
                  <Upload className="h-8 w-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Drag & Drop Excel File</h3>
                <p className="text-sm text-slate-400 text-center max-w-md mb-6">
                  Upload your populated template here. Ensure Client IDs and User Emails exactly match the database.
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Browse Files
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-slate-950 rounded-lg p-6 border border-slate-800">
                <h3 className="text-lg font-medium text-white mb-2">Ready to Import</h3>
                <p className="text-slate-400 text-sm mb-6">
                  Successfully parsed {quotations.length} quotation records from the uploaded file.
                </p>
                
                <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-md">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 bg-slate-900 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-medium">Quote #</th>
                        <th className="px-4 py-3 font-medium">Rev</th>
                        <th className="px-4 py-3 font-medium">Client</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 bg-slate-950/50">
                      {quotations.slice(0, 10).map((q, i) => (
                        <tr key={i} className="hover:bg-slate-900/50">
                          <td className="px-4 py-3 font-medium text-white">{q.quotationNumber}</td>
                          <td className="px-4 py-3 text-slate-400">{q.revisionNumber}</td>
                          <td className="px-4 py-3 text-slate-300">{q.clientId}</td>
                          <td className="px-4 py-3 text-emerald-400 font-mono">AED {q.grandTotal}</td>
                          <td className="px-4 py-3 text-slate-400">{q.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {quotations.length > 10 && (
                  <p className="text-xs text-slate-500 text-center mt-3 font-medium">
                    Showing 10 of {quotations.length} records
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 3 && importResult && (
            <div className="space-y-6 text-center py-8">
              <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Import Complete</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Processed {importResult.totalReceived} records.
              </p>
              
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
                <Card className="bg-slate-950 border-emerald-500/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-400 mb-1">{importResult.successCount}</div>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Success</div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-950 border-rose-500/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-rose-400 mb-1">{importResult.failedCount}</div>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Failed</div>
                  </CardContent>
                </Card>
              </div>

              {validationErrors.length > 0 && (
                <div className="max-w-xl mx-auto bg-rose-500/10 border border-rose-500/20 rounded-lg p-6 text-left">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="h-5 w-5 text-rose-400" />
                    <h4 className="font-semibold text-rose-400">Failed Records</h4>
                  </div>
                  <p className="text-sm text-slate-300 mb-4">
                    {validationErrors.length} records failed to import due to validation errors (e.g., missing clients, users, or invalid parent revisions).
                  </p>
                  <Button onClick={downloadErrorExcel} className="w-full bg-rose-600 hover:bg-rose-500 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    Download Error Report
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 3 && (
          <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={uploading} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            {step === 2 && (
              <Button 
                onClick={handleImport} 
                disabled={uploading || quotations.length === 0}
                className="bg-orange-600 hover:bg-orange-500 text-white min-w-[120px]"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Import"}
              </Button>
            )}
          </div>
        )}
        {step === 3 && (
          <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
             <Button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white">
              Close Window
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
