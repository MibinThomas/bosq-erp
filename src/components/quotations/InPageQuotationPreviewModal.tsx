"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  ExternalLink,
  Loader2,
  MessageSquare,
  FileText,
  Building2,
  Calendar,
  Calculator,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface InPageQuotationPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotationData: any
  loading?: boolean
  formData?: any
  calculatedGrandTotal?: number
}

export function InPageQuotationPreviewModal({
  open,
  onOpenChange,
  quotationData,
  loading = false,
  formData,
  calculatedGrandTotal = 0,
}: InPageQuotationPreviewModalProps) {
  const quote = quotationData || formData
  if (!open) return null

  const items = quote?.items || []
  const subtotal = quote?.subtotal || 0
  const vatAmount = quote?.vatAmount || 0
  const grandTotal = quote?.grandTotal || calculatedGrandTotal || 0
  const additionalCharges = Array.isArray(quote?.additionalCharges) ? quote.additionalCharges : []

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const isHighlight = !!quote?.commonRemarkHighlight
  const style = isHighlight ? (quote?.commonRemarkStyle || "AMBER") : "NONE"

  const getStyleClasses = (s: string) => {
    switch (s) {
      case "AMBER":
        return {
          box: "bg-amber-500/10 border-amber-500/50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500/30",
          icon: "text-amber-600 dark:text-amber-400",
        }
      case "BLUE":
        return {
          box: "bg-blue-500/10 border-blue-500/50 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500/30",
          icon: "text-blue-600 dark:text-blue-400",
        }
      case "EMERALD":
        return {
          box: "bg-emerald-500/10 border-emerald-500/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/30",
          icon: "text-emerald-600 dark:text-emerald-400",
        }
      case "ROSE":
        return {
          box: "bg-rose-500/10 border-rose-500/50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 ring-1 ring-rose-500/30",
          icon: "text-rose-600 dark:text-rose-400",
        }
      default:
        return {
          box: "bg-card border-border/80 text-foreground",
          icon: "text-primary",
        }
    }
  }

  const remarkStyleCls = getStyleClasses(style)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden border-border shadow-2xl rounded-2xl">
        {/* Modal Header */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/40 flex flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Quotation Preview</span>
                {quote?.quotationNumber && (
                  <Badge variant="outline" className="font-mono text-xs font-semibold bg-background">
                    {quote.quotationNumber}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                  {quote?.status || "DRAFT"}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                In-Page Draft Preview • {quote?.client?.companyName || "Client"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {quote?.id && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/quotations/${quote.id}/preview`, "_blank")}
                  className="h-8 text-xs font-medium cursor-pointer"
                  title="Open Full Screen Preview"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open in New Tab
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => window.open(`/api/quotations/${quote.id}/pdf`, "_blank")}
                  className="h-8 text-xs font-semibold bg-primary text-primary-foreground cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-950/40">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Compiling in-page quotation preview...</p>
            </div>
          ) : (
            <>
              {/* Top Details Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card border rounded-2xl p-5 shadow-2xs">
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-primary" /> Client Details
                  </span>
                  <h3 className="font-bold text-sm text-foreground">{quote?.client?.companyName || "Client Company"}</h3>
                  {quote?.client?.contactPerson && (
                    <p className="text-xs text-muted-foreground font-medium">Contact: {quote.client.contactPerson}</p>
                  )}
                </div>

                <div className="space-y-1.5 md:text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1 md:justify-end">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Quotation Info
                  </span>
                  <p className="text-xs text-foreground font-semibold">
                    Date: {quote?.date ? new Date(quote.date).toLocaleDateString() : new Date().toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Valid Until: {quote?.validityDate ? new Date(quote.validityDate).toLocaleDateString() : "-"}
                  </p>
                </div>
              </div>

              {/* Product Line Items Table */}
              <div className="bg-card border rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" /> Products &amp; Quoted Line Items
                  </h3>
                  <Badge variant="outline" className="text-xs font-mono font-bold">
                    {items.length} Item(s)
                  </Badge>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b bg-muted/60 text-muted-foreground font-bold uppercase text-[10px]">
                        <th className="p-3 w-10">#</th>
                        <th className="p-3 min-w-[200px]">Product &amp; Specifications</th>
                        <th className="p-3 text-center w-16">Qty</th>
                        <th className="p-3 text-right min-w-[100px]">Quoted Rate</th>
                        <th className="p-3 text-right min-w-[110px]">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-b">
                      {items.map((item: any, idx: number) => {
                        const qty = item.quantity || 1
                        const rate = item.unitPrice || 0
                        const disc = item.discount || 0
                        const discType = item.discountType || "PERCENTAGE"
                        const discPerUnit = discType === "PERCENTAGE" ? rate * (disc / 100) : disc
                        const netRate = Math.max(0, rate - discPerUnit)
                        const lineTotal = qty * netRate

                        return (
                          <tr key={item.id || idx} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-mono text-muted-foreground align-top font-bold text-xs">{idx + 1}</td>
                            <td className="p-3 align-top space-y-1">
                              <div className="font-bold text-foreground text-xs">{item.description || "Product Item"}</div>
                              {item.specifications && (
                                <div className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                  {item.specifications}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold align-top text-xs text-foreground">{qty}</td>
                            <td className="p-3 text-right font-mono font-semibold align-top text-xs text-foreground">
                              AED {formatCurrency(netRate)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold align-top text-xs text-primary">
                              AED {formatCurrency(lineTotal)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REMARKS Section */}
              {quote?.commonRemark && quote.commonRemark.trim() && (
                <div className={cn(
                  "p-5 rounded-2xl border transition-all shadow-2xs space-y-3",
                  remarkStyleCls.box
                )}>
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                    <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className={cn("h-4 w-4", remarkStyleCls.icon)} />
                      REMARKS
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                    {quote.commonRemark}
                  </p>
                </div>
              )}

              {/* Financial Calculation Breakdown Summary */}
              <div className="bg-card border rounded-2xl p-5 shadow-2xs space-y-3 max-w-md ml-auto">
                <h4 className="text-xs font-bold text-foreground uppercase border-b pb-2">Financial Calculation Summary</h4>
                <div className="space-y-2 text-xs font-medium">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Products Subtotal</span>
                    <span className="font-mono font-semibold text-foreground">AED {formatCurrency(subtotal)}</span>
                  </div>

                  {additionalCharges.map((c: any, idx: number) => {
                    const amt = Number(c?.amount || 0)
                    if (amt <= 0) return null
                    return (
                      <div key={idx} className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                        <span className="text-muted-foreground">{c.name || "Additional Charge"}</span>
                        <span className="font-mono font-semibold">+ AED {formatCurrency(amt)}</span>
                      </div>
                    )
                  })}

                  {vatAmount > 0 && (
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>VAT (5%)</span>
                      <span className="font-mono font-semibold text-foreground">AED {formatCurrency(vatAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t font-bold text-sm">
                    <span className="text-foreground uppercase">Grand Total</span>
                    <span className="font-mono text-base text-primary">AED {formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
