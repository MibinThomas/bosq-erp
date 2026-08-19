"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calculator, 
  Package, 
  Wrench, 
  Truck, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Layers, 
  Percent, 
  Coins,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react"

export interface CostingItemData {
  id?: string
  itemNo?: number
  description: string
  specifications?: string | null
  quantity: number
  unit?: string
  categoryName?: string | null
  imageUrl?: string | null
  
  // Cost Component Breakdown
  factoryCost?: number
  accessoriesCost?: number
  materialCost?: number
  laborCost?: number
  installationCost?: number
  transportCost?: number
  overheadCost?: number
  
  // Unit & Total Costs
  unitCost?: number | null
  totalCost?: number | null
  
  // Margins & Selling Prices
  marginPercentage?: number | null
  margin?: number | null
  negotiationPercentage?: number | null
  negotiationAmount?: number | null
  unitSellingPrice?: number | null
  unitPrice?: number | null
  totalSellingPrice?: number | null
  amount?: number | null
}

interface CostingBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  item: CostingItemData | null
  currency?: string
}

export function CostingBreakdownModal({
  isOpen,
  onClose,
  item,
  currency = "AED"
}: CostingBreakdownModalProps) {
  if (!item) return null

  const qty = Math.max(1, item.quantity || 1)
  
  // Extract or calculate cost components
  const matCost = Number(item.materialCost || 0)
  const factoryCost = Number(item.factoryCost || 0)
  const accessoriesCost = Number(item.accessoriesCost || 0)
  const labCost = Number(item.laborCost || 0)
  const instCost = Number(item.installationCost || 0)
  const transCost = Number(item.transportCost || 0)
  const overCost = Number(item.overheadCost || 0)

  // Direct base unit cost calculation
  const legacyUnitCost = matCost + labCost + instCost + transCost + overCost
  const unitCost = Number(item.unitCost) > 0 
    ? Number(item.unitCost) 
    : (factoryCost > 0 || accessoriesCost > 0 ? factoryCost + accessoriesCost : legacyUnitCost)
  
  const totalCost = Number(item.totalCost) > 0 ? Number(item.totalCost) : unitCost * qty

  // Selling Prices
  const unitSellingPrice = Number(item.unitSellingPrice ?? item.unitPrice ?? item.amount ?? 0)
  const totalSellingPrice = Number(item.totalSellingPrice ?? (unitSellingPrice * qty))

  // Margins & Profit
  const marginPct = Number(item.marginPercentage ?? item.margin ?? 0)
  const negAmt = Number(item.negotiationAmount || 0)
  const negPct = Number(item.negotiationPercentage || 0)
  
  const netProfitUnit = unitSellingPrice - unitCost
  const netProfitTotal = totalSellingPrice - totalCost
  const netMarginPct = totalSellingPrice > 0 ? (netProfitTotal / totalSellingPrice) * 100 : 0

  // Profitability Badge
  const getProfitabilityBadge = (pct: number) => {
    if (pct >= 25) {
      return {
        label: "High Margin",
        color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
        icon: CheckCircle2
      }
    } else if (pct >= 15) {
      return {
        label: "Healthy Margin",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-800",
        icon: TrendingUp
      }
    } else if (pct >= 5) {
      return {
        label: "Low Margin Warning",
        color: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800",
        icon: AlertTriangle
      }
    } else {
      return {
        label: "Critical Margin",
        color: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-800",
        icon: TrendingDown
      }
    }
  }

  const badgeInfo = getProfitabilityBadge(netMarginPct)
  const BadgeIcon = badgeInfo.icon

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0)
  }

  const itemImgUrl = item.imageUrl || (item as any).customImageUrl || (item as any).product?.imageUrl || null

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-y-auto font-sans p-6 sm:p-8 rounded-2xl">
        <DialogHeader className="space-y-2 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2 flex-wrap">
                  <span>Estimator Costing Breakdown</span>
                  {item.itemNo && (
                    <Badge variant="outline" className="text-xs font-mono font-bold bg-muted/40">
                      Item #{item.itemNo}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Structured cost component analysis &amp; margin breakdown entered by Estimator
                </DialogDescription>
              </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 self-start sm:self-auto ${badgeInfo.color}`}>
              <BadgeIcon className="h-3.5 w-3.5" />
              <span>{badgeInfo.label} ({netMarginPct.toFixed(1)}%)</span>
            </div>
          </div>
        </DialogHeader>

        {/* Item Header Details */}
        <div className="bg-muted/40 p-4 rounded-xl border border-border/50 text-xs flex items-center gap-4">
          {itemImgUrl ? (
            <img 
              src={itemImgUrl} 
              alt={item.description} 
              className="w-16 h-16 rounded-xl object-cover border shrink-0 bg-white shadow-2xs" 
            />
          ) : (
            <div className="w-16 h-16 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground text-center font-medium shrink-0">
              No Image
            </div>
          )}
          <div className="space-y-1 flex-1 min-w-0">
            <div className="font-bold text-foreground text-sm leading-tight">{item.description}</div>
            {item.specifications && (
              <div className="text-muted-foreground line-clamp-2 text-[11px]" title={item.specifications}>
                {item.specifications}
              </div>
            )}
            <div className="flex items-center gap-4 text-muted-foreground pt-1 text-[11px] font-mono">
              <span>Quantity: <strong className="text-foreground font-sans font-bold">{qty} {item.unit || "Nos"}</strong></span>
              {item.categoryName && <span>Category: <strong className="text-foreground font-sans font-bold">{item.categoryName}</strong></span>}
            </div>
          </div>
        </div>

        {/* Cost Components Breakdown */}
        <div className="space-y-5 py-2">
          
          {/* Section 1: Materials & Hardware */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-blue-500" />
              Direct Materials &amp; Hardware
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-card border rounded-xl text-xs space-y-1 shadow-2xs">
                <span className="text-muted-foreground text-[11px] font-medium block">Raw Material Cost</span>
                <span className="font-extrabold text-foreground text-base whitespace-nowrap">{currency} {formatCurrency(matCost)}</span>
                <span className="text-[10px] text-muted-foreground block font-mono">per unit</span>
              </div>
              <div className="p-3.5 bg-card border rounded-xl text-xs space-y-1 shadow-2xs">
                <span className="text-muted-foreground text-[11px] font-medium block">Factory Base Cost</span>
                <span className="font-extrabold text-foreground text-base whitespace-nowrap">{currency} {formatCurrency(factoryCost)}</span>
                <span className="text-[10px] text-muted-foreground block font-mono">base production</span>
              </div>
              <div className="p-3.5 bg-card border rounded-xl text-xs space-y-1 shadow-2xs">
                <span className="text-muted-foreground text-[11px] font-medium block">Accessories &amp; Hardware</span>
                <span className="font-extrabold text-foreground text-base whitespace-nowrap">{currency} {formatCurrency(accessoriesCost)}</span>
                <span className="text-[10px] text-muted-foreground block font-mono">fittings &amp; locks</span>
              </div>
            </div>
          </div>

          {/* Section 2: Labor, Factory & Logistics */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-amber-500" />
              Labor, Overheads &amp; Logistics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-card border rounded-xl text-xs space-y-1 shadow-2xs">
                <span className="text-muted-foreground text-[10px] font-medium block uppercase tracking-wider">Labor Cost</span>
                <span className="font-bold text-foreground text-sm whitespace-nowrap">{currency} {formatCurrency(labCost)}</span>
              </div>
              <div className="p-3 bg-card border rounded-xl text-xs space-y-1 shadow-2xs">
                <span className="text-muted-foreground text-[10px] font-medium block uppercase tracking-wider">Factory Overhead</span>
                <span className="font-bold text-foreground text-sm whitespace-nowrap">{currency} {formatCurrency(overCost)}</span>
              </div>
              <div className="p-3 bg-card border rounded-xl text-xs space-y-1 shadow-2xs">
                <span className="text-muted-foreground text-[10px] font-medium block uppercase tracking-wider">Transport Logistics</span>
                <span className="font-bold text-foreground text-sm whitespace-nowrap">{currency} {formatCurrency(transCost)}</span>
              </div>
              <div className="p-3 bg-card border rounded-lg text-xs space-y-1 shadow-2xs">
                <span className="text-muted-foreground text-[10px] font-medium block uppercase tracking-wider">Site Installation</span>
                <span className="font-bold text-foreground text-sm whitespace-nowrap">{currency} {formatCurrency(instCost)}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Summary Comparison Cards */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-emerald-500" />
              Financial &amp; Profitability Summary
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Unit Cost */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 border rounded-xl space-y-1 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Unit Cost</span>
                <span className="text-base font-extrabold text-foreground whitespace-nowrap">{currency} {formatCurrency(unitCost)}</span>
                <span className="text-[10px] text-muted-foreground block font-mono whitespace-nowrap">Total: {currency} {formatCurrency(totalCost)}</span>
              </div>

              {/* Target Margin % */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 border rounded-xl space-y-1 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Target Margin</span>
                <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap">{marginPct.toFixed(1)}%</span>
                {(negAmt > 0 || negPct > 0) && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-mono whitespace-nowrap">
                    Neg. Margin: +{negPct > 0 ? `${negPct.toFixed(1)}%` : ""} (+{currency} {formatCurrency(negAmt)})
                  </span>
                )}
              </div>

              {/* Unit Selling Price */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 border rounded-xl space-y-1 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Quoted Selling Price</span>
                <span className="text-base font-extrabold text-foreground whitespace-nowrap">{currency} {formatCurrency(unitSellingPrice)}</span>
                <span className="text-[10px] text-muted-foreground block font-mono whitespace-nowrap">Total: {currency} {formatCurrency(totalSellingPrice)}</span>
              </div>

              {/* Net Profit */}
              <div className={`p-3.5 border rounded-xl space-y-1 shadow-2xs ${netProfitTotal >= 0 ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"}`}>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Net Profit</span>
                <span className={`text-base font-extrabold whitespace-nowrap ${netProfitTotal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {currency} {formatCurrency(netProfitTotal)}
                </span>
                <span className="text-[10px] font-bold block font-mono whitespace-nowrap">
                  Margin: {netMarginPct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto text-xs font-bold px-5">
            Close Breakdown
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
