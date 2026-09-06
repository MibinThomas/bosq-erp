"use client"

import { useState } from "react"
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
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

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
  onSaveStock?: (productId: string, newStock: number) => Promise<void>
  onImageUploaded?: () => void
  onVariantAdded?: () => void
  onVariantDeleted?: () => void
  canEditProduct?: boolean
  canDeleteProduct?: boolean
  hasQuoteAccess?: boolean
}

export function VariantDrawerModal({
  masterProduct,
  isOpen,
  onClose,
  onAddToCart,
  onEditVariant,
  onSaveStock,
  onImageUploaded,
  onVariantAdded,
  onVariantDeleted,
  canEditProduct = true,
  canDeleteProduct = true,
  hasQuoteAccess = true,
}: VariantDrawerModalProps) {
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>("all")
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [draftStockVal, setDraftStockVal] = useState<number>(0)
  const [savingStockId, setSavingStockId] = useState<string | null>(null)
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null)
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null)

  const handleDeleteVariant = async (variantId: string, variantName: string) => {
    if (!confirm(`Are you sure you want to delete variant "${variantName}"?`)) return

    setDeletingVariantId(variantId)
    try {
      const res = await fetch(`/api/products/${variantId}`, {
        method: "DELETE",
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete variant")

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

  // Inline Add Variant state
  const [isAddingVariant, setIsAddingVariant] = useState(false)
  const [isSubmittingNewVariant, setIsSubmittingNewVariant] = useState(false)
  const [newVariantImageFile, setNewVariantImageFile] = useState<File | null>(null)
  const [newVariantForm, setNewVariantForm] = useState({
    productCode: "",
    productName: "",
    modelName: "High Back",
    availableColors: "",
    costPrice: 200,
    unitPrice: 300,
    projectPrice: 300,
    stock: 10,
    description: "",
  })

  if (!isOpen || !masterProduct) return null

  const variants = masterProduct.variants || []
  
  // Extract distinct sub-models (e.g. High Back, Mid Back, Low Back)
  const distinctModels = Array.from(
    new Set(variants.map(v => v.modelName).filter(Boolean) as string[])
  )

  // Filter variants by selected sub-model
  const filteredVariants = variants.filter(v => {
    if (selectedModelFilter === "all") return true
    return v.modelName === selectedModelFilter
  })

  // Total stock count across all variants
  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0)

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
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload image")
      }

      // Update variant in database
      const patchRes = await fetch(`/api/products/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: data.url }),
      })

      if (!patchRes.ok) {
        throw new Error("Failed to link image to product variant")
      }

      // Update local variant object
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
        if (uploadRes.ok && uploadData.url) {
          imageUrl = uploadData.url
        }
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
        categoryName: masterProduct.category?.name || "Chairs",
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
        modelName: "High Back",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200 overflow-x-hidden">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold uppercase text-[10px] tracking-wider">
                {masterProduct.category?.name || "Catalog Series"}
              </Badge>
              <Badge variant="secondary" className="font-semibold text-xs">
                <Layers className="h-3 w-3 mr-1 text-primary" />
                {variants.length} {variants.length === 1 ? "Variant" : "Variants Configured"}
              </Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {masterProduct.productName}
            </h2>
            <p className="text-xs text-muted-foreground">
              Select and configure specific variations below for quotations or inventory management.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
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

        {/* Sub-Model Filter Tabs */}
        {distinctModels.length > 0 && (
          <div className="px-6 py-3 border-b bg-muted/10 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
              Sub-Models:
            </span>
            <Button
              variant={selectedModelFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedModelFilter("all")}
              className="h-7 text-xs rounded-full cursor-pointer"
            >
              All ({variants.length})
            </Button>
            {distinctModels.map(model => {
              const count = variants.filter(v => v.modelName === model).length
              return (
                <Button
                  key={model}
                  variant={selectedModelFilter === model ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedModelFilter(model)}
                  className="h-7 text-xs rounded-full cursor-pointer"
                >
                  {model} ({count})
                </Button>
              )
            })}
          </div>
        )}

        {/* Variants List Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">

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
                {/* Sub-Model Name */}
                <div className="space-y-1">
                  <label className="font-bold text-foreground block">
                    Sub-Model / Variant Type <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. High Back, Mid Back, Visitor"
                    value={newVariantForm.modelName}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, modelName: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                {/* Colors / Finish */}
                <div className="space-y-1">
                  <label className="font-bold text-foreground block">
                    Color / Finish
                  </label>
                  <Input
                    placeholder="e.g. Black Leather, Cream, Tan Brown"
                    value={newVariantForm.availableColors}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, availableColors: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                {/* SKU Code (Optional) */}
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

                {/* Full Variant Name (Optional) */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-foreground block">
                    Variant Display Name (Optional)
                  </label>
                  <Input
                    placeholder={`e.g. ${masterProduct.productName} ${newVariantForm.modelName || "High Back"} ${newVariantForm.availableColors ? `- ${newVariantForm.availableColors}` : ""}`}
                    value={newVariantForm.productName}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, productName: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                {/* Initial Stock */}
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

                {/* Cost Price */}
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

                {/* Project Price / Unit Price */}
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

                {/* Photo File Upload */}
                <div className="space-y-1 sm:col-span-3">
                  <label className="font-bold text-foreground block">
                    Variant Image (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setNewVariantImageFile(file)
                      }}
                      className="h-9 text-xs bg-background cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    {newVariantImageFile && (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                        <Check className="h-3.5 w-3.5" /> File Selected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingVariant(false)}
                  className="text-xs h-8 rounded-lg cursor-pointer"
                  disabled={isSubmittingNewVariant}
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
                      Creating Variant...
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

          {filteredVariants.length === 0 ? (
            <div className="py-12 text-center border border-dashed rounded-xl bg-muted/10">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No variants found under this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredVariants.map((variant) => {
                const isStockEditing = editingStockId === variant.id
                const displayPrice = variant.projectPrice || variant.unitPrice || 0

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

                            {/* Image Upload Overlay Button */}
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
                          {variant.modelName && (
                            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                              {variant.modelName}
                            </Badge>
                          )}
                          {variant.availableColors && (
                            <span className="text-[11px] font-medium text-foreground flex items-center gap-1 bg-muted/60 border px-2 py-0.5 rounded-md">
                              <Palette className="h-3 w-3 text-primary" />
                              {variant.availableColors}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-base text-foreground leading-snug truncate">
                          {variant.productName}
                        </h4>

                        {variant.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {variant.description}
                          </p>
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

                      {/* Pricing Tiers Display */}
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Project Rate
                        </span>
                        <span className="text-lg font-black text-primary">
                          AED {displayPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Action Buttons: Add to Cart & Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        {hasQuoteAccess && (
                          <Button
                            onClick={() => onAddToCart(variant)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow hover:shadow-md cursor-pointer flex items-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl shrink-0 text-xs"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            <span>Add to Cart</span>
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
            Master SKU: <span className="font-mono font-bold">{masterProduct.productCode}</span>
          </p>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Close
          </Button>
        </div>

      </div>
    </div>
  )
}
