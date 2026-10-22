"use client"

import { useState, useMemo, useEffect } from "react"
import {
  X,
  Package,
  Layers,
  ShoppingCart,
  Check,
  Pencil,
  Tag,
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
  Ruler,
  ChevronsUpDown,
  Armchair,
  Building2,
  Box,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn, formatImageUrl } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import RichTextEditor from "@/components/ui/rich-text-editor"
import { categoryTrail, facetDefsFor, optionSummary, variantKind, variantNoun, variantTypeLabel } from "@/lib/variant-facets"

// Helper icon for dynamic attribute labels
const getAttributeIcon = (name: string) => {
  const lower = name.toLowerCase()
  if (lower.includes("color") || lower.includes("finish")) return <Palette className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("dimension") || lower.includes("size")) return <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("leg") || lower.includes("base") || lower.includes("frame")) return <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("chair") || lower.includes("back") || lower.includes("seat") || lower.includes("arm") || lower.includes("headrest")) return <Armchair className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("top") || lower.includes("surface") || lower.includes("table")) return <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("storage") || lower.includes("drawer") || lower.includes("pedestal") || lower.includes("lock") || lower.includes("handle")) return <Box className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("warranty")) return <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("material") || lower.includes("upholstery") || lower.includes("fabric")) return <Tag className="h-3.5 w-3.5 text-muted-foreground" />
  return <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
}

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

// Searchable Attribute Combobox component with inline "+ Add New" value creation
interface AttributeComboboxProps {
  attrName: string
  options: string[]
  value: string
  onChange: (value: string) => void
  onAddNewValue: (attrName: string, newValue: string) => void
  icon?: React.ReactNode
}

function AttributeCombobox({
  attrName,
  options,
  value,
  onChange,
  onAddNewValue,
  icon,
}: AttributeComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newValInput, setNewValInput] = useState("")

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const query = search.toLowerCase().trim()
    return options.filter((opt) => opt.toLowerCase().includes(query))
  }, [options, search])

  const handleCreate = () => {
    const trimmed = (newValInput || search).trim()
    if (!trimmed) return
    onAddNewValue(attrName, trimmed)
    onChange(trimmed)
    setNewValInput("")
    setSearch("")
    setIsCreatingNew(false)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="w-full h-9 px-3 text-xs justify-between bg-background border border-border/80 rounded-lg hover:border-primary/40 focus:ring-2 focus:ring-primary font-medium flex items-center transition-colors cursor-pointer"
        aria-expanded={open}
      >
        <span className="truncate text-foreground font-semibold">
          {value || `Select ${attrName}`}
        </span>
        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2 bg-card border rounded-xl shadow-xl z-50 space-y-2" align="start">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={`Search ${attrName}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-muted/30 border-muted focus-visible:ring-1"
          />
        </div>

        {/* Inline Create Form if toggled */}
        {isCreatingNew ? (
          <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
            <span className="text-[11px] font-bold text-primary block flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add New {attrName}:
            </span>
            <Input
              placeholder={`Enter new ${attrName}...`}
              value={newValInput}
              onChange={(e) => setNewValInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleCreate()
                }
              }}
              autoFocus
              className="h-8 text-xs bg-background font-medium"
            />
            <div className="flex items-center justify-end gap-1.5 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setIsCreatingNew(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-6 text-[10px] px-2.5 bg-primary text-primary-foreground font-bold cursor-pointer"
                onClick={handleCreate}
              >
                Save &amp; Select
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Options List */}
            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = value === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onChange(opt)
                        setOpen(false)
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 text-xs rounded-md flex items-center justify-between transition-colors cursor-pointer",
                        isSelected
                          ? "bg-primary/10 text-primary font-bold"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <span className="truncate">{opt}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                    </button>
                  )
                })
              )}
            </div>

            {/* + Add New Option Button */}
            <div className="pt-1.5 border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  setNewValInput(search)
                  setIsCreatingNew(true)
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-md text-primary hover:bg-primary/10 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>
                  + Add New {attrName}
                  {search ? ` "${search}"` : ""}
                </span>
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
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
    specifications: "",
  })

  // Configuration-Based Variant Builder state
  const [isAddingVariant, setIsAddingVariant] = useState(false)
  const [isSubmittingNewVariant, setIsSubmittingNewVariant] = useState(false)
  const [newVariantImageFile, setNewVariantImageFile] = useState<File | null>(null)
  const [newVariantSelectedAttrs, setNewVariantSelectedAttrs] = useState<Record<string, string>>({})
  const [customAttrOptions, setCustomAttrOptions] = useState<Record<string, string[]>>({})

  // Multi-image upload state for Variant Builder
  const [variantUploadedImages, setVariantUploadedImages] = useState<string[]>([])
  const [variantPrimaryImage, setVariantPrimaryImage] = useState<string | null>(null)
  const [isUploadingVariantImages, setIsUploadingVariantImages] = useState(false)
  const [isDraggingVariantImages, setIsDraggingVariantImages] = useState(false)

  // Upload handler for variant images
  const handleVariantImagesUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return
    setIsUploadingVariantImages(true)
    const newUrls: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append("file", file)
        const uploadRes = await fetch("/api/upload?type=products", {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (uploadRes.ok && uploadData.url) {
          newUrls.push(uploadData.url)
        }
      }

      if (newUrls.length > 0) {
        setVariantUploadedImages((prev) => {
          const updated = [...prev, ...newUrls]
          if (!variantPrimaryImage) {
            setVariantPrimaryImage(updated[0])
          }
          return updated
        })
        toast.success(`Uploaded ${newUrls.length} image(s) successfully!`)
      }
    } catch (err: any) {
      console.error("Variant image upload error:", err)
      toast.error(err.message || "Failed to upload variant images")
    } finally {
      setIsUploadingVariantImages(false)
    }
  }

  // Remove single image from variant images list
  const handleRemoveVariantImage = (urlToRemove: string) => {
    setVariantUploadedImages((prev) => {
      const filtered = prev.filter((u) => u !== urlToRemove)
      if (variantPrimaryImage === urlToRemove) {
        setVariantPrimaryImage(filtered[0] || null)
      }
      return filtered
    })
  }

  const [newVariantForm, setNewVariantForm] = useState({
    productCode: "",
    productName: "",
    modelName: "Standard",
    availableColors: "",
    costPrice: 0,
    unitPrice: 300,
    projectPrice: 300,
    stock: 10,
    description: "",
    specifications: "",
  })

  // Category attribute identification for Master Product
  const categoryName = masterProduct?.category?.name || "Chairs"
  const categoryLower = categoryName.toLowerCase()
  const isChairCategory = categoryLower.includes("chair") || categoryLower.includes("seating")
  const isWorkstationCategory = categoryLower.includes("workstation") || categoryLower.includes("desk") || categoryLower.includes("table")
  const isStorageCategory = categoryLower.includes("storage") || categoryLower.includes("cabinet") || categoryLower.includes("pedestal")

  // Base Category Attribute Options map for Master Product
  const activeCategoryAttrOptions: Record<string, string[]> = useMemo(() => {
    if (!masterProduct) return {}

    // 1. Check if master product defines custom variantAttributes JSON
    if (masterProduct.variantAttributes && typeof masterProduct.variantAttributes === "object") {
      const vAttrs = masterProduct.variantAttributes as Record<string, any>
      const customMap: Record<string, string[]> = {}
      for (const [k, v] of Object.entries(vAttrs)) {
        if (Array.isArray(v)) {
          customMap[k] = v
        } else if (typeof v === "string" && v.includes(",")) {
          customMap[k] = v.split(",").map((s) => s.trim()).filter(Boolean)
        } else if (v) {
          customMap[k] = [String(v).trim()]
        }
      }
      if (Object.keys(customMap).length > 0) return customMap
    }

    // 2. Standard Category attribute presets per proposed behavior
    if (isChairCategory) {
      return {
        "Chair Type": ["High Back (101)", "Mid Back (201)", "Low Back (301)", "Executive Chair", "Task Chair", "Visitor / Guest"],
        "Headrest Color": ["Black", "Grey", "White", "Red", "Blue", "None / N/A"],
        "Backrest Color": ["Black Mesh", "Grey Mesh", "Red Mesh", "Blue Mesh", "Leather Black", "Leather Tan"],
        "Seat Color": ["Black Fabric", "Grey Fabric", "Blue Fabric", "Red Fabric", "Tan Leather"],
        "Base Type": ["Aluminium Base", "Nylon Base", "Chrome Base"],
        "Armrest Type": ["3D Adjustable", "Fixed Armrest", "4D Armrest", "Armless"],
      }
    }

    if (isWorkstationCategory) {
      return {
        "Table Top Color": ["White Top", "Beech Top", "Walnut Top", "Black Top", "Oak Top"],
        "Leg Type": ["Loop Leg", "A-Leg", "O-Leg", "Mild Steel Frame", "Timber Legs"],
        "Leg Color": ["Black Legs", "White Legs", "Silver Legs"],
        "Table Dimensions": ["1200 x 600 mm", "1400 x 700 mm", "1500 x 750 mm", "1600 x 800 mm", "1800 x 800 mm"],
        "Cable Tray Option": ["Under-desk Cable Tray", "Flip Box Grommet", "Snake Wire Tray", "None"],
      }
    }

    if (isStorageCategory) {
      return {
        "Finish Color": ["White Finish", "Black Finish", "Walnut Finish", "Beech Finish"],
        "Handle Type": ["Recessed Aluminium", "Bar Handle", "Push to Open", "Flush Handle"],
        "Lock Type": ["Digital Keypad Lock", "Key Lock", "Combination Lock", "No Lock"],
        "Storage Dimensions": ["400 x 500 x 600 mm", "800 x 450 x 1200 mm", "900 x 450 x 1800 mm"],
      }
    }

    // General / Fallback category
    return {
      "Color / Finish": ["Black", "White", "Grey", "Wood Finish"],
      "Dimension / Size": ["Standard Size", "Compact Size", "Large Size"],
      "Material / Finish": ["Standard Material", "Premium Fabric", "Wood Veneer"],
    }
  }, [masterProduct, isChairCategory, isWorkstationCategory, isStorageCategory])

  // Merged Category Attribute Options including dynamically created inline values
  const mergedCategoryAttrOptions: Record<string, string[]> = useMemo(() => {
    const base = { ...activeCategoryAttrOptions }
    for (const [key, extraOpts] of Object.entries(customAttrOptions)) {
      if (base[key]) {
        const combined = [...base[key]]
        for (const opt of extraOpts) {
          if (!combined.includes(opt)) combined.push(opt)
        }
        base[key] = combined
      } else {
        base[key] = extraOpts
      }
    }
    return base
  }, [activeCategoryAttrOptions, customAttrOptions])

  // Handler for adding new attribute value directly from combobox
  const handleAddNewAttrValue = (attrName: string, newValue: string) => {
    const trimmed = newValue.trim()
    if (!trimmed) return
    setCustomAttrOptions((prev) => {
      const existing = prev[attrName] || []
      if (existing.includes(trimmed)) return prev
      return {
        ...prev,
        [attrName]: [...existing, trimmed],
      }
    })
    setNewVariantSelectedAttrs((prev) => ({
      ...prev,
      [attrName]: trimmed,
    }))
  }

  // Initialize selected attribute values and form when isAddingVariant opens
  useEffect(() => {
    if (isAddingVariant && mergedCategoryAttrOptions) {
      const initialAttrs: Record<string, string> = {}
      for (const [key, opts] of Object.entries(mergedCategoryAttrOptions)) {
        if (opts.length > 0) {
          initialAttrs[key] = opts[0]
        }
      }
      setNewVariantSelectedAttrs(initialAttrs)
      setVariantUploadedImages([])
      setVariantPrimaryImage(null)
      setNewVariantForm({
        productCode: "",
        productName: "",
        modelName: "Standard",
        availableColors: "",
        costPrice: 0,
        unitPrice: 300,
        projectPrice: 300,
        stock: 10,
        description: "",
        specifications: "",
      })
    }
  }, [isAddingVariant, mergedCategoryAttrOptions])

  // Track broken/404 image URLs to gracefully fallback to Package icon
  const [failedImageUrls, setFailedImageUrls] = useState<Record<string, boolean>>({})

  const handleImageError = (url?: string | null) => {
    if (!url) return
    setFailedImageUrls((prev) => ({ ...prev, [url]: true }))
  }

  // Variants of this model, organised like the product listing: chair types (chairs), seater & layouts
  // (workstations, desks, tables) or plain variants (storage and others)
  const variants = useMemo(() => masterProduct?.variants || [], [masterProduct])
  const masterTitle = masterProduct?.productName || "Product Series"
  const kind = useMemo(() => variantKind(masterProduct?.category, variants), [masterProduct, variants])
  const facetDefs = useMemo(() => facetDefsFor(kind, masterTitle), [kind, masterTitle])

  const [selectedFacets, setSelectedFacets] = useState<Record<string, string>>({})
  const [variantSearch, setVariantSearch] = useState<string>("")

  // Each variant's values for every filter (a chair type offers several colours, a layout several sizes)
  const variantFacetValues = useMemo(
    () =>
      variants.map((v) => ({
        variant: v,
        values: Object.fromEntries(facetDefs.map((f) => [f.key, f.values(v)])) as Record<string, string[]>,
      })),
    [variants, facetDefs]
  )

  const searchedVariants = useMemo(() => {
    const q = variantSearch.trim().toLowerCase()
    if (!q) return variantFacetValues
    return variantFacetValues.filter(({ variant, values }) =>
      [variant.productCode, variant.productName, variant.description || "", ...Object.values(values).flat()].some((s) =>
        String(s).toLowerCase().includes(q)
      )
    )
  }, [variantFacetValues, variantSearch])

  // Filter options are counted against the other active filters; only filters with a real choice are shown
  const facetOptions = useMemo(() => {
    const matchesOthers = (values: Record<string, string[]>, except: string) =>
      facetDefs.every((f) => f.key === except || !selectedFacets[f.key] || values[f.key].includes(selectedFacets[f.key]))
    return facetDefs
      .map((f) => {
        const counts = new Map<string, number>()
        for (const { values } of searchedVariants) {
          if (!matchesOthers(values, f.key)) continue
          for (const val of new Set(values[f.key])) counts.set(val, (counts.get(val) || 0) + 1)
        }
        const distinct = new Set(variantFacetValues.flatMap(({ values }) => values[f.key])).size
        const options = [...counts.entries()]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }))
        return { ...f, options, distinct }
      })
      .filter((f) => f.distinct > 1)
  }, [facetDefs, searchedVariants, variantFacetValues, selectedFacets])

  const finalFilteredVariants = useMemo(
    () =>
      searchedVariants
        .filter(({ values }) => facetDefs.every((f) => !selectedFacets[f.key] || values[f.key].includes(selectedFacets[f.key])))
        .map(({ variant }) => variant),
    [searchedVariants, facetDefs, selectedFacets]
  )

  const activeFilters = facetDefs.filter((f) => selectedFacets[f.key]).map((f) => ({ label: f.label, value: selectedFacets[f.key] }))
  const resetFilters = () => setSelectedFacets({})

  if (!isOpen || !masterProduct) return null

  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0)
  const categoryPath = categoryTrail(kind, masterProduct.category?.name)
  const variantPrices = variants.map((v) => v.projectPrice || v.unitPrice || 0).filter((p) => p > 0)
  const modelPriceFrom = variantPrices.length ? Math.min(...variantPrices) : 0

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
      specifications: variant.specifications || "",
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
          specifications: editVariantForm.specifications.trim() || null,
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
            specifications: editVariantForm.specifications.trim() || null,
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
      if (data.url) {
        setFailedImageUrls((prev) => ({ ...prev, [data.url]: false }))
      }

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

      const varName = newVariantForm.productName.trim()
      if (!varName) {
        toast.error("Please enter a Product Variant Name")
        setIsSubmittingNewVariant(false)
        return
      }

      const masterPrefix = masterProduct.productCode.replace("MASTER-", "").replace(/[^A-Z0-9]/g, "").slice(0, 5)

      // Primary color value extracted for availableColors field
      const primaryColorVal = newVariantSelectedAttrs["Seat Color"] ||
        newVariantSelectedAttrs["Backrest Color"] ||
        newVariantSelectedAttrs["Table Top Color"] ||
        newVariantSelectedAttrs["Finish Color"] ||
        newVariantSelectedAttrs["Color / Finish"] ||
        ""

      const selectedChairType = newVariantSelectedAttrs["Chair Type"] || null
      const finalPrimaryImage = variantPrimaryImage || variantUploadedImages[0] || masterProduct.imageUrl || null
      const sku = newVariantForm.productCode.trim() || `${masterPrefix}-VAR-${Date.now().toString().slice(-4)}`
      const project = newVariantForm.projectPrice || newVariantForm.unitPrice || 0

      const payload = {
        productCode: sku,
        productName: varName,
        categoryName: masterProduct.category?.name || "Chairs",
        parentProductId: masterProduct.id,
        isMaster: false,
        modelName: masterProduct.modelName || masterProduct.productName || null,
        availableColors: primaryColorVal.trim() || null,
        costPrice: 0,
        unitPrice: project,
        projectPrice: project,
        dealerPrice: project,
        interiorPrice: project,
        specialPrice: project,
        stock: newVariantForm.stock || 0,
        imageUrl: finalPrimaryImage,
        imageUrls: variantUploadedImages,
        chairType: selectedChairType,
        variantAttributes: Object.keys(newVariantSelectedAttrs).length > 0 ? newVariantSelectedAttrs : undefined,
        description: newVariantForm.description.trim() || null,
        specifications: newVariantForm.specifications.trim() || null,
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
      setNewVariantSelectedAttrs({})
      setVariantUploadedImages([])
      setVariantPrimaryImage(null)
      setNewVariantForm({
        productCode: "",
        productName: "",
        modelName: "Standard",
        availableColors: "",
        costPrice: 0,
        unitPrice: 0,
        projectPrice: 0,
        stock: 0,
        description: "",
        specifications: "",
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
        
        {/* Model header: category trail, model name/code, what it contains, and actions */}
        <div className="p-5 sm:p-6 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1.5 min-w-0">
            {categoryPath.length > 0 && (
              <nav aria-label="Category" className="flex items-center gap-1 flex-wrap text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {categoryPath.map((name, i) => (
                  <span key={name} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3" />}
                    <span className={i === categoryPath.length - 1 ? "text-primary" : undefined}>{name}</span>
                  </span>
                ))}
              </nav>
            )}
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-baseline gap-2 flex-wrap">
              {masterProduct.productName}
              {masterProduct.modelCode && masterProduct.modelCode.toLowerCase() !== masterProduct.productName.toLowerCase() && (
                <span className="font-mono text-sm font-semibold text-muted-foreground">{masterProduct.modelCode}</span>
              )}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary border border-primary/20">
                <Layers className="h-3 w-3 mr-1" />
                {variantNoun(kind, variants.length)}
              </Badge>
              {modelPriceFrom > 0 && (
                <Badge variant="secondary" className="font-semibold text-xs bg-muted border">
                  From AED {modelPriceFrom.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {kind === "chairs"
                ? "Each chair type lists the colour and base options offered on quotations."
                : kind === "workstations"
                  ? "Each layout lists its available sizes and finishes. Quantities on quotations count complete units."
                  : "All variants of this product with their price and stock."}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            {canEditProduct && onEditMasterProduct && (
              <Button
                variant="outline"
                onClick={() => onEditMasterProduct(masterProduct)}
                className="border-primary/20 hover:border-primary/40 text-foreground font-bold text-xs rounded-xl h-9 px-3 flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Edit model details"
              >
                <Pencil className="h-4 w-4 text-primary" />
                Edit Model
              </Button>
            )}
            {canEditProduct && (
              <Button
                onClick={() => setIsAddingVariant(!isAddingVariant)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-9 px-4 flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {kind === "chairs" ? "Add Chair Type" : kind === "workstations" ? "Add Layout" : "Add Variant"}
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
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Filters: chosen per product type and shown only when they offer a real choice */}
        <div className="border-b bg-muted/10 px-4 py-3 space-y-3 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase text-primary tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </span>
              <Badge variant="secondary" className="text-xs font-bold bg-background border">
                {finalFilteredVariants.length} of {variantNoun(kind, variants.length)}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {activeFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground h-8 cursor-pointer"
                >
                  Reset Filters
                </Button>
              )}
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={kind === "chairs" ? "Search chair types, codes, colours…" : kind === "workstations" ? "Search layouts, codes, sizes…" : "Search variants or codes…"}
                  value={variantSearch}
                  onChange={(e) => setVariantSearch(e.target.value)}
                  className="h-8 text-xs pl-8 bg-background"
                  aria-label="Search variants"
                />
              </div>
            </div>
          </div>

          {facetOptions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {facetOptions.map((f) => {
                const selected = selectedFacets[f.key] || "all"
                return (
                  <div key={f.key} className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">{f.label}</label>
                    <Select
                      value={selected}
                      onValueChange={(val) => setSelectedFacets((prev) => ({ ...prev, [f.key]: !val || val === "all" ? "" : val }))}
                    >
                      <SelectTrigger className="w-full h-9 text-xs font-semibold rounded-xl border bg-background border-border/80 px-3 cursor-pointer shadow-2xs hover:border-primary/40 focus:ring-2 focus:ring-primary">
                        <SelectValue placeholder={`All (${f.options.length})`}>
                          {selected === "all" ? `All (${f.options.length})` : selected}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-60 min-w-[220px] bg-card border rounded-xl shadow-xl z-50">
                        <SelectItem value="all" className="text-xs font-semibold cursor-pointer">
                          All ({f.options.length})
                        </SelectItem>
                        {f.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium cursor-pointer">
                            <span className="flex items-center justify-between w-full gap-2">
                              <span className="truncate">{opt.value}</span>
                              <span className="text-[10px] font-mono text-muted-foreground font-bold shrink-0">({opt.count})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Level 3: Variant Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">     

          {/* Add New Variant Form Card (Configuration-Based Variant Builder) */}
          {isAddingVariant && (
            <div className="bg-card border-2 border-primary/30 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl animate-in fade-in slide-in-from-top-3 duration-200">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                    {isChairCategory ? <Armchair className="h-5 w-5" /> : isWorkstationCategory ? <Building2 className="h-5 w-5" /> : <Box className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-foreground">
                        Configuration-Based Variant Builder
                      </h3>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
                        {categoryName} Category
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select configuration attributes or create new values directly. Enter variant details manually below.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground self-end sm:self-auto cursor-pointer"
                  onClick={() => setIsAddingVariant(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 1. Dynamic Category Configuration Attributes */}
              <div className="space-y-3 bg-muted/40 p-4 rounded-xl border">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    1. Configuration Attributes ({Object.keys(mergedCategoryAttrOptions).length})
                  </h4>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Searchable dropdowns with inline "+ Add New" value creation
                  </span>
                </div>

                {Object.keys(mergedCategoryAttrOptions).length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground bg-background rounded-lg border border-dashed">
                    No configurable attributes defined for this category/product.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(mergedCategoryAttrOptions).map(([attrName, options]) => {
                      const currentValue = newVariantSelectedAttrs[attrName] || ""
                      return (
                        <div key={attrName} className="space-y-1.5 bg-background p-3 rounded-lg border shadow-2xs">
                          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            {getAttributeIcon(attrName)}
                            <span>{attrName}</span>
                            <span className="text-destructive">*</span>
                          </label>
                          <AttributeCombobox
                            attrName={attrName}
                            options={options}
                            value={currentValue}
                            onChange={(val) => {
                              setNewVariantSelectedAttrs((prev) => ({
                                ...prev,
                                [attrName]: val,
                              }))
                            }}
                            onAddNewValue={handleAddNewAttrValue}
                            icon={getAttributeIcon(attrName)}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 2. Product Information & Pricing */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-primary" />
                  2. Product Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  {/* Product Variant Name (Manual Entry) */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-foreground block">
                      Product Variant Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="Enter variant display name (e.g. Ace High Back Chair - Black)"
                      value={newVariantForm.productName}
                      onChange={(e) => setNewVariantForm({ ...newVariantForm, productName: e.target.value })}
                      className="h-9 text-xs bg-background font-medium"
                    />
                  </div>

                  {/* SKU (Manual Entry) */}
                  <div className="space-y-1">
                    <label className="font-bold text-foreground block">
                      SKU <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="Enter SKU (e.g. ACE-HB-BLK-ALU)"
                      value={newVariantForm.productCode}
                      onChange={(e) => setNewVariantForm({ ...newVariantForm, productCode: e.target.value })}
                      className="h-9 text-xs bg-background font-mono font-bold"
                    />
                  </div>

                  {/* Initial Stock Quantity */}
                  <div className="space-y-1">
                    <label className="font-bold text-foreground block">
                      Initial Stock Quantity
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={newVariantForm.stock}
                      onChange={(e) => setNewVariantForm({ ...newVariantForm, stock: parseInt(e.target.value, 10) || 0 })}
                      className="h-9 text-xs bg-background font-medium"
                    />
                  </div>

                  {/* Selling / Project Price (AED) */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-foreground block text-primary">
                      Selling / Project Price (AED) <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newVariantForm.projectPrice}
                      onChange={(e) => setNewVariantForm({ ...newVariantForm, projectPrice: parseFloat(e.target.value) || 0, unitPrice: parseFloat(e.target.value) || 0 })}
                      className="h-9 text-xs bg-background font-mono font-bold text-primary border-primary/40 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Product Content */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-primary" />
                  3. Product Content
                </h4>

                <div className="space-y-4 text-xs">
                  {/* Short Description */}
                  <div className="space-y-1">
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

                  {/* Product Specification Summary */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground block flex items-center justify-between">
                      <span>Product Specification Summary</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Manual entry with rich text formatting (headings, bullet points, highlights)
                      </span>
                    </label>
                    <RichTextEditor
                      value={newVariantForm.specifications}
                      onChange={(val) => setNewVariantForm({ ...newVariantForm, specifications: val })}
                      placeholder="Enter full specifications, bullet points, or custom requirements..."
                    />
                  </div>
                </div>
              </div>

              {/* 4. Variant Images (Multiple Image Upload & Primary Featured Image) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-primary" />
                    4. Variant Images ({variantUploadedImages.length})
                  </h4>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Upload multiple images (JPG, PNG, WEBP) &amp; set a primary featured image
                  </span>
                </div>

                {/* Drag & Drop Upload Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDraggingVariantImages(true)
                  }}
                  onDragLeave={() => setIsDraggingVariantImages(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDraggingVariantImages(false)
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleVariantImagesUpload(e.dataTransfer.files)
                    }
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2",
                    isDraggingVariantImages
                      ? "border-primary bg-primary/10"
                      : "border-border/80 hover:border-primary/50 bg-muted/20"
                  )}
                  onClick={() => {
                    const el = document.getElementById("variant-multi-image-input")
                    if (el) el.click()
                  }}
                >
                  <input
                    id="variant-multi-image-input"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleVariantImagesUpload(e.target.files)
                    }}
                  />
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    {isUploadingVariantImages ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      {isUploadingVariantImages
                        ? "Uploading images..."
                        : "Click to upload or drag & drop variant images"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Front view, side view, rear view &amp; detail shots (Max 10MB per file)
                    </p>
                  </div>
                </div>

                {/* Uploaded Images Gallery Preview */}
                {variantUploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
                    {variantUploadedImages.map((imgUrl, index) => {
                      const isPrimary = variantPrimaryImage === imgUrl || (!variantPrimaryImage && index === 0)
                      return (
                        <div
                          key={imgUrl}
                          className={cn(
                            "relative group border rounded-xl overflow-hidden bg-background aspect-square flex items-center justify-center shadow-2xs transition-all",
                            isPrimary ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
                          )}
                        >
                          <img
                            src={formatImageUrl(imgUrl) || imgUrl}
                            alt={`Variant image ${index + 1}`}
                            className="w-full h-full object-contain p-1"
                          />

                          {/* Primary Badge */}
                          {isPrimary && (
                            <Badge className="absolute top-1.5 left-1.5 text-[9px] font-extrabold px-1.5 py-0.5 bg-primary text-primary-foreground shadow">
                              ⭐ Primary
                            </Badge>
                          )}

                          {/* Action Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                            {!isPrimary && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-6 text-[10px] font-bold px-2 bg-white text-black hover:bg-white/90 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setVariantPrimaryImage(imgUrl)
                                }}
                              >
                                Set Primary
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-6 w-6 p-0 rounded-full cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveVariantImage(imgUrl)
                              }}
                              title="Remove Image"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingVariant(false)}
                  className="text-xs h-9 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateVariantSubmit}
                  disabled={isSubmittingNewVariant}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isSubmittingNewVariant ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Variant...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
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
              Showing <strong className="text-foreground font-extrabold">{finalFilteredVariants.length}</strong> of {variantNoun(kind, variants.length)}
            </span>
            {activeFilters.length > 0 && (
              <span className="truncate">
                {activeFilters.map((f) => (
                  <span key={f.label} className="ml-3">
                    {f.label}: <strong className="text-foreground">{f.value}</strong>
                  </span>
                ))}
              </span>
            )}
          </div>

          {/* Empty State */}
          {finalFilteredVariants.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20 space-y-3">
              <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Nothing matches the selected filters</p>
                <p className="text-xs text-muted-foreground">Reset the filters or clear the search to see all {variantNoun(kind, variants.length)}.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetFilters()
                  setVariantSearch("")
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
                const typeLabel = variantTypeLabel(variant, kind, masterTitle)
                const options = optionSummary(variant, kind)
                const fixedSize = options.length === 0 ? (variant.dimensions || "").trim() : ""
                const fixedColour = options.length === 0 ? (variant.availableColors || variant.finishMaterial || "").trim() : ""

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

                        <div className="space-y-1.5 sm:col-span-3">
                          <label className="font-bold text-foreground block flex items-center justify-between">
                            <span>Product Specifications</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              Rich text formatting (headings, bullet points, highlights) for PDF & quotation preview
                            </span>
                          </label>
                          <RichTextEditor
                            value={editVariantForm.specifications}
                            onChange={(val) => setEditVariantForm({ ...editVariantForm, specifications: val })}
                            placeholder="E.g. Headrest: 3D Adjustable; Back Frame: Mesh PP+GF; Armrest: 4D PU..."
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
                          (() => {
                            const formattedUrl = formatImageUrl(variant.imageUrl)
                            const isFailed = formattedUrl ? failedImageUrls[formattedUrl] : true

                            return (
                              <>
                                {formattedUrl && !isFailed ? (
                                  <img
                                    src={formattedUrl}
                                    alt={variant.productName}
                                    className="h-full w-full object-cover object-center group-hover/img:scale-105 transition-transform"
                                    onError={() => handleImageError(formattedUrl)}
                                  />
                                ) : (
                                  <Package className="h-8 w-8 text-muted-foreground/40" />
                                )}

                                {canEditProduct && (
                                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer text-[10px] font-bold gap-1 p-1 text-center select-none z-10">
                                    <Camera className="h-4 w-4 text-white" />
                                    <span>{formattedUrl && !isFailed ? "Change" : "Add Image"}</span>
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
                            )
                          })()
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground font-semibold px-2 py-0.5 rounded bg-muted">
                            {variant.productCode}
                          </span>
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                            {typeLabel}
                          </Badge>
                          {fixedSize && !/^standard$/i.test(fixedSize) && (
                            <span className="text-[11px] font-medium text-foreground bg-muted/60 border px-2 py-0.5 rounded-md">
                              {fixedSize}
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

                        {variant.specifications && (
                          <div className="text-[11px] text-muted-foreground bg-muted/20 px-2.5 py-1.5 rounded-lg border border-border/40 max-w-2xl space-y-1">
                            <span className="font-bold text-[9px] uppercase tracking-wider text-primary/80 block">Variant Specifications:</span>
                            <div className="prose prose-xs dark:prose-invert max-w-none text-[11px] leading-relaxed [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>p]:m-0" dangerouslySetInnerHTML={{ __html: variant.specifications }} />
                          </div>
                        )}

                        {/* Options offered for this chair type / layout on quotations */}
                        {options.length > 0 ? (
                          <div className="space-y-1 pt-0.5 max-w-2xl">
                            {options.map((o) => (
                              <div key={o.label} className="flex items-start gap-2 text-[11px]">
                                <span className="font-bold text-muted-foreground w-20 shrink-0 pt-0.5">{o.label}</span>
                                <span className="flex flex-wrap gap-1">
                                  {o.values.slice(0, 8).map((val) => (
                                    <span key={val} className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-medium">{val}</span>
                                  ))}
                                  {o.values.length > 8 && (
                                    <span className="px-1.5 py-0.5 text-muted-foreground font-semibold">+{o.values.length - 8} more</span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          fixedColour && !/^standard$/i.test(fixedColour) && (
                            <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground pt-0.5">
                              <span className="bg-muted px-2 py-0.5 rounded border flex items-center gap-1">
                                <Palette className="h-3 w-3 text-primary" />
                                <strong className="text-foreground font-semibold">{fixedColour}</strong>
                              </span>
                            </div>
                          )
                        )}
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
