"use client"

import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  PieChart,
  Calculator,
  Tag,
  CheckCircle2,
  AlertCircle,
  XCircle,
  User,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  Sparkles,
} from "lucide-react"

function cleanHtmlText(text?: string | null): string {
  if (!text) return ""
  return text
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

export interface AuditItemMetric {
  id: string
  itemNo: number
  description: string
  specifications?: string | null
  quantity: number
  factoryCost: number
  accessoriesCost: number
  totalCostUnit: number
  marginPct: number
  negotiationPct: number
  estimatorPriceUnit: number
  consultantPriceUnit: number
  discountAmountUnit: number
  discountPct: number
  lineTotalRevenue: number
  lineTotalCost: number
  lineExpectedProfit: number
  lineMarginPct: number
}

export interface ManagerialAuditSummary {
  grandFactoryCost: number
  grandAccessoriesCost: number
  grandTotalCost: number
  grandEstimatorRevenue: number
  grandConsultantRevenue: number
  grandTotalDiscountAmount: number
  overallDiscountPct: number
  grandExpectedProfit: number
  overallGrossMarginPct: number
  maxItemDiscountPct: number
  approvalStatus: string
  preparedByName?: string
  estimatorName?: string
}

interface ManagerialAuditSectionProps {
  summary: ManagerialAuditSummary
  items: AuditItemMetric[]
  userRole?: string
}

export function ManagerialAuditSection({ summary, items }: ManagerialAuditSectionProps) {
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false)

  // Determine Overall Financial Health
  const getHealthBadge = () => {
    const margin = summary.overallGrossMarginPct
    const discount = summary.overallDiscountPct

    if (margin < 10 || discount > 20 || summary.grandExpectedProfit < 0) {
      return {
        label: "Loss-Making / High Risk",
        color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
        icon: XCircle,
        dot: "bg-rose-500"
      }
    }
    if (margin < 25 || discount > 10) {
      return {
        label: "Low Margin / Medium Discount",
        color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
        icon: AlertCircle,
        dot: "bg-amber-500"
      }
    }
    return {
      label: "Healthy Profitability & Pricing",
      color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      icon: CheckCircle2,
      dot: "bg-emerald-500"
    }
  }

  const health = getHealthBadge()
  const HealthIcon = health.icon

  const preparedBy = summary.preparedByName || "Sales Consultant"
  const estimatorBy = summary.estimatorName || "Cost Estimator"

  return (
    <Card className="border border-border/80 bg-card text-card-foreground shadow-md rounded-2xl overflow-hidden my-6">
      {/* Header */}
      <CardHeader className="p-4 sm:p-5 border-b border-border/70 bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
                MANAGERIAL FINANCIAL &amp; DISCOUNT AUDIT
              </CardTitle>
              <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-bold border flex items-center gap-1.5 ${health.color}`}>
                <span className={`h-2 w-2 rounded-full ${health.dot} animate-pulse`} />
                <HealthIcon className="h-3.5 w-3.5" />
                <span>{health.label}</span>
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-foreground">
                <User className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Discount Offered By: <strong className="text-foreground">{preparedBy}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Estimator: <strong className="text-foreground">{estimatorBy}</strong>
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
          className="h-8 text-xs font-bold border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-2xs shrink-0"
        >
          <TableIcon className="h-3.5 w-3.5 mr-1.5 text-primary" />
          {showDetailedBreakdown ? "Hide Product Details" : "View Itemized Costing"}
          {showDetailedBreakdown ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Executive Summary Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Cost */}
          <div className="p-4 rounded-xl bg-background border border-border/80 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
              <Calculator className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Total Cost
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-foreground">
              AED {summary.grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Factory + Accessories</p>
          </div>

          {/* Estimator Baseline Price */}
          <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-cyan-700 dark:text-cyan-400 tracking-wider flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-cyan-600" /> Estimator Baseline
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-cyan-900 dark:text-cyan-200">
              AED {summary.grandEstimatorRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-cyan-800 dark:text-cyan-300 font-medium">Cost + Margin Target</p>
          </div>

          {/* Client Revenue (Consultant Price) */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Client Revenue
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-900 dark:text-emerald-200">
              AED {summary.grandConsultantRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">Consultant Final Price</p>
          </div>

          {/* Consultant Discount Given & By Whom */}
          <div className={`p-4 rounded-xl border space-y-1 shadow-2xs ${summary.grandTotalDiscountAmount > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-background border-border/80"}`}>
            <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5 text-amber-600" /> Discount Given</span>
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-amber-900 dark:text-amber-200">
              {summary.grandTotalDiscountAmount > 0 ? (
                <>
                  AED {summary.grandTotalDiscountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs ml-1 font-bold text-amber-700 dark:text-amber-300">({summary.overallDiscountPct.toFixed(1)}%)</span>
                </>
              ) : (
                <span className="text-muted-foreground">0.00 (0%)</span>
              )}
            </div>
            <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium truncate" title={`Discount Given By: ${preparedBy}`}>
              By: <strong>{preparedBy}</strong>
            </p>
          </div>

          {/* Gross Profit & Margin % */}
          <div className={`p-4 rounded-xl border space-y-1 shadow-2xs col-span-2 lg:col-span-1 ${summary.grandExpectedProfit < 0 ? "bg-rose-500/10 border-rose-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
            <span className="text-[10px] uppercase font-bold text-foreground tracking-wider flex items-center gap-1">
              <PieChart className="h-3.5 w-3.5 text-primary" /> Expected Profit
            </span>
            <div className={`text-base sm:text-lg font-black font-mono ${summary.grandExpectedProfit < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              AED {summary.grandExpectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs ml-1 font-bold">({summary.overallGrossMarginPct.toFixed(1)}%)</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Overall Gross Margin</p>
          </div>
        </div>

        {/* Collapsible Product-Level Detailed Audit Table */}
        {showDetailedBreakdown && (
          <div className="space-y-3 pt-2 border-t border-border/60 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Product-Level Pricing &amp; Discount Audit ({items.length} items)</span>
              </h4>
              <Badge variant="outline" className="font-mono text-[10px]">
                Detailed Breakdown
              </Badge>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/80 bg-background shadow-2xs">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/60 text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3 text-center w-10">#</th>
                    <th className="py-3 px-3 min-w-[200px]">Product &amp; Specifications</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3 text-right">Factory Cost</th>
                    <th className="py-3 px-3 text-right">Accessories Cost</th>
                    <th className="py-3 px-3 text-right">Total Cost (Unit)</th>
                    <th className="py-3 px-3 text-right text-cyan-700 dark:text-cyan-300">Estimator Price</th>
                    <th className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400">Consultant Price</th>
                    <th className="py-3 px-3 text-right text-amber-700 dark:text-amber-400">Discount Given</th>
                    <th className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400">Line Profit</th>
                    <th className="py-3 px-3 text-center">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-foreground">
                  {items.map((item) => {
                    const isDiscounted = item.discountAmountUnit > 0
                    const isLowMargin = item.lineMarginPct < 15
                    const cleanSpecs = cleanHtmlText(item.specifications)

                    return (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-3 text-center font-mono font-bold text-muted-foreground">{item.itemNo}</td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-foreground">{item.description}</div>
                          {cleanSpecs && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1 italic mt-0.5">{cleanSpecs}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">{item.quantity}</td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {item.factoryCost > 0 ? `AED ${item.factoryCost.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {item.accessoriesCost > 0 ? `AED ${item.accessoriesCost.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                          AED {item.totalCostUnit.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-cyan-700 dark:text-cyan-300">
                          AED {item.estimatorPriceUnit.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                          AED {item.consultantPriceUnit.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {isDiscounted ? (
                            <div className="text-amber-700 dark:text-amber-300">
                              -AED {item.discountAmountUnit.toFixed(2)}
                              <span className="text-[10px] block font-normal text-muted-foreground">({item.discountPct.toFixed(1)}%)</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">0.00 (0%)</span>
                          )}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-bold ${item.lineExpectedProfit < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          AED {item.lineExpectedProfit.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              isLowMargin
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            }`}
                          >
                            {item.lineMarginPct.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
