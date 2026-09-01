"use client"

import React, { useState } from "react"
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
  FileText,
  RefreshCw,
} from "lucide-react"

interface InPageQuotationPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quoteId: string | null
  quotationNumber?: string
  clientName?: string
  loading?: boolean
  status?: string
}

export function InPageQuotationPreviewModal({
  open,
  onOpenChange,
  quoteId,
  quotationNumber,
  clientName,
  loading = false,
  status = "DRAFT",
}: InPageQuotationPreviewModalProps) {
  const [iframeKey, setIframeKey] = useState(0)

  if (!open) return null

  const isDraft = !status || status.toUpperCase() === "DRAFT" || status.toUpperCase() === "DRAFT_PDF"
  const pdfUrl = quoteId ? `/api/quotations/${quoteId}/pdf?preview=true` : null
  const downloadUrl = quoteId ? `/api/quotations/${quoteId}/pdf` : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] sm:max-w-[96vw] w-[96vw] h-[94vh] max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden border-slate-800 shadow-2xl rounded-2xl bg-slate-950">
        {/* Modal Header */}
        <DialogHeader className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950 flex flex-row items-center justify-between gap-4 shrink-0 text-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
                <span>Quotation PDF Preview</span>
                {quotationNumber && (
                  <Badge variant="outline" className="font-mono text-xs font-semibold bg-slate-800 border-slate-700 text-slate-200">
                    {quotationNumber}
                  </Badge>
                )}
                {isDraft ? (
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border-amber-500/40">
                    DRAFT PDF
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                    FINAL PDF
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact Customer PDF Output {clientName ? `• ${clientName}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-10 sm:pr-12">
            {quoteId && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIframeKey((prev) => prev + 1)}
                  className="h-8 text-xs text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer hidden sm:flex items-center gap-1"
                  title="Reload PDF Preview"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>

                {isDraft ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="h-8 text-xs font-semibold border-slate-800 bg-slate-900 text-slate-500 opacity-40 cursor-not-allowed"
                    title="Opening PDF in new tab is disabled for Draft quotations"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1 text-slate-600" /> Open in New Tab
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(pdfUrl || "", "_blank")}
                    className="h-8 text-xs font-semibold border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                    title="Open PDF in new browser window"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1 text-slate-400" /> Open in New Tab
                  </Button>
                )}

                {isDraft ? (
                  <Button
                    size="sm"
                    variant="default"
                    disabled
                    className="h-8 text-xs font-bold bg-slate-800 text-slate-500 border border-slate-700 opacity-40 cursor-not-allowed shadow-none"
                    title="Download PDF is disabled for Draft quotations"
                  >
                    <Download className="h-3.5 w-3.5 mr-1 text-slate-600" /> Download PDF (Draft)
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => window.open(downloadUrl || "", "_blank")}
                    className="h-8 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white cursor-pointer shadow-sm"
                    title="Download Quotation PDF"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogHeader>

        {/* Modal PDF Viewer Body */}
        <div className="flex-1 w-full h-full bg-slate-900 relative flex flex-col items-center justify-center overflow-hidden">
          {loading || !quoteId ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-300">
              <Loader2 className="h-9 w-9 animate-spin text-orange-500" />
              <p className="text-xs font-semibold text-slate-300">Compiling official quotation PDF layout...</p>
              <p className="text-[11px] text-slate-500">Preparing quotation preview, line items, and styling</p>
            </div>
          ) : (
            <iframe
              key={iframeKey}
              src={`${pdfUrl}#toolbar=${isDraft ? 0 : 1}&navpanes=0&view=FitH`}
              className="w-full h-full border-none rounded-b-2xl bg-white"
              title="Quotation PDF Preview"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
