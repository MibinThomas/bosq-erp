"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "lucide-react"

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
}

interface ManagerialAuditSectionProps {
  summary: ManagerialAuditSummary
  items: AuditItemMetric[]
  userRole?: string
}

export function ManagerialAuditSection({ summary, items }: ManagerialAuditSectionProps) {
  // Determine Overall Financial Health
  const getHealthBadge = () => {
    const margin = summary.overallGrossMarginPct
    const discount = summary.overallDiscountPct

    if (margin < 10 || discount > 20 || summary.grandExpectedProfit < 0) {
      return {
        label: "Loss-Making / High Risk",
        color: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
        icon: XCircle,
        dot: "bg-rose-500"
      }
    }
    if (margin < 25 || discount > 10) {
      return {
        label: "Low Margin / Medium Discount",
        color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
        icon: AlertCircle,
        dot: "bg-amber-500"
      }
    }
    return {
      label: "Healthy Margin & Pricing",
      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      icon: CheckCircle2,
      dot: "bg-emerald-500"
    }
  }

  const health = getHealthBadge()
  const HealthIcon = health.icon

  return (
    <Card className="border-2 border-slate-800 bg-slate-950 text-slate-100 shadow-2xl rounded-2xl overflow-hidden my-6">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>MANAGERIAL COSTING &amp; CONSULTANT DISCOUNT AUDIT</span>
            </CardTitle>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Full visibility into Estimator baseline rates, Consultant discounts, and profit margins.
            </p>
          </div>
        </div>

        <Badge variant="outline" className={`px-3 py-1 text-xs font-bold border flex items-center gap-1.5 ${health.color}`}>
          <span className={`h-2 w-2 rounded-full ${health.dot} animate-pulse`} />
          <HealthIcon className="h-3.5 w-3.5" />
          <span>{health.label}</span>
        </Badge>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Top 5 Key Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Cost */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Calculator className="h-3 w-3 text-blue-400" /> Total Cost
            </span>
            <div className="text-sm sm:text-base font-extrabold font-mono text-slate-100">
              AED {summary.grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Factory + Accessories</p>
          </div>

          {/* Estimator Baseline Price */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Tag className="h-3 w-3 text-cyan-400" /> Estimator Baseline
            </span>
            <div className="text-sm sm:text-base font-extrabold font-mono text-cyan-300">
              AED {summary.grandEstimatorRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Cost + Margin + Buffer</p>
          </div>

          {/* Proposed Client Revenue */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-emerald-400" /> Client Revenue
            </span>
            <div className="text-sm sm:text-base font-extrabold font-mono text-emerald-400">
              AED {summary.grandConsultantRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Consultant Final Price</p>
          </div>

          {/* Consultant Discount Given */}
          <div className={`p-3.5 rounded-xl bg-slate-900/80 border space-y-1 ${summary.grandTotalDiscountAmount > 0 ? "border-amber-500/40" : "border-slate-800"}`}>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-amber-400" /> Discount Given
            </span>
            <div className="text-sm sm:text-base font-extrabold font-mono text-amber-400">
              AED {summary.grandTotalDiscountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs ml-1 font-bold">({summary.overallDiscountPct.toFixed(1)}%)</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Max Item Discount: {summary.maxItemDiscountPct.toFixed(1)}%
            </p>
          </div>

          {/* Gross Profit & Margin % */}
          <div className={`p-3.5 rounded-xl bg-slate-900/80 border space-y-1 col-span-2 lg:col-span-1 ${summary.grandExpectedProfit < 0 ? "border-rose-500/50 bg-rose-950/20" : "border-emerald-500/40"}`}>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <PieChart className="h-3 w-3 text-emerald-400" /> Expected Profit
            </span>
            <div className={`text-sm sm:text-base font-extrabold font-mono ${summary.grandExpectedProfit < 0 ? "text-rose-400" : "text-emerald-400"}`}>
              AED {summary.grandExpectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs ml-1 font-bold">({summary.overallGrossMarginPct.toFixed(1)}%)</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Gross Margin Target</p>
          </div>
        </div>

        {/* Detailed Item Breakdown Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span>Product-Level Pricing &amp; Discount Breakdown ({items.length} items)</span>
          </h4>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900 text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-3 min-w-[180px]">Product &amp; Specifications</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-3 text-right">Factory Cost</th>
                  <th className="py-3 px-3 text-right">Accessories Cost</th>
                  <th className="py-3 px-3 text-right">Total Cost (Unit)</th>
                  <th className="py-3 px-3 text-right text-cyan-300">Estimator Price (Unit)</th>
                  <th className="py-3 px-3 text-right text-emerald-400">Consultant Price (Unit)</th>
                  <th className="py-3 px-3 text-right text-amber-400">Discount Given</th>
                  <th className="py-3 px-3 text-right text-emerald-400">Line Profit</th>
                  <th className="py-3 px-3 text-center">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {items.map((item) => {
                  const isDiscounted = item.discountAmountUnit > 0
                  const isLowMargin = item.lineMarginPct < 15
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">{item.itemNo}</td>
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-100">{item.description}</div>
                        {item.specifications && (
                          <p className="text-[10px] text-slate-400 line-clamp-1 italic mt-0.5">{item.specifications}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">{item.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {item.factoryCost > 0 ? `AED ${item.factoryCost.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {item.accessoriesCost > 0 ? `AED ${item.accessoriesCost.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                        AED {item.totalCostUnit.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">
                        AED {item.estimatorPriceUnit.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-400">
                        AED {item.consultantPriceUnit.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {isDiscounted ? (
                          <div className="text-amber-400">
                            -AED {item.discountAmountUnit.toFixed(2)}
                            <span className="text-[10px] block font-normal">({item.discountPct.toFixed(1)}%)</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">0.00 (0%)</span>
                        )}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${item.lineExpectedProfit < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        AED {item.lineExpectedProfit.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            isLowMargin
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
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
      </CardContent>
    </Card>
  )
}
