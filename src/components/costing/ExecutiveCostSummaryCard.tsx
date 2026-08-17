"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Wrench, 
  Truck, 
  ShieldCheck, 
  Coins,
  Percent,
  CheckCircle2,
  AlertTriangle
} from "lucide-react"

export interface CostSummaryMetrics {
  totalMaterialCost: number
  totalLaborCost: number
  totalInstallation: number
  totalTransport: number
  totalOverhead: number
  totalCost: number
  marginAmount: number
  totalSellingPrice: number
  itemCount?: number
}

interface ExecutiveCostSummaryCardProps {
  metrics: CostSummaryMetrics
  currency?: string
  title?: string
  subtitle?: string
}

export function ExecutiveCostSummaryCard({
  metrics,
  currency = "AED",
  title = "Executive Costing & Profitability Summary",
  subtitle = "High-level cost distribution and profit margin audit for Estimators & Management"
}: ExecutiveCostSummaryCardProps) {
  const totalRev = Number(metrics.totalSellingPrice || 0)
  const totalCost = Number(metrics.totalCost || 0)
  const netProfit = Number(metrics.marginAmount ?? (totalRev - totalCost))
  const grossMarginPct = totalRev > 0 ? (netProfit / totalRev) * 100 : 0

  const matCost = Number(metrics.totalMaterialCost || 0)
  const labCost = Number(metrics.totalLaborCost || 0)
  const logisticsCost = Number(metrics.totalTransport || 0) + Number(metrics.totalInstallation || 0) + Number(metrics.totalOverhead || 0)

  // Percentages relative to total revenue (or total cost if revenue is 0)
  const baseForPct = totalRev > 0 ? totalRev : (totalCost || 1)
  const matPct = Math.min(100, Math.max(0, (matCost / baseForPct) * 100))
  const labPct = Math.min(100, Math.max(0, (labCost / baseForPct) * 100))
  const logPct = Math.min(100, Math.max(0, (logisticsCost / baseForPct) * 100))
  const profitPct = Math.max(0, grossMarginPct)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0)
  }

  // Margin Health Badge
  const getMarginHealth = (pct: number) => {
    if (pct >= 25) {
      return {
        label: "Optimal Margin",
        color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300",
        icon: CheckCircle2
      }
    } else if (pct >= 15) {
      return {
        label: "Standard Margin",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300",
        icon: TrendingUp
      }
    } else if (pct >= 5) {
      return {
        label: "Low Margin Warning",
        color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300",
        icon: AlertTriangle
      }
    } else {
      return {
        label: "Critical Margin",
        color: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300",
        icon: TrendingDown
      }
    }
  }

  const health = getMarginHealth(grossMarginPct)
  const HealthIcon = health.icon

  return (
    <Card className="border border-border/80 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl overflow-hidden font-sans">
      <div className="p-5 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Coins className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground font-sans tracking-tight">{title}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 shrink-0 ${health.color}`}>
          <HealthIcon className="h-3.5 w-3.5" />
          <span>{health.label} ({grossMarginPct.toFixed(1)}%)</span>
        </div>
      </div>

      <CardContent className="p-5 space-y-5">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Total Revenue */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Revenue</span>
            <div className="text-lg font-extrabold text-foreground tracking-tight">
              <span className="text-xs text-muted-foreground mr-1">{currency}</span>
              {formatCurrency(totalRev)}
            </div>
            <span className="text-[10px] text-muted-foreground block font-mono">Quoted Selling Price</span>
          </div>

          {/* Direct Factory Cost */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Factory Cost</span>
            <div className="text-lg font-extrabold text-foreground tracking-tight">
              <span className="text-xs text-muted-foreground mr-1">{currency}</span>
              {formatCurrency(totalCost)}
            </div>
            <span className="text-[10px] text-muted-foreground block font-mono">Materials, Labor &amp; Overheads</span>
          </div>

          {/* Net Profit */}
          <div className={`p-3.5 border rounded-xl space-y-1 ${netProfit >= 0 ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Net Profit</span>
            <div className={`text-lg font-extrabold tracking-tight ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              <span className="text-xs mr-1 opacity-80">{currency}</span>
              {formatCurrency(netProfit)}
            </div>
            <span className="text-[10px] font-bold block font-mono">
              Margin: {grossMarginPct.toFixed(1)}%
            </span>
          </div>

          {/* Cost Distribution Details */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Primary Cost Driver</span>
            <div className="text-xs font-bold text-foreground truncate mt-1">
              {matCost >= labCost && matCost >= logisticsCost ? `Materials (${matPct.toFixed(0)}%)` : labCost >= logisticsCost ? `Labor (${labPct.toFixed(0)}%)` : `Logistics (${logPct.toFixed(0)}%)`}
            </div>
            <div className="text-[10px] text-muted-foreground space-x-2 font-mono pt-0.5">
              <span>Mat: {currency} {formatCurrency(matCost)}</span>
            </div>
          </div>

        </div>

        {/* Cost & Profit Distribution Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Cost &amp; Profit Distribution Breakdown</span>
            <span>100% Total Revenue</span>
          </div>

          {/* Multi-segment Progress Bar */}
          <div className="h-3.5 w-full bg-muted/60 rounded-full overflow-hidden flex border">
            {matPct > 0 && (
              <div 
                style={{ width: `${matPct}%` }} 
                className="bg-blue-500 hover:bg-blue-600 transition-all duration-300"
                title={`Materials: ${currency} ${formatCurrency(matCost)} (${matPct.toFixed(1)}%)`}
              />
            )}
            {labPct > 0 && (
              <div 
                style={{ width: `${labPct}%` }} 
                className="bg-amber-500 hover:bg-amber-600 transition-all duration-300"
                title={`Labor: ${currency} ${formatCurrency(labCost)} (${labPct.toFixed(1)}%)`}
              />
            )}
            {logPct > 0 && (
              <div 
                style={{ width: `${logPct}%` }} 
                className="bg-purple-500 hover:bg-purple-600 transition-all duration-300"
                title={`Logistics/Overhead: ${currency} ${formatCurrency(logisticsCost)} (${logPct.toFixed(1)}%)`}
              />
            )}
            {profitPct > 0 && (
              <div 
                style={{ width: `${profitPct}%` }} 
                className="bg-emerald-500 hover:bg-emerald-600 transition-all duration-300"
                title={`Net Profit: ${currency} ${formatCurrency(netProfit)} (${profitPct.toFixed(1)}%)`}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between flex-wrap gap-3 text-[11px] text-muted-foreground font-medium pt-1">
            <div className="flex items-center space-x-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span>Raw Materials: <strong className="text-foreground">{matPct.toFixed(1)}%</strong> ({currency} {formatCurrency(matCost)})</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Labor: <strong className="text-foreground">{labPct.toFixed(1)}%</strong> ({currency} {formatCurrency(labCost)})</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              <span>Logistics &amp; Overhead: <strong className="text-foreground">{logPct.toFixed(1)}%</strong> ({currency} {formatCurrency(logisticsCost)})</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Net Profit: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{profitPct.toFixed(1)}%</strong> ({currency} {formatCurrency(netProfit)})</span>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
