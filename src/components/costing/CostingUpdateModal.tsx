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
import { Loader2, Calculator, Check, AlertCircle, Coins, Percent } from "lucide-react"
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
  const [marginPercentage, setMarginPercentage] = useState<number>(25)
  const [unitPrice, setUnitPrice] = useState<number>(0)
  const [estimatorNotes, setEstimatorNotes] = useState<string>("")

  useEffect(() => {
    if (item && open) {
      setMaterialCost(item.materialCost || 0)
      setLaborCost(item.laborCost || 0)
      setOverheadCost(item.overheadCost || 0)
      setTransportCost(item.transportCost || 0)
      setInstallationCost(item.installationCost || 0)
      setMarginPercentage(item.marginPercentage || 25)
      setUnitPrice(item.unitPrice || 0)
      setEstimatorNotes(item.estimatorNotes || "")
    }
  }, [item, open])

  if (!item) return null

  const quantity = item.quantity || 1
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
      <DialogContent className="max-w-2xl sm:rounded-2xl p-6">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Line Item Costing &amp; Estimation (Item #{item.itemNo})
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set factory unit costs, material/labor allocations, and approved margin percentage.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Item Overview Banner */}
          <div className="p-3.5 bg-muted/40 border rounded-xl flex items-start justify-between gap-3 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-foreground leading-snug">{item.description}</p>
              {item.specifications && (
                <p className="text-muted-foreground text-[11px] line-clamp-2">{item.specifications}</p>
              )}
            </div>
            <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 font-bold shrink-0">
              Qty: {quantity}
            </Badge>
          </div>

          {/* Cost Allocation Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center justify-between">
                <span>Material Cost (AED/unit)</span>
                <Coins className="h-3.5 w-3.5 text-blue-600" />
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={materialCost || ""}
                onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="font-mono font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center justify-between">
                <span>Labor &amp; Production (AED/unit)</span>
                <Coins className="h-3.5 w-3.5 text-emerald-600" />
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={laborCost || ""}
                onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="font-mono font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center justify-between">
                <span>Factory Overhead (AED/unit)</span>
                <Coins className="h-3.5 w-3.5 text-amber-600" />
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={overheadCost || ""}
                onChange={(e) => setOverheadCost(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="font-mono font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center justify-between">
                <span>Transport &amp; Site Installation (AED/unit)</span>
                <Coins className="h-3.5 w-3.5 text-purple-600" />
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={transportCost || ""}
                onChange={(e) => setTransportCost(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="font-mono font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center justify-between">
                <span>Desired Gross Margin %</span>
                <Percent className="h-3.5 w-3.5 text-teal-600" />
              </label>
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
                className="font-mono font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center justify-between">
                <span>Quoted Selling Price (AED/unit)</span>
                <Coins className="h-3.5 w-3.5 text-emerald-600" />
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice || ""}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                placeholder={suggestedUnitPrice.toString()}
                className="font-mono font-bold text-emerald-700 dark:text-emerald-400"
              />
            </div>
          </div>

          {/* Computed Financial Audit Summary Card */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-sans shadow-inner">
            <div className="flex items-center justify-between text-xs font-semibold border-b border-slate-800 pb-2">
              <span className="text-slate-400 uppercase tracking-wider text-[10px]">Cost &amp; Profit Summary</span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-0 font-mono text-[10px]">
                {computedMarginPct.toFixed(1)}% Margin
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Unit Factory Cost</span>
                <span className="font-mono font-bold text-sm text-slate-200">AED {totalUnitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Unit Selling Price</span>
                <span className="font-mono font-extrabold text-sm text-emerald-400">AED {effectiveUnitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Line Net Profit ({quantity}x)</span>
                <span className={`font-mono font-extrabold text-sm ${lineNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  AED {lineNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Estimator Notes / Remarks */}
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-foreground">Estimator Notes / Material Specifications</label>
            <Textarea
              rows={2}
              value={estimatorNotes}
              onChange={(e) => setEstimatorNotes(e.target.value)}
              placeholder="Add technical notes on materials, veneer specs, or supplier cost references..."
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveCosting}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving Costing...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-4 w-4" /> Approve &amp; Save Costing
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
