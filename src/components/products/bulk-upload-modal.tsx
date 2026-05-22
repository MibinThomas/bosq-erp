"use client"

import { useState, useRef } from "react"
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Check, 
  Image as ImageIcon, 
  Loader2, 
  ArrowRight,
  Sparkles,
  AlertCircle,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { read, utils } from "xlsx"

interface BulkUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ParsedProduct {
  productCode: string
  productName: string
  categoryName: string
  description: string
  specifications: string
  unitPrice: number
  costPrice: number
  warranty: string
  availableColors: string
  dimensions: string
  imageFilename: string
  localImageFile?: File
  previewUrl?: string
  status: string
}

export function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Upload, 2: Map Columns, 3: Preview & Images
  const [headers, setHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [products, setProducts] = useState<ParsedProduct[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Lightweight CSV Parser
  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/)
    return lines.map(line => {
      const result = []
      let current = ""
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }).filter(row => row.length > 0 && row.some(cell => cell !== ""))
  }

  // Generate and download a clean CSV import template
  const downloadSampleCSV = (e: React.MouseEvent) => {
    e.stopPropagation()
    const headers = ["Product Code", "Product Name", "CategoryName", "Unit Price (AED)", "Dimensions", "Warranty", "Description", "Image Filename"]
    const rows = [
      ["CH-1001", "Aero Ergonomic Mesh Task Chair", "Chairs", "850.00", "650W x 600D x 1150H", "5 Years", "High-performance ergonomic mesh chair with adaptive lumbar support", "aero_mesh_chair.jpg"],
      ["CH-1002", "Ergo Pro Leather Executive Chair", "Chairs", "1250.00", "700W x 650D x 1200H", "5 Years", "Luxury bonded leather manager chair with pneumatic height tilt adjust", "ergo_leather_chair.jpg"],
      ["DK-2001", "Linear Triple Bench Workstation", "Desks", "2450.00", "2100W x 700D x 755H", "3 Years", "Premium steel frame corporate collaborative workspace table", "bench_workstation.jpg"]
    ]
    
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "bosq_product_import_template.csv")
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
        { key: "productCode", synonyms: ["code", "sku", "productcode", "itemcode", "id"] },
        { key: "productName", synonyms: ["name", "title", "productname", "chairname", "item"] },
        { key: "categoryName", synonyms: ["category", "type", "group", "class", "categoryname"] },
        { key: "unitPrice", synonyms: ["price", "unitprice", "rate", "cost", "sellingprice", "selling rate"] },
        { key: "description", synonyms: ["description", "details", "desc", "about"] },
        { key: "dimensions", synonyms: ["dimensions", "size", "dimension", "width", "height"] },
        { key: "warranty", synonyms: ["warranty", "guarantee", "period"] },
        { key: "imageFilename", synonyms: ["image", "photo", "filename", "imagename", "imagefilename", "picture"] }
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
    // Validate required fields (Name and Category are essential)
    if (!mappings["productName"] || !mappings["categoryName"]) {
      toast.error("Please map at least Product Name and Category Name.")
      return
    }

    // Convert CSV rows to product objects using mapped columns
    const parsedProducts: ParsedProduct[] = csvRows.map(row => {
      const getVal = (fieldKey: string) => {
        const colHeader = mappings[fieldKey]
        if (!colHeader) return ""
        const colIdx = headers.indexOf(colHeader)
        if (colIdx !== -1) {
          const val = row[colIdx]
          return val !== undefined && val !== null ? String(val) : ""
        }
        return ""
      }

      const priceVal = parseFloat(getVal("unitPrice").replace(/[^0-9.]/g, ""))

      return {
        productCode: getVal("productCode"),
        productName: getVal("productName"),
        categoryName: getVal("categoryName") || "Chairs",
        description: getVal("description"),
        specifications: getVal("specifications"),
        unitPrice: isNaN(priceVal) ? 0.0 : priceVal,
        costPrice: 0.0,
        warranty: getVal("warranty") || "5 Years",
        availableColors: getVal("availableColors") || "Standard",
        dimensions: getVal("dimensions") || "Standard",
        imageFilename: getVal("imageFilename"),
        status: "ACTIVE"
      }
    }).filter(p => p.productName)

    setProducts(parsedProducts)
    setStep(3)
  }

  const handleImageBulkUpload = (files: FileList) => {
    const updatedProducts = [...products]
    let matchCount = 0

    Array.from(files).forEach(file => {
      // Find matching product based on image filename
      const fileNameClean = file.name.toLowerCase().trim()
      const matchIdx = updatedProducts.findIndex(p => {
        if (!p.imageFilename) return false
        const pImgClean = p.imageFilename.toLowerCase().trim()
        return fileNameClean === pImgClean || fileNameClean.includes(pImgClean) || pImgClean.includes(fileNameClean)
      })

      if (matchIdx !== -1) {
        updatedProducts[matchIdx].localImageFile = file
        updatedProducts[matchIdx].previewUrl = URL.createObjectURL(file)
        matchCount++
      } else {
        // Fallback fuzzy search on product name
        const matchByNameIdx = updatedProducts.findIndex(p => {
          const pNameClean = p.productName.toLowerCase().replace(/[^a-z0-9]/g, "")
          const fNameClean = file.name.toLowerCase().replace(/[^a-z0-9]/g, "")
          return fNameClean.includes(pNameClean) || pNameClean.includes(fNameClean)
        })

        if (matchByNameIdx !== -1) {
          updatedProducts[matchByNameIdx].localImageFile = file
          updatedProducts[matchByNameIdx].previewUrl = URL.createObjectURL(file)
          matchCount++
        }
      }
    })

    setProducts(updatedProducts)
    toast.success(`Matched ${matchCount} image(s) to products!`)
  }

  const handleSingleImageSelect = (index: number, file: File) => {
    const updatedProducts = [...products]
    updatedProducts[index].localImageFile = file
    updatedProducts[index].previewUrl = URL.createObjectURL(file)
    setProducts(updatedProducts)
  }

  const handleImport = async () => {
    setUploading(true)
    try {
      // 1. Process and upload images sequentially
      const finalizedProducts = []
      
      for (let i = 0; i < products.length; i++) {
        const prod = products[i]
        let uploadedUrl = null

        if (prod.localImageFile) {
          // In a real application we would upload this to Supabase Storage.
          // For absolute robustness, we will convert the image to a Base64 string which we pass to our backend,
          // or we can save it. Converting to base64 gives a fully mockable/embeddable representation,
          // or we can upload via standard body!
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(prod.localImageFile!)
          })
          
          uploadedUrl = base64Data
        }

        finalizedProducts.push({
          ...prod,
          imageUrl: uploadedUrl
        })
      }

      // 2. Submit to bulk API
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: finalizedProducts })
      })

      if (!res.ok) throw new Error("Bulk import failed")
      const data = await res.json()

      toast.success(`Successfully imported ${data.count} products!`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Failed to import products. Please verify data formats.")
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
              Bulk Product Importer
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload your catalog spreadsheet, map columns, and map product images in bulk.
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
            3. Bulk Images & Preview
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
                <h3 className="text-lg font-semibold mb-1">Drag & Drop Product List</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Support standard CSV or Excel (.xlsx) product catalog listings from SharePoint.
                </p>
                <Button className="mt-4 bg-primary hover:bg-primary/90">
                  Select Spreadsheet File
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border">
                <div>
                  <h4 className="font-semibold text-sm">Need an import template?</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Download a sample CSV file pre-configured with the ideal headers and sample products.</p>
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
                  <p className="font-semibold mb-1">Pro-Tip for SharePoint Chair Lists:</p>
                  You can upload your downloaded Excel spreadsheet (**xlsx**) directly without saving as CSV! Our dynamic mapper will automatically read your columns and map them perfectly.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="p-4 bg-secondary/35 rounded-xl text-sm border">
                🔍 **Dynamic Header Mapper**: Select which spreadsheet column header matches each system product property below.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "productCode", label: "Product SKU / Code", required: false },
                  { key: "productName", label: "Product Name / Title", required: true },
                  { key: "categoryName", label: "Category", required: true },
                  { key: "unitPrice", label: "Unit Price (AED)", required: false },
                  { key: "dimensions", label: "Dimensions", required: false },
                  { key: "warranty", label: "Warranty period", required: false },
                  { key: "description", label: "Description / About", required: false },
                  { key: "imageFilename", label: "Image Filename (e.g. chair1.jpg)", required: false }
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
                  Map & Preview Catalog <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & IMAGE BULK UPLOAD */}
          {step === 3 && (
            <div className="space-y-6">
              
              {/* Image Drag and Drop */}
              <div 
                className="border-2 border-dashed border-primary/40 rounded-xl p-4 bg-primary/5 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => imageInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={imageInputRef} 
                  multiple 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => e.target.files && handleImageBulkUpload(e.target.files)}
                />
                <div className="flex items-center gap-2 text-primary">
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-sm font-semibold">Bulk Drop Product Images Here</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Upload multiple chair images. The app automatically maps them by matching the filename (e.g., `AeroChair.jpg`) to rows!
                </p>
              </div>

              {/* Table Preview */}
              <div className="border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead className="bg-muted/80 sticky top-0 border-b z-10">
                    <tr>
                      <th className="p-3 text-xs font-bold w-16">Image</th>
                      <th className="p-3 text-xs font-bold w-24">Code</th>
                      <th className="p-3 text-xs font-bold">Product Name</th>
                      <th className="p-3 text-xs font-bold w-28">Category</th>
                      <th className="p-3 text-xs font-bold w-24 text-right">Price (AED)</th>
                      <th className="p-3 text-xs font-bold w-24">Warranty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-2 align-middle">
                          {p.previewUrl ? (
                            <div className="relative h-10 w-10 border rounded-lg overflow-hidden bg-white shadow-inner">
                              <img src={p.previewUrl} alt="Preview" className="object-contain h-full w-full" />
                            </div>
                          ) : (
                            <button 
                              className="h-10 w-10 border rounded-lg flex items-center justify-center bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
                              onClick={() => {
                                const inp = document.createElement("input")
                                inp.type = "file"
                                inp.accept = "image/*"
                                inp.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0]
                                  if (file) handleSingleImageSelect(idx, file)
                                }
                                inp.click()
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                        <td className="p-2 font-mono">
                          <input 
                            className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent"
                            value={p.productCode}
                            placeholder="Auto"
                            onChange={(e) => {
                              const updated = [...products]
                              updated[idx].productCode = e.target.value
                              setProducts(updated)
                            }}
                          />
                        </td>
                        <td className="p-2 font-semibold">
                          <input 
                            className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent font-semibold"
                            value={p.productName}
                            onChange={(e) => {
                              const updated = [...products]
                              updated[idx].productName = e.target.value
                              setProducts(updated)
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent"
                            value={p.categoryName}
                            onChange={(e) => {
                              const updated = [...products]
                              updated[idx].categoryName = e.target.value
                              setProducts(updated)
                            }}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input 
                            type="number"
                            className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent text-right font-mono"
                            value={p.unitPrice}
                            onChange={(e) => {
                              const updated = [...products]
                              updated[idx].unitPrice = parseFloat(e.target.value) || 0
                              setProducts(updated)
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent"
                            value={p.warranty}
                            onChange={(e) => {
                              const updated = [...products]
                              updated[idx].warranty = e.target.value
                              setProducts(updated)
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
                      Importing Products...
                    </>
                  ) : (
                    <>
                      Import {products.length} Products
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
