"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Loader2,
  Building2,
  FileText,
  FileSpreadsheet,
  UserCheck,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Percent,
  RefreshCw
} from "lucide-react"

import { usePermissions } from "@/components/providers/PermissionsProvider"

export default function ApprovalsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { hasPermission, loading: loadingPerms } = usePermissions()
  const userRole = (session?.user as any)?.role || ""
  const canViewApprovals = hasPermission("APPROVALS", "view")

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>({
    clientAccessRequests: [],
    pendingQuotations: [],
    pendingBoqs: []
  })
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/approvals")
      if (!res.ok) {
        throw new Error("Failed to load approvals inbox")
      }
      const resData = await res.json()
      setData(resData)
    } catch (err: any) {
      toast.error(err.message || "Failed to load approvals")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleApproveAccessRequest = async (requestId: string, approve: boolean) => {
    setProcessingId(requestId)
    try {
      const res = await fetch(`/api/clients/access-requests`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          status: approve ? "APPROVED" : "REJECTED"
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to process access request")
      }
      toast.success(approve ? "Access Request Approved!" : "Access Request Rejected.")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" /> Management Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Executive Approval Center
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Single-inbox review for special discounts, client access requests, and BOQ costing approvals.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto text-xs font-semibold flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Inbox
        </Button>
      </div>

      {!loadingPerms && !canViewApprovals && userRole !== "SUPER_ADMIN" ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-4 border rounded-2xl bg-card text-center">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-bold text-foreground">Access Restricted</h3>
            <p className="text-xs text-muted-foreground">
              You do not have permission to access the Executive Approval Center. Please contact your Super Administrator if you require access to this module.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Loading approval requests...</p>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* SECTION 1: Client Access Requests */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-500" />
                Pending Client Access Requests
              </h2>
              <Badge variant="secondary" className="font-mono text-xs">
                {data.clientAccessRequests?.length || 0} Pending
              </Badge>
            </div>

            {(!data.clientAccessRequests || data.clientAccessRequests.length === 0) ? (
              <Card className="rounded-xl border p-6 text-center text-xs text-muted-foreground bg-muted/20">
                No pending client access requests. All client permissions are up to date.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.clientAccessRequests.map((req: any) => (
                  <Card key={req.id} className="rounded-xl border shadow-sm hover:shadow-md transition-all space-y-3 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-foreground">{req.client?.companyName}</div>
                        <div className="text-xs text-muted-foreground">ID: {req.client?.clientId}</div>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] uppercase font-bold">
                        Access Request
                      </Badge>
                    </div>

                    <div className="text-xs bg-muted/40 p-3 rounded-lg space-y-1">
                      <div className="font-medium text-foreground">
                        Requested by: <strong>{req.user?.name}</strong> ({req.user?.role})
                      </div>
                      {req.notes && (
                        <div className="text-muted-foreground italic text-[11px]">
                          "{req.notes}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={processingId === req.id}
                        onClick={() => handleApproveAccessRequest(req.id, true)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8"
                      >
                        {processingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processingId === req.id}
                        onClick={() => handleApproveAccessRequest(req.id, false)}
                        className="flex-1 border-rose-500/40 text-rose-600 hover:bg-rose-500/10 text-xs h-8 font-semibold"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: Pending BOQs Costing Approvals */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                BOQ Costing Review Queue
              </h2>
              <Badge variant="secondary" className="font-mono text-xs">
                {data.pendingBoqs?.length || 0} In Progress
              </Badge>
            </div>

            {(!data.pendingBoqs || data.pendingBoqs.length === 0) ? (
              <Card className="rounded-xl border p-6 text-center text-xs text-muted-foreground bg-muted/20">
                No active BOQs awaiting costing review.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.pendingBoqs.map((boq: any) => (
                  <Card key={boq.id} className="rounded-xl border shadow-sm hover:shadow-md transition-all space-y-3 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-foreground">{boq.boqNumber}</div>
                        <div className="text-xs text-muted-foreground">{boq.client?.companyName}</div>
                      </div>
                      <Badge className={
                        boq.status === "COSTING_COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] uppercase font-bold"
                      }>
                        {boq.status === "COSTING_COMPLETED" ? "Costing Completed" : "Estimator Active"}
                      </Badge>
                    </div>

                    <div className="text-xs bg-muted/40 p-3 rounded-lg space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Cost:</span>
                        <span className="font-bold">AED {boq.totalCost?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Selling Price:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">AED {boq.totalSellingPrice?.toLocaleString() || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted-foreground">Prepared by: <strong>{boq.preparedBy?.name || "N/A"}</strong></span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/boq/${boq.id}`)}
                        className="text-xs font-semibold text-primary hover:bg-primary/10 h-7"
                      >
                        Review BOQ <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: Quotations Special Discount Review */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                Special Discount & Quote Review
              </h2>
              <Badge variant="secondary" className="font-mono text-xs">
                {data.pendingQuotations?.length || 0} Active
              </Badge>
            </div>

            {(!data.pendingQuotations || data.pendingQuotations.length === 0) ? (
              <Card className="rounded-xl border p-6 text-center text-xs text-muted-foreground bg-muted/20">
                No active quotations requiring special discount sign-off.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.pendingQuotations.map((quote: any) => (
                  <Card key={quote.id} className="rounded-xl border shadow-sm hover:shadow-md transition-all space-y-3 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-foreground">{quote.quotationNumber}</div>
                        <div className="text-xs text-muted-foreground">{quote.client?.companyName}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {quote.customerSegment} Segment
                      </Badge>
                    </div>

                    <div className="text-xs bg-muted/40 p-3 rounded-lg space-y-1">
                      <div className="flex justify-between font-mono">
                        <span className="text-muted-foreground">Grand Total:</span>
                        <span className="font-bold text-foreground">AED {quote.grandTotal?.toLocaleString() || 0}</span>
                      </div>
                      {quote.specialDiscountValue > 0 && (
                        <div className="flex justify-between font-mono text-amber-600 dark:text-amber-400 font-semibold">
                          <span>Special Discount:</span>
                          <span>{quote.specialDiscountType === "PERCENTAGE" ? `${quote.specialDiscountValue}%` : `AED ${quote.specialDiscountValue}`}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted-foreground">Prepared by: <strong>{quote.preparedBy?.name || "N/A"}</strong></span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/quotations/${quote.id}/preview`)}
                        className="text-xs font-semibold text-primary hover:bg-primary/10 h-7"
                      >
                        Inspect Quote <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
