"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Package, ChevronDown } from "lucide-react"

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

function parseSpecifications(rawText?: string | null): { key?: string; value: string }[] {
  if (!rawText) return []
  const text = cleanHtmlText(rawText)
    .replace(/^product\s+specifications\s*/i, "")
    .trim()
  if (!text) return []

  const parsedSpecs: { key?: string; value: string }[] = []
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  lines.forEach(line => {
    if (/^product\s+specifications$/i.test(line)) return

    if (line.includes(",") && line.includes(":")) {
      const parts = line.split(",")
      let currentSpec: { key?: string; value: string } | null = null

      parts.forEach(part => {
        const trimmed = part.trim()
        if (trimmed.includes(":")) {
          const colonIndex = trimmed.indexOf(":")
          const key = trimmed.substring(0, colonIndex).trim()
          const value = trimmed.substring(colonIndex + 1).trim()

          if (currentSpec) {
            parsedSpecs.push(currentSpec)
          }
          currentSpec = { key, value }
        } else {
          if (currentSpec) {
            currentSpec.value += ", " + trimmed
          } else {
            parsedSpecs.push({ value: trimmed })
          }
        }
      })
      if (currentSpec) {
        parsedSpecs.push(currentSpec)
      }
    } else if (line.includes(":")) {
      const colonIndex = line.indexOf(":")
      const key = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()
      parsedSpecs.push({ key, value })
    } else {
      parsedSpecs.push({ value: line })
    }
  })

  return parsedSpecs.filter(spec => {
    const val = spec.value.trim().toLowerCase()
    if (!val || val === "-" || val === "not specified" || val === "none") {
      return false
    }
    return true
  })
}

export interface AuditItemMetric {
  id: string
  itemNo: number
  imageUrl?: string | null
  description: string
  specifications?: string | null
  modelCode?: string | null
  productType?: string | null
  upholsteryMaterial?: string | null
  baseType?: string | null
  finishColor?: string | null
  recommendedUsage?: string | null
  quantity: number
  factoryCost: number
  accessoriesCost: number
  totalCostUnit: number
  marginPct: number
  negotiationPct: number
  estimatorPriceUnit: number
  costingDone: boolean
  costingStatusText: string
  discountByIDC: string | number
  finalPriceUnit: number
}

export interface ManagerialAuditSummary {
  grandFactoryCost?: number
  grandAccessoriesCost?: number
  grandTotalCost?: number
  grandEstimatorRevenue?: number
  grandConsultantRevenue?: number
  grandTotalDiscountAmount?: number
  overallDiscountPct?: number
  grandExpectedProfit?: number
  overallGrossMarginPct?: number
  maxItemDiscountPct?: number
  approvalStatus?: string
  preparedByName?: string
  estimatorName?: string
}

interface ManagerialAuditSectionProps {
  summary?: ManagerialAuditSummary
  items: AuditItemMetric[]
  userRole?: string
}

export function ManagerialAuditSection({ items }: ManagerialAuditSectionProps) {
  return (
    <div className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg shadow-md overflow-hidden font-sans my-4">
      {/* 13-Column Reference Audit Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-sans border-slate-300">
          <thead>
            <tr className="bg-black text-white font-bold uppercase text-[11px] tracking-wide border-b border-black">
              <th className="py-3 px-2 text-center border-r border-slate-700 w-12 shrink-0">Sl No</th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-36 shrink-0">Product Image</th>
              <th className="py-3 px-3 text-left border-r border-slate-700 min-w-[320px]">Product Specification's</th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-14 shrink-0">QTY</th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-24">Factory Cost</th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-24">Accessories Cost</th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-24">Total Unit Cost</th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-20">Margin %</th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-24">Negotiation %</th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-28">Final Estimated Price (Unit)</th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-28">Costing Done/ Not</th>
              <th className="py-3 px-2 text-center border-r border-emerald-500 border-2 bg-slate-950 text-emerald-400 font-extrabold min-w-[200px]">Discount added By Interior Design Consultant</th>
              <th className="py-3 px-2 text-center w-28">Final Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 text-slate-800 bg-white">
            {items.map((item) => {
              const parsedSpecs = parseSpecifications(item.specifications)

              return (
                <tr key={item.id} className="border-b border-slate-300 hover:bg-slate-50/80 transition-colors">
                  {/* Sl No */}
                  <td className="py-3 px-2 text-center font-mono font-medium border-r border-slate-300 align-middle">
                    {item.itemNo}
                  </td>

                  {/* Product Image */}
                  <td className="py-3 px-2 text-center border-r border-slate-300 align-middle">
                    <div className="flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.description}
                          className="w-28 h-28 object-cover rounded-md border border-slate-300 shadow-2xs bg-white"
                        />
                      ) : (
                        <div className="w-28 h-28 rounded-md border border-dashed border-slate-300 bg-slate-100 flex flex-col items-center justify-center text-[10px] text-slate-400">
                          <Package className="h-6 w-6 text-slate-300 mb-1" />
                          No Image
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Product Specifications */}
                  <td className="py-3.5 px-3.5 border-r border-slate-300 align-top text-xs leading-relaxed space-y-1 min-w-[320px] max-w-[500px]">
                    <p className="font-bold text-slate-900 text-xs">
                      Model Code: <span className="font-semibold text-slate-800">{item.modelCode || item.description}</span>
                    </p>
                    {item.productType && !parsedSpecs.some(s => s.key?.toLowerCase() === "product type") && (
                      <p className="text-slate-800 text-[11px]">
                        <strong className="font-semibold text-slate-900">Product Type:</strong> {item.productType}
                      </p>
                    )}
                    {item.upholsteryMaterial && !parsedSpecs.some(s => s.key?.toLowerCase() === "upholstery material") && (
                      <p className="text-slate-800 text-[11px]">
                        <strong className="font-semibold text-slate-900">Upholstery Material:</strong> {item.upholsteryMaterial}
                      </p>
                    )}
                    {item.baseType && !parsedSpecs.some(s => s.key?.toLowerCase() === "base type") && (
                      <p className="text-slate-800 text-[11px]">
                        <strong className="font-semibold text-slate-900">Base Type:</strong> {item.baseType}
                      </p>
                    )}
                    {item.finishColor && !parsedSpecs.some(s => s.key?.toLowerCase() === "finish/color" || s.key?.toLowerCase() === "finish & color") && (
                      <p className="text-slate-800 text-[11px]">
                        <strong className="font-semibold text-slate-900">Finish/Color:</strong> {item.finishColor}
                      </p>
                    )}
                    {item.recommendedUsage && !parsedSpecs.some(s => s.key?.toLowerCase() === "recommended usage") && (
                      <p className="text-slate-800 text-[11px]">
                        <strong className="font-semibold text-slate-900">Recommended Usage:</strong> {item.recommendedUsage}
                      </p>
                    )}

                    {/* Render line-by-line specifications with bold labels */}
                    {parsedSpecs.map((spec, sIdx) => {
                      const kLower = spec.key?.toLowerCase() || ""
                      if (kLower === "model code" || kLower === "model") return null

                      return (
                        <p key={sIdx} className="text-slate-800 text-[11px] leading-snug">
                          {spec.key ? (
                            <>
                              <strong className="font-semibold text-slate-900">{spec.key}:</strong> {spec.value}
                            </>
                          ) : (
                            <span>{spec.value}</span>
                          )}
                        </p>
                      )
                    })}
                  </td>

                  {/* QTY */}
                  <td className="py-3 px-2 text-center font-mono font-medium border-r border-slate-300 align-middle">
                    {item.quantity}
                  </td>

                  {/* Factory Cost */}
                  <td className="py-3 px-2 text-center font-mono border-r border-slate-300 align-middle">
                    {item.factoryCost > 0 ? Math.round(item.factoryCost) : "0"}
                  </td>

                  {/* Accessories Cost */}
                  <td className="py-3 px-2 text-center font-mono border-r border-slate-300 align-middle">
                    {item.accessoriesCost > 0 ? Math.round(item.accessoriesCost) : "0"}
                  </td>

                  {/* Total Unit Cost */}
                  <td className="py-3 px-2 text-center font-mono font-semibold border-r border-slate-300 align-middle">
                    {item.totalCostUnit > 0 ? Math.round(item.totalCostUnit) : "0"}
                  </td>

                  {/* Margin % */}
                  <td className="py-3 px-2 text-center font-mono border-r border-slate-300 align-middle">
                    {item.marginPct > 0 ? `${item.marginPct}%` : "0%"}
                  </td>

                  {/* Negotiation % */}
                  <td className="py-3 px-2 text-center font-mono border-r border-slate-300 align-middle">
                    {item.negotiationPct > 0 ? `${item.negotiationPct}%` : "0%"}
                  </td>

                  {/* Final Estimated Price (Unit) */}
                  <td className="py-3 px-2 text-center font-mono font-semibold text-slate-900 border-r border-slate-300 align-middle">
                    {item.estimatorPriceUnit > 0 ? item.estimatorPriceUnit.toFixed(2) : "0"}
                  </td>

                  {/* Costing Done / Not */}
                  <td className="py-3 px-2 text-center font-medium border-r border-slate-300 align-middle min-w-[160px]">
                    <span className={`text-[11px] ${
                      item.costingStatusText.startsWith("Costing Completed") || item.costingDone
                        ? "text-emerald-700 font-bold"
                        : item.costingStatusText.startsWith("Price from Catalog")
                        ? "text-teal-700 font-extrabold"
                        : item.costingStatusText.startsWith("Provided by")
                        ? "text-blue-800 font-semibold"
                        : item.costingStatusText.startsWith("In Costing")
                        ? "text-indigo-700 font-bold"
                        : item.costingStatusText.startsWith("Pending")
                        ? "text-amber-700 font-bold"
                        : "text-slate-700 font-medium"
                    }`}>
                      {item.costingStatusText}
                    </span>
                  </td>

                  {/* Discount added By Interior Design Consultant (Highlighted Cell) */}
                  <td className="py-3 px-2 text-center font-mono font-bold text-emerald-800 border-2 border-emerald-500 bg-emerald-50/30 align-middle">
                    {item.discountByIDC || "0%"}
                  </td>

                  {/* Final Price */}
                  <td className="py-3 px-2 text-center font-mono font-extrabold text-slate-900 align-middle">
                    {item.finalPriceUnit > 0 ? Math.round(item.finalPriceUnit) : "0"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
