"use client"

import React, { useEffect, useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Calculator, 
  Check, 
  Coins, 
  Percent, 
  FileText, 
  Package, 
  Sparkles, 
  Building2, 
  User, 
  Clock,
  Layers,
  Save,
  Tag,
  Maximize2,
  Info
} from "lucide-react"
import { toast } from "sonner"

export interface CostingItemData {
  id: string
  quotationId: string
  itemNo: number
  description: string
  specifications: string | null
  productNotes: string | null
  productDescription: string | null
  quantity: number
  unitPrice: number
  amount: number
  unitCost: number
  materialCost: number    // Used as Factory Cost
  laborCost: number       // Used as Accessories Cost
  overheadCost: number
  transportCost: number
  installationCost: number
  marginPercentage: number // Margin %
  costingStatus: string
  estimatorNotes: string | null
  costingRequestedAt: string | null
  costingCompletedAt: string | null
  customImageUrl: string | null
  imageUrl: string | null
  categoryName: string | null
  chairType: string | null
  batchHeading?: string | null
  product?: {
    id: string
    productName: string
    sku: string | null
    imageUrl: string | null
  } | null
}

export interface QuotationGroupData {
  quotationId: string
  quotationNumber: string
  projectName: string | null
  status: string
  costingStatus: string | null
  client: {
    id: string
    companyName: string
    contactPerson: string | null
    email: string | null
    phone: string | null
  }
  preparedBy: {
    id: string
    name: string | null
    email: string | null
    role: string
  }
  assignedEstimator?: {
    id: string
    name: string | null
    email: string | null
  } | null
  requestDate: string | null
  items: CostingItemData[]
}

interface QuotationCostingWorkspaceModalProps {
  quotationGroup: QuotationGroupData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function cleanHtmlText(htmlStr?: string | null): string {
  if (!htmlStr) return ""
  return htmlStr
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

interface EditableItemState {
  id: string
  factoryCost: number       // Stored in materialCost
  accessoriesCost: number   // Stored in laborCost
  marginPercentage: number
  negotiationPct: number    // Buffer / discount % for negotiation
  unitPrice: number
  estimatorNotes: string
  costingStatus: string
}

/**
 * Formula Calculation Engine:
 * 1. Total Cost (Unit) = Factory Cost + Accessories Cost
 * 2. Scenario 1 (Margin % only): Final Selling Price = Total Cost / (1 - Margin %)
 * 3. Scenario 2 (Margin % + Negotiation %): Final Selling Price = {Total Cost / (1 - Margin %)} / (1 - Negotiation %)
 * 4. Scenario 3 (Negotiation % only): Final Selling Price = Total Cost / (1 - Negotiation %)
 * 5. Scenario 4 (Neither): Final Selling Price = Total Cost
 */
export function calculateProductPrice(
  factoryCost: number,
  accessoriesCost: number,
  marginPct: number,
  negotiationPct: number,
  manualUnitPrice?: number
) {
  const totalCost = (factoryCost || 0) + (accessoriesCost || 0)
  const M = Math.min(Math.max(marginPct || 0, 0), 99.9) / 100
  const N = Math.min(Math.max(negotiationPct || 0, 0), 99.9) / 100

  // Base selling price with Margin % only: Total Cost / (1 - M)
  const baseSellingPrice = M > 0 && M < 1
    ? Math.round((totalCost / (1 - M)) * 100) / 100
    : totalCost

  let computedFinalPrice = totalCost
  if (M > 0 && N > 0) {
    computedFinalPrice = Math.round(((totalCost / (1 - M)) / (1 - N)) * 100) / 100
  } else if (M > 0) {
    computedFinalPrice = Math.round((totalCost / (1 - M)) * 100) / 100
  } else if (N > 0) {
    computedFinalPrice = Math.round((totalCost / (1 - N)) * 100) / 100
  }

  const finalSellingPrice = (manualUnitPrice && manualUnitPrice > 0) ? manualUnitPrice : computedFinalPrice

  const marginValue = baseSellingPrice - totalCost
  const negotiationValue = finalSellingPrice - baseSellingPrice

  return {
    totalCost,
    baseSellingPrice,
    marginValue,
    negotiationValue,
    finalSellingPrice
  }
}

export function QuotationCostingWorkspaceModal({
  quotationGroup,
  open,
  onOpenChange,
  onSuccess
}: QuotationCostingWorkspaceModalProps) {
  const [loading, setLoading] = useState(false)
  const [itemStates, setItemStates] = useState<Record<string, EditableItemState>>({})
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null)

  // Initialize editable state when modal opens or quotationGroup changes
  useEffect(() => {
    if (quotationGroup && open) {
      const initial: Record<string, EditableItemState> = {}
      quotationGroup.items.forEach((item) => {
        initial[item.id] = {
          id: item.id,
          factoryCost: item.materialCost || 0,
          accessoriesCost: item.laborCost || 0,
          marginPercentage: item.marginPercentage ?? 0,
          negotiationPct: 0,
          unitPrice: item.unitPrice || 0,
          estimatorNotes: item.estimatorNotes || "",
          costingStatus: item.costingStatus || "PENDING_COSTING"
        }
      })
      setItemStates(initial)
    }
  }, [quotationGroup, open])

  if (!quotationGroup) return null

  const items = quotationGroup.items || []

  // Helper to update a specific field of an item
  const updateItemField = (itemId: string, field: keyof EditableItemState, value: any) => {
    setItemStates((prev) => {
      const curr = prev[itemId] || {
        id: itemId,
        factoryCost: 0,
        accessoriesCost: 0,
        marginPercentage: 0,
        negotiationPct: 0,
        unitPrice: 0,
        estimatorNotes: "",
        costingStatus: "PENDING_COSTING"
      }
      return {
        ...prev,
        [itemId]: {
          ...curr,
          [field]: value
        }
      }
    })
  }

  // Calculate quotation-level totals dynamically using corrected formulas
  const quotationTotals = useMemo(() => {
    let grandFactoryCost = 0
    let grandAccessoriesCost = 0
    let grandTotalCost = 0
    let grandBaseSellingPrice = 0
    let grandFinalSellingPrice = 0

    items.forEach((item) => {
      const state = itemStates[item.id]
      const qty = item.quantity || 1
      
      const facCost = state?.factoryCost || 0
      const accCost = state?.accessoriesCost || 0
      const marginPct = state?.marginPercentage ?? 0
      const negotiationPct = state?.negotiationPct ?? 0

      const calc = calculateProductPrice(facCost, accCost, marginPct, negotiationPct, state?.unitPrice)

      grandFactoryCost += facCost * qty
      grandAccessoriesCost += accCost * qty
      grandTotalCost += calc.totalCost * qty
      grandBaseSellingPrice += calc.baseSellingPrice * qty
      grandFinalSellingPrice += calc.finalSellingPrice * qty
    })

    const grandTotalProfit = grandFinalSellingPrice - grandTotalCost
    const overallMarginPct = grandFinalSellingPrice > 0 ? (grandTotalProfit / grandFinalSellingPrice) * 100 : 0

    return {
      grandFactoryCost,
      grandAccessoriesCost,
      grandTotalCost,
      grandBaseSellingPrice,
      grandFinalSellingPrice,
      grandTotalProfit,
      overallMarginPct
    }
  }, [items, itemStates])

  // Save changes API handler
  const handleSaveCosting = async (isComplete: boolean) => {
    setLoading(true)
    try {
      const payloadItems = items.map((item) => {
        const state = itemStates[item.id] || {}
        const facCost = state.factoryCost || 0
        const accCost = state.accessoriesCost || 0
        const marginPct = state.marginPercentage ?? 0
        const negotiationPct = state.negotiationPct ?? 0

        const calc = calculateProductPrice(facCost, accCost, marginPct, negotiationPct, state.unitPrice)

        return {
          id: item.id,
          materialCost: facCost,       // Factory Cost stored in materialCost
          laborCost: accCost,          // Accessories Cost stored in laborCost
          overheadCost: 0,
          transportCost: 0,
          installationCost: 0,
          marginPercentage: marginPct,
          unitPrice: calc.finalSellingPrice,
          estimatorNotes: state.estimatorNotes || "",
          costingStatus: isComplete ? "COSTING_COMPLETED" : (state.costingStatus || "COSTING_IN_PROGRESS")
        }
      })

      const res = await fetch(`/api/quotations/${quotationGroup.quotationId}/costing-update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update quotation costing")
      }

      if (isComplete) {
        toast.success(`Costing completed for Quotation ${quotationGroup.quotationNumber}! Sales team notified.`)
      } else {
        toast.success(`Costing progress saved for Quotation ${quotationGroup.quotationNumber}.`)
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Failed to save costing updates")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl lg:max-w-7xl max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-2xl border shadow-2xl bg-card">
          {/* Workspace Header */}
          <DialogHeader className="p-5 sm:p-6 border-b bg-muted/20 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
                  <Calculator className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-extrabold text-foreground flex items-center gap-2.5 flex-wrap">
                    Quotation Costing Workspace
                    <Badge variant="outline" className="font-mono text-xs bg-background border-amber-400 text-amber-900 dark:text-amber-300 font-bold px-2.5 py-0.5">
                      {quotationGroup.quotationNumber}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap mt-0.5">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {quotationGroup.client?.companyName || "Client"}
                    </span>
                    {quotationGroup.projectName && (
                      <span className="text-muted-foreground truncate max-w-[220px]">
                        • Project: {quotationGroup.projectName}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-muted-foreground">
                      • <User className="h-3.5 w-3.5" /> IDC: {quotationGroup.preparedBy?.name || "Sales Team"}
                    </span>
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <Badge variant="secondary" className="font-mono text-xs font-bold px-3 py-1">
                  {items.length} Product(s) Pending Costing
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {/* Quotation-Level Financial Summary (Top Dock) */}
          <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 shrink-0 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Quotation Financial Audit Summary ({quotationGroup.quotationNumber})
                </span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs px-3 py-0.5">
                {quotationTotals.overallMarginPct.toFixed(1)}% Overall Gross Margin
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Factory Cost</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-200 mt-0.5 block">
                  AED {quotationTotals.grandFactoryCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Accessories Cost</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-200 mt-0.5 block">
                  AED {quotationTotals.grandAccessoriesCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Cost</span>
                <span className="font-mono font-extrabold text-xs sm:text-sm text-amber-300 mt-0.5 block">
                  AED {quotationTotals.grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Overall Margin</span>
                <span className="font-mono font-extrabold text-xs sm:text-sm text-teal-300 mt-0.5 block">
                  {quotationTotals.overallMarginPct.toFixed(1)}%
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Selling Price</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-emerald-300 mt-0.5 block">
                  AED {quotationTotals.grandBaseSellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Revenue</span>
                <span className="font-mono font-extrabold text-xs sm:text-sm text-emerald-400 mt-0.5 block">
                  AED {quotationTotals.grandFinalSellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Profit</span>
                <span className={`font-mono font-extrabold text-xs sm:text-sm mt-0.5 block ${quotationTotals.grandTotalProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  AED {quotationTotals.grandTotalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable Products List Workspace */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {items.map((item, idx) => {
              const state = itemStates[item.id] || {
                id: item.id,
                factoryCost: item.materialCost || 0,
                accessoriesCost: item.laborCost || 0,
                marginPercentage: item.marginPercentage ?? 0,
                negotiationPct: 0,
                unitPrice: item.unitPrice || 0,
                estimatorNotes: item.estimatorNotes || "",
                costingStatus: item.costingStatus || "PENDING_COSTING"
              }

              const qty = item.quantity || 1
              const cleanedSpecs = cleanHtmlText(item.specifications)
              const cleanedDescription = cleanHtmlText(item.productDescription || item.productNotes)
              const productImg = item.imageUrl || item.customImageUrl || item.product?.imageUrl
              const modelCode = item.product?.sku || item.description

              // Calculations via Engine
              const calc = calculateProductPrice(
                state.factoryCost || 0,
                state.accessoriesCost || 0,
                state.marginPercentage ?? 0,
                state.negotiationPct ?? 0,
                state.unitPrice
              )

              const lineTotalRevenue = calc.finalSellingPrice * qty
              const lineTotalCost = calc.totalCost * qty
              const lineNetProfit = lineTotalRevenue - lineTotalCost
              const lineProfitPct = lineTotalRevenue > 0 ? (lineNetProfit / lineTotalRevenue) * 100 : 0

              return (
                <div 
                  key={item.id}
                  className="p-5 sm:p-6 rounded-2xl border bg-card shadow-sm space-y-5 transition-all hover:border-amber-400/60"
                >
                  {/* Card Header Row */}
                  <div className="flex items-center justify-between border-b pb-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-extrabold bg-muted/70 text-muted-foreground px-2.5 py-1 rounded-lg shrink-0">
                        Product #{idx + 1}
                      </span>
                      {item.categoryName && (
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                          {item.categoryName} {item.chairType ? `• ${item.chairType}` : ""}
                        </Badge>
                      )}
                      {item.batchHeading && item.batchHeading !== "General Items" && (
                        <Badge variant="outline" className="text-[10px] bg-muted/40 font-mono">
                          <Layers className="h-3 w-3 mr-1" /> {item.batchHeading}
                        </Badge>
                      )}
                    </div>

                    <Badge className="bg-primary text-primary-foreground font-mono text-xs font-extrabold px-3 py-1 shrink-0">
                      Quantity: {qty}
                    </Badge>
                  </div>

                  {/* 2-Column Split Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: Product Specifications & Visual Information */}
                    <div className="lg:col-span-5 space-y-4 border-r-0 lg:border-r pr-0 lg:pr-6 border-border/80">
                      {/* Product Image & Title */}
                      <div className="flex items-start gap-4">
                        <div className="relative group shrink-0">
                          {productImg ? (
                            <img 
                              src={productImg} 
                              alt={item.description} 
                              onClick={() => setEnlargedImage({ url: productImg, title: item.description })}
                              className="w-32 h-32 rounded-2xl object-cover border-2 border-border shadow-sm bg-white cursor-pointer transition-transform duration-200 group-hover:scale-105" 
                            />
                          ) : (
                            <div className="w-32 h-32 rounded-2xl border-2 border-dashed bg-muted flex flex-col items-center justify-center text-[10px] text-muted-foreground shrink-0 font-medium">
                              <Package className="h-8 w-8 text-muted-foreground/40 mb-1" />
                              No Image
                            </div>
                          )}
                          {productImg && (
                            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <Maximize2 className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5 min-w-0 flex-1">
                          <h3 className="font-extrabold text-sm sm:text-base text-foreground leading-snug">
                            {item.description}
                          </h3>

                          {modelCode && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono font-semibold">
                              <Tag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span className="truncate">{modelCode}</span>
                            </div>
                          )}

                          {item.categoryName && (
                            <div className="text-xs text-muted-foreground font-medium pt-0.5">
                              Category: <span className="font-semibold text-foreground">{item.categoryName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Specifications */}
                      {cleanedSpecs && (
                        <div className="p-3.5 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            Product Specifications
                          </span>
                          <p className="text-xs text-foreground leading-relaxed font-sans whitespace-pre-wrap">
                            {cleanedSpecs}
                          </p>
                        </div>
                      )}

                      {/* Product Description & Sales Notes */}
                      {cleanedDescription && (
                        <div className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <Info className="h-3.5 w-3.5 text-amber-600" />
                            Sales Team Description &amp; Notes
                          </span>
                          <p className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed italic">
                            {cleanedDescription}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: Simplified Costing Inputs & Calculations */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Coins className="h-4 w-4 text-amber-600" />
                          Costing Inputs &amp; Pricing Model
                        </h4>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          Unit Pricing (AED)
                        </Badge>
                      </div>

                      {/* 4 Costing Inputs Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Factory Cost */}
                        <div className="space-y-1 p-3 rounded-xl border bg-card shadow-2xs">
                          <label className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span>Factory Cost</span>
                            <span className="text-[10px] text-muted-foreground font-normal">Base Production</span>
                          </label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={state.factoryCost || ""}
                              onChange={(e) => updateItemField(item.id, "factoryCost", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="font-mono font-bold h-9 text-xs pl-8 bg-background"
                            />
                            <span className="absolute left-2.5 top-2.5 text-xs font-bold text-muted-foreground pointer-events-none">AED</span>
                          </div>
                        </div>

                        {/* Accessories Cost */}
                        <div className="space-y-1 p-3 rounded-xl border bg-card shadow-2xs">
                          <label className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span>Accessories Cost</span>
                            <span className="text-[10px] text-muted-foreground font-normal">Hardware &amp; Fittings</span>
                          </label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={state.accessoriesCost || ""}
                              onChange={(e) => updateItemField(item.id, "accessoriesCost", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="font-mono font-bold h-9 text-xs pl-8 bg-background"
                            />
                            <span className="absolute left-2.5 top-2.5 text-xs font-bold text-muted-foreground pointer-events-none">AED</span>
                          </div>
                        </div>

                        {/* Margin % */}
                        <div className="space-y-1 p-3 rounded-xl border bg-teal-500/5 border-teal-500/20 shadow-2xs">
                          <label className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span>Margin %</span>
                            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">Profit Target</span>
                          </label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="99"
                              step="0.1"
                              value={state.marginPercentage ?? 0}
                              onChange={(e) => {
                                const raw = e.target.value
                                const val = raw === "" ? 0 : parseFloat(raw)
                                updateItemField(item.id, "marginPercentage", isNaN(val) ? 0 : val)
                              }}
                              placeholder="0%"
                              className="font-mono font-bold h-9 text-xs pr-7 bg-background"
                            />
                            <span className="absolute right-2.5 top-2.5 text-xs font-bold text-muted-foreground pointer-events-none">%</span>
                          </div>
                        </div>

                        {/* Negotiation % */}
                        <div className="space-y-1 p-3 rounded-xl border bg-purple-500/5 border-purple-500/20 shadow-2xs">
                          <label className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span>Negotiation %</span>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Buffer / Discount</span>
                          </label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="50"
                              step="0.1"
                              value={state.negotiationPct ?? 0}
                              onChange={(e) => {
                                const raw = e.target.value
                                const val = raw === "" ? 0 : parseFloat(raw)
                                updateItemField(item.id, "negotiationPct", isNaN(val) ? 0 : val)
                              }}
                              placeholder="0%"
                              className="font-mono font-bold h-9 text-xs pr-7 bg-background"
                            />
                            <span className="absolute right-2.5 top-2.5 text-xs font-bold text-muted-foreground pointer-events-none">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Estimator Technical Notes Input */}
                      <div className="space-y-1 pt-1">
                        <label className="text-xs font-semibold text-muted-foreground flex justify-between">
                          <span>Estimator Technical Notes &amp; Remarks</span>
                          <span className="text-[10px]">Internal pricing reference</span>
                        </label>
                        <Input
                          type="text"
                          value={state.estimatorNotes || ""}
                          onChange={(e) => updateItemField(item.id, "estimatorNotes", e.target.value)}
                          placeholder="Add technical notes on materials, veneer specs, or supplier cost references..."
                          className="h-8 text-xs bg-background"
                        />
                      </div>

                      {/* Financial Audit Summary Box (Per Product) */}
                      <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-sans shadow-md border border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                            Product Cost &amp; Profit Audit
                          </span>
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-0 font-mono text-[10px]">
                            {lineProfitPct.toFixed(1)}% Line Margin
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                            <span className="text-[9px] text-slate-400 font-semibold block uppercase">Total Cost (Unit)</span>
                            <span className="font-mono font-bold text-xs text-slate-200 mt-0.5 block">
                              AED {calc.totalCost.toFixed(2)}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                            <span className="text-[9px] text-slate-400 font-semibold block uppercase">Margin Value (Unit)</span>
                            <span className="font-mono font-bold text-xs text-teal-300 mt-0.5 block">
                              AED {calc.marginValue.toFixed(2)}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                            <span className="text-[9px] text-slate-400 font-semibold block uppercase">Negotiation Buffer</span>
                            <span className="font-mono font-bold text-xs text-purple-300 mt-0.5 block">
                              AED {calc.negotiationValue.toFixed(2)}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                            <span className="text-[9px] text-slate-400 font-semibold block uppercase">Final Selling Price</span>
                            <span className="font-mono font-bold text-xs text-emerald-400 mt-0.5 block">
                              AED {calc.finalSellingPrice.toFixed(2)}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                            <span className="text-[9px] text-slate-400 font-semibold block uppercase">Line Total Revenue ({qty}x)</span>
                            <span className="font-mono font-extrabold text-xs text-emerald-300 mt-0.5 block">
                              AED {lineTotalRevenue.toFixed(2)}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                            <span className="text-[9px] text-slate-400 font-semibold block uppercase">Expected Line Profit</span>
                            <span className={`font-mono font-extrabold text-xs mt-0.5 block ${lineNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              AED {lineNetProfit.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Workspace Footer Actions */}
          <DialogFooter className="p-4 sm:p-5 bg-muted/30 border-t flex flex-row items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs h-10 px-4 font-semibold cursor-pointer rounded-xl"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSaveCosting(false)}
                disabled={loading}
                className="text-xs h-10 px-4 font-semibold cursor-pointer rounded-xl border-amber-300 text-amber-800 dark:text-amber-300 bg-amber-50/50 hover:bg-amber-100"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1 text-amber-600" />}
                Save Progress
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveCosting(true)}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-6 flex items-center gap-2 cursor-pointer shadow-md rounded-xl transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving &amp; Completing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 stroke-[3]" /> Costing Completed
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* High-Resolution Image Preview Lightbox */}
      {enlargedImage && (
        <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
          <DialogContent className="max-w-2xl p-4 bg-card rounded-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-sm font-bold truncate">{enlargedImage.title}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-2 bg-black/5 dark:bg-black/40 rounded-xl overflow-hidden">
              <img src={enlargedImage.url} alt={enlargedImage.title} className="max-h-[75vh] w-auto object-contain rounded-lg" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
