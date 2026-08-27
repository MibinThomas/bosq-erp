"use client"

import React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, FileText, Plus, ArrowRight, Sparkles } from "lucide-react"

interface QuotationSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  quotation: {
    id: string
    quotationNumber: string
    clientName?: string
    projectName?: string
    grandTotal?: number
    isRevision?: boolean
    isEdit?: boolean
    pdfUrl?: string
  } | null
  onResetForm?: () => void
}

export function QuotationSuccessModal({
  isOpen,
  onClose,
  quotation,
  onResetForm,
}: QuotationSuccessModalProps) {
  const router = useRouter()

  if (!quotation) return null

  const titleText = quotation.isRevision
    ? "Quotation Revision Created!"
    : quotation.isEdit
      ? "Quotation Updated Successfully!"
      : "Quotation Created Successfully!"

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0)
  }

  const handleModalClose = () => {
    onClose()
    router.push("/quotations")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleModalClose()
    }}>
      <DialogContent className="max-w-md p-6 rounded-2xl sm:rounded-3xl border shadow-2xl bg-background">
        <DialogHeader className="flex flex-col items-center text-center space-y-3 pt-2">
          {/* Animated celebration icon */}
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-1">
            <DialogTitle className="text-xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
              <span>{titleText}</span>
              <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Quotation <span className="font-mono font-bold text-foreground">{quotation.quotationNumber}</span> has been created successfully.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Highlighted Quote Details Card */}
        <div className="my-4 bg-muted/40 dark:bg-muted/20 border border-border/70 p-4 rounded-xl space-y-2.5">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
            <span className="text-muted-foreground uppercase font-bold text-[10px] tracking-wider">Quotation No.</span>
            <span className="font-mono font-bold text-primary text-sm px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              {quotation.quotationNumber}
            </span>
          </div>

          {quotation.clientName && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-semibold text-foreground truncate max-w-[200px]">{quotation.clientName}</span>
            </div>
          )}

          {quotation.projectName && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Project:</span>
              <span className="font-semibold text-foreground truncate max-w-[200px]">{quotation.projectName}</span>
            </div>
          )}

          {quotation.grandTotal !== undefined && (
            <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-border/50">
              <span className="text-muted-foreground font-medium">Grand Total:</span>
              <span className="font-mono font-extrabold text-foreground text-sm">
                AED {formatCurrency(quotation.grandTotal)}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={handleModalClose}
            className="w-full text-xs h-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <ArrowRight className="h-4 w-4" />
            <span>Back to Quotations List</span>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const pdfPath = quotation.pdfUrl || `/api/quotations/${quotation.id}/pdf`
                window.open(pdfPath, "_blank")
              }}
              className="text-xs h-9 font-medium flex items-center justify-center gap-1.5 border-border hover:bg-muted cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-orange-600" />
              <span>View PDF</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                if (onResetForm) {
                  onResetForm()
                } else {
                  router.push("/quotations/new")
                }
              }}
              className="text-xs h-9 font-medium flex items-center justify-center gap-1.5 border-border hover:bg-muted cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-600" />
              <span>New Quotation</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
