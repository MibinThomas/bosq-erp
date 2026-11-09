"use client"

import React, { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Clock, FileCheck, History, Loader2, ShieldAlert, XCircle } from "lucide-react"

type ApprovalRequestRow = {
  id: string
  levelName: string
  status: string
  reason: string | null
  metrics: { discountPct?: number; amount?: number } | null
  decidedByName: string | null
  decidedAt: string | null
  comment: string | null
  createdAt: string
}

type ApprovalView = {
  moduleEnabled: boolean
  approvalStatus: string
  rejectionReason: string | null
  request: ApprovalRequestRow | null
  canDecide: boolean
  history: ApprovalRequestRow[]
}

interface ApprovalMatrixBannerProps {
  quotationId: string
  /** Changes to this value reload the panel (e.g. the quotation's updatedAt). */
  refreshKey?: string | number
  onApprovalUpdate?: () => void
}

/**
 * Approval panel for a quotation (Approval Module). Renders nothing while the module is off
 * or when the quotation needs no approval.
 */
export function ApprovalMatrixBanner({ quotationId, refreshKey, onApprovalUpdate }: ApprovalMatrixBannerProps) {
  const [view, setView] = useState<ApprovalView | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<null | "APPROVE" | "REJECT">(null)
  const [comment, setComment] = useState("")
  const [showHistory, setShowHistory] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotations/${quotationId}/approval`, { cache: "no-store" })
      if (!res.ok) { setView(null); return }
      setView(await res.json())
    } catch {
      setView(null)
    }
  }, [quotationId])

  useEffect(() => { void load() }, [load, refreshKey])

  const decide = async (action: "APPROVE" | "REJECT") => {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotations/${quotationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Failed to update the approval.")
      toast.success(action === "APPROVE" ? "Quotation approved." : "Quotation rejected.")
      setMode(null)
      setComment("")
      await load()
      onApprovalUpdate?.()
    } catch (e: any) {
      toast.error(e.message || "Failed to update the approval.")
    } finally {
      setLoading(false)
    }
  }

  if (!view || !view.moduleEnabled) return null
  const status = view.approvalStatus
  if (status === "AUTO_APPROVED" && view.history.length === 0) return null

  const req = view.request
  const metricsText = req?.metrics
    ? [
        typeof req.metrics.discountPct === "number" ? `discount ${req.metrics.discountPct.toFixed(1)}%` : null,
        typeof req.metrics.amount === "number" ? `value AED ${Math.round(req.metrics.amount).toLocaleString()}` : null,
      ].filter(Boolean).join(" · ")
    : ""
  const latestApproved = view.history.find((h) => h.status === "APPROVED")

  const banner = status === "APPROVED"
    ? {
        tone: "bg-emerald-950/80 border-emerald-500/50 text-emerald-100",
        Icon: CheckCircle2,
        title: "APPROVED",
        desc: latestApproved
          ? `Approved by ${latestApproved.decidedByName || "an approver"} (${latestApproved.levelName})${latestApproved.decidedAt ? ` on ${new Date(latestApproved.decidedAt).toLocaleString()}` : ""}. Cleared to send to the client.`
          : "Cleared to send to the client.",
      }
    : status === "REJECTED"
      ? {
          tone: "bg-rose-950/80 border-rose-500/50 text-rose-100",
          Icon: XCircle,
          title: "APPROVAL REJECTED",
          desc: `${view.rejectionReason || req?.comment || "Rejected."} Revise the quotation and submit it again.`,
        }
      : status === "AUTO_APPROVED"
        ? {
            tone: "bg-emerald-950/80 border-emerald-500/50 text-emerald-100",
            Icon: CheckCircle2,
            title: "NO APPROVAL NEEDED",
            desc: "No approval rule applies to this quotation now.",
          }
        : {
            tone: "bg-amber-950/90 border-amber-500/60 text-amber-100",
            Icon: req ? ShieldAlert : Clock,
            title: req ? `AWAITING ${req.levelName.toUpperCase()} APPROVAL` : "WILL NEED APPROVAL WHEN SUBMITTED",
            desc: req
              ? `${req.reason ? `Rule: ${req.reason}. ` : ""}${metricsText ? `${metricsText}. ` : ""}It can't be sent to the client until approved.`
              : "Approvers are asked once the quotation is submitted.",
          }

  const { Icon } = banner

  return (
    <>
      <div className={`p-4 rounded-2xl border ${banner.tone} shadow-lg my-4 font-sans space-y-3`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-black/30 border border-white/10 shrink-0"><Icon className="h-5 w-5" /></div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm tracking-tight text-white">{banner.title}</span>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-white/30 text-white/80">
                  {status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">{banner.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {view.history.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setShowHistory((s) => !s)} className="h-8 text-xs text-white/80 hover:text-white hover:bg-white/10">
                <History className="h-3.5 w-3.5 mr-1" /> History
              </Button>
            )}
            {view.canDecide && req && (
              <>
                {req.status === "PENDING" && (
                  <Button size="sm" variant="outline" onClick={() => setMode("REJECT")} disabled={loading}
                    className="h-8 text-xs font-bold border-rose-500/50 text-rose-300 bg-rose-950/40 hover:bg-rose-900/60">
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                )}
                <Button size="sm" onClick={() => setMode("APPROVE")} disabled={loading}
                  className="h-8 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md">
                  <FileCheck className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
              </>
            )}
          </div>
        </div>

        {showHistory && (
          <ul className="border-t border-white/10 pt-3 space-y-1.5 text-xs text-slate-300">
            {view.history.map((h) => (
              <li key={h.id}>
                <span className="font-semibold text-white">{h.status}</span> · {h.levelName} · {new Date(h.decidedAt || h.createdAt).toLocaleString()}
                {h.decidedByName ? ` · ${h.decidedByName}` : ""}
                {h.comment ? ` — ${h.comment}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={mode !== null} onOpenChange={(o) => { if (!o) setMode(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={`text-base font-bold flex items-center gap-2 ${mode === "REJECT" ? "text-rose-500" : "text-emerald-600"}`}>
              {mode === "REJECT" ? <ShieldAlert className="h-5 w-5" /> : <FileCheck className="h-5 w-5" />}
              {mode === "REJECT" ? "Reject quotation" : "Approve quotation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground">
              {mode === "REJECT"
                ? "Tell the consultant why, so they can revise it (required)."
                : "Add a comment for the record (optional)."}
            </p>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} className="text-xs min-h-[90px]"
              placeholder={mode === "REJECT" ? "E.g. Maximum discount for this segment is 8%." : "Optional"} />
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
            <Button size="sm" variant={mode === "REJECT" ? "destructive" : "default"}
              disabled={loading || (mode === "REJECT" && !comment.trim())}
              onClick={() => mode && decide(mode)}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {mode === "REJECT" ? "Confirm rejection" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
