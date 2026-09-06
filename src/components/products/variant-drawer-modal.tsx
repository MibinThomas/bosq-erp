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
  Loader2
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
  canEditProduct?: boolean
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
  canEditProduct = true,
  hasQuoteAccess = true,
}: VariantDrawerModalProps) {
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>("all")
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [draftStockVal, setDraftStockVal] = useState<number>(0)
  const [savingStockId, setSavingStockId] = useState<string | null>(null)
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null)

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
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
                    className="border rounded-xl p-4 bg-background hover:border-primary/40 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    {/* Variant Thumbnail & Primary Info */}
                    <div className="flex items-start sm:items-center gap-4 flex-1">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg border bg-muted/40 shrink-0 overflow-hidden relative flex items-center justify-center group/img shadow-sm">
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
                            <Badge variant="secondary" className="text-[10px] font-semibold">
                              {variant.modelName}
                            </Badge>
                          )}
                          {variant.availableColors && (
                            <span className="text-[11px] font-medium text-foreground flex items-center gap-1 bg-primary/5 border border-primary/15 px-2 py-0.5 rounded-md">
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

                    {/* Stock & Pricing */}
                    <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 shrink-0">
                      
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
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
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

                      {/* Action Button: Add to Cart */}
                      {hasQuoteAccess && (
                        <Button
                          onClick={() => onAddToCart(variant)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow hover:shadow-md cursor-pointer flex items-center gap-1.5 h-10 px-4 rounded-xl shrink-0"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          <span className="hidden sm:inline">Add to Cart</span>
                        </Button>
                      )}
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
