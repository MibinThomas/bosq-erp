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
              <th className="py-3 px-2 text-center border-r border-slate-700 w-12 shrink-0">
                <div className="flex items-center justify-center gap-1">
                  <span>Sl No</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-36 shrink-0">
                <div className="flex items-center justify-center gap-1">
                  <span>Product Image</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-left border-r border-slate-700 min-w-[220px]">
                <div className="flex items-center justify-between gap-1">
                  <span>Product Specification's</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-14 shrink-0">
                <div className="flex items-center justify-center gap-1">
                  <span>QTY</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-24">
                <div className="flex items-center justify-center gap-1">
                  <span>Factory Cost</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-24">
                <div className="flex items-center justify-center gap-1">
                  <span>Accessories Cost</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-24">
                <div className="flex items-center justify-center gap-1">
                  <span>Total Unit Cost</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-20">
                <div className="flex items-center justify-center gap-1">
                  <span>Margin %</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-24">
                <div className="flex items-center justify-center gap-1">
                  <span>Negotiation %</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-28">
                <div className="flex items-center justify-center gap-1">
                  <span>Final Estimated Price (Unit)</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-center border-r border-slate-700 w-28">
                <div className="flex items-center justify-center gap-1">
                  <span>Costing Done/ Not</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-center border-r border-emerald-500 border-2 bg-slate-950 min-w-[200px]">
                <div className="flex items-center justify-center gap-1 text-emerald-400 font-extrabold">
                  <span>Discount added By Interior Design Consultant</span>
                  <ChevronDown className="h-3 w-3 text-emerald-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-center w-28">
                <div className="flex items-center justify-center gap-1">
                  <span>Final Price</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 text-slate-800 bg-white">
            {items.map((item) => {
              const cleanSpecs = cleanHtmlText(item.specifications)

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
                  <td className="py-3 px-2 border-r border-slate-300 align-top text-[11px] leading-snug space-y-1">
                    <p className="font-semibold text-slate-900">
                      Model Code: <span className="font-normal">{item.modelCode || item.description}</span>
                    </p>
                    {item.productType && (
                      <p className="text-slate-800">
                        Product Type: <span className="font-normal">{item.productType}</span>
                      </p>
                    )}
                    {item.upholsteryMaterial && (
                      <p className="text-slate-800">
                        Upholstery Material: <span className="font-normal">{item.upholsteryMaterial}</span>
                      </p>
                    )}
                    {item.baseType && (
                      <p className="text-slate-800">
                        Base Type: <span className="font-normal">{item.baseType}</span>
                      </p>
                    )}
                    {item.finishColor && (
                      <p className="text-slate-800">
                        Finish/Color: <span className="font-normal">{item.finishColor}</span>
                      </p>
                    )}
                    {item.recommendedUsage && (
                      <p className="text-slate-800">
                        Recommended Usage: <span className="font-normal">{item.recommendedUsage}</span>
                      </p>
                    )}
                    {cleanSpecs && (
                      <p className="text-[10px] text-slate-600 italic pt-0.5 line-clamp-2">
                        {cleanSpecs}
                      </p>
                    )}
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
                  <td className="py-3 px-2 text-center font-medium border-r border-slate-300 align-middle">
                    <span className={`text-[11px] ${item.costingDone ? "text-slate-900 font-semibold" : "text-slate-500"}`}>
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
