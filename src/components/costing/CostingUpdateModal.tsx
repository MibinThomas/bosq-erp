"use client"

import React, { useEffect, useState } from "react"
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
import { Loader2, Calculator, Check, Coins, Percent, FileText, Package, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface QuotationItemForCosting {
  id: string
  itemNo: number
  description: string
  specifications?: string | null
  quantity: number
  unitPrice: number
  materialCost?: number
  laborCost?: number
  overheadCost?: number
  transportCost?: number
  installationCost?: number
  unitCost?: number
  marginPercentage?: number
  estimatorNotes?: string | null
  costingStatus?: string
}

interface CostingUpdateModalProps {
  quotationId: string
  item: QuotationItemForCosting | null
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

export function CostingUpdateModal({
  quotationId,
  item,
  open,
  onOpenChange,
  onSuccess
}: CostingUpdateModalProps) {
  const [loading, setLoading] = useState(false)
  const [materialCost, setMaterialCost] = useState<number>(0)
  const [laborCost, setLaborCost] = useState<number>(0)
  const [overheadCost, setOverheadCost] = useState<number>(0)
  const [transportCost, setTransportCost] = useState<number>(0)
  const [installationCost, setInstallationCost] = useState<number>(0)
  const [marginPercentage, setMarginPercentage] = useState<number>(0)
  const [unitPrice, setUnitPrice] = useState<number>(0)
  const [estimatorNotes, setEstimatorNotes] = useState<string>("")

  useEffect(() => {
    if (item && open) {
      setMaterialCost(item.materialCost || 0)
      setLaborCost(item.laborCost || 0)
      setOverheadCost(item.overheadCost || 0)
      setTransportCost(item.transportCost || 0)
      setInstallationCost(item.installationCost || 0)
      setMarginPercentage(item.marginPercentage ?? 0)
      setUnitPrice(item.unitPrice || 0)
      setEstimatorNotes(item.estimatorNotes || "")
    }
  }, [item, open])

  if (!item) return null

  const quantity = item.quantity || 1
  const cleanedSpecs = cleanHtmlText(item.specifications)
  const totalUnitCost = materialCost + laborCost + overheadCost + transportCost + installationCost
  
  // Compute suggested selling price from margin % if unit price not manually overridden
  const suggestedUnitPrice = totalUnitCost > 0 && marginPercentage > 0 && marginPercentage < 100
    ? Math.round((totalUnitCost / (1 - marginPercentage / 100)) * 100) / 100
    : totalUnitCost

  const effectiveUnitPrice = unitPrice > 0 ? unitPrice : suggestedUnitPrice
  const lineTotalCost = totalUnitCost * quantity
  const lineTotalSelling = effectiveUnitPrice * quantity
  const lineNetProfit = lineTotalSelling - lineTotalCost
  const computedMarginPct = lineTotalSelling > 0 ? ((lineTotalSelling - lineTotalCost) / lineTotalSelling) * 100 : 0

  const handleSaveCosting = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotations/${quotationId}/costing-update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              id: item.id,
              materialCost,
              laborCost,
              overheadCost,
              transportCost,
              installationCost,
              marginPercentage,
              unitPrice: effectiveUnitPrice,
              estimatorNotes,
              costingStatus: "COSTING_COMPLETED"
            }
          ]
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update costing")
      }

      toast.success(`Costing completed for item #${item.itemNo}!`)
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Failed to update costing")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border shadow-2xl bg-card">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 border-b bg-muted/20 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                Line Item Costing &amp; Estimation
                <Badge variant="outline" className="font-mono text-xs bg-background border-amber-300 text-amber-900 dark:text-amber-300">
                  Item #{item.itemNo}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter factory unit costs, material/labor breakdown, and target gross margin percentage.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Section 1: Item Overview Banner */}
          <div className="p-4 bg-muted/40 border border-border/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="h-4 w-4 text-primary shrink-0" />
                <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">{item.description}</h4>
              </div>
              <Badge className="bg-primary text-primary-foreground font-mono text-xs font-bold px-3 py-0.5 shrink-0">
                Quantity: {quantity}
              </Badge>
            </div>

            {cleanedSpecs && (
              <div className="pt-2 border-t border-border/60 flex items-start gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {cleanedSpecs}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Cost Breakdown Inputs Grid */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-amber-600" />
              1. Direct Unit Costs &amp; Expense Breakdown (AED/Unit)
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3.5 rounded-xl border bg-card/60">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Material Cost</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Raw Materials / Veneer</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={materialCost || ""}
                    onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="font-mono font-semibold h-9 text-xs pl-8 bg-background"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs font-bold text-muted-foreground pointer-events-none">AED</span>
                </div>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-xl border bg-card/60">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Labor &amp; Production</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Carpentry &amp; Assembly</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={laborCost || ""}
                    onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="font-mono font-semibold h-9 text-xs pl-8 bg-background"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs font-bold text-muted-foreground pointer-events-none">AED</span>
                </div>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-xl border bg-card/60">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Factory Overhead</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Machinery &amp; Power</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={overheadCost || ""}
                    onChange={(e) => setOverheadCost(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="font-mono font-semibold h-9 text-xs pl-8 bg-background"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs font-bold text-muted-foreground pointer-events-none">AED</span>
                </div>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-xl border bg-card/60">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Transport &amp; Logistics</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Delivery &amp; Installation</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={transportCost || ""}
                    onChange={(e) => setTransportCost(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="font-mono font-semibold h-9 text-xs pl-8 bg-background"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs font-bold text-muted-foreground pointer-events-none">AED</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Target Margin & Selling Price */}
          <div className="space-y-3 pt-2 border-t">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-teal-600" />
              2. Margin Target &amp; Quoted Selling Price
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3.5 rounded-xl border bg-teal-500/5 border-teal-500/20">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Target Gross Margin %</span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">Auto-calculates Price</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    step="0.1"
                    value={marginPercentage || ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setMarginPercentage(val)
                      if (totalUnitCost > 0 && val > 0 && val < 100) {
                        setUnitPrice(Math.round((totalUnitCost / (1 - val / 100)) * 100) / 100)
                      }
                    }}
                    placeholder="25%"
                    className="font-mono font-bold h-9 text-xs pr-7 bg-background"
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs font-bold text-muted-foreground pointer-events-none">%</span>
                </div>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Quoted Selling Price (AED/unit)</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Final Customer Price</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice || ""}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    placeholder={suggestedUnitPrice.toString()}
                    className="font-mono font-extrabold h-9 text-xs pl-8 bg-background text-emerald-700 dark:text-emerald-400 border-emerald-400"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 pointer-events-none">AED</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Financial Summary Card */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4 font-sans shadow-xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Financial Audit &amp; Profit Summary</span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs px-2.5 py-0.5">
                {computedMarginPct.toFixed(1)}% Gross Margin
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Unit Factory Cost</span>
                <span className="font-mono font-bold text-sm text-slate-200 mt-0.5 block">
                  AED {totalUnitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Unit Selling Price</span>
                <span className="font-mono font-bold text-sm text-emerald-400 mt-0.5 block">
                  AED {effectiveUnitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Line Total Revenue</span>
                <span className="font-mono font-extrabold text-sm text-amber-300 mt-0.5 block">
                  AED {lineTotalSelling.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Line Net Profit</span>
                <span className={`font-mono font-extrabold text-sm mt-0.5 block ${lineNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  AED {lineNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Estimator Notes / Remarks */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Estimator Technical Notes &amp; Specifications</span>
              <span className="text-[10px] font-normal text-muted-foreground">Internal reference for pricing team</span>
            </label>
            <Textarea
              rows={3}
              value={estimatorNotes}
              onChange={(e) => setEstimatorNotes(e.target.value)}
              placeholder="Add technical notes on materials, veneer specs, factory machinery time, or supplier cost references..."
              className="text-xs leading-relaxed bg-background"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 sm:p-5 bg-muted/30 border-t flex flex-row items-center justify-end gap-3 shrink-0">
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
          <Button
            type="button"
            size="sm"
            onClick={handleSaveCosting}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
