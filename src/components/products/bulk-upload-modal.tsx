"use client"

import { useState, useRef, useEffect } from "react"
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
import { ImageCropper } from "@/components/ui/image-cropper"

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
  shortDescription: string
  specifications: string
  unitPrice: number
  costPrice: number
  dealerPrice: number
  interiorPrice: number
  directPrice: number
  onlinePrice: number
  warranty: string
  imageFilename: string
  localImageFile?: File
  previewUrl?: string
  status: string
  chairType?: string
  tableTopFinish?: string
  legType?: string
  storageOptions?: string
  finishMaterial?: string
  availableColors?: string
  dimensions?: string
}

export function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Upload, 2: Map Columns, 3: Preview & Images
  const [headers, setHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [products, setProducts] = useState<ParsedProduct[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [pricingTiers, setPricingTiers] = useState({ dealer: 15, interior: 30, direct: 50, online: 75 })
  const [exporting, setExporting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ row: number; column: string; message: string; key?: string }[]>([])

  // Cropper states
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null)
  const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      fetch("/api/settings/pricing")
        .then(res => res.json())
        .then(data => {
          if (!data.error) setPricingTiers(data)
        })
        .catch(console.error)
    }
  }, [isOpen])

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

  const CSV_HEADERS = [
    "Product Code",
    "Product Name",
    "Short Description",
    "Category",
    "Base Price (AED)",
    "Warranty",
    "Product Type",
    "Chair Type (for chairs)",
    "Color (for chairs)",
    "Table Top Finish (for workstations)",
    "Leg Type (for workstations)",
    "Storage Options (for workstations)",
    "Specifications / Details",
    "Dimensions",
    "Image Filename"
  ]

  const serializeToCSVCell = (val: any) => {
    if (val === null || val === undefined) return '""'
    const str = String(val)
    return `"${str.replace(/"/g, '""')}"`
  }

  const downloadEmptyTemplate = (e: React.MouseEvent) => {
    e.stopPropagation()
    const csvContent = CSV_HEADERS.join(",") + "\n"
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "bosq_product_import_template_empty.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Empty import template downloaded!")
  }

  const downloadExistingProductsCSV = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setExporting(true)
    try {
      const res = await fetch("/api/products")
      if (!res.ok) throw new Error("Failed to fetch products")
      const productsList = await res.json()

      const rows = productsList.map((p: any) => {
        let imageFilename = ""
        if (p.imageUrl) {
          try {
            const urlParts = p.imageUrl.split("/")
            imageFilename = urlParts[urlParts.length - 1] || p.imageUrl
          } catch {
            imageFilename = p.imageUrl
          }
        }
        return [
          p.productCode || "",
          p.productName || "",
          p.shortDescription || "",
          p.category?.name || p.categoryName || "",
          typeof p.costPrice === "number" ? p.costPrice.toFixed(2) : "0.00",
          p.warranty || "",
          p.finishMaterial || "",
          p.chairType || "",
          p.availableColors || "",
          p.tableTopFinish || "",
          p.legType || "",
          p.storageOptions || "",
          p.specifications || "",
          p.dimensions || "",
          imageFilename
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
      link.setAttribute("download", "bosq_existing_products_catalog.csv")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`Exported ${productsList.length} products successfully!`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to export existing products. Please try again.")
    } finally {
      setExporting(false)
    }
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
        { key: "productCode", synonyms: ["product code", "code", "sku", "productcode", "itemcode", "id"] },
        { key: "productName", synonyms: ["product name", "name", "title", "productname", "chairname", "item"] },
        { key: "shortDescription", synonyms: ["short description", "shortdescription", "short desc", "summary"] },
        { key: "categoryName", synonyms: ["category", "type", "group", "class", "categoryname"] },
        { key: "basePrice", synonyms: ["base price (aed)", "base price", "price", "unitprice", "rate", "cost", "sellingprice", "selling rate", "baseprice", "costprice"] },
        { key: "warranty", synonyms: ["warranty", "warranty period", "guarantee", "period"] },
        { key: "finishMaterial", synonyms: ["product type", "producttype", "finish / material", "finish/material", "finish material", "finishmaterial"] },
        { key: "chairType", synonyms: ["chair type (for chairs)", "chair type", "chairtype"] },
        { key: "availableColors", synonyms: ["color (for chairs)", "color", "colors", "available color(s)", "available colors", "availablecolors"] },
        { key: "tableTopFinish", synonyms: ["table top finish (for workstations)", "table top finish", "tabletop finish", "tabletopfinish"] },
        { key: "legType", synonyms: ["leg type (for workstations)", "leg type", "legtype"] },
        { key: "storageOptions", synonyms: ["storage options (for workstations)", "storage options", "storageoptions"] },
        { key: "specifications", synonyms: ["specifications / details", "specifications", "details", "specs", "specification", "technical"] },
        { key: "dimensions", synonyms: ["dimensions", "dimension", "size"] },
        { key: "imageFilename", synonyms: ["image filename", "image", "photo", "filename", "imagename", "imagefilename", "picture"] }
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

  const validateProducts = (items: ParsedProduct[]) => {
    const errors: { row: number; column: string; message: string; key?: string }[] = []
    
    items.forEach((p, idx) => {
      const csvRowNum = idx + 2
      
      if (!p.productName) {
        errors.push({
          row: csvRowNum,
          column: mappings["productName"] || "Product Name",
          message: "Product Name is required",
          key: "productName"
        })
      }
      
      if (!p.categoryName) {
        errors.push({
          row: csvRowNum,
          column: mappings["categoryName"] || "Category",
          message: "Category is required",
          key: "categoryName"
        })
      }
      
      if (typeof p.costPrice !== "number" || isNaN(p.costPrice) || p.costPrice <= 0) {
        errors.push({
          row: csvRowNum,
          column: mappings["basePrice"] || "Base Price (AED)",
          message: "Base Price must be a valid positive number",
          key: "basePrice"
        })
      }
      
      if (p.shortDescription && (p.shortDescription.length < 145 || p.shortDescription.length > 260)) {
        errors.push({
          row: csvRowNum,
          column: mappings["shortDescription"] || "Short Description",
          message: `Short description must be 145-260 characters (currently ${p.shortDescription.length})`,
          key: "shortDescription"
        })
      }
      
      const lowerCat = (p.categoryName || "").toLowerCase()
      if (lowerCat === "chair" || lowerCat === "chairs") {
        if (!p.chairType) {
          errors.push({
            row: csvRowNum,
            column: mappings["chairType"] || "Chair Type",
            message: "Chair Type is required for Chair category",
            key: "chairType"
          })
        }
        if (!p.availableColors) {
          errors.push({
            row: csvRowNum,
            column: mappings["availableColors"] || "Color (for chairs)",
            message: "Color is required for Chair category",
            key: "availableColors"
          })
        }
      } else if (lowerCat === "workstation" || lowerCat === "workstations") {
        if (!p.tableTopFinish) {
          errors.push({
            row: csvRowNum,
            column: mappings["tableTopFinish"] || "Table Top Finish",
            message: "Table Top Finish is required for Workstation category",
            key: "tableTopFinish"
          })
        }
        if (!p.legType) {
          errors.push({
            row: csvRowNum,
            column: mappings["legType"] || "Leg Type",
            message: "Leg Type is required for Workstation category",
            key: "legType"
          })
        }
        if (!p.storageOptions) {
          errors.push({
            row: csvRowNum,
            column: mappings["storageOptions"] || "Storage Options",
            message: "Storage Options are required for Workstation category",
            key: "storageOptions"
          })
        }
      }
    })
    
    return errors
  }

  const downloadErrorReport = () => {
    const reportHeaders = ["Row Number", "Column Name", "Error Message", "Property Key"]
    const rows = validationErrors.map(err => [
      `Row ${err.row}`,
      err.column,
      err.message,
      err.key || ""
    ])
    
    const csvContent = [
      reportHeaders.join(","),
      ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "product_import_errors_report.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Error report downloaded!")
  }

  const handleColumnMapping = () => {
    // Validate that all required headers are mapped
    const missingCols = []
    if (!mappings["productName"]) missingCols.push("Product Name / Title")
    if (!mappings["categoryName"]) missingCols.push("Category")
    if (!mappings["basePrice"]) missingCols.push("Base Price (AED)")
    
    if (missingCols.length > 0) {
      toast.error(`Please map all mandatory columns: ${missingCols.join(", ")}`)
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
          return val !== undefined && val !== null ? String(val).trim() : ""
        }
        return ""
      }

      const basePriceVal = parseFloat(getVal("basePrice").replace(/[^0-9.]/g, ""))
      const basePrice = isNaN(basePriceVal) ? 0.0 : basePriceVal

      const calculatePrice = (pct: number) => {
        if (pct >= 100) return basePrice
        return Number((basePrice / (1 - (pct / 100))).toFixed(2))
      }

      const dealerPrice = calculatePrice(pricingTiers.dealer)
      const interiorPrice = calculatePrice(pricingTiers.interior)
      const directPrice = calculatePrice(pricingTiers.direct)
      const onlinePrice = calculatePrice(pricingTiers.online)

      return {
        productCode: getVal("productCode"),
        productName: getVal("productName"),
        categoryName: getVal("categoryName") || "Chairs",
        description: getVal("description"),
        shortDescription: getVal("shortDescription"),
        specifications: getVal("specifications"),
        unitPrice: directPrice,
        costPrice: basePrice,
        dealerPrice,
        interiorPrice,
        directPrice,
        onlinePrice,
        warranty: getVal("warranty") || "5 Years",
        finishMaterial: getVal("finishMaterial"),
        chairType: getVal("chairType"),
        availableColors: getVal("availableColors"),
        tableTopFinish: getVal("tableTopFinish"),
        legType: getVal("legType"),
        storageOptions: getVal("storageOptions"),
        dimensions: getVal("dimensions"),
        imageFilename: getVal("imageFilename"),
        status: "ACTIVE"
      }
    })

    setProducts(parsedProducts)
    const errors = validateProducts(parsedProducts)
    setValidationErrors(errors)
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
    const reader = new FileReader()
    reader.onloadend = () => {
      setActiveProductIndex(index)
      setCropperImageSrc(reader.result as string)
      setIsCropperOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropSave = (croppedBase64: string) => {
    if (activeProductIndex === null) return
    setIsCropperOpen(false)
    const updatedProducts = [...products]
    updatedProducts[activeProductIndex].previewUrl = croppedBase64
    setProducts(updatedProducts)
    toast.success(`Image cropped and applied for product row ${activeProductIndex + 1}!`)
  }

  const handleImport = async () => {
    setUploading(true)
    try {
      // 1. Process and upload images sequentially
      const finalizedProducts = []
      
      for (let i = 0; i < products.length; i++) {
        const prod = products[i]
        let uploadedUrl = null

        if (prod.previewUrl && prod.previewUrl.startsWith("data:image/")) {
          uploadedUrl = prod.previewUrl
        } else if (prod.localImageFile) {
          // In a real application we would upload this to Supabase Storage.
          // For absolute robustness, we will convert the image to a Base64 string which we pass to our backend,
          // or we can save it. Converting to base64 gives a fully mockable/embeddable representation,
          // or we can upload via standard body!
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error("Failed to read image file"))
            reader.readAsDataURL(prod.localImageFile!)
          })
          
          uploadedUrl = base64Data
        }

        finalizedProducts.push({
          ...prod,
          imageUrl: uploadedUrl
        })
      }

      // 2. Validate shortDescription length
      for (const prod of finalizedProducts) {
        if (prod.shortDescription && (prod.shortDescription.length < 145 || prod.shortDescription.length > 260)) {
          toast.error(`Invalid short description length for ${prod.productCode || prod.productName}. Must be 145-260 characters.`);
          setUploading(false);
          return;
        }
      }

      // 3. Submit to bulk API
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

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-muted/50 rounded-2xl border gap-4">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm">Need a CSV template or existing data?</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Download a clean empty template to import new products, or download existing product data to make bulk edits.</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={downloadEmptyTemplate}
                    className="border-primary/20 hover:bg-primary/5 hover:border-primary/45 text-primary text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Download Empty Template
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={downloadExistingProductsCSV}
                    disabled={exporting}
                    className="border-primary/20 hover:bg-primary/5 hover:border-primary/45 text-primary text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    Download Existing Products
                  </Button>
                </div>
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
                  { key: "basePrice", label: "Base Price (AED)", required: true },
                  { key: "warranty", label: "Warranty period", required: false },
                  { key: "finishMaterial", label: "Product Type (Finish/Material)", required: false },
                  { key: "chairType", label: "Chair Type (for chairs)", required: false },
                  { key: "availableColors", label: "Color (for chairs)", required: false },
                  { key: "tableTopFinish", label: "Table Top Finish (for workstations)", required: false },
                  { key: "legType", label: "Leg Type (for workstations)", required: false },
                  { key: "storageOptions", label: "Storage Options (for workstations)", required: false },
                  { key: "shortDescription", label: "Short Description (145-260 chars)", required: false },
                  { key: "specifications", label: "Specifications / Details", required: false },
                  { key: "dimensions", label: "Dimensions", required: false },
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
          {step === 3 && (() => {
            const hasCellError = (rowIdx: number, key: string) => {
              const csvRowNum = rowIdx + 2
              return validationErrors.some(err => err.row === csvRowNum && err.key === key)
            }

            const handleProductFieldChange = (index: number, key: keyof ParsedProduct, value: any) => {
              const updated = [...products]
              let parsedValue = value
              
              if (key === "costPrice") {
                const parsed = parseFloat(value)
                parsedValue = isNaN(parsed) ? 0.0 : parsed
              }
              
              updated[index] = { ...updated[index], [key]: parsedValue }
              
              // If changing costPrice, recalculate other price tiers
              if (key === "costPrice") {
                const cost = parsedValue as number
                const calculatePrice = (pct: number) => {
                  if (pct >= 100) return cost
                  return Number((cost / (1 - (pct / 100))).toFixed(2))
                }
                updated[index].dealerPrice = calculatePrice(pricingTiers.dealer)
                updated[index].interiorPrice = calculatePrice(pricingTiers.interior)
                updated[index].directPrice = calculatePrice(pricingTiers.direct)
                updated[index].onlinePrice = calculatePrice(pricingTiers.online)
                updated[index].unitPrice = updated[index].directPrice
              }
              
              setProducts(updated)
              const errors = validateProducts(updated)
              setValidationErrors(errors)
            }

            return (
              <div className="space-y-6">
                
                {/* Validation Error Banner */}
                {validationErrors.length > 0 && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 font-semibold font-mono">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                      <span>Found {validationErrors.length} validation error(s) in the data. Please fix highlighted cells below or download the report.</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={downloadErrorReport}
                      className="border-destructive/30 hover:bg-destructive/10 text-destructive text-[11px] shrink-0"
                    >
                      Download Error Report
                    </Button>
                  </div>
                )}

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
                        <th className="p-3 text-xs font-bold w-48">Product Name</th>
                        <th className="p-3 text-xs font-bold w-28">Category</th>
                        <th className="p-3 text-xs font-bold w-20 text-right">Base</th>
                        <th className="p-3 text-xs font-bold w-20 text-right">Dealer</th>
                        <th className="p-3 text-xs font-bold w-20 text-right">Interior</th>
                        <th className="p-3 text-xs font-bold w-20 text-right">Direct</th>
                        <th className="p-3 text-xs font-bold w-20 text-right">Online</th>
                        <th className="p-3 text-xs font-bold w-24">Warranty</th>
                        <th className="p-3 text-xs font-bold w-28">Product Type</th>
                        <th className="p-3 text-xs font-bold w-28">Chair Type</th>
                        <th className="p-3 text-xs font-bold w-24">Color</th>
                        <th className="p-3 text-xs font-bold w-28">Table Top Finish</th>
                        <th className="p-3 text-xs font-bold w-28">Leg Type</th>
                        <th className="p-3 text-xs font-bold w-28">Storage Options</th>
                        <th className="p-3 text-xs font-bold w-48">Short Description</th>
                        <th className="p-3 text-xs font-bold w-48">Specifications</th>
                        <th className="p-3 text-xs font-bold w-24">Dimensions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-2 align-middle">
                            {p.previewUrl ? (
                              <div 
                                className="relative h-10 w-10 border rounded-lg overflow-hidden bg-white shadow-inner cursor-pointer hover:border-primary group transition-all"
                                onClick={() => {
                                  setActiveProductIndex(idx)
                                  setCropperImageSrc(p.previewUrl || null)
                                  setIsCropperOpen(true)
                                }}
                                title="Click to adjust and crop image"
                              >
                                <img src={p.previewUrl} alt="Preview" className="object-contain h-full w-full" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <span className="text-[9px] text-white font-bold uppercase text-center">Crop</span>
                                </div>
                              </div>
                            ) : (
                              <button 
                                type="button"
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
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent ${
                                hasCellError(idx, "productCode") ? "border-red-500 bg-red-950/20" : ""
                              }`}
                              value={p.productCode}
                              placeholder="Auto"
                              onChange={(e) => handleProductFieldChange(idx, "productCode", e.target.value)}
                            />
                          </td>
                          <td className="p-2 font-semibold">
                            <input 
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent font-semibold ${
                                hasCellError(idx, "productName") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                              }`}
                              value={p.productName}
                              onChange={(e) => handleProductFieldChange(idx, "productName", e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent ${
                                hasCellError(idx, "categoryName") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                              }`}
                              value={p.categoryName}
                              onChange={(e) => handleProductFieldChange(idx, "categoryName", e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input 
                              type="number"
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent text-right font-mono ${
                                hasCellError(idx, "basePrice") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                              }`}
                              value={p.costPrice || ""}
                              onChange={(e) => handleProductFieldChange(idx, "costPrice", e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input 
                              type="number"
                              className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent text-right font-mono text-muted-foreground"
                              value={p.dealerPrice}
                              readOnly={true}
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input 
                              type="number"
                              className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent text-right font-mono text-muted-foreground"
                              value={p.interiorPrice}
                              readOnly={true}
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input 
                              type="number"
                              className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent text-right font-mono text-muted-foreground"
                              value={p.directPrice}
                              readOnly={true}
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input 
                              type="number"
                              className="w-full border rounded px-1.5 py-0.5 text-xs bg-transparent text-right font-mono text-muted-foreground"
                              value={p.onlinePrice}
                              readOnly={true}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent ${
                                hasCellError(idx, "warranty") ? "border-red-500 bg-red-950/20" : ""
                              }`}
                              value={p.warranty}
                              onChange={(e) => handleProductFieldChange(idx, "warranty", e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent ${
                                hasCellError(idx, "finishMaterial") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                              }`}
                              value={p.finishMaterial || ""}
                              placeholder="Product Type"
                              onChange={(e) => handleProductFieldChange(idx, "finishMaterial", e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent ${
                                hasCellError(idx, "chairType") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                              }`}
                              value={p.chairType || ""}
                              placeholder="Chair Type"
                              onChange={(e) => handleProductFieldChange(idx, "chairType", e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent ${
                                hasCellError(idx, "availableColors") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                              }`}
                              value={p.availableColors || ""}
                              placeholder="Color"
                              onChange={(e) => handleProductFieldChange(idx, "availableColors", e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent ${
                                hasCellError(idx, "tableTopFinish") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                              }`}
                              value={p.tableTopFinish || ""}
                              placeholder="Table Top Finish"
                              onChange={(e) => handleProductFieldChange(idx, "tableTopFinish", e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent ${
                                hasCellError(idx, "legType") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                              }`}
                              value={p.legType || ""}
                              placeholder="Leg Type"
                              onChange={(e) => handleProductFieldChange(idx, "legType", e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent ${
                                hasCellError(idx, "storageOptions") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                              }`}
                              value={p.storageOptions || ""}
                              placeholder="Storage Options"
                              onChange={(e) => handleProductFieldChange(idx, "storageOptions", e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent ${
                                hasCellError(idx, "shortDescription") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                              }`}
                              value={p.shortDescription || ""}
                              placeholder="Short Description"
                              onChange={(e) => handleProductFieldChange(idx, "shortDescription", e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent ${
                                hasCellError(idx, "specifications") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                              }`}
                              value={p.specifications || ""}
                              placeholder="Specifications"
                              onChange={(e) => handleProductFieldChange(idx, "specifications", e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              className={`w-full border rounded px-1.5 py-0.5 text-xs bg-transparent ${
                                hasCellError(idx, "dimensions") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                              }`}
                              value={p.dimensions || ""}
                              placeholder="Dimensions"
                              onChange={(e) => handleProductFieldChange(idx, "dimensions", e.target.value)}
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
                  <Button 
                    onClick={handleImport} 
                    className="bg-primary" 
                    disabled={uploading || validationErrors.length > 0}
                    title={validationErrors.length > 0 ? "Please resolve all validation errors before importing" : ""}
                  >
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
            )
          })()}

        </div>

      </div>

      <ImageCropper
        isOpen={isCropperOpen}
        imageSrc={cropperImageSrc}
        onClose={() => {
          setIsCropperOpen(false)
          setCropperImageSrc(null)
          setActiveProductIndex(null)
        }}
        onCrop={handleCropSave}
      />
    </div>
  )
}
