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
import { Textarea } from "@/components/ui/textarea"
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
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"

export interface CostingItemData {
  id: string
  quotationId: string
  itemNo: number
  description: string
  specifications: string | null
  productNotes: string | null
  quantity: number
  unitPrice: number
  amount: number
  unitCost: number
  materialCost: number
  laborCost: number
  overheadCost: number
  transportCost: number
  installationCost: number
  marginPercentage: number
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
  materialCost: number
  laborCost: number
  overheadCost: number
  transportCost: number
  installationCost: number
  marginPercentage: number
  unitPrice: number
  estimatorNotes: string
  costingStatus: string
}

export function QuotationCostingWorkspaceModal({
  quotationGroup,
  open,
  onOpenChange,
  onSuccess
}: QuotationCostingWorkspaceModalProps) {
  const [loading, setLoading] = useState(false)
  const [itemStates, setItemStates] = useState<Record<string, EditableItemState>>({})

  // Initialize editable state when modal opens or quotationGroup changes
  useEffect(() => {
    if (quotationGroup && open) {
      const initial: Record<string, EditableItemState> = {}
      quotationGroup.items.forEach((item) => {
        initial[item.id] = {
          id: item.id,
          materialCost: item.materialCost || 0,
          laborCost: item.laborCost || 0,
          overheadCost: item.overheadCost || 0,
          transportCost: item.transportCost || 0,
          installationCost: item.installationCost || 0,
          marginPercentage: item.marginPercentage || 25,
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
        materialCost: 0,
        laborCost: 0,
        overheadCost: 0,
        transportCost: 0,
        installationCost: 0,
        marginPercentage: 25,
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

  // Calculate quotation-level totals dynamically
  const quotationTotals = useMemo(() => {
    let grandFactoryCost = 0
    let grandSellingPrice = 0

    items.forEach((item) => {
      const state = itemStates[item.id]
      const qty = item.quantity || 1
      
      const matCost = state?.materialCost || 0
      const labCost = state?.laborCost || 0
      const overCost = state?.overheadCost || 0
      const transCost = state?.transportCost || 0
      const instCost = state?.installationCost || 0
      const unitCost = matCost + labCost + overCost + transCost + instCost

      const margin = state?.marginPercentage || 25
      const suggestedPrice = unitCost > 0 && margin > 0 && margin < 100
        ? Math.round((unitCost / (1 - margin / 100)) * 100) / 100
        : unitCost

      const sellingPrice = (state?.unitPrice && state.unitPrice > 0) ? state.unitPrice : suggestedPrice

      grandFactoryCost += unitCost * qty
      grandSellingPrice += sellingPrice * qty
    })

    const netProfit = grandSellingPrice - grandFactoryCost
    const marginPct = grandSellingPrice > 0 ? (netProfit / grandSellingPrice) * 100 : 0

    return {
      grandFactoryCost,
      grandSellingPrice,
      netProfit,
      marginPct
    }
  }, [items, itemStates])

  // Save changes API handler (isComplete = true marks all COSTING_COMPLETED)
  const handleSaveCosting = async (isComplete: boolean) => {
    setLoading(true)
    try {
      const payloadItems = items.map((item) => {
        const state = itemStates[item.id] || {}
        const matCost = state.materialCost || 0
        const labCost = state.laborCost || 0
        const overCost = state.overheadCost || 0
        const transCost = state.transportCost || 0
        const instCost = state.installationCost || 0
        const unitCost = matCost + labCost + overCost + transCost + instCost
        const marginPct = state.marginPercentage || 25

        const suggestedPrice = unitCost > 0 && marginPct > 0 && marginPct < 100
          ? Math.round((unitCost / (1 - marginPct / 100)) * 100) / 100
          : unitCost

        const effectiveUnitPrice = (state.unitPrice && state.unitPrice > 0) ? state.unitPrice : suggestedPrice

        return {
          id: item.id,
          materialCost: matCost,
          laborCost: labCost,
          overheadCost: overCost,
          transportCost: transCost,
          installationCost: instCost,
          marginPercentage: marginPct,
          unitPrice: effectiveUnitPrice,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl lg:max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border shadow-2xl bg-card">
        {/* Workspace Header */}
        <DialogHeader className="p-5 sm:p-6 border-b bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-extrabold text-foreground flex items-center gap-2.5 flex-wrap">
                  Quotation Costing Workspace
                  <Badge variant="outline" className="font-mono text-xs bg-background border-amber-400 text-amber-900 dark:text-amber-300 font-bold">
                    {quotationGroup.quotationNumber}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap mt-0.5">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {quotationGroup.client?.companyName || "Client"}
                  </span>
                  {quotationGroup.projectName && (
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      • {quotationGroup.projectName}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground">
                    • <User className="h-3.5 w-3.5" /> IDC: {quotationGroup.preparedBy?.name || "Sales Team"}
                  </span>
                </DialogDescription>
              </div>
            </div>

            <Badge variant="secondary" className="font-mono text-xs font-bold px-3 py-1 self-start sm:self-center shrink-0">
              {items.length} Product(s) Pending Costing
            </Badge>
          </div>
        </DialogHeader>

        {/* Quotation Financial Audit Dock (Sticky Top Banner) */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 shrink-0 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Quotation Financial Summary ({quotationGroup.quotationNumber})
              </span>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs px-2.5 py-0.5">
              {quotationTotals.marginPct.toFixed(1)}% Overall Gross Margin
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Factory Cost</span>
              <span className="font-mono font-bold text-sm sm:text-base text-slate-200 mt-0.5 block">
                AED {quotationTotals.grandFactoryCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Quoted Revenue</span>
              <span className="font-mono font-bold text-sm sm:text-base text-emerald-400 mt-0.5 block">
                AED {quotationTotals.grandSellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Overall Net Profit</span>
              <span className={`font-mono font-extrabold text-sm sm:text-base mt-0.5 block ${quotationTotals.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                AED {quotationTotals.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Products Count</span>
              <span className="font-mono font-bold text-sm sm:text-base text-amber-300 mt-0.5 block">
                {items.length} Items
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Products List Workspace */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {items.map((item, idx) => {
            const state = itemStates[item.id] || {
              id: item.id,
              materialCost: item.materialCost || 0,
              laborCost: item.laborCost || 0,
              overheadCost: item.overheadCost || 0,
              transportCost: item.transportCost || 0,
              installationCost: item.installationCost || 0,
              marginPercentage: item.marginPercentage || 25,
              unitPrice: item.unitPrice || 0,
              estimatorNotes: item.estimatorNotes || "",
              costingStatus: item.costingStatus || "PENDING_COSTING"
            }

            const qty = item.quantity || 1
            const cleanedSpecs = cleanHtmlText(item.specifications)
            const productImg = item.imageUrl || item.customImageUrl || item.product?.imageUrl

            const unitCost = state.materialCost + state.laborCost + state.overheadCost + state.transportCost + state.installationCost
            const suggestedPrice = unitCost > 0 && state.marginPercentage > 0 && state.marginPercentage < 100
              ? Math.round((unitCost / (1 - state.marginPercentage / 100)) * 100) / 100
              : unitCost

            const effectiveUnitPrice = state.unitPrice > 0 ? state.unitPrice : suggestedPrice
            const lineTotalCost = unitCost * qty
            const lineTotalSelling = effectiveUnitPrice * qty
            const lineNetProfit = lineTotalSelling - lineTotalCost
            const lineMarginPct = lineTotalSelling > 0 ? (lineNetProfit / lineTotalSelling) * 100 : 0

            return (
              <div 
                key={item.id}
                className="p-5 rounded-2xl border bg-card shadow-sm space-y-4 transition-all hover:border-amber-400/60"
              >
                {/* Product Header */}
                <div className="flex items-start justify-between border-b pb-3.5 gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="font-mono text-xs font-extrabold bg-muted/60 text-muted-foreground px-2 py-1 rounded-lg shrink-0 mt-0.5">
                      #{idx + 1}
                    </span>

                    {productImg ? (
                      <img src={productImg} alt={item.description} className="w-12 h-12 rounded-xl object-cover border shrink-0 bg-white shadow-2xs" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl border border-dashed bg-muted flex items-center justify-center text-[10px] text-muted-foreground shrink-0 font-medium">
                        No Img
                      </div>
                    )}

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug truncate">
                          {item.description}
                        </h4>
                        {item.categoryName && (
                          <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                            {item.categoryName} {item.chairType ? `• ${item.chairType}` : ""}
                          </Badge>
                        )}
                        {item.batchHeading && item.batchHeading !== "General Items" && (
                          <Badge variant="outline" className="text-[10px] bg-muted/40 font-mono">
                            <Layers className="h-3 w-3 mr-1" /> {item.batchHeading}
                          </Badge>
                        )}
                      </div>

                      {cleanedSpecs && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 italic pt-0.5">
                          {cleanedSpecs}
                        </p>
                      )}
                    </div>
                  </div>

                  <Badge className="bg-primary text-primary-foreground font-mono text-xs font-bold px-3 py-1 shrink-0">
                    Qty: {qty}
                  </Badge>
                </div>

                {/* Direct Costs Input Breakdown */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-amber-600" />
                    Factory Unit Cost Breakdown (AED/Unit)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1 p-3 rounded-xl border bg-muted/20">
                      <label className="text-[11px] font-semibold text-muted-foreground flex justify-between">
                        <span>Material Cost</span>
                        <span>(Veneer/Wood)</span>
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={state.materialCost || ""}
                          onChange={(e) => updateItemField(item.id, "materialCost", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="font-mono font-semibold h-8 text-xs pl-8 bg-background"
                        />
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-muted-foreground pointer-events-none">AED</span>
                      </div>
                    </div>

                    <div className="space-y-1 p-3 rounded-xl border bg-muted/20">
                      <label className="text-[11px] font-semibold text-muted-foreground flex justify-between">
                        <span>Labor &amp; Production</span>
                        <span>(Assembly)</span>
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={state.laborCost || ""}
                          onChange={(e) => updateItemField(item.id, "laborCost", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="font-mono font-semibold h-8 text-xs pl-8 bg-background"
                        />
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-muted-foreground pointer-events-none">AED</span>
                      </div>
                    </div>

                    <div className="space-y-1 p-3 rounded-xl border bg-muted/20">
                      <label className="text-[11px] font-semibold text-muted-foreground flex justify-between">
                        <span>Factory Overhead</span>
                        <span>(Power/Tools)</span>
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={state.overheadCost || ""}
                          onChange={(e) => updateItemField(item.id, "overheadCost", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="font-mono font-semibold h-8 text-xs pl-8 bg-background"
                        />
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-muted-foreground pointer-events-none">AED</span>
                      </div>
                    </div>

                    <div className="space-y-1 p-3 rounded-xl border bg-muted/20">
                      <label className="text-[11px] font-semibold text-muted-foreground flex justify-between">
                        <span>Transport &amp; Site</span>
                        <span>(Delivery)</span>
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={state.transportCost || ""}
                          onChange={(e) => updateItemField(item.id, "transportCost", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="font-mono font-semibold h-8 text-xs pl-8 bg-background"
                        />
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-muted-foreground pointer-events-none">AED</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Target Margin & Quoted Price Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1 p-3 rounded-xl border bg-teal-500/5 border-teal-500/20">
                    <label className="text-[11px] font-bold text-foreground flex justify-between">
                      <span>Desired Gross Margin %</span>
                      <span className="text-[10px] text-teal-600 dark:text-teal-400">Target Profit Margin</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="99"
                        step="0.1"
                        value={state.marginPercentage || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          updateItemField(item.id, "marginPercentage", val)
                          if (unitCost > 0 && val > 0 && val < 100) {
                            const newPrice = Math.round((unitCost / (1 - val / 100)) * 100) / 100
                            updateItemField(item.id, "unitPrice", newPrice)
                          }
                        }}
                        placeholder="25%"
                        className="font-mono font-bold h-8 text-xs pr-7 bg-background"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-bold text-muted-foreground pointer-events-none">%</span>
                    </div>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                    <label className="text-[11px] font-bold text-foreground flex justify-between">
                      <span>Quoted Selling Price (AED/unit)</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Final Price to Customer</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={state.unitPrice || ""}
                        onChange={(e) => updateItemField(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                        placeholder={suggestedPrice.toString()}
                        className="font-mono font-extrabold h-8 text-xs pl-8 bg-background text-emerald-700 dark:text-emerald-400 border-emerald-400"
                      />
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 pointer-events-none">AED</span>
                    </div>
                  </div>
                </div>

                {/* Item Financial Summary Bar & Technical Notes */}
                <div className="p-3.5 bg-muted/40 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap text-muted-foreground font-mono">
                    <div>
                      <span className="text-[10px] block font-sans font-bold uppercase text-muted-foreground">Unit Cost:</span>
                      <span className="font-bold text-foreground">AED {unitCost.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] block font-sans font-bold uppercase text-muted-foreground">Quoted Rate:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">AED {effectiveUnitPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] block font-sans font-bold uppercase text-muted-foreground">Line Profit ({qty}x):</span>
                      <span className={`font-bold ${lineNetProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                        AED {lineNetProfit.toFixed(2)} ({lineMarginPct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 max-w-md">
                    <Input
                      type="text"
                      value={state.estimatorNotes || ""}
                      onChange={(e) => updateItemField(item.id, "estimatorNotes", e.target.value)}
                      placeholder="Estimator technical notes / supplier cost references..."
                      className="h-8 text-xs bg-background"
                    />
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
  )
}
