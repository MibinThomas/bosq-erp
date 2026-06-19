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
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileCheck2,
  FileWarning,
  CheckCircle,
  HelpCircle,
  Info
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
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Upload, 2: Review & Fix, 3: Confirm & Import
  const [headers, setHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [products, setProducts] = useState<ParsedProduct[]>([])
  const [existingProductCodes, setExistingProductCodes] = useState<string[]>([])
  const [pricingTiers, setPricingTiers] = useState({ dealer: 15, interior: 30, direct: 50, online: 75 })
  const [exporting, setExporting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [imageDragActive, setImageDragActive] = useState(false)
  const [filterStatus, setFilterStatus] = useState<"all" | "errors" | "ready">("all")
  
  // File metadata state
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{
    fileName: string
    fileSize: string
    totalRows: number
    productsDetected: number
    uploadedAt: string
  } | null>(null)

  // Validation details state
  const [validationErrors, setValidationErrors] = useState<{ row: number; column: string; message: string; key: string }[]>([])
  const [validationWarnings, setValidationWarnings] = useState<{ row: number; column: string; message: string; key: string }[]>([])

  // Image Upload Match details
  const [missingImagesList, setMissingImagesList] = useState<string[]>([])
  const [imageInputKey, setImageInputKey] = useState(0)

  // Details drawer open state per row
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

  // Success screen overlay
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)

  // Cropper states
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null)
  const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Load markup pricing configuration
      fetch("/api/settings/pricing")
        .then(res => res.json())
        .then(data => {
          if (!data.error) setPricingTiers(data)
        })
        .catch(console.error)

      // Load existing products database to compare SKUs for update vs create
      fetch("/api/products")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setExistingProductCodes(data.map((p: any) => String(p.productCode).toLowerCase().trim()))
          }
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
    "Product Description",
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
    toast.success("Empty template downloaded successfully.")
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
          p.description || "",
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
      toast.error("Failed to export products.")
    } finally {
      setExporting(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Auto-suggest and process data silently
  const processImportData = (fileHeaders: string[], fileRows: string[][], fileName: string, fileSize: number) => {
    const initialMappings: Record<string, string> = {}
    const targetFields = [
      { key: "productCode", synonyms: ["product code", "code", "sku", "productcode", "itemcode", "id"] },
      { key: "productName", synonyms: ["product name", "name", "title", "productname", "chairname", "item"] },
      { key: "description", synonyms: ["product description", "description", "short description", "shortdescription", "short desc", "summary", "full description"] },
      { key: "categoryName", synonyms: ["category", "type", "group", "class", "categoryname"] },
      { key: "basePrice", synonyms: ["base price (aed)", "base price", "price", "unitprice", "rate", "cost", "sellingprice", "selling rate", "baseprice", "costprice", "price(aed)"] },
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
        field.synonyms.some(syn => {
          const cleanSyn = syn.replace(/[^a-z0-9]/g, "")
          return cleanHeader === cleanSyn || cleanHeader.includes(cleanSyn) || cleanSyn.includes(cleanHeader)
        })
      )
      if (matched) {
        initialMappings[matched.key] = header
      }
    })

    setMappings(initialMappings)

    const parsedProducts: ParsedProduct[] = fileRows.map(row => {
      const getVal = (fieldKey: string) => {
        const colHeader = initialMappings[fieldKey]
        if (!colHeader) return ""
        const colIdx = fileHeaders.indexOf(colHeader)
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

      return {
        productCode: getVal("productCode"),
        productName: getVal("productName"),
        categoryName: getVal("categoryName") || "Chairs",
        description: getVal("description") || getVal("shortDescription") || getVal("specifications") || "",
        specifications: getVal("specifications"),
        unitPrice: calculatePrice(pricingTiers.direct),
        costPrice: basePrice,
        dealerPrice: calculatePrice(pricingTiers.dealer),
        interiorPrice: calculatePrice(pricingTiers.interior),
        directPrice: calculatePrice(pricingTiers.direct),
        onlinePrice: basePrice,
        warranty: getVal("warranty"),
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
    validateCatalogData(parsedProducts, initialMappings)

    const missing = parsedProducts
      .map(p => p.imageFilename)
      .filter(name => !!name)
    setMissingImagesList(Array.from(new Set(missing)))

    setUploadedFileMeta({
      fileName: fileName,
      fileSize: formatBytes(fileSize),
      totalRows: fileRows.length + 1,
      productsDetected: fileRows.length,
      uploadedAt: new Date().toLocaleString()
    })

    toast.success(`Spreadsheet parsed and mapped implicitly!`)
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
        toast.error("The spreadsheet has no data rows.")
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

  // Row by row validation returning errors and warnings separately
  const validateCatalogData = (items: ParsedProduct[], activeMappings?: Record<string, string>) => {
    const currentMappings = activeMappings || mappings
    const errorsList: { row: number; column: string; message: string; key: string }[] = []
    const warningsList: { row: number; column: string; message: string; key: string }[] = []

    const seenCodes = new Map<string, number[]>() // SKU -> rows

    items.forEach((p, idx) => {
      const csvRowNum = idx + 2
      const sku = (p.productCode || "").toLowerCase().trim()
      if (sku) {
        if (!seenCodes.has(sku)) {
          seenCodes.set(sku, [csvRowNum])
        } else {
          seenCodes.get(sku)!.push(csvRowNum)
        }
      }

      // Blocking Errors
      if (!p.productName) {
        errorsList.push({
          row: csvRowNum,
          column: currentMappings["productName"] || "Product Name",
          message: "Product Name is required.",
          key: "productName"
        })
      }
      
      if (!p.categoryName) {
        errorsList.push({
          row: csvRowNum,
          column: currentMappings["categoryName"] || "Category",
          message: "Category name is required.",
          key: "categoryName"
        })
      }

      if (typeof p.costPrice !== "number" || isNaN(p.costPrice) || p.costPrice <= 0) {
        errorsList.push({
          row: csvRowNum,
          column: currentMappings["basePrice"] || "Base Price (AED)",
          message: "Base price must be a valid positive number.",
          key: "costPrice"
        })
      }



      // Category specific checks
      const lowerCat = (p.categoryName || "").toLowerCase()
      if (lowerCat === "chair" || lowerCat === "chairs") {
        if (!p.chairType) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["chairType"] || "Chair Type",
            message: "Chair Type is required for Chair category.",
            key: "chairType"
          })
        }
        if (!p.availableColors) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["availableColors"] || "Color (for chairs)",
            message: "Color is required for Chair category.",
            key: "availableColors"
          })
        }
      } else if (lowerCat === "workstation" || lowerCat === "workstations") {
        if (!p.tableTopFinish) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["tableTopFinish"] || "Table Top Finish",
            message: "Table Top Finish is required for Workstation category.",
            key: "tableTopFinish"
          })
        }
        if (!p.legType) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["legType"] || "Leg Type",
            message: "Leg Type is required for Workstation category.",
            key: "legType"
          })
        }
        if (!p.storageOptions) {
          errorsList.push({
            row: csvRowNum,
            column: currentMappings["storageOptions"] || "Storage Options",
            message: "Storage Options are required for Workstation category.",
            key: "storageOptions"
          })
        }
      }

      // Non-blocking Warnings
      if (!p.warranty) {
        warningsList.push({
          row: csvRowNum,
          column: currentMappings["warranty"] || "Warranty",
          message: "Warranty field is missing (defaults to 5 Years).",
          key: "warranty"
        })
      }

      if (!p.dimensions) {
        warningsList.push({
          row: csvRowNum,
          column: currentMappings["dimensions"] || "Dimensions",
          message: "Dimensions specification is missing.",
          key: "dimensions"
        })
      }

      if (!p.imageFilename && !p.previewUrl) {
        warningsList.push({
          row: csvRowNum,
          column: currentMappings["imageFilename"] || "Image Filename",
          message: "No product image matched.",
          key: "imageFilename"
        })
      }
    })

    // Duplicate SKU checks within the file
    seenCodes.forEach((rows, sku) => {
      if (rows.length > 1) {
        rows.forEach(r => {
          errorsList.push({
            row: r,
            column: currentMappings["productCode"] || "Product SKU / Code",
            message: `Duplicate Product Code '${sku.toUpperCase()}' found on rows: ${rows.join(", ")}.`,
            key: "productCode"
          })
        })
      }
    })

    // Sort by row index
    errorsList.sort((a, b) => a.row - b.row)
    warningsList.sort((a, b) => a.row - b.row)

    setValidationErrors(errorsList)
    setValidationWarnings(warningsList)
  }

  const downloadErrorReport = () => {
    const reportHeaders = ["Row Number", "Column Name", "Type", "Error Message", "Property Key"]
    const errors = validationErrors.map(err => [`Row ${err.row}`, err.column, "ERROR", err.message, err.key || ""])
    const warnings = validationWarnings.map(wrn => [`Row ${wrn.row}`, wrn.column, "WARNING", wrn.message, wrn.key || ""])
    
    const csvContent = [
      reportHeaders.join(","),
      ...[...errors, ...warnings].map(r => r.map(serializeToCSVCell).join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "product_import_validation_report.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Validation report downloaded successfully.")
  }

  const getMatchConfidence = (key: string) => {
    const mappedHeader = mappings[key]
    if (!mappedHeader) return 0
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "")
    const cleanHeader = mappedHeader.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (cleanKey === cleanHeader) return 100
    if (cleanHeader.includes(cleanKey) || cleanKey.includes(cleanHeader)) return 95
    return 80
  }

  // Recalculate products on manual mapping change
  const recalculateProducts = (updatedMappings: Record<string, string>) => {
    setMappings(updatedMappings)
    const parsedProducts: ParsedProduct[] = csvRows.map(row => {
      const getVal = (fieldKey: string) => {
        const colHeader = updatedMappings[fieldKey]
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

      return {
        productCode: getVal("productCode"),
        productName: getVal("productName"),
        categoryName: getVal("categoryName") || "Chairs",
        description: getVal("description") || getVal("shortDescription") || getVal("specifications") || "",
        specifications: getVal("specifications"),
        unitPrice: calculatePrice(pricingTiers.direct),
        costPrice: basePrice,
        dealerPrice: calculatePrice(pricingTiers.dealer),
        interiorPrice: calculatePrice(pricingTiers.interior),
        directPrice: calculatePrice(pricingTiers.direct),
        onlinePrice: basePrice, // Online Price = Base Price
        warranty: getVal("warranty"),
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
    validateCatalogData(parsedProducts, updatedMappings)
    
    // Initial missing images scan
    const missing = parsedProducts
      .map(p => p.imageFilename)
      .filter(name => !!name)
    setMissingImagesList(Array.from(new Set(missing)))

    setStep(3)
  }

  // Expand card, scroll to it, and focus the error field
  const handleFixError = (rowNum: number, fieldKey: string) => {
    const idx = rowNum - 2
    setExpandedRows(prev => ({ ...prev, [idx]: true }))
    
    setTimeout(() => {
      const cardElement = document.getElementById(`product-card-${idx}`)
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      
      const inputId = `input-${idx}-${fieldKey === "costPrice" ? "costPrice" : fieldKey}`
      const inputElement = document.getElementById(inputId)
      if (inputElement) {
        inputElement.focus()
      }
    }, 150)
  }

  // Handle image uploads
  const handleImageBulkUpload = (files: FileList | File[]) => {
    const updatedProducts = [...products]
    let matchCount = 0

    Array.from(files).forEach(file => {
      const fileNameClean = file.name.toLowerCase().trim()
      const dotIndex = fileNameClean.lastIndexOf(".")
      const baseName = dotIndex !== -1 ? fileNameClean.substring(0, dotIndex) : fileNameClean
      
      const matchIdx = updatedProducts.findIndex(p => {
        const pSkuClean = (p.productCode || "").toLowerCase().trim()
        const pImgClean = (p.imageFilename || "").toLowerCase().trim()
        
        if (pSkuClean && (baseName === pSkuClean || baseName.startsWith(pSkuClean) || pSkuClean.startsWith(baseName))) {
          return true
        }
        if (pImgClean && (fileNameClean === pImgClean || fileNameClean.includes(pImgClean) || pImgClean.includes(fileNameClean))) {
          return true
        }
        return false
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
    validateCatalogData(updatedProducts)
    
    // Recalculate missing list
    const missing = updatedProducts
      .filter(p => !p.previewUrl && p.imageFilename)
      .map(p => p.imageFilename)
    setMissingImagesList(Array.from(new Set(missing)))
    
    toast.success(`Matched ${matchCount} image(s) to product items!`)
    setImageInputKey(prev => prev + 1)
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
    validateCatalogData(updatedProducts)
    
    // Recalculate missing list
    const missing = updatedProducts
      .filter(p => !p.previewUrl && p.imageFilename)
      .map(p => p.imageFilename)
    setMissingImagesList(Array.from(new Set(missing)))

    toast.success(`Cropped and matched image successfully.`)
  }

  const handleProductFieldChange = (index: number, key: keyof ParsedProduct, value: any) => {
    const updated = [...products]
    let parsedValue = value
    
    if (key === "costPrice") {
      const parsed = parseFloat(value)
      parsedValue = isNaN(parsed) ? 0.0 : parsed
    }
    
    updated[index] = { ...updated[index], [key]: parsedValue }
    
    // If changing costPrice, recalculate prices
    if (key === "costPrice") {
      const cost = parsedValue as number
      const calculatePrice = (pct: number) => {
        if (pct >= 100) return cost
        return Number((cost / (1 - (pct / 100))).toFixed(2))
      }
      updated[index].dealerPrice = calculatePrice(pricingTiers.dealer)
      updated[index].interiorPrice = calculatePrice(pricingTiers.interior)
      updated[index].directPrice = calculatePrice(pricingTiers.direct)
      updated[index].onlinePrice = cost
      updated[index].unitPrice = updated[index].directPrice
    }
    
    setProducts(updated)
    validateCatalogData(updated)
  }

  const handleImport = async () => {
    setUploading(true)
    try {
      const finalizedProducts = []
      
      for (let i = 0; i < products.length; i++) {
        const prod = products[i]
        
        // Skip products with blocking errors
        const hasErrors = validationErrors.some(err => err.row === (i + 2))
        if (hasErrors) continue

        let uploadedUrl = null
        if (prod.previewUrl && prod.previewUrl.startsWith("data:image/")) {
          uploadedUrl = prod.previewUrl
        } else if (prod.localImageFile) {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error("Failed to read image"))
            reader.readAsDataURL(prod.localImageFile!)
          })
          uploadedUrl = base64Data
        }

        finalizedProducts.push({
          ...prod,
          imageUrl: uploadedUrl
        })
      }

      if (finalizedProducts.length === 0) {
        toast.error("No valid products to import. Please resolve the errors first.")
        setUploading(false)
        return
      }

      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: finalizedProducts })
      })

      if (!res.ok) throw new Error("Bulk import failed")
      const data = await res.json()

      setShowSuccessOverlay(true)
      toast.success(`Successfully imported ${data.count} products!`)
    } catch (err) {
      console.error(err)
      toast.error("Bulk upload failed. Please verify spreadsheet structure.")
    } finally {
      setUploading(false)
    }
  }

  const toggleRowExpansion = (index: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
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

  const handleSaveDraft = () => {
    try {
      localStorage.setItem("bosq_importer_draft_products", JSON.stringify(products))
      localStorage.setItem("bosq_importer_draft_mappings", JSON.stringify(mappings))
      toast.success("Draft catalog progress saved to local storage!")
    } catch (err) {
      toast.error("Failed to save draft.")
    }
  }

  const handleImageDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setImageDragActive(true)
    } else if (e.type === "dragleave") {
      setImageDragActive(false)
    }
  }

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setImageDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageBulkUpload(e.dataTransfer.files)
    }
  }

  const handleDeleteProduct = (index: number) => {
    const updated = products.filter((_, idx) => idx !== index)
    setProducts(updated)
    validateCatalogData(updated)
    toast.success("Product removed from import list.")
  }

  // Summary counts
  const totalDetected = products.length
  const totalErrors = Array.from(new Set(validationErrors.map(err => err.row))).length
  const totalWarnings = Array.from(new Set(validationWarnings.map(wrn => wrn.row))).length
  const totalValid = totalDetected - totalErrors
  const imagesMatched = products.filter(p => p.previewUrl).length
  const totalMissingImages = missingImagesList.length
  
  const createCount = products.filter(p => !validationErrors.some(e => e.row === (products.indexOf(p) + 2)) && !existingProductCodes.includes((p.productCode || "").toLowerCase().trim())).length
  const updateCount = products.filter(p => !validationErrors.some(e => e.row === (products.indexOf(p) + 2)) && existingProductCodes.includes((p.productCode || "").toLowerCase().trim())).length
  const skipCount = totalErrors

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-hidden">
      <div className="relative w-[90vw] max-w-[1400px] h-[90vh] bg-card rounded-2xl border shadow-2xl flex flex-col overflow-hidden bg-white dark:bg-zinc-950 dark:border-zinc-800">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-zinc-850 shrink-0">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent">
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              Bulk Product Importer Redesign
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Redesigned enterprise-grade guided wizard to upload spreadsheet records, map schemas, and pair images in bulk.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-900">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Sticky Progress Indicator */}
        <div className="flex items-center px-8 py-3.5 bg-zinc-50 border-b dark:bg-zinc-900/50 dark:border-zinc-850 text-xs font-semibold gap-5 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center border font-bold text-xs ${
              step === 1 ? "bg-amber-600 border-amber-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-650"
            }`}>1</span>
            <span className={step === 1 ? "text-zinc-800 dark:text-zinc-100 font-bold" : "text-zinc-400"}>Upload File</span>
          </div>
          <ArrowRight className="h-3 w-3 text-zinc-300" />
          
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center border font-bold text-xs ${
              step === 2 ? "bg-amber-600 border-amber-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-650"
            }`}>2</span>
            <span className={step === 2 ? "text-zinc-800 dark:text-zinc-100 font-bold" : "text-zinc-400"}>Review &amp; Fix Errors</span>
          </div>
          <ArrowRight className="h-3 w-3 text-zinc-300" />

          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center border font-bold text-xs ${
              step === 3 ? "bg-amber-600 border-amber-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-650"
            }`}>3</span>
            <span className={step === 3 ? "text-zinc-800 dark:text-zinc-100 font-bold" : "text-zinc-400"}>Confirm &amp; Import</span>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-zinc-50/30 dark:bg-zinc-950/20">
          
          {/* STEP 1: UPLOAD FILE */}
          {step === 1 && (
            <div className="space-y-6 max-w-4xl mx-auto py-6">
              
              {!uploadedFileMeta ? (
                /* Drag and Drop Zone */
                <div 
                  className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    dragActive 
                      ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/10" 
                      : "border-zinc-300 hover:border-amber-500/50 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/30"
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
                  
                  <div className="h-24 w-24 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center dark:bg-amber-950/40 mb-6 shadow-inner border border-amber-100 dark:border-zinc-800 animate-pulse">
                    <Upload className="h-12 w-12 text-amber-600" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Drag &amp; Drop Spreadsheet Here</h3>
                  <p className="text-xs text-zinc-450 mt-1 max-w-sm text-center">
                    Upload a CSV or Excel (.xlsx) file containing product data. Auto-mapping will happen silently.
                  </p>
                  
                  <div className="flex gap-3 mt-6">
                    <Button type="button" className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 shadow-md transition-all">
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
                /* Upload confirmation card */
                <div className="bg-white border dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-8 shadow-lg max-w-2xl mx-auto space-y-6 flex flex-col items-center text-center animate-in zoom-in duration-150">
                  <div className="h-16 w-16 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-full flex items-center justify-center border border-green-150 dark:border-green-900/30 shadow-inner">
                    <Check className="h-8 w-8 animate-bounce" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase bg-zinc-105 dark:bg-zinc-850 px-2 py-1 rounded border dark:border-zinc-800">
                      {uploadedFileMeta.fileName}
                    </span>
                    <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                      {uploadedFileMeta.productsDetected} Products Found
                    </h3>
                    <p className="text-xs text-zinc-450">
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
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
                    >
                      Continue <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Download actions box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border rounded-2xl dark:bg-zinc-900 dark:border-zinc-800 shadow-sm gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-zinc-850 dark:text-zinc-200">Looking for a starter CSV template or existing catalog?</h4>
                  <p className="text-xs text-zinc-450 mt-0.5">Generate a blank headers template or download a backup copy of the current active ERP catalog to perform bulk updates.</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={downloadEmptyTemplate}
                    className="border-zinc-250 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-amber-500" />
                    Download Sample Template
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={downloadExistingProductsCSV}
                    disabled={exporting}
                    className="border-zinc-250 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 text-amber-500" />
                    )}
                    Download Existing Products
                  </Button>
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: REVIEW & FIX ERRORS */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start h-full pb-6">
              
              {/* Left Main panel for cards, validation panel and image manager (75% width) */}
              <div className="lg:col-span-3 space-y-6 h-full overflow-y-auto pr-1">
                
                {/* 1. Validation Center Error List Panel */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50/50 border border-red-200 dark:bg-red-950/10 dark:border-red-900/30 rounded-2xl p-5 shadow-sm space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-red-200/50 dark:border-red-900/20 pb-2">
                      <h3 className="text-sm font-bold text-red-800 dark:text-red-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 animate-pulse text-red-500" />
                        {validationErrors.length} Products Need Attention
                      </h3>
                      <Button 
                        onClick={downloadErrorReport}
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] border-red-350 hover:bg-red-100/50 dark:border-red-900/40 dark:hover:bg-red-950/40 text-red-700 dark:text-red-400 font-bold bg-white"
                      >
                        Download Error Report (CSV)
                      </Button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-white/40 dark:bg-black/20 divide-y dark:divide-zinc-800 text-[11px] text-red-700 dark:text-red-450 font-medium">
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
                            className="h-5 px-2 text-[9px] font-bold text-red-700 hover:bg-red-100 hover:text-red-800 dark:text-red-450 dark:hover:bg-red-950/40 uppercase tracking-wider cursor-pointer"
                          >
                            Fix
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Drag-and-Drop Image Pairer Widget */}
                <div className="bg-white border rounded-2xl p-5 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b dark:border-zinc-800 pb-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-250 flex items-center gap-1.5">
                      <ImageIcon className="h-4.5 w-4.5 text-amber-500" />
                      Upload Product Images
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-medium">Pair automatically by SKU/Filename matching</span>
                  </div>

                  <div 
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      imageDragActive 
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/10" 
                        : "border-zinc-250 hover:border-amber-500/50 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/30"
                    }`}
                    onDragEnter={handleImageDrag}
                    onDragOver={handleImageDrag}
                    onDragLeave={handleImageDrag}
                    onDrop={handleImageDrop}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <input 
                      key={imageInputKey}
                      type="file" 
                      ref={imageInputRef} 
                      multiple 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => e.target.files && handleImageBulkUpload(e.target.files)}
                    />
                    <Upload className="h-8 w-8 text-amber-500 mb-2 animate-pulse" />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-350">Drag images here or click to browse</span>
                    <span className="text-[9px] text-zinc-400 mt-1 font-medium">Files named like ZENX-001.jpg are automatically matched to SKU ZENX-001</span>
                  </div>

                  {/* Image Match Status Counters */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs border dark:border-zinc-850 rounded-xl p-2.5 bg-zinc-50/30 dark:bg-zinc-950/10">
                    <div>
                      <span className="block text-[9px] text-zinc-400 font-bold uppercase">Images Uploaded</span>
                      <span className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mt-0.5">{imagesMatched + totalMissingImages}</span>
                    </div>
                    <div className="border-x dark:border-zinc-800">
                      <span className="block text-[9px] text-zinc-400 font-bold uppercase">Matched</span>
                      <span className="block text-sm font-bold text-green-600 dark:text-green-455 mt-0.5">{imagesMatched}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-400 font-bold uppercase">Missing</span>
                      <span className="block text-sm font-bold text-red-600 dark:text-red-400 mt-0.5">{totalMissingImages}</span>
                    </div>
                  </div>

                  {/* Missing images list */}
                  {totalMissingImages > 0 && (
                    <div className="space-y-1.5">
                      <span className="block text-[9px] text-red-500 font-bold uppercase tracking-wider">Missing Images:</span>
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-2 border border-red-100 dark:border-red-950/20 bg-red-50/10 rounded-lg">
                        {missingImagesList.map(img => (
                          <span key={img} className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 font-mono text-[9px]">
                            {img}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Product Cards List */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-250">Product Entries</h3>
                    
                    {/* Filtering pills */}
                    <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-850 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setFilterStatus("all")}
                        className={`px-3 py-1 rounded-md transition-all ${filterStatus === "all" ? "bg-white dark:bg-zinc-850 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-450 hover:text-zinc-700"}`}
                      >
                        All ({totalDetected})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterStatus("errors")}
                        className={`px-3 py-1 rounded-md transition-all ${filterStatus === "errors" ? "bg-red-500 text-white shadow-sm" : "text-zinc-455 hover:text-red-500"}`}
                      >
                        Errors ({totalErrors})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterStatus("ready")}
                        className={`px-3 py-1 rounded-md transition-all ${filterStatus === "ready" ? "bg-green-600 text-white shadow-sm" : "text-zinc-455 hover:text-green-650"}`}
                      >
                        Ready ({totalValid})
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 pb-4">
                    {products
                      .map((p, idx) => ({ p, idx }))
                      .filter(({ p, idx }) => {
                        const csvRowNum = idx + 2
                        const hasErrors = validationErrors.some(err => err.row === csvRowNum)
                        if (filterStatus === "errors") return hasErrors
                        if (filterStatus === "ready") return !hasErrors
                        return true
                      })
                      .map(({ p, idx }) => {
                        const csvRowNum = idx + 2
                        const rowErrors = validationErrors.filter(err => err.row === csvRowNum)
                        const rowWarnings = validationWarnings.filter(wrn => wrn.row === csvRowNum)
                        const isExpanded = !!expandedRows[idx]

                        return (
                          <div 
                            key={idx} 
                            id={`product-card-${idx}`}
                            className={`bg-white border rounded-2xl dark:bg-zinc-900 dark:border-zinc-800 shadow-sm transition-all overflow-hidden ${
                              rowErrors.length > 0 ? "border-red-300 dark:border-red-950/40" :
                              rowWarnings.length > 0 ? "border-amber-300 dark:border-amber-950/40" :
                              "hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            {/* Card Core Row */}
                            <div className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                              
                              {/* Product Image */}
                              <div className="shrink-0">
                                {p.previewUrl ? (
                                  <div 
                                    className="relative h-16 w-16 border rounded-xl overflow-hidden bg-white shadow-inner cursor-pointer hover:border-amber-500 group transition-all"
                                    onClick={() => {
                                      setActiveProductIndex(idx)
                                      setCropperImageSrc(p.previewUrl || null)
                                      setIsCropperOpen(true)
                                    }}
                                    title="Crop Image"
                                  >
                                    <img src={p.previewUrl} alt="Preview" className="object-contain h-full w-full" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                      <span className="text-[8px] text-white font-bold uppercase tracking-wider">Crop</span>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="h-16 w-16 border border-dashed rounded-xl flex flex-col items-center justify-center text-zinc-400 hover:bg-amber-50/45 hover:text-amber-600 dark:hover:bg-zinc-850 hover:border-amber-500/50 transition-all cursor-pointer bg-zinc-50/20 dark:border-zinc-800"
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
                                    <span className="text-[8px] font-semibold mt-1">Image</span>
                                  </button>
                                )}
                              </div>

                              {/* Product Name */}
                              <div className="flex-1 min-w-[150px] space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Product Name / Title</label>
                                <input 
                                  id={`input-${idx}-productName`}
                                  className={`w-full border rounded-lg px-2.5 py-1 text-xs bg-zinc-55 dark:bg-zinc-805 border-zinc-200 dark:border-zinc-700 font-bold focus:ring-amber-500 ${
                                    rowErrors.some(e => e.key === "productName") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                                  }`}
                                  value={p.productName}
                                  onChange={(e) => handleProductFieldChange(idx, "productName", e.target.value)}
                                />
                              </div>

                              {/* SKU Code */}
                              <div className="w-28 shrink-0 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Product SKU / Code</label>
                                <input 
                                  id={`input-${idx}-productCode`}
                                  className={`w-full border rounded-lg px-2 py-1 text-xs bg-zinc-55 dark:bg-zinc-805 border-zinc-200 dark:border-zinc-700 font-mono focus:ring-amber-500 ${
                                    rowErrors.some(e => e.key === "productCode") ? "border-red-500 bg-red-950/20 text-red-500 animate-pulse" : ""
                                  }`}
                                  value={p.productCode}
                                  placeholder="Auto"
                                  onChange={(e) => handleProductFieldChange(idx, "productCode", e.target.value)}
                                />
                              </div>

                              {/* Category */}
                              <div className="w-28 shrink-0 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Category</label>
                                <input 
                                  id={`input-${idx}-categoryName`}
                                  className={`w-full border rounded-lg px-2.5 py-1 text-xs bg-zinc-55 dark:bg-zinc-805 border-zinc-200 dark:border-zinc-700 focus:ring-amber-500 ${
                                    rowErrors.some(e => e.key === "categoryName") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                                  }`}
                                  value={p.categoryName}
                                  onChange={(e) => handleProductFieldChange(idx, "categoryName", e.target.value)}
                                />
                              </div>

                              {/* Base Price */}
                              <div className="w-24 shrink-0 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Base Price (AED)</label>
                                <input 
                                  id={`input-${idx}-costPrice`}
                                  type="number"
                                  className={`w-full border rounded-lg px-2.5 py-1 text-xs bg-zinc-55 dark:bg-zinc-805 border-zinc-200 dark:border-zinc-700 text-right font-mono focus:ring-amber-500 ${
                                    rowErrors.some(e => e.key === "costPrice") ? "border-red-500 bg-red-950/20 text-red-500" : ""
                                  }`}
                                  value={p.costPrice || ""}
                                  onChange={(e) => handleProductFieldChange(idx, "costPrice", e.target.value)}
                                />
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
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-450 font-bold text-[9px] border border-green-200 dark:border-green-900/30 shadow-sm">
                                    ✓ Ready
                                  </span>
                                )}
                              </div>

                              {/* Collapse control & Delete */}
                              <div className="shrink-0 flex items-center gap-1.5 self-end mb-1">
                                <button
                                  type="button"
                                  onClick={() => toggleRowExpansion(idx)}
                                  className="p-1.5 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-805 text-zinc-650 dark:text-zinc-350 dark:border-zinc-800 transition-all flex items-center gap-1 cursor-pointer text-[10px] font-semibold"
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
                                  onClick={() => handleDeleteProduct(idx)}
                                  className="h-8 w-8 text-zinc-400 hover:text-red-650 dark:hover:text-red-400"
                                  title="Skip Product"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>

                            {/* Collapsible details Drawer */}
                            {isExpanded && (
                              <div className="p-5 bg-zinc-50/50 dark:bg-zinc-900/40 border-t dark:border-zinc-805 text-xs grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top duration-150">
                                
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Warranty</label>
                                  <input
                                    id={`input-${idx}-warranty`}
                                    className={`w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-amber-500 ${
                                      rowErrors.some(e => e.key === "warranty") ? "border-red-500" : ""
                                    }`}
                                    value={p.warranty}
                                    placeholder="5 Years"
                                    onChange={(e) => handleProductFieldChange(idx, "warranty", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Dimensions</label>
                                  <input
                                    id={`input-${idx}-dimensions`}
                                    className={`w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-amber-500 ${
                                      rowErrors.some(e => e.key === "dimensions") ? "border-red-500" : ""
                                    }`}
                                    value={p.dimensions || ""}
                                    placeholder="e.g. 600 x 600 x 750 mm"
                                    onChange={(e) => handleProductFieldChange(idx, "dimensions", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Product Type (Finish/Material)</label>
                                  <input
                                    id={`input-${idx}-finishMaterial`}
                                    className="w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-amber-500"
                                    value={p.finishMaterial || ""}
                                    onChange={(e) => handleProductFieldChange(idx, "finishMaterial", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Chair Type (for chairs)</label>
                                  <input
                                    id={`input-${idx}-chairType`}
                                    className={`w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-amber-500 ${
                                      rowErrors.some(e => e.key === "chairType") ? "border-red-500 bg-red-950/20" : ""
                                    }`}
                                    value={p.chairType || ""}
                                    onChange={(e) => handleProductFieldChange(idx, "chairType", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Color (for chairs)</label>
                                  <input
                                    id={`input-${idx}-availableColors`}
                                    className={`w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-amber-500 ${
                                      rowErrors.some(e => e.key === "availableColors") ? "border-red-500 bg-red-950/20" : ""
                                    }`}
                                    value={p.availableColors || ""}
                                    onChange={(e) => handleProductFieldChange(idx, "availableColors", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Table Top Finish (workstation)</label>
                                  <input
                                    id={`input-${idx}-tableTopFinish`}
                                    className={`w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-amber-500 ${
                                      rowErrors.some(e => e.key === "tableTopFinish") ? "border-red-500 bg-red-950/20" : ""
                                    }`}
                                    value={p.tableTopFinish || ""}
                                    onChange={(e) => handleProductFieldChange(idx, "tableTopFinish", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Leg Type (workstation)</label>
                                  <input
                                    id={`input-${idx}-legType`}
                                    className={`w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-amber-500 ${
                                      rowErrors.some(e => e.key === "legType") ? "border-red-500 bg-red-950/20" : ""
                                    }`}
                                    value={p.legType || ""}
                                    onChange={(e) => handleProductFieldChange(idx, "legType", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Storage Options (workstation)</label>
                                  <input
                                    id={`input-${idx}-storageOptions`}
                                    className={`w-full border rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs focus:ring-amber-500 ${
                                      rowErrors.some(e => e.key === "storageOptions") ? "border-red-500 bg-red-950/20" : ""
                                    }`}
                                    value={p.storageOptions || ""}
                                    onChange={(e) => handleProductFieldChange(idx, "storageOptions", e.target.value)}
                                  />
                                </div>

                                <div className="md:col-span-3 space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wide">Product Description</label>
                                  <textarea
                                    id={`input-${idx}-description`}
                                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-xs focus:ring-amber-500"
                                    value={p.description || ""}
                                    rows={3}
                                    onChange={(e) => handleProductFieldChange(idx, "description", e.target.value)}
                                  />
                                </div>

                                <div className="md:col-span-3 space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wide">Specifications / Details</label>
                                  <textarea
                                    id={`input-${idx}-specifications`}
                                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-xs focus:ring-amber-500"
                                    value={p.specifications || ""}
                                    rows={3}
                                    onChange={(e) => handleProductFieldChange(idx, "specifications", e.target.value)}
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

              {/* Right sticky Summary & Mapping sidebar (25% width) */}
              <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-0 h-full overflow-y-auto pr-1">
                
                {/* 1. Import Summary Panel */}
                <div className="bg-white border rounded-2xl p-5 dark:bg-zinc-900 dark:border-zinc-800 shadow-md space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider border-b dark:border-zinc-800 pb-2">
                    Import Summary
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-medium">Products Found:</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{totalDetected}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-medium">Products Ready:</span>
                      <span className="font-bold text-green-600 dark:text-green-455">{totalValid}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-medium">With Errors:</span>
                      <span className={`font-bold ${totalErrors > 0 ? "text-red-500 animate-pulse" : "text-zinc-700 dark:text-zinc-350"}`}>
                        {totalErrors}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-t dark:border-zinc-800 pt-2.5">
                      <span className="text-zinc-500 font-medium">Images Matched:</span>
                      <span className="font-bold text-zinc-750 dark:text-zinc-250">{imagesMatched} / {totalDetected}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/40 rounded-xl text-[10px] text-amber-800 dark:text-amber-405 leading-relaxed flex items-start gap-1.5">
                    <Info size={14} className="shrink-0 mt-0.5 animate-pulse" />
                    <span>Other selling prices are automatically calculated using Admin Pricing Rules.</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t dark:border-zinc-850">
                    <Button 
                      onClick={() => setStep(3)}
                      disabled={totalValid === 0}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 shadow-md flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Proceed to Import ({totalValid} Ready) <ArrowRight size={14} />
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleSaveDraft}
                      className="w-full text-xs py-2.5 border-zinc-250 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 cursor-pointer text-zinc-700 dark:text-zinc-300 font-semibold bg-white"
                    >
                      Save Draft
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setStep(1)}
                      className="w-full text-xs text-zinc-450 hover:text-zinc-650"
                    >
                      Upload Different File
                    </Button>
                  </div>
                </div>

                {/* 2. Collapsible Column Mapping Accordion */}
                <div className="border rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
                  <details className="group">
                    <summary className="flex items-center justify-between p-4 font-bold text-xs text-zinc-750 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer select-none">
                      <span>Advanced Column Mapping</span>
                      <ChevronDown size={14} className="transition-all group-open:rotate-180" />
                    </summary>
                    <div className="p-4 border-t dark:border-zinc-800 space-y-4 max-h-[300px] overflow-y-auto">
                      {[
                        { key: "productCode", label: "Product SKU / Code", required: false },
                        { key: "productName", label: "Product Name / Title", required: true },
                        { key: "categoryName", label: "Category", required: true },
                        { key: "finishMaterial", label: "Product Type (Finish)", required: false },
                        { key: "basePrice", label: "Base Price Only (AED)", required: true },
                        { key: "description", label: "Product Description", required: false },
                        { key: "specifications", label: "Specifications", required: false },
                        { key: "warranty", label: "Warranty period", required: false },
                        { key: "dimensions", label: "Dimensions", required: false },
                        { key: "chairType", label: "Chair Type", required: false },
                        { key: "availableColors", label: "Color (for chairs)", required: false },
                        { key: "tableTopFinish", label: "Table Top Finish", required: false },
                        { key: "legType", label: "Leg Type", required: false },
                        { key: "storageOptions", label: "Storage Options", required: false },
                        { key: "imageFilename", label: "Image Filename", required: false }
                      ].map((field) => (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-650 dark:text-zinc-350">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <select 
                            className="w-full h-8 text-[11px] rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-250 focus:ring-amber-500"
                            value={mappings[field.key] || ""}
                            onChange={(e) => recalculateProducts({ ...mappings, [field.key]: e.target.value })}
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
          {step === 3 && (
            <div className="max-w-xl mx-auto py-10 space-y-6 text-center animate-in zoom-in duration-150">
              <div className="h-16 w-16 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-full flex items-center justify-center border border-amber-100 dark:border-zinc-850 mx-auto">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">Ready to Import Products</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Verify the final breakdown of actions before updating the product catalog in the database.
                </p>
              </div>

              {/* Counts Breakdown Card */}
              <div className="bg-white border rounded-2xl p-6 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm text-left max-w-md mx-auto divide-y dark:divide-zinc-800 text-xs">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-zinc-550 font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-550" /> Create New Products
                  </span>
                  <span className="font-bold text-green-600 dark:text-green-455">{createCount} Products</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-zinc-550 font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-505" /> Update Existing Products
                  </span>
                  <span className="font-bold text-amber-500">{updateCount} Products</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-zinc-555 font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Skip (Unresolved Errors)
                  </span>
                  <span className="font-bold text-red-600 dark:text-red-400">{skipCount} Products</span>
                </div>
              </div>

              {/* Action Buttons */}
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
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {uploading ? (
                    <>Importing <Loader2 className="h-4 w-4 animate-spin" /></>
                  ) : (
                    <>Import Products</>
                  )}
                </Button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Success Animation Screen Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="flex flex-col items-center space-y-5 max-w-sm text-center">
            
            {/* Green Animated Checkmark */}
            <div className="h-20 w-20 bg-green-500/10 text-green-500 border border-green-500/30 rounded-full flex items-center justify-center animate-bounce shadow-inner">
              <CheckCircle size={48} className="animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white tracking-tight">Catalog Imported!</h3>
              <p className="text-sm text-zinc-400 leading-normal">
                Successfully processed, calculated selling prices, matched image assets, and stored {totalValid} products in the database!
              </p>
            </div>

            <Button
              onClick={() => {
                setShowSuccessOverlay(false)
                onSuccess()
                onClose()
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-bold w-full py-2 shadow-lg"
            >
              Back to Catalog View
            </Button>
          </div>
        </div>
      )}

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
