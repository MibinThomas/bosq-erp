"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Loader2, AlertCircle, ArrowRight } from "lucide-react"

export const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED", "UNDER_REVIEW", "SENT_TO_CLIENT", "CLIENT_APPROVED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "SENT_TO_CLIENT", "CANCELLED"],
  UNDER_REVIEW: ["SENT_TO_CLIENT", "REVISED", "CANCELLED"],
  REVISED: ["SENT_TO_CLIENT", "CANCELLED"],
  SENT_TO_CLIENT: ["CLIENT_REVIEWING", "CLIENT_APPROVED", "CLIENT_REJECTED", "CANCELLED"],
  CLIENT_REVIEWING: ["CLIENT_APPROVED", "CLIENT_REJECTED", "CANCELLED"],
  CLIENT_APPROVED: ["CLIENT_CONFIRMED", "CANCELLED"],
  CLIENT_CONFIRMED: ["PO_RECEIVED", "UNDER_PRODUCTION", "CANCELLED"],
  CLIENT_REJECTED: ["LOST", "REVISED", "CANCELLED"],
  UNDER_PRODUCTION: ["READY_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["PO_RECEIVED", "COMPLETED", "CANCELLED"],
  PO_RECEIVED: ["UNDER_PRODUCTION", "READY_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED"],
  COMPLETED: ["CANCELLED"],
  CANCELLED: ["DRAFT", "SUBMITTED"],
  LOST: ["DRAFT", "SUBMITTED"]
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  REVISED: "Revised",
  SENT_TO_CLIENT: "Sent to Client",
  CLIENT_REVIEWING: "Client Reviewing",
  CLIENT_APPROVED: "Client Approved",
  CLIENT_CONFIRMED: "Client Confirmed",
  CLIENT_REJECTED: "Client Rejected",
  UNDER_PRODUCTION: "Under Production",
  READY_FOR_DELIVERY: "Ready for Delivery",
  DELIVERED: "Delivered",
  PO_RECEIVED: "PO Received",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  LOST: "Lost"
}

export const STATUS_BADGES: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700",
  SUBMITTED: "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
  UNDER_REVIEW: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30",
  REVISED: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
  SENT_TO_CLIENT: "bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400 border-teal-100 dark:border-teal-900/30",
  CLIENT_REVIEWING: "bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400 border-sky-100 dark:border-sky-900/30",
  CLIENT_APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
  CLIENT_CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400 border-green-200 dark:border-green-900/30",
  CLIENT_REJECTED: "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-100 dark:border-rose-900/30",
  UNDER_PRODUCTION: "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
  READY_FOR_DELIVERY: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/30",
  DELIVERED: "bg-lime-50 text-lime-700 dark:bg-lime-950/20 dark:text-lime-400 border-lime-100 dark:border-lime-900/30",
  PO_RECEIVED: "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border-purple-100 dark:border-purple-900/30",
  COMPLETED: "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:border-emerald-800",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-100 dark:border-red-900/30",
  LOST: "bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900/30"
}

interface QuotationStatusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation: {
    id: string
    quotationNumber: string
    status: string
  } | null
  onSuccess?: () => void
}

export function QuotationStatusModal({
  open,
  onOpenChange,
  quotation,
  onSuccess
}: QuotationStatusModalProps) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isSuperAdminOrAdmin = ["SUPER_ADMIN", "ADMIN"].includes(userRole)
  const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(userRole)

  const [newStatus, setNewStatus] = useState<string>("")
  const [remarks, setRemarks] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  if (!quotation) return null

  const currentStatus = quotation.status
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [
    "DRAFT", "SUBMITTED", "UNDER_REVIEW", "SENT_TO_CLIENT", "CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_RECEIVED", "CANCELLED"
  ]

  // Filter restricted statuses for consultants/executives
  const restrictedStatuses = [
    "CLIENT_CONFIRMED",
    "PO_RECEIVED",
    "UNDER_PRODUCTION",
    "READY_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED"
  ]

  const filteredNextStatuses = isSuperAdminOrAdmin
    ? Object.keys(STATUS_LABELS).filter(status => status !== currentStatus)
    : allowedTransitions.filter(status => {
        if (!isManagerOrAdmin && restrictedStatuses.includes(status)) {
          return false
        }
        return true
      })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStatus) {
      toast.error("Please select a new status!")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/quotations/${quotation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_STATUS",
          newStatus,
          remarks: remarks.trim() || undefined
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to update quotation status")
      }

      toast.success(`Quotation status updated to ${STATUS_LABELS[newStatus] || newStatus}!`)
      setNewStatus("")
      setRemarks("")
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(err.message || "An error occurred while changing status.")
    } finally {
      setLoading(false)
    }
  }

  const currentBadgeClass = STATUS_BADGES[currentStatus] || "bg-zinc-100 text-zinc-800"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] w-full font-sans rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-bold text-foreground">Change Quotation Status</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update the lifecycle state for #{quotation.quotationNumber}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Current Status Preview */}
          <div className="flex items-center justify-between p-3.5 border rounded-2xl bg-muted/20 border-zinc-200/60 dark:border-zinc-850">
            <span className="text-xs font-semibold text-muted-foreground">Current Status</span>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${currentBadgeClass}`}>
              {STATUS_LABELS[currentStatus] || currentStatus}
            </span>
          </div>

          {filteredNextStatuses.length === 0 ? (
            <div className="flex items-start gap-2.5 p-3.5 border rounded-2xl border-amber-250 bg-amber-500/10 text-amber-600">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold">No transitions available</span>
                <p className="leading-normal">
                  You are not authorized to transition this quotation from its current status of "{STATUS_LABELS[currentStatus]}". Downstream operations require Manager or Admin authorization.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Target Status Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Select Next Status *</label>
                <Select value={newStatus} onValueChange={(val) => setNewStatus(val || "")}>
                  <SelectTrigger className="w-full h-10 rounded-xl bg-background border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Choose new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredNextStatuses.map((status) => (
                      <SelectItem key={status} value={status} className="cursor-pointer text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{STATUS_LABELS[status] || status}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border scale-95 ${STATUS_BADGES[status]}`}>
                            Preview
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Remarks Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex justify-between">
                  <span>Remarks / Change Notes</span>
                  <span className="text-[10px] font-normal text-muted-foreground/80">(Optional)</span>
                </label>
                <Textarea
                  placeholder="Explain why the status is changing (e.g. client signed PO, production started...)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="resize-none rounded-xl text-xs bg-muted/10 border-zinc-200 dark:border-zinc-850 focus-visible:bg-background"
                />
              </div>

              {/* Transition Warning Dialog description */}
              {newStatus && (
                <div className={`p-3 border rounded-2xl text-[11px] leading-normal flex items-start gap-2 ${
                  isSuperAdminOrAdmin && !allowedTransitions.includes(newStatus)
                    ? "border-amber-250 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-blue-100 dark:border-blue-900/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}>
                  <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${
                    isSuperAdminOrAdmin && !allowedTransitions.includes(newStatus) ? "text-amber-500" : "text-blue-500"
                  }`} />
                  <span>
                    {isSuperAdminOrAdmin && !allowedTransitions.includes(newStatus) ? (
                      <>
                        <strong>Admin Flow Override:</strong> You are forcing an out-of-flow transition from <strong>{STATUS_LABELS[currentStatus]}</strong> directly to <strong>{STATUS_LABELS[newStatus]}</strong>. This action will bypass the standard matrix and update dashboards in real-time.
                      </>
                    ) : (
                      <>
                        Confirming this action will move quotation #{quotation.quotationNumber} into status <strong>{STATUS_LABELS[newStatus]}</strong>. This will update the sales pipeline and team dashboards in real-time.
                      </>
                    )}
                  </span>
                </div>
              )}
            </>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs px-4"
            >
              Cancel
            </Button>
            {filteredNextStatuses.length > 0 && (
              <Button
                type="submit"
                disabled={loading || !newStatus}
                className="bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl px-5 text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-primary/10 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Confirm Transition"
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
