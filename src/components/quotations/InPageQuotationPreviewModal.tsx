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
  X,
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [fetchingPdf, setFetchingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const isDraft = !status || status.toUpperCase() === "DRAFT" || status.toUpperCase() === "DRAFT_PDF"
  const pdfUrl = quoteId ? `/api/quotations/${quoteId}/pdf?preview=true` : null
  const downloadUrl = quoteId ? `/api/quotations/${quoteId}/pdf` : null

  React.useEffect(() => {
    let active = true
    let currentObjectUrl: string | null = null

    if (open && quoteId) {
      setFetchingPdf(true)
      setPdfError(null)

      fetch(`/api/quotations/${quoteId}/pdf?preview=true&_k=${reloadKey}`)
        .then(async (res) => {
          if (!active) return
          if (!res.ok) {
            const errText = await res.text().catch(() => "")
            throw new Error(errText || `Server responded with status ${res.status}`)
          }
          const blob = await res.blob()
          if (!active) return
          currentObjectUrl = URL.createObjectURL(blob)
          setBlobUrl(currentObjectUrl)
        })
        .catch((err) => {
          if (!active) return
          console.error("PDF preview fetch error:", err)
          setPdfError(err.message || "Failed to load PDF preview")
        })
        .finally(() => {
          if (active) setFetchingPdf(false)
        })
    } else {
      setBlobUrl(null)
      setPdfError(null)
    }

    return () => {
      active = false
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl)
      }
    }
  }, [open, quoteId, reloadKey])

  if (!open) return null

  const isCompiling = loading || fetchingPdf

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[96vw] sm:max-w-[96vw] w-[96vw] h-[94vh] max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden border-slate-800 shadow-2xl rounded-2xl bg-slate-950">
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

          <div className="flex items-center gap-2">
            {quoteId && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReloadKey((prev) => prev + 1)}
                  disabled={isCompiling}
                  className="h-8 text-xs text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer hidden sm:flex items-center gap-1"
                  title="Reload PDF Preview"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isCompiling ? "animate-spin" : ""}`} /> Refresh
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(pdfUrl || "", "_blank")}
                  className="h-8 text-xs font-semibold border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  title="Open PDF in new browser window"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1 text-slate-400" /> Open in New Tab
                </Button>

                <Button
                  size="sm"
                  variant="default"
                  onClick={() => window.open(downloadUrl || "", "_blank")}
                  className="h-8 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white cursor-pointer shadow-sm"
                  title={isDraft ? "Download Draft Quotation PDF" : "Download Quotation PDF"}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> {isDraft ? "Download PDF (Draft)" : "Download PDF"}
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 flex items-center justify-center border-slate-700 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 hover:border-slate-500 cursor-pointer rounded-lg shadow-sm transition-colors ml-1"
              title="Close Preview (Esc)"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Modal PDF Viewer Body */}
        <div className="flex-1 w-full h-full bg-slate-900 relative flex flex-col items-center justify-center overflow-hidden">
          {isCompiling ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-300">
              <Loader2 className="h-9 w-9 animate-spin text-orange-500" />
              <p className="text-xs font-semibold text-slate-300">Compiling official quotation PDF layout...</p>
              <p className="text-[11px] text-slate-500">Preparing quotation preview, line items, and styling</p>
            </div>
          ) : pdfError ? (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-md bg-slate-950 border border-slate-800 rounded-2xl">
              <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <FileText className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-200">Unable to Render PDF Preview</h3>
                <p className="text-xs text-slate-400 font-mono bg-slate-900 p-2 rounded border border-slate-800 overflow-x-auto text-left max-h-24">
                  {pdfError}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setReloadKey((prev) => prev + 1)}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry Preview
              </Button>
            </div>
          ) : blobUrl ? (
            <object
              data={`${blobUrl}#toolbar=${isDraft ? 0 : 1}&navpanes=0&view=FitH`}
              type="application/pdf"
              className="w-full h-full rounded-b-2xl bg-white"
            >
              <iframe
                src={`${blobUrl}#toolbar=${isDraft ? 0 : 1}&navpanes=0&view=FitH`}
                className="w-full h-full border-none rounded-b-2xl bg-white"
                title="Quotation PDF Preview"
              />
            </object>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <p className="text-xs">No quotation PDF available for preview.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
