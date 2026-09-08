"use client"

import { useState, useMemo, useEffect } from "react"
import {
  X,
  Package,
  Layers,
  ShoppingCart,
  Check,
  Edit,
  Pencil,
  Tag,
  Boxes,
  Palette,
  ShieldCheck,
  ChevronRight,
  Plus,
  Camera,
  Upload,
  Loader2,
  Trash2,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  CheckCircle2,
  Ruler,
  ChevronsUpDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

export interface ProductVariantItem {
  id: string
  productCode: string
  productName: string
  unitPrice: number
  costPrice: number
  interiorPrice?: number
  dealerPrice?: number
  projectPrice?: number
  specialPrice?: number
  warranty?: string | null
  availableColors?: string | null
  dimensions?: string | null
  specifications?: string | null
  description?: string | null
  status: string
  imageUrl?: string | null
  imageUrls?: string[]
  stock: number
  isMaster?: boolean
  parentProductId?: string | null
  modelCode?: string | null
  modelName?: string | null
  tableTopFinish?: string | null
  legType?: string | null
  chairType?: string | null
  storageOptions?: string | null
  finishMaterial?: string | null
  variantAttributes?: any
  category?: {
    name: string
  }
}

export interface MasterProductItem extends ProductVariantItem {
  variants?: ProductVariantItem[]
}

interface VariantDrawerModalProps {
  masterProduct: MasterProductItem | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (variant: ProductVariantItem) => void
  onEditVariant?: (variant: ProductVariantItem) => void
  onEditMasterProduct?: (masterProduct: ProductVariantItem) => void
  onSaveStock?: (productId: string, newStock: number) => Promise<void>
  onImageUploaded?: () => void
  onVariantAdded?: () => void
  onVariantDeleted?: () => void
  canEditProduct?: boolean
  canDeleteProduct?: boolean
  hasQuoteAccess?: boolean
  onOpenCart?: () => void
  quoteCartCount?: number
}

// Helper to extract clean sub-product model name (Level 2)
export function getSubProductName(v: ProductVariantItem, masterTitle: string): string {
  if (v.modelName && v.modelName.trim() && v.modelName !== "Standard" && v.modelName !== masterTitle) {
    return v.modelName.trim()
  }

  let name = (v.productName || "").trim()
  // Remove dimension specs like 2000x750mm, 2000×750mm, 1800x800x750mm
  name = name.replace(/\b\d{3,5}\s*[x×X]\s*\d{3,5}(\s*[x×X]\s*\d{3,5})?\s*(mm)?\b/gi, "").trim()

  // Split at attribute delimiters
  const parts = name.split(/\s+–\s+|\s+-\s+|,\s+|\s+\|\s+/)
  let baseTitle = parts[0].trim()
  baseTitle = baseTitle.replace(/,\s*.*$/, "").trim()

  return baseTitle || masterTitle
}

// Helper to extract attribute values from variant title or fields
export function extractVariantAttributes(v: ProductVariantItem) {
  const name = v.productName || ""

  // Dimensions
  let dimensions = v.dimensions || ""
  if (!dimensions) {
    const dimMatch = name.match(/\b\d{3,5}\s*[x×X]\s*\d{3,5}(\s*[x×X]\s*\d{3,5})?\s*(mm)?\b/i)
    if (dimMatch) dimensions = dimMatch[0].trim()
  }

  // Table Top Finish / Wood
  let finish = v.tableTopFinish || v.finishMaterial || ""
  if (!finish) {
    if (/walnut/i.test(name)) finish = "Walnut Wood"
    else if (/beech/i.test(name)) finish = "Beech Wood"
    else if (/oak/i.test(name)) finish = "Natural Oak"
    else if (/black/i.test(name) && /top|table|wood|finish/i.test(name)) finish = "Black Finish"
    else if (/white/i.test(name) && /top|table|wood|finish/i.test(name)) finish = "White Finish"
  }

  // Leg Type / Color
  let legs = v.legType || ""
  if (!legs) {
    if (/black legs/i.test(name)) legs = "Black Legs"
    else if (/white legs/i.test(name)) legs = "White Legs"
    else if (/silver legs|chrome/i.test(name)) legs = "Silver Legs"
    else if (/loop leg/i.test(name)) legs = "Loop Legs"
    else if (/timber leg/i.test(name)) legs = "Timber Legs"
  }

  // Side Return
  let sideReturn = ""
  const srMatch = name.match(/Side Return\s+\d{3,5}(x\d{3,5})?mm/i)
  if (srMatch) sideReturn = srMatch[0].trim()

  // Color
  const color = v.availableColors || ""

  return {
    dimensions: dimensions || "Standard Size",
    finish: finish || "Standard Finish",
    legs: legs || "Standard Frame",
    sideReturn: sideReturn || "No Side Return",
    color: color || "Default Color",
  }
}

export function VariantDrawerModal({
  masterProduct,
  isOpen,
  onClose,
  onAddToCart,
  onEditVariant,
  onEditMasterProduct,
  onSaveStock,
  onImageUploaded,
  onVariantAdded,
  onVariantDeleted,
  canEditProduct = true,
  canDeleteProduct = true,
  hasQuoteAccess = true,
  onOpenCart,
  quoteCartCount,
}: VariantDrawerModalProps) {
  const [selectedSubProduct, setSelectedSubProduct] = useState<string>("all")
  const [subProductSearch, setSubProductSearch] = useState<string>("")
  
  // Attribute Combination Filters
  const [selectedDimension, setSelectedDimension] = useState<string>("all")
  const [selectedFinish, setSelectedFinish] = useState<string>("all")
  const [selectedLeg, setSelectedLeg] = useState<string>("all")
  const [selectedSideReturn, setSelectedSideReturn] = useState<string>("all")

  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [draftStockVal, setDraftStockVal] = useState<number>(0)
  const [savingStockId, setSavingStockId] = useState<string | null>(null)
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null)
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null)

  // Inline Edit Variant Details state
  const [editingVariantDetailsId, setEditingVariantDetailsId] = useState<string | null>(null)
  const [isSubmittingEditVariant, setIsSubmittingEditVariant] = useState(false)
  const [editVariantForm, setEditVariantForm] = useState({
    productCode: "",
    productName: "",
    modelName: "",
    availableColors: "",
    costPrice: 0,
    unitPrice: 0,
    projectPrice: 0,
    stock: 0,
    description: "",
  })

  // Inline Add Variant state
  const [isAddingVariant, setIsAddingVariant] = useState(false)
  const [isSubmittingNewVariant, setIsSubmittingNewVariant] = useState(false)
  const [newVariantImageFile, setNewVariantImageFile] = useState<File | null>(null)
  const [newVariantForm, setNewVariantForm] = useState({
    productCode: "",
    productName: "",
    modelName: "Single Seater Workstation",
    availableColors: "",
    costPrice: 200,
    unitPrice: 300,
    projectPrice: 300,
    stock: 10,
    description: "",
  })

  // Compute Sub-Products (Level 2) and Variant Attributes (Level 3)
  const variants = masterProduct?.variants || []
  const masterTitle = masterProduct?.productName || "Product Series"

  // Pre-parse all variants for fast dynamic filtering
  const parsedVariants = useMemo(() => {
    return (masterProduct?.variants || []).map((v) => {
      const subProduct = getSubProductName(v, masterTitle)
      const attrs = extractVariantAttributes(v)
      return {
        variant: v,
        subProduct,
        dimensions: attrs.dimensions,
        finish: attrs.finish,
        legs: attrs.legs,
        sideReturn: attrs.sideReturn,
      }
    })
  }, [masterProduct, masterTitle])

  const [isSubProductPopoverOpen, setIsSubProductPopoverOpen] = useState(false)

  // Map each sub-product model name to its thumbnail image (first matching variant image)
  const subProductImageMap = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const pv of parsedVariants) {
      if (pv.subProduct && !map.has(pv.subProduct)) {
        if (pv.variant.imageUrl) {
          map.set(pv.subProduct, pv.variant.imageUrl)
        }
      }
    }
    return map
  }, [parsedVariants])

  // Distinct sub-product names count for header badge
  const allSubProductNames = useMemo(() => {
    const set = new Set<string>()
    for (const pv of parsedVariants) {
      if (pv.subProduct) set.add(pv.subProduct)
    }
    return Array.from(set).sort()
  }, [parsedVariants])

  // Filter variants by search query (SKU, name, sub-product)
  const searchFilteredVariants = useMemo(() => {
    if (!subProductSearch.trim()) return parsedVariants
    const q = subProductSearch.toLowerCase().trim()
    return parsedVariants.filter(
      (pv) =>
        pv.subProduct.toLowerCase().includes(q) ||
        (pv.variant.productCode && pv.variant.productCode.toLowerCase().includes(q)) ||
        (pv.variant.productName && pv.variant.productName.toLowerCase().includes(q))
    )
  }, [parsedVariants, subProductSearch])

  // Active filter predicates
  const matchSubProduct = (pv: (typeof parsedVariants)[0]) =>
    selectedSubProduct === "all" || pv.subProduct === selectedSubProduct

  const matchDimension = (pv: (typeof parsedVariants)[0]) =>
    selectedDimension === "all" || pv.dimensions === selectedDimension

  const matchFinish = (pv: (typeof parsedVariants)[0]) =>
    selectedFinish === "all" || pv.finish === selectedFinish

  const matchLeg = (pv: (typeof parsedVariants)[0]) =>
    selectedLeg === "all" || pv.legs === selectedLeg

  const matchSideReturn = (pv: (typeof parsedVariants)[0]) =>
    selectedSideReturn === "all" || pv.sideReturn === selectedSideReturn

  // Dynamic available Sub-Products (matching remaining 4 attribute filters)
  const availableSubProducts = useMemo(() => {
    const matching = searchFilteredVariants.filter(
      (pv) => matchDimension(pv) && matchFinish(pv) && matchLeg(pv) && matchSideReturn(pv)
    )
    const countsMap = new Map<string, number>()
    for (const pv of matching) {
      if (pv.subProduct) {
        countsMap.set(pv.subProduct, (countsMap.get(pv.subProduct) || 0) + 1)
      }
    }
    return Array.from(countsMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.value.localeCompare(b.value))
  }, [searchFilteredVariants, selectedDimension, selectedFinish, selectedLeg, selectedSideReturn])

  // Dynamic available Dimensions (matching subProduct + finish + leg + sideReturn)
  const availableDimensions = useMemo(() => {
    const matching = searchFilteredVariants.filter(
      (pv) => matchSubProduct(pv) && matchFinish(pv) && matchLeg(pv) && matchSideReturn(pv)
    )
    const countsMap = new Map<string, number>()
    for (const pv of matching) {
      if (pv.dimensions && pv.dimensions !== "Standard Size") {
        countsMap.set(pv.dimensions, (countsMap.get(pv.dimensions) || 0) + 1)
      }
    }
    return Array.from(countsMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }))
  }, [searchFilteredVariants, selectedSubProduct, selectedFinish, selectedLeg, selectedSideReturn])

  // Dynamic available Finishes (matching subProduct + dimension + leg + sideReturn)
  const availableFinishes = useMemo(() => {
    const matching = searchFilteredVariants.filter(
      (pv) => matchSubProduct(pv) && matchDimension(pv) && matchLeg(pv) && matchSideReturn(pv)
    )
    const countsMap = new Map<string, number>()
    for (const pv of matching) {
      if (pv.finish && pv.finish !== "Standard Finish") {
        countsMap.set(pv.finish, (countsMap.get(pv.finish) || 0) + 1)
      }
    }
    return Array.from(countsMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.value.localeCompare(b.value))
  }, [searchFilteredVariants, selectedSubProduct, selectedDimension, selectedLeg, selectedSideReturn])

  // Dynamic available Leg Options (matching subProduct + dimension + finish + sideReturn)
  const availableLegs = useMemo(() => {
    const matching = searchFilteredVariants.filter(
      (pv) => matchSubProduct(pv) && matchDimension(pv) && matchFinish(pv) && matchSideReturn(pv)
    )
    const countsMap = new Map<string, number>()
    for (const pv of matching) {
      if (pv.legs && pv.legs !== "Standard Frame") {
        countsMap.set(pv.legs, (countsMap.get(pv.legs) || 0) + 1)
      }
    }
    return Array.from(countsMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.value.localeCompare(b.value))
  }, [searchFilteredVariants, selectedSubProduct, selectedDimension, selectedFinish, selectedSideReturn])

  // Dynamic available Side Returns (matching subProduct + dimension + finish + leg)
  const availableSideReturns = useMemo(() => {
    const matching = searchFilteredVariants.filter(
      (pv) => matchSubProduct(pv) && matchDimension(pv) && matchFinish(pv) && matchLeg(pv)
    )
    const countsMap = new Map<string, number>()
    for (const pv of matching) {
      if (pv.sideReturn && pv.sideReturn !== "No Side Return") {
        countsMap.set(pv.sideReturn, (countsMap.get(pv.sideReturn) || 0) + 1)
      }
    }
    return Array.from(countsMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.value.localeCompare(b.value))
  }, [searchFilteredVariants, selectedSubProduct, selectedDimension, selectedFinish, selectedLeg])

  // Final filtered list of variants matching all currently active selection criteria
  const finalFilteredVariants = useMemo(() => {
    return searchFilteredVariants
      .filter(
        (pv) =>
          matchSubProduct(pv) &&
          matchDimension(pv) &&
          matchFinish(pv) &&
          matchLeg(pv) &&
          matchSideReturn(pv)
      )
      .map((pv) => pv.variant)
  }, [
    searchFilteredVariants,
    selectedSubProduct,
    selectedDimension,
    selectedFinish,
    selectedLeg,
    selectedSideReturn,
  ])

  // Auto-reset filter selections if they are no longer valid options in the newly filtered subset
  useEffect(() => {
    if (selectedSubProduct !== "all" && !availableSubProducts.some((o) => o.value === selectedSubProduct)) {
      setSelectedSubProduct("all")
    }
    if (selectedDimension !== "all" && !availableDimensions.some((o) => o.value === selectedDimension)) {
      setSelectedDimension("all")
    }
    if (selectedFinish !== "all" && !availableFinishes.some((o) => o.value === selectedFinish)) {
      setSelectedFinish("all")
    }
    if (selectedLeg !== "all" && !availableLegs.some((o) => o.value === selectedLeg)) {
      setSelectedLeg("all")
    }
    if (selectedSideReturn !== "all" && !availableSideReturns.some((o) => o.value === selectedSideReturn)) {
      setSelectedSideReturn("all")
    }
  }, [
    availableSubProducts,
    availableDimensions,
    availableFinishes,
    availableLegs,
    availableSideReturns,
    selectedSubProduct,
    selectedDimension,
    selectedFinish,
    selectedLeg,
    selectedSideReturn,
  ])

  if (!isOpen || !masterProduct) return null

  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0)

  const startEditingVariant = (variant: ProductVariantItem) => {
    if (onEditVariant) {
      onEditVariant(variant)
      return
    }
    setEditingVariantDetailsId(variant.id)
    setEditVariantForm({
      productCode: variant.productCode || "",
      productName: variant.productName || "",
      modelName: variant.modelName || "",
      availableColors: variant.availableColors || "",
      costPrice: variant.costPrice || 0,
      unitPrice: variant.unitPrice || 0,
      projectPrice: variant.projectPrice || variant.unitPrice || 0,
      stock: variant.stock || 0,
      description: variant.description || "",
    })
  }

  const handleSaveVariantSubmit = async (variantId: string) => {
    if (!masterProduct) return
    setIsSubmittingEditVariant(true)

    try {
      const cost = editVariantForm.costPrice || 0
      const project = editVariantForm.projectPrice || editVariantForm.unitPrice || 0

      const res = await fetch(`/api/products/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: editVariantForm.productCode.trim(),
          productName: editVariantForm.productName.trim(),
          categoryName: masterProduct.category?.name || "Workstations",
          modelName: editVariantForm.modelName.trim() || null,
          availableColors: editVariantForm.availableColors.trim() || null,
          costPrice: cost,
          unitPrice: project,
          projectPrice: project,
          dealerPrice: Number((cost / 0.85).toFixed(2)) || project,
          interiorPrice: Number((cost / 0.70).toFixed(2)) || project,
          specialPrice: cost || project,
          stock: editVariantForm.stock || 0,
          description: editVariantForm.description.trim() || null,
          status: "ACTIVE",
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update variant details")

      if (masterProduct && masterProduct.variants) {
        const idx = masterProduct.variants.findIndex((v) => v.id === variantId)
        if (idx !== -1) {
          masterProduct.variants[idx] = {
            ...masterProduct.variants[idx],
            ...data,
            modelName: editVariantForm.modelName.trim() || null,
            availableColors: editVariantForm.availableColors.trim() || null,
            stock: editVariantForm.stock,
            projectPrice: project,
            unitPrice: project,
          }
        }
      }

      toast.success(`Variant "${editVariantForm.productName}" updated successfully!`)
      setEditingVariantDetailsId(null)
      if (onVariantAdded) onVariantAdded()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to update variant details")
    } finally {
      setIsSubmittingEditVariant(false)
    }
  }

  const handleDeleteVariant = async (variantId: string, variantName: string) => {
    if (!confirm(`Are you sure you want to delete variant "${variantName}"?`)) return
    setDeletingVariantId(variantId)

    try {
      const res = await fetch(`/api/products/${variantId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete variant")
      }

      if (masterProduct && masterProduct.variants) {
        masterProduct.variants = masterProduct.variants.filter((v) => v.id !== variantId)
      }

      toast.success(`Variant "${variantName}" deleted successfully!`)
      if (onVariantDeleted) onVariantDeleted()
      else if (onVariantAdded) onVariantAdded()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to delete variant")
    } finally {
      setDeletingVariantId(null)
    }
  }

  const handleStockSaveSubmit = async (productId: string) => {
    if (!onSaveStock) return
    setSavingStockId(productId)
    try {
      await onSaveStock(productId, draftStockVal)
      setEditingStockId(null)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingStockId(null)
    }
  }

  const handleImageUpload = async (variantId: string, file: File) => {
    setUploadingImageId(variantId)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload?type=products", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to upload image")

      const patchRes = await fetch(`/api/products/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: data.url }),
      })

      if (!patchRes.ok) throw new Error("Failed to link image to product variant")

      const vItem = variants.find((v) => v.id === variantId)
      if (vItem) vItem.imageUrl = data.url

      toast.success("Variant image updated successfully!")
      if (onImageUploaded) onImageUploaded()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to upload image")
    } finally {
      setUploadingImageId(null)
    }
  }

  const handleCreateVariantSubmit = async () => {
    if (!masterProduct) return
    setIsSubmittingNewVariant(true)

    try {
      let imageUrl = null

      if (newVariantImageFile) {
        const formData = new FormData()
        formData.append("file", newVariantImageFile)
        const uploadRes = await fetch("/api/upload?type=products", {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (uploadRes.ok && uploadData.url) imageUrl = uploadData.url
      }

      const masterPrefix = masterProduct.productCode.replace("MASTER-", "").slice(0, 5)
      const modelPart = (newVariantForm.modelName || "VAR").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)
      const colorPart = (newVariantForm.availableColors || "STD").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)
      const sku = newVariantForm.productCode.trim() || `${masterPrefix}-${modelPart}-${colorPart}`

      const varName = newVariantForm.productName.trim() || `${masterProduct.productName} ${newVariantForm.modelName}${newVariantForm.availableColors ? ` - ${newVariantForm.availableColors}` : ""}`

      const cost = newVariantForm.costPrice || 200
      const project = newVariantForm.projectPrice || newVariantForm.unitPrice || Number((cost * 1.5).toFixed(2))

      const payload = {
        productCode: sku,
        productName: varName,
        categoryName: masterProduct.category?.name || "Workstations",
        parentProductId: masterProduct.id,
        isMaster: false,
        modelName: newVariantForm.modelName.trim() || null,
        availableColors: newVariantForm.availableColors.trim() || null,
        costPrice: cost,
        unitPrice: project,
        projectPrice: project,
        dealerPrice: Number((cost / 0.85).toFixed(2)),
        interiorPrice: Number((cost / 0.70).toFixed(2)),
        specialPrice: cost,
        stock: newVariantForm.stock || 0,
        imageUrl: imageUrl || masterProduct.imageUrl || null,
        description: newVariantForm.description || `${masterProduct.productName} Series ${newVariantForm.modelName}`,
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create variant")

      if (!masterProduct.variants) masterProduct.variants = []
      masterProduct.variants.push(data)

      toast.success(`New variant "${varName}" created successfully!`)
      setIsAddingVariant(false)
      setNewVariantImageFile(null)
      setNewVariantForm({
        productCode: "",
        productName: "",
        modelName: "Single Seater Workstation",
        availableColors: "",
        costPrice: 200,
        unitPrice: 300,
        projectPrice: 300,
        stock: 10,
        description: "",
      })

      if (onVariantAdded) onVariantAdded()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to create new variant")
    } finally {
      setIsSubmittingNewVariant(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200 overflow-x-hidden">
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Level 1: Main Product Header */}
        <div className="p-5 sm:p-6 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold uppercase text-[10px] tracking-wider">
                {masterProduct.category?.name || "Product Series"}
              </Badge>
              <Badge variant="secondary" className="font-semibold text-xs bg-muted border">
                <LayoutGrid className="h-3 w-3 mr-1 text-primary" />
                {allSubProductNames.length} Sub-Products / Workstation Models
              </Badge>
              <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary border border-primary/20">
                <Layers className="h-3 w-3 mr-1" />
                {variants.length} Total Variations
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              {masterProduct.productName}
            </h2>
            <p className="text-xs text-muted-foreground">
              Select a sub-product workstation model below to choose your required attribute combination (dimensions, finish, legs, side return).
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            {canEditProduct && onEditMasterProduct && (
              <Button
                variant="outline"
                onClick={() => onEditMasterProduct(masterProduct)}
                className="border-primary/20 hover:border-primary/40 text-foreground font-bold text-xs rounded-xl h-9 px-3 flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Edit Master Product Details"
              >
                <Pencil className="h-4 w-4 text-primary" />
                Edit Master
              </Button>
            )}
            {canEditProduct && (
              <Button
                onClick={() => setIsAddingVariant(!isAddingVariant)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-9 px-4 flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Variant
              </Button>
            )}
            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Stock</span>
              <span className={`text-sm font-extrabold ${totalStock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}`}>
                {totalStock} units
              </span>
            </div>

            {hasQuoteAccess && onOpenCart && (
              <Button
                variant="outline"
                onClick={onOpenCart}
                className="border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-foreground font-bold text-xs rounded-xl h-9 px-3 flex items-center gap-2 relative shadow-sm cursor-pointer"
                title="View Quote Compilation Cart"
              >
                <ShoppingCart className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">Quote Cart</span>
                {quoteCartCount !== undefined && quoteCartCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-extrabold h-5 w-5 rounded-full flex items-center justify-center shadow shadow-primary/30">
                    {quoteCartCount}
                  </span>
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Level 2 & 3: Unified Filter Controls (Sub-Product Dropdown & Attribute Combination Dropdowns) */}
        <div className="border-b bg-muted/10 p-4 space-y-4 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase text-primary tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4" />
                Filter Options:
              </span>
              <Badge variant="secondary" className="text-xs font-bold bg-background border">
                {finalFilteredVariants.length} Variations Shown
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {(selectedSubProduct !== "all" || selectedDimension !== "all" || selectedFinish !== "all" || selectedLeg !== "all" || selectedSideReturn !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedSubProduct("all")
                    setSelectedDimension("all")
                    setSelectedFinish("all")
                    setSelectedLeg("all")
                    setSelectedSideReturn("all")
                  }}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground h-8 cursor-pointer"
                >
                  Reset All Filters
                </Button>
              )}

              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search sub-products / SKUs..."
                  value={subProductSearch}
                  onChange={(e) => setSubProductSearch(e.target.value)}
                  className="h-8 text-xs pl-8 bg-background"
                />
              </div>
            </div>
          </div>

          {/* Unified Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            
            {/* 1. Sub-Product / Model Popover Combobox Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1">
                <LayoutGrid className="h-3 w-3 text-primary" />
                Sub-Product / Model
              </label>
              <Popover open={isSubProductPopoverOpen} onOpenChange={setIsSubProductPopoverOpen}>
                <PopoverTrigger 
                  className="w-full h-9 text-xs font-bold rounded-xl border bg-background border-border/80 px-3 cursor-pointer shadow-2xs hover:border-primary/40 focus:ring-2 focus:ring-primary flex items-center justify-between gap-2 overflow-hidden transition-colors"
                  aria-expanded={isSubProductPopoverOpen}
                >
                  <span className="truncate flex items-center gap-1.5 min-w-0">
                    {selectedSubProduct === "all" ? (
                      <span>All Sub-Products ({allSubProductNames.length})</span>
                    ) : (
                      <>
                        <span className="truncate">{selectedSubProduct}</span>
                        {(() => {
                          const item = availableSubProducts.find(s => s.value === selectedSubProduct)
                          return item ? (
                            <Badge variant="secondary" className="text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/20 shrink-0">
                              {item.count}
                            </Badge>
                          ) : null
                        })()}
                      </>
                    )}
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60 text-muted-foreground" />
                </PopoverTrigger>
                
                <PopoverContent 
                  className="w-[340px] sm:w-[440px] p-0 rounded-2xl shadow-2xl border bg-card text-card-foreground z-[65]" 
                  align="start"
                >
                  <Command filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase())) return 1
                    return 0
                  }}>
                    <CommandInput placeholder="Search workstation models..." className="h-10 text-xs px-3" />
                    <CommandList className="max-h-76 overflow-y-auto p-2 space-y-1">
                      <CommandEmpty className="p-4 text-center text-xs text-muted-foreground">
                        No workstation models match your search.
                      </CommandEmpty>
                      
                      <CommandGroup>
                        {/* Option: All Sub-Products */}
                        <CommandItem
                          value="all All Sub-Products"
                          onSelect={() => {
                            setSelectedSubProduct("all")
                            setIsSubProductPopoverOpen(false)
                          }}
                          className={cn(
                            "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 mb-1",
                            selectedSubProduct === "all" 
                              ? "bg-primary/10 border-primary/40 text-primary font-bold shadow-xs" 
                              : "border-border/40 hover:bg-muted/60 dark:hover:bg-muted/30 text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                              <LayoutGrid className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-xs leading-snug">All Sub-Products</span>
                              <span className="text-[10px] text-muted-foreground">Show all models in series</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="text-[10px] font-mono font-bold bg-muted text-muted-foreground">
                              {allSubProductNames.length} models
                            </Badge>
                            <Check className={cn("h-4 w-4 text-primary", selectedSubProduct === "all" ? "opacity-100" : "opacity-0")} />
                          </div>
                        </CommandItem>

                        {/* Model Cards */}
                        {availableSubProducts.map((opt) => {
                          const isSelected = selectedSubProduct === opt.value
                          const img = subProductImageMap.get(opt.value) || masterProduct?.imageUrl

                          return (
                            <CommandItem
                              key={opt.value}
                              value={opt.value}
                              onSelect={() => {
                                setSelectedSubProduct(opt.value)
                                setIsSubProductPopoverOpen(false)
                              }}
                              className={cn(
                                "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 my-1",
                                isSelected
                                  ? "bg-primary/10 border-primary/40 text-primary font-bold shadow-xs"
                                  : "border-border/40 hover:bg-muted/60 dark:hover:bg-muted/30 text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Model Thumbnail */}
                                <div className="h-10 w-10 border rounded-lg bg-white dark:bg-muted/50 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                                  {img ? (
                                    <img
                                      src={img.startsWith("http") || img.startsWith("/") ? img : `/${img}`}
                                      alt={opt.label}
                                      className="h-full w-full object-contain p-0.5"
                                    />
                                  ) : (
                                    <Package className="h-5 w-5 text-muted-foreground/50" />
                                  )}
                                </div>
                                
                                {/* Model Title & Specs */}
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="font-bold text-xs leading-snug break-words whitespace-normal text-foreground" title={opt.label}>
                                    {opt.label}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                    {masterProduct?.productCode}
                                  </span>
                                </div>
                              </div>

                              {/* Variant Count & Selection Indicator */}
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border",
                                    isSelected 
                                      ? "bg-primary text-primary-foreground border-primary" 
                                      : "bg-primary/10 text-primary border-primary/20"
                                  )}
                                >
                                  {opt.count} {opt.count === 1 ? "var" : "vars"}
                                </Badge>
                                <Check className={cn("h-4 w-4 text-primary shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* 2. Dimensions / Size Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Ruler className="h-3 w-3 text-primary" />
                Dimensions / Size
              </label>
              <Select value={selectedDimension} onValueChange={(val) => setSelectedDimension(val || "all")}>
                <SelectTrigger className="w-full h-9 text-xs font-semibold font-mono rounded-xl border bg-background border-border/80 px-3 cursor-pointer shadow-2xs hover:border-primary/40 focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="All Dimensions" />
                </SelectTrigger>
                <SelectContent className="max-h-60 min-w-[240px] sm:min-w-[280px] bg-card border rounded-xl shadow-xl z-50">
                  <SelectItem value="all" className="text-xs font-semibold cursor-pointer">
                    All Dimensions ({availableDimensions.length})
                  </SelectItem>
                  {availableDimensions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs font-mono font-medium cursor-pointer">
                      <span className="flex items-center justify-between w-full gap-2">
                        <span className="truncate">{opt.label}</span>
                        <span className="text-[10px] font-mono text-muted-foreground font-bold shrink-0">({opt.count})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Table Top Finish / Wood Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Palette className="h-3 w-3 text-primary" />
                Table Top Finish
              </label>
              <Select value={selectedFinish} onValueChange={(val) => setSelectedFinish(val || "all")}>
                <SelectTrigger className="w-full h-9 text-xs font-semibold rounded-xl border bg-background border-border/80 px-3 cursor-pointer shadow-2xs hover:border-primary/40 focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="All Finishes" />
                </SelectTrigger>
                <SelectContent className="max-h-60 min-w-[240px] sm:min-w-[280px] bg-card border rounded-xl shadow-xl z-50">
                  <SelectItem value="all" className="text-xs font-semibold cursor-pointer">
                    All Finishes ({availableFinishes.length})
                  </SelectItem>
                  {availableFinishes.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium cursor-pointer">
                      <span className="flex items-center justify-between w-full gap-2">
                        <span className="truncate">{opt.label}</span>
                        <span className="text-[10px] font-mono text-muted-foreground font-bold shrink-0">({opt.count})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Leg Type / Color Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Layers className="h-3 w-3 text-primary" />
                Leg Type / Color
              </label>
              <Select value={selectedLeg} onValueChange={(val) => setSelectedLeg(val || "all")}>
                <SelectTrigger className="w-full h-9 text-xs font-semibold rounded-xl border bg-background border-border/80 px-3 cursor-pointer shadow-2xs hover:border-primary/40 focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="All Leg Options" />
                </SelectTrigger>
                <SelectContent className="max-h-60 min-w-[240px] sm:min-w-[280px] bg-card border rounded-xl shadow-xl z-50">
                  <SelectItem value="all" className="text-xs font-semibold cursor-pointer">
                    All Leg Options ({availableLegs.length})
                  </SelectItem>
                  {availableLegs.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium cursor-pointer">
                      <span className="flex items-center justify-between w-full gap-2">
                        <span className="truncate">{opt.label}</span>
                        <span className="text-[10px] font-mono text-muted-foreground font-bold shrink-0">({opt.count})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 5. Side Return Option Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Boxes className="h-3 w-3 text-primary" />
                Side Return Option
              </label>
              <Select value={selectedSideReturn} onValueChange={(val) => setSelectedSideReturn(val || "all")}>
                <SelectTrigger className="w-full h-9 text-xs font-semibold rounded-xl border bg-background border-border/80 px-3 cursor-pointer shadow-2xs hover:border-primary/40 focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="All Side Returns" />
                </SelectTrigger>
                <SelectContent className="max-h-60 min-w-[240px] sm:min-w-[280px] bg-card border rounded-xl shadow-xl z-50">
                  <SelectItem value="all" className="text-xs font-semibold cursor-pointer">
                    All Side Returns ({availableSideReturns.length})
                  </SelectItem>
                  {availableSideReturns.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium cursor-pointer">
                      <span className="flex items-center justify-between w-full gap-2">
                        <span className="truncate">{opt.label}</span>
                        <span className="text-[10px] font-mono text-muted-foreground font-bold shrink-0">({opt.count})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Level 3: Variant Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">     

          {/* Add New Variant Form Card */}
          {isAddingVariant && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4 shadow-md animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Create New Variant for {masterProduct.productName}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Configure model type, colors, prices, and stock to add a new option to this series.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => setIsAddingVariant(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-foreground block">
                    Sub-Model / Variant Type <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Single Seater Workstation, Ultra Single Seater"
                    value={newVariantForm.modelName}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, modelName: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground block">
                    Color / Finish
                  </label>
                  <Input
                    placeholder="e.g. Walnut Wood / White Legs"
                    value={newVariantForm.availableColors}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, availableColors: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground block">
                    Product SKU (Optional)
                  </label>
                  <Input
                    placeholder="Auto-generated if blank"
                    value={newVariantForm.productCode}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, productCode: e.target.value })}
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-foreground block">
                    Variant Display Name (Optional)
                  </label>
                  <Input
                    placeholder={`e.g. ${masterProduct.productName} ${newVariantForm.modelName || "Single Seater Workstation"}`}
                    value={newVariantForm.productName}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, productName: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground block">
                    Initial Stock Qty
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={newVariantForm.stock}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, stock: parseInt(e.target.value, 10) || 0 })}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground block">
                    Cost Price (AED)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newVariantForm.costPrice}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, costPrice: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground block">
                    Project Price (AED)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newVariantForm.projectPrice}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, projectPrice: parseFloat(e.target.value) || 0, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs bg-background font-bold text-primary"
                  />
                </div>

                <div className="space-y-1 sm:col-span-3">
                  <label className="font-bold text-foreground block">
                    Short Description
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Enter short description for quotation preview..."
                    value={newVariantForm.description}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, description: e.target.value })}
                    className="text-xs bg-background resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingVariant(false)}
                  className="text-xs h-8 rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateVariantSubmit}
                  disabled={isSubmittingNewVariant}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                >
                  {isSubmittingNewVariant ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Save Variant
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Variants Count Header */}
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>
              Showing <strong className="text-foreground font-extrabold">{finalFilteredVariants.length}</strong> of {variants.length} variations
            </span>
            {selectedSubProduct !== "all" && (
              <span>Sub-Product: <strong className="text-foreground">{selectedSubProduct}</strong></span>
            )}
          </div>

          {/* Empty State */}
          {finalFilteredVariants.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20 space-y-3">
              <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">No variations match the selected filters</p>
                <p className="text-xs text-muted-foreground">Try resetting your combination filters or choosing another sub-product model.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSubProduct("all")
                  setSelectedDimension("all")
                  setSelectedFinish("all")
                  setSelectedLeg("all")
                  setSelectedSideReturn("all")
                }}
                className="text-xs rounded-xl border-primary/20 text-primary hover:bg-primary/10 cursor-pointer"
              >
                Reset All Filters
              </Button>
            </div>
          ) : (
            /* Variant Cards Grid */
            <div className="space-y-3">
              {finalFilteredVariants.map((variant) => {
                const isEditingThisDetails = editingVariantDetailsId === variant.id
                const isStockEditing = editingStockId === variant.id
                const displayPrice = variant.projectPrice || variant.unitPrice || 0
                const attrs = extractVariantAttributes(variant)
                const subProductName = getSubProductName(variant, masterTitle)

                if (isEditingThisDetails) {
                  return (
                    <div
                      key={variant.id}
                      className="border-2 border-amber-500/40 rounded-xl p-4 sm:p-5 bg-amber-500/5 space-y-4 shadow-md animate-in fade-in duration-150"
                    >
                      <div className="flex items-center justify-between border-b border-amber-500/15 pb-2">
                        <span className="font-bold text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <Pencil className="h-3.5 w-3.5" />
                          Editing Variant: <strong className="font-mono">{variant.productCode}</strong>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingVariantDetailsId(null)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-bold text-foreground block">SKU Code</label>
                          <Input
                            value={editVariantForm.productCode}
                            onChange={(e) => setEditVariantForm({ ...editVariantForm, productCode: e.target.value })}
                            className="h-8 text-xs bg-background font-mono"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <label className="font-bold text-foreground block">Product Name</label>
                          <Input
                            value={editVariantForm.productName}
                            onChange={(e) => setEditVariantForm({ ...editVariantForm, productName: e.target.value })}
                            className="h-8 text-xs bg-background font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-foreground block">Sub-Product Model</label>
                          <Input
                            value={editVariantForm.modelName}
                            onChange={(e) => setEditVariantForm({ ...editVariantForm, modelName: e.target.value })}
                            className="h-8 text-xs bg-background"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-foreground block">Color / Finish</label>
                          <Input
                            value={editVariantForm.availableColors}
                            onChange={(e) => setEditVariantForm({ ...editVariantForm, availableColors: e.target.value })}
                            className="h-8 text-xs bg-background"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-foreground block">Stock Quantity</label>
                          <Input
                            type="number"
                            min="0"
                            value={editVariantForm.stock}
                            onChange={(e) => setEditVariantForm({ ...editVariantForm, stock: parseInt(e.target.value, 10) || 0 })}
                            className="h-8 text-xs bg-background"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-foreground block">Cost Price (AED)</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editVariantForm.costPrice}
                            onChange={(e) => setEditVariantForm({ ...editVariantForm, costPrice: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs bg-background"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-foreground block">Project Price (AED)</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editVariantForm.projectPrice}
                            onChange={(e) => setEditVariantForm({ ...editVariantForm, projectPrice: parseFloat(e.target.value) || 0, unitPrice: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs bg-background font-bold text-primary"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-3">
                          <label className="font-bold text-foreground block flex items-center justify-between">
                            <span>Short Description</span>
                            <span className="text-[10px] text-muted-foreground font-normal">Essential product details for quotations</span>
                          </label>
                          <Textarea
                            rows={2}
                            placeholder="Enter short description for quotation preview..."
                            value={editVariantForm.description}
                            onChange={(e) => setEditVariantForm({ ...editVariantForm, description: e.target.value })}
                            className="text-xs bg-background resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/15">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingVariantDetailsId(null)}
                          className="text-xs h-8 rounded-lg cursor-pointer"
                          disabled={isSubmittingEditVariant}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveVariantSubmit(variant.id)}
                          disabled={isSubmittingEditVariant}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          {isSubmittingEditVariant ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Saving Changes...
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={variant.id}
                    className="border rounded-xl p-4 sm:p-5 bg-background hover:border-primary/40 transition-all shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                  >
                    {/* Variant Thumbnail & Primary Info */}
                    <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl border bg-muted/30 shrink-0 overflow-hidden relative flex items-center justify-center group/img shadow-sm">
                        {uploadingImageId === variant.id ? (
                          <div className="flex flex-col items-center justify-center gap-1 text-primary animate-pulse p-1 text-center">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-[9px] font-bold">Uploading...</span>
                          </div>
                        ) : (
                          <>
                            {variant.imageUrl ? (
                              <img
                                src={variant.imageUrl.startsWith("http") || variant.imageUrl.startsWith("/") ? variant.imageUrl : `/${variant.imageUrl}`}
                                alt={variant.productName}
                                className="h-full w-full object-cover object-center group-hover/img:scale-105 transition-transform"
                              />
                            ) : (
                              <Package className="h-8 w-8 text-muted-foreground/40" />
                            )}

                            {canEditProduct && (
                              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer text-[10px] font-bold gap-1 p-1 text-center select-none z-10">
                                <Camera className="h-4 w-4 text-white" />
                                <span>{variant.imageUrl ? "Change" : "Add Image"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleImageUpload(variant.id, file)
                                  }}
                                />
                              </label>
                            )}
                          </>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground font-semibold px-2 py-0.5 rounded bg-muted">
                            {variant.productCode}
                          </span>
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                            {subProductName}
                          </Badge>
                          {attrs.dimensions !== "Standard Size" && (
                            <span className="text-[11px] font-medium text-foreground bg-muted/60 border px-2 py-0.5 rounded-md">
                              {attrs.dimensions}
                            </span>
                          )}
                          {attrs.sideReturn !== "No Side Return" && (
                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                              {attrs.sideReturn}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-base text-foreground leading-snug truncate">
                          {variant.productName}
                        </h4>

                        {variant.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 italic bg-muted/30 px-2 py-0.5 rounded border border-border/40 max-w-xl">
                            "{variant.description}"
                          </p>
                        )}

                        {/* Attribute Badges */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground pt-0.5">
                          {attrs.finish !== "Standard Finish" && (
                            <span className="bg-muted px-2 py-0.5 rounded border">
                              Finish: <strong className="text-foreground font-semibold">{attrs.finish}</strong>
                            </span>
                          )}
                          {attrs.legs !== "Standard Frame" && (
                            <span className="bg-muted px-2 py-0.5 rounded border">
                              Legs: <strong className="text-foreground font-semibold">{attrs.legs}</strong>
                            </span>
                          )}
                          {attrs.color !== "Default Color" && (
                            <span className="bg-muted px-2 py-0.5 rounded border flex items-center gap-1">
                              <Palette className="h-3 w-3 text-primary" />
                              <strong className="text-foreground font-semibold">{attrs.color}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock, Pricing & Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-4 sm:gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 shrink-0 flex-wrap sm:flex-nowrap">
                      
                      {/* Stock Level */}
                      <div className="flex flex-col items-start sm:items-end">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Stock
                        </span>
                        {isStockEditing ? (
                          <div className="flex items-center gap-1 mt-1">
                            <Input
                              type="number"
                              min="0"
                              className="h-7 w-20 text-xs text-center font-bold"
                              value={draftStockVal}
                              onChange={(e) => setDraftStockVal(parseInt(e.target.value, 10) || 0)}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                              disabled={savingStockId === variant.id}
                              onClick={() => handleStockSaveSubmit(variant.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditingStockId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                variant.stock > 0
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                              }`}
                            >
                              {variant.stock > 0 ? `${variant.stock} available` : "Out of stock"}
                            </span>
                            {canEditProduct && onSaveStock && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground"
                                onClick={() => {
                                  setEditingStockId(variant.id)
                                  setDraftStockVal(variant.stock || 0)
                                }}
                                title="Edit stock level"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pricing Display */}
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Project Rate
                        </span>
                        <span className="text-lg font-black text-primary">
                          AED {displayPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {canEditProduct && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => startEditingVariant(variant)}
                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border-muted-foreground/20 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer"
                            title="Edit Variant Details"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}

                        {hasQuoteAccess && (
                          <Button
                            onClick={() => onAddToCart(variant)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow hover:shadow-md cursor-pointer flex items-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl shrink-0 text-xs"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            <span>Add to Quote</span>
                          </Button>
                        )}

                        {canDeleteProduct && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteVariant(variant.id, variant.productName)}
                            disabled={deletingVariantId === variant.id}
                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/40 transition-colors shrink-0 cursor-pointer"
                            title="Delete Variant"
                          >
                            {deletingVariantId === variant.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t bg-muted/20 flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground">
            Master SKU: <span className="font-mono font-bold text-foreground">{masterProduct.productCode}</span>
          </p>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Close
          </Button>
        </div>

      </div>
    </div>
  )
}
