"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  XCircle,
  ShieldAlert,
  Loader2,
  FileCheck,
} from "lucide-react"

interface ApprovalMatrixBannerProps {
  quotationId: string
  approvalStatus: string
  overallDiscountPct: number
  maxDiscountPct: number
  overallGrossMarginPct: number
  userRole?: string
  onApprovalUpdate?: () => void
}

export function ApprovalMatrixBanner({
  quotationId,
  approvalStatus,
  overallDiscountPct,
  maxDiscountPct,
  overallGrossMarginPct,
  userRole = "",
  onApprovalUpdate,
}: ApprovalMatrixBannerProps) {
  const [loading, setLoading] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const isManagerOrAdmin = [
    "SUPER_ADMIN",
    "ADMIN",
    "SALES_MANAGER",
    "MANAGER",
  ].includes(userRole)
  const isSuperAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN"

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotations/${quotationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "REJECT" ? rejectionReason : undefined,
        }),
      })

      if (res.ok) {
        setRejectModalOpen(false)
        setRejectionReason("")
        if (onApprovalUpdate) onApprovalUpdate()
      } else {
        const err = await res.json()
        alert(err.message || "Failed to update quotation approval status.")
      }
    } catch (e) {
      console.error("Approval error", e)
      alert("An unexpected error occurred during approval.")
    } finally {
      setLoading(false)
    }
  }

  // Determine Routing Tier based on Discount & Approval Status
  const getBannerDetails = () => {
    if (approvalStatus === "APPROVED" || approvalStatus === "AUTO_APPROVED") {
      return {
        bgColor: "bg-emerald-950/80 border-emerald-500/50 text-emerald-100",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        icon: CheckCircle2,
        title: approvalStatus === "AUTO_APPROVED" ? "AUTO-APPROVED QUOTATION" : "MANAGER APPROVED QUOTATION",
        desc: `No high discounts applied (${overallDiscountPct.toFixed(1)}% overall discount). Cleared for customer release.`,
        canApprove: false,
      }
    }

    if (approvalStatus === "REJECTED") {
      return {
        bgColor: "bg-rose-950/80 border-rose-500/50 text-rose-100",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        icon: XCircle,
        title: "QUOTATION DISCOUNT REJECTED",
        desc: "Discounts exceed profitability boundaries. Please revise quotation pricing before sending to client.",
        canApprove: isManagerOrAdmin,
      }
    }

    if (approvalStatus === "PENDING_GM_APPROVAL" || maxDiscountPct > 20) {
      return {
        bgColor: "bg-rose-950/90 border-rose-500/60 text-rose-100",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        icon: ShieldAlert,
        title: "REQUIRES GENERAL MANAGER / DIRECTOR APPROVAL",
        desc: `High discount detected (Max item discount: ${maxDiscountPct.toFixed(1)}%, Overall: ${overallDiscountPct.toFixed(1)}%). Executive authorization required.`,
        canApprove: isSuperAdmin,
      }
    }

    if (approvalStatus === "PENDING_MANAGER_APPROVAL" || maxDiscountPct > 10) {
      return {
        bgColor: "bg-amber-950/90 border-amber-500/60 text-amber-100",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        icon: AlertTriangle,
        title: "REQUIRES SALES MANAGER APPROVAL",
        desc: `Medium discount applied (Max item discount: ${maxDiscountPct.toFixed(1)}%, Overall: ${overallDiscountPct.toFixed(1)}%). Sales Manager authorization required.`,
        canApprove: isManagerOrAdmin,
      }
    }

    return {
      bgColor: "bg-blue-950/80 border-blue-500/50 text-blue-100",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      icon: Clock,
      title: "PENDING IDC REVIEW & FINALIZATION",
      desc: "Quotation is within standard consultant discount allowances (1% - 10%).",
      canApprove: isManagerOrAdmin,
    }
  }

  const banner = getBannerDetails()
  const BannerIcon = banner.icon

  return (
    <>
      <div className={`p-4 rounded-2xl border ${banner.bgColor} shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 my-4 font-sans`}>
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-black/30 border border-white/10 shrink-0">
            <BannerIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm tracking-tight text-white">{banner.title}</span>
              <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${banner.badgeColor}`}>
                {approvalStatus.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {banner.desc}
            </p>
          </div>
        </div>

        {banner.canApprove && (
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRejectModalOpen(true)}
              disabled={loading}
              className="h-8 text-xs font-bold border-rose-500/50 text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject Discount
            </Button>
            <Button
              size="sm"
              onClick={() => handleAction("APPROVE")}
              disabled={loading}
              className="h-8 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileCheck className="h-3.5 w-3.5 mr-1" />}
              Approve Quotation
            </Button>
          </div>
        )}
      </div>

      {/* Reject Remarks Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 text-slate-100 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Reject Quotation Discount
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-300">
              Provide feedback or instructions for the sales consultant regarding the requested discount:
            </p>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="E.g., Maximum discount allowed for this project segment is 8%. Please adjust margin accordingly."
              className="bg-slate-900 border-slate-800 text-xs text-slate-100 min-h-[90px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={loading || !rejectionReason.trim()}
              onClick={() => handleAction("REJECT")}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
