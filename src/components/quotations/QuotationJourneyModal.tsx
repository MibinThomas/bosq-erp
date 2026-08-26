import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, FileDown, FolderOpen, ExternalLink, Calendar, User, Clock, Check, FileText, History, Edit, Edit3, RefreshCw, Copy, Eye, Trash2, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useSession } from "next-auth/react"
import { usePermissions } from "@/components/providers/PermissionsProvider"
import { toast } from "sonner"
import { QuotationStatusTimeline } from "@/components/quotations/QuotationStatusTimeline"

interface Log {
  id: string
  action: string
  entityType: string
  entityId: string
  details: string
  createdAt: string
  user: {
    name: string | null
    role: string
    email: string
    image?: string | null
  }
}

interface Revision {
  id: string
  quotationNumber: string
  status: string
  revisionNumber: number
  date: string
  createdAt: string
  updatedAt: string
  subtotal: number
  discount: number
  vatAmount: number
  grandTotal: number
  preparedBy: {
    name: string
  }
}

interface JourneyData {
  quotation: {
    id: string
    quotationNumber: string
    status: string
    sharepointUrl: string | null
  }
  boq: {
    boqNumber: string
    sharepointUrl: string | null
  } | null
  logs: Log[]
  revisions: any[]
  seriesQuotations: Revision[]
}

import { isManagerOrAdminRole } from "@/lib/utils"

export function QuotationJourneyModal({ 
  quotationId, 
  open, 
  onOpenChange,
  onConfirmed
}: { 
  quotationId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmed?: () => void
}) {
  const { data: session } = useSession()
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission("QUOTATIONS", "create")
  const canEdit = hasPermission("QUOTATIONS", "edit")

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<JourneyData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [copyLoadingId, setCopyLoadingId] = useState<string | null>(null)

  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isSuperAdmin = userRole === "SUPER_ADMIN"
  const canViewWorkflowLogs = isManagerOrAdminRole(userRole)
  const isAuthorizedToConfirm = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER", "SALES_EXECUTIVE", "INTERIOR_DESIGN_CONSULTANT"].includes(userRole) || 
    (session?.user as any)?.permissionOverrides?.find((o: any) => o.action === "canConfirmQuotation")?.value === true

  // Super Admin Rename Revision State
  const [renameRevision, setRenameRevision] = useState<Revision | null>(null)
  const [newQuotationNumber, setNewQuotationNumber] = useState("")
  const [newRevisionNotes, setNewRevisionNotes] = useState("")
  const [renameLoading, setRenameLoading] = useState(false)

  // Super Admin Delete Revision State
  const [deleteRevisionItem, setDeleteRevisionItem] = useState<Revision | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (quotationId && open) {
      setLoading(true)
      fetch(`/api/quotations/${quotationId}/journey`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to load journey")
          return res.json()
        })
        .then(resData => {
          setData(resData)
          setError(null)
        })
        .catch(err => {
          setError(err.message)
          setData(null)
        })
        .finally(() => setLoading(false))
    }
  }, [quotationId, open])

  const handleExecuteConfirmFinal = async () => {
    if (!confirmingId) return
    setConfirmLoading(true)
    try {
      const res = await fetch(`/api/quotations/${confirmingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM_FINAL" })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to confirm final quotation")
      }

      // Re-fetch journey data to refresh entire UI
      if (quotationId) {
        const journeyRes = await fetch(`/api/quotations/${quotationId}/journey`)
        if (journeyRes.ok) {
          const journeyData = await journeyRes.json()
          setData(journeyData)
        }
      }

      setIsConfirmModalOpen(false)
      setConfirmingId(null)
      toast.success("Quotation revision confirmed as Final successfully!")
      if (onConfirmed) onConfirmed()
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm final quotation")
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleExecuteRename = async () => {
    if (!renameRevision || !newQuotationNumber.trim()) return
    setRenameLoading(true)
    try {
      const res = await fetch(`/api/quotations/${renameRevision.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RENAME_REVISION",
          newQuotationNumber: newQuotationNumber.trim(),
          newRevisionNotes: newRevisionNotes.trim(),
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to rename revision")
      }

      toast.success("Revision renamed successfully!")
      setRenameRevision(null)
      if (quotationId) {
        const journeyRes = await fetch(`/api/quotations/${quotationId}/journey`)
        if (journeyRes.ok) setData(await journeyRes.json())
      }
      if (onConfirmed) onConfirmed()
    } catch (err: any) {
      toast.error(err.message || "Failed to rename revision")
    } finally {
      setRenameLoading(false)
    }
  }

  const handleExecuteDelete = async () => {
    if (!deleteRevisionItem) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/quotations/${deleteRevisionItem.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to delete revision")
      }

      toast.success("Revision deleted successfully!")
      setDeleteRevisionItem(null)
      if (quotationId) {
        const journeyRes = await fetch(`/api/quotations/${quotationId}/journey`)
        if (journeyRes.ok) setData(await journeyRes.json())
      }
      if (onConfirmed) onConfirmed()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete revision")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCopyTimelineItem = async (targetId: string) => {
    setCopyLoadingId(targetId)
    try {
      const res = await fetch(`/api/quotations/${targetId}/copy`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to copy quotation")
      }
      const newQuote = await res.json()
      toast.success(`Created copy "${newQuote.quotationNumber}"!`)

      if (quotationId) {
        const journeyRes = await fetch(`/api/quotations/${quotationId}/journey`)
        if (journeyRes.ok) setData(await journeyRes.json())
      }
      if (onConfirmed) onConfirmed()
    } catch (err: any) {
      toast.error(err.message || "Failed to copy quotation")
    } finally {
      setCopyLoadingId(null)
    }
  }

  // Derived values for confirmed and active quotation
  const confirmedQuotation = data?.seriesQuotations?.find(q => q.status === "CLIENT_CONFIRMED")
  const activeQuotation = (confirmedQuotation || data?.seriesQuotations?.[data.seriesQuotations.length - 1] || data?.quotation) as any

  const confirmationLog = data?.logs?.find(log => log.action === "CLIENT_CONFIRMED_QUOTATION")
  const confirmedByUser = confirmationLog?.user?.name || activeQuotation?.preparedBy?.name || "N/A"
  const confirmationDateTime = confirmationLog?.createdAt || activeQuotation?.updatedAt

  const activeRevisionLog = data?.revisions?.find(
    (r: any) => r.revisionNumber === activeQuotation?.revisionNumber
  )
  const activeRevisionNotes = activeRevisionLog?.notes || (activeQuotation?.revisionNumber === 0 ? "Initial Version" : null) || "No revision notes available."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-[900px] w-full max-h-[85vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-8 py-5 border-b shrink-0 bg-muted/10">
          <DialogTitle className="text-2xl font-bold tracking-tight">Quotation Journey</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto overflow-x-hidden px-5 md:px-8 py-8 flex-1 bg-muted/5 w-full">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-12 font-medium text-lg">{error}</div>
          ) : data && activeQuotation ? (
            <div className="space-y-8">
              {/* Quotation Workflow Lifecycle Timeline */}
              <QuotationStatusTimeline
                status={activeQuotation?.status}
                costingStatus={activeQuotation?.costingStatus}
                createdAt={activeQuotation?.createdAt}
                preparedByName={activeQuotation?.preparedBy?.name}
                sentToCostingAt={activeQuotation?.sentToCostingAt}
                sentToCostingByName={activeQuotation?.sentToCostingBy?.name}
                costingCompletedAt={activeQuotation?.costingCompletedAt}
                costedByName={activeQuotation?.costedBy?.name || activeQuotation?.assignedEstimator?.name}
                approvedAt={activeQuotation?.approvedAt}
                approvedByName={activeQuotation?.approvedBy?.name}
              />

              {/* Header Cards & Final Quotation Summary */}
              <div className="space-y-6">
                <div className="p-6 border border-border/80 rounded-2xl bg-card shadow-sm space-y-6 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {confirmedQuotation ? "Final Confirmed Quotation" : "Current Quotation Status"}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
                          {activeQuotation.quotationNumber}
                        </p>
                        <div>
                          {confirmedQuotation ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30 shadow-xs">
                              <Check className="h-3.5 w-3.5 shrink-0 text-green-600 font-bold" /> ✓ Client Confirmed
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-xs px-3 py-1 font-semibold bg-background shrink-0">
                              {activeQuotation.status.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      <Button size="sm" variant="default" className="text-xs font-semibold cursor-pointer" onClick={() => window.open(`/api/quotations/${activeQuotation.id}/pdf`, "_blank")}>
                        <FileDown className="mr-2 h-4 w-4" /> Download PDF
                      </Button>
                      {data.quotation.sharepointUrl && (
                        <Button size="sm" variant="outline" className="text-xs font-semibold cursor-pointer text-yellow-700 hover:text-yellow-800 hover:bg-yellow-50 border-yellow-200" onClick={() => window.open(data.quotation.sharepointUrl!, "_blank")}>
                          <FolderOpen className="mr-2 h-4 w-4" /> SharePoint
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-dashed text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Active Revision</span>
                      <span className="font-semibold text-foreground text-sm">
                        {activeQuotation.revisionNumber === 0 ? "Original Quote" : `Revision #${activeQuotation.revisionNumber}`}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Grand Total</span>
                      <span className="font-mono font-bold text-foreground text-sm">
                        AED {activeQuotation.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {confirmedQuotation ? (
                      <>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Confirmation Time</span>
                          <span className="font-semibold text-foreground">
                            {new Date(confirmationDateTime).toLocaleString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                              hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Confirmed By</span>
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-primary shrink-0" />
                            {confirmedByUser}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Last Updated</span>
                          <span className="font-semibold text-foreground">
                            {new Date(activeQuotation.updatedAt).toLocaleString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                              hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Prepared By</span>
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-primary shrink-0" />
                            {activeQuotation.preparedBy?.name || "Sales Rep"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Costing & Revision Audit Details Grid */}
                  {(activeQuotation.sentToCostingAt || activeQuotation.costingCompletedAt || activeQuotation.revisionRequestedAt) && (
                    <div className="bg-amber-500/5 dark:bg-amber-950/20 border border-amber-300/50 dark:border-amber-800/40 rounded-xl p-4 mt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                          Costing Workflow Audit Trail
                        </span>
                        {activeQuotation.costingRevisionCycles > 0 && (
                          <Badge variant="outline" className="bg-rose-50 border-rose-200 text-rose-700 font-mono text-[10px] font-bold">
                            {activeQuotation.costingRevisionCycles} Revision Cycle(s)
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        {activeQuotation.sentToCostingAt && (
                          <div>
                            <span className="text-[10px] text-muted-foreground font-semibold block">Sent to Estimator</span>
                            <span className="font-semibold text-foreground">
                              {activeQuotation.sentToCostingBy?.name || "IDC"}
                            </span>
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              {new Date(activeQuotation.sentToCostingAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        )}
                        {activeQuotation.costingCompletedAt && (
                          <div>
                            <span className="text-[10px] text-muted-foreground font-semibold block">Costed By</span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              {activeQuotation.costedBy?.name || activeQuotation.assignedEstimator?.name || "Estimator"}
                            </span>
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              {new Date(activeQuotation.costingCompletedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        )}
                        {activeQuotation.revisionRequestedAt && (
                          <div>
                            <span className="text-[10px] text-muted-foreground font-semibold block">Revision Requested By</span>
                            <span className="font-semibold text-rose-700 dark:text-rose-400">
                              {activeQuotation.revisionRequestedBy?.name || "Consultant"}
                            </span>
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              {new Date(activeQuotation.revisionRequestedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        )}
                      </div>
                      {activeQuotation.revisionReason && (
                        <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/40 text-xs">
                          <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase block">Revision Reason:</span>
                          <p className="text-xs text-foreground italic mt-0.5">&quot;{activeQuotation.revisionReason}&quot;</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-muted/40 border border-zinc-150 dark:border-zinc-800 rounded-xl p-4 mt-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Revision Notes</span>
                    <p className="text-xs font-medium text-foreground leading-relaxed">
                      {activeRevisionNotes}
                    </p>
                  </div>
                </div>

                {data.boq && (
                  <div className="p-4 border border-border/60 rounded-xl bg-card flex items-center justify-between shadow-xs">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Origin BOQ Number</p>
                      <p className="text-base font-bold font-mono text-zinc-800 dark:text-zinc-200">{data.boq.boqNumber}</p>
                    </div>
                    {data.boq.sharepointUrl && (
                      <Button size="sm" variant="outline" className="text-xs text-green-700 hover:text-green-800 hover:bg-green-50" onClick={() => window.open(data.boq?.sharepointUrl!, "_blank")}>
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> BOQ Excel
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Journey Consolidated Tabs */}
              <Tabs defaultValue="revisions" className="w-full">
                {canViewWorkflowLogs && (
                  <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-xl">
                    <TabsTrigger value="revisions" className="rounded-lg text-xs font-semibold py-2 cursor-pointer">
                      <History className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
                      Revisions Timeline
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="rounded-lg text-xs font-semibold py-2 cursor-pointer">
                      <FileText className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                      Activity Workflow Logs
                    </TabsTrigger>
                  </TabsList>
                )}

                {/* 1. Revisions Chronological Timeline */}
                <TabsContent value="revisions" className="mt-6">
                  <div className="relative pl-8 border-l-2 border-primary/20 space-y-8 pb-4 ml-4">
                    {(!data.seriesQuotations || data.seriesQuotations.length === 0) ? (
                      <p className="text-muted-foreground text-sm">No revisions found.</p>
                    ) : (
                      data.seriesQuotations.map((item) => {
                        const isConfirmedOrWon = [
                          "CLIENT_APPROVED",
                          "CLIENT_CONFIRMED",
                          "PO_RECEIVED",
                          "UNDER_PRODUCTION",
                          "READY_FOR_DELIVERY",
                          "DELIVERED",
                          "COMPLETED"
                        ].includes(item.status)
                        const isConfirmed = item.status === "CLIENT_APPROVED" || item.status === "CLIENT_CONFIRMED"
                        const isProgressed = ["PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION", "READY_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(item.status)
                        const isActive = item.id === activeQuotation.id

                        let displayStatus = item.status
                        if (item.status === "CLIENT_APPROVED") displayStatus = "Client Approved"
                        else if (item.status === "CLIENT_CONFIRMED") displayStatus = "Client Confirmed"
                        else if (item.status === "PO_CONVERTED" || item.status === "PO_RECEIVED") displayStatus = "Converted to PO"
                        else if (item.status === "UNDER_PRODUCTION") displayStatus = "Under Production"
                        else if (item.status === "REVISED") displayStatus = "Revised"
                        else if (item.status === "APPROVED") displayStatus = "Client Approved"
                        else if (item.status === "REJECTED") displayStatus = "Rejected"
                        else if (item.status === "CANCELLED") displayStatus = "Cancelled"
                        else if (item.status === "DRAFT") displayStatus = "Draft"
                        else if (item.status === "QUOTE_CREATED") displayStatus = "Quote Created"

                        const revisionLog = data.revisions?.find(
                          (r: any) => r.revisionNumber === item.revisionNumber
                        )
                        const revisionNotes = revisionLog?.notes || (item.revisionNumber === 0 ? "Initial Version" : null) || "No revision notes available."

                        return (
                          <div key={item.id} className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                            {/* Timeline Dot */}
                            <span className={`absolute -left-[41px] top-5 h-4 w-4 rounded-full ring-4 ring-background shrink-0 ${
                              isConfirmedOrWon
                                ? "bg-emerald-500"
                                : isActive 
                                  ? "bg-primary animate-pulse" 
                                  : "bg-muted-foreground/30"
                            }`} />

                            <div className={`p-5 border rounded-xl bg-card shadow-sm space-y-4 hover:shadow-md transition-all duration-300 w-full relative ${
                              isActive ? "border-primary/40 bg-primary/2 dark:bg-primary/5" : "border-border/60"
                            }`}>
                              {/* Top row: Revision header & Date */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-sm font-bold font-mono text-foreground">
                                    {item.quotationNumber.toLowerCase().includes("copy")
                                      ? "Copied Version"
                                      : item.revisionNumber === 0 || item.quotationNumber === data?.quotation?.quotationNumber
                                        ? "Original Quote"
                                        : `Revision #${item.revisionNumber}`}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-mono">({item.quotationNumber})</span>
                                  {isActive && (
                                    <Badge className="bg-primary/10 text-primary hover:bg-primary/15 text-[10px] px-2 py-0.5 rounded-md border-transparent font-bold">
                                      Active Version
                                    </Badge>
                                  )}
                                  {item.quotationNumber.toLowerCase().includes("copy") && (
                                    <Badge variant="outline" className="bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border-teal-200 text-[10px] px-2 py-0.5 font-semibold">
                                      Copy
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground/75" />
                                  {new Date(item.createdAt).toLocaleString("en-US", {
                                    month: "short", day: "numeric", year: "numeric",
                                    hour: "numeric", minute: "2-digit"
                                  })}
                                </span>
                              </div>

                              {/* Details columns */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-1.5 text-xs">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Total Amount</span>
                                  <span className="font-mono font-bold text-sm text-foreground">
                                    AED {item.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Status</span>
                                  <div className="pt-0.5">
                                    {item.status === "CLIENT_CONFIRMED" ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30 shadow-xs">
                                        <Check className="h-3 w-3 shrink-0 text-green-600 font-bold" /> Client Confirmed
                                      </span>
                                    ) : item.status === "CLIENT_APPROVED" ? (
                                      <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-xs">
                                        Client Approved
                                      </span>
                                    ) : (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        isProgressed
                                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200"
                                          : "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200"
                                      }`}>
                                        {displayStatus}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Prepared By</span>
                                  <div className="flex items-center gap-1.5 pt-0.5 font-medium text-foreground">
                                    <User className="h-3.5 w-3.5 text-primary shrink-0" />
                                    {item.preparedBy?.name || "Sales Rep"}
                                  </div>
                                </div>
                              </div>

                              {/* Revision Notes Callout */}
                              <div className="space-y-1.5 bg-muted/40 border border-zinc-150 dark:border-zinc-800 rounded-xl p-3.5">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Revision Notes</span>
                                <p className="text-xs font-medium text-foreground leading-relaxed">{revisionNotes}</p>
                              </div>

                              {/* Action Footer */}
                              <div className="flex flex-wrap justify-between items-center pt-2 border-t border-border/40 gap-2">
                                <div>
                                  {item.status !== "CLIENT_CONFIRMED" && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white font-bold cursor-pointer transition-colors"
                                      disabled={!isAuthorizedToConfirm}
                                      onClick={() => {
                                        setConfirmingId(item.id)
                                        setIsConfirmModalOpen(true)
                                      }}
                                    >
                                      <Check className="h-3.5 w-3.5 mr-1" /> Confirm as Final
                                    </Button>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Edit Action */}
                                  {canEdit && (
                                    <Link href={`/quotations/new?editId=${item.id}`}>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 font-semibold cursor-pointer"
                                        title="Edit this version"
                                      >
                                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                                      </Button>
                                    </Link>
                                  )}

                                  {/* Revise Action */}
                                  {canCreate && (
                                    <Link href={`/quotations/new?reviseId=${item.id}`}>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200 font-semibold cursor-pointer"
                                        title="Create a revision from this version"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Revise
                                      </Button>
                                    </Link>
                                  )}

                                  {/* Copy Action */}
                                  {canCreate && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 border-teal-200 font-semibold cursor-pointer"
                                      title="Create a copy of this version"
                                      disabled={copyLoadingId === item.id}
                                      onClick={() => handleCopyTimelineItem(item.id)}
                                    >
                                      {copyLoadingId === item.id ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5 mr-1" />
                                      )}
                                      Copy
                                    </Button>
                                  )}

                                  {/* View / Preview Action */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 font-semibold cursor-pointer"
                                    onClick={() => window.open(`/quotations/${item.id}/preview`, "_blank")}
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                                  </Button>

                                  {/* Super Admin Rename & Delete */}
                                  {isSuperAdmin && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-300 font-semibold cursor-pointer"
                                        title="Rename / Edit Revision (Super Admin)"
                                        onClick={() => {
                                          setRenameRevision(item)
                                          setNewQuotationNumber(item.quotationNumber)
                                          setNewRevisionNotes(revisionNotes === "No revision notes available." ? "" : revisionNotes)
                                        }}
                                      >
                                        <Edit3 className="h-3.5 w-3.5 mr-1 text-amber-600" /> Rename
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 font-semibold cursor-pointer"
                                        title="Delete Revision (Super Admin)"
                                        onClick={() => setDeleteRevisionItem(item)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" /> Delete
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </TabsContent>

                {/* 2. Technical Activity Workflow Logs */}
                {canViewWorkflowLogs && (
                  <TabsContent value="activity" className="mt-6">
                    <div className="relative pl-8 border-l-2 border-muted-foreground/20 space-y-8 pb-4 ml-4">
                      {(!data.logs || data.logs.length === 0) && (
                        <p className="text-muted-foreground text-sm">No activity logs found for this journey.</p>
                      )}
                      {(data.logs || []).map((log) => (
                        <div key={log.id} className="relative">
                          {/* Timeline Dot */}
                          <span className={`absolute -left-[41px] top-5 h-4 w-4 rounded-full ring-4 ring-background shrink-0 ${
                            log.action === "CLIENT_CONFIRMED_QUOTATION" || log.details?.includes("Confirmed quotation")
                              ? "bg-emerald-500"
                              : log.action === "COSTING_REQUESTED"
                              ? "bg-amber-500"
                              : log.action === "COSTING_COMPLETED"
                              ? "bg-teal-500"
                              : "bg-zinc-400"
                          }`} />
                          
                          <div className="p-5 border border-border/60 rounded-xl bg-card shadow-sm space-y-3 hover:shadow-md transition-shadow w-full">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 w-full">
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold rounded-md uppercase tracking-wider bg-muted text-muted-foreground border-transparent">
                                  {log.action.replace(/_/g, " ")}
                                </Badge>
                                <span className="text-sm font-medium text-zinc-500 border-l pl-3">
                                  {log.entityType}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono flex items-center shrink-0">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                            
                            {log.details && (
                              <p className="text-sm text-foreground leading-relaxed font-normal">
                                {userRole === "INTERIOR_DESIGN_CONSULTANT" && log.action === "COSTING_COMPLETED"
                                  ? log.details.replace(/\. New Grand Total: AED .*$/, ". Costing completed & approved.")
                                  : log.details}
                              </p>
                            )}

                            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center font-medium">
                                <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                {log.user?.name || log.user?.email || "System"} ({log.user?.role || "SYSTEM"})
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          ) : null}
        </div>
      </DialogContent>

      {/* Nested Confirm Revision Dialog */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              Confirm Final Quotation
            </DialogTitle>
            <DialogDescription className="text-sm pt-2 leading-relaxed text-zinc-500">
              Are you sure you want to make this client-approved revision the Final Quotation? This revision will become the active quotation for all future operations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setIsConfirmModalOpen(false)} disabled={confirmLoading}>
              Cancel
            </Button>
            <Button variant="default" size="sm" className="bg-green-650 hover:bg-green-700 text-white font-bold cursor-pointer transition-colors" onClick={handleExecuteConfirmFinal} disabled={confirmLoading}>
              {confirmLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirming...
                </>
              ) : "Confirm as Final"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Super Admin Rename Revision Dialog */}
      <Dialog open={!!renameRevision} onOpenChange={(open) => !open && setRenameRevision(null)}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Edit3 className="h-5 w-5 text-amber-600" />
              Rename Revision (Super Admin)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Modify the quotation number / title or revision notes for this specific revision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Quotation Number / Revision Label</label>
              <Input
                value={newQuotationNumber}
                onChange={(e) => setNewQuotationNumber(e.target.value)}
                placeholder="e.g. BOSQ-QT-2026-0042-2"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Revision Notes</label>
              <Textarea
                value={newRevisionNotes}
                onChange={(e) => setNewRevisionNotes(e.target.value)}
                placeholder="Describe reason or details for this revision..."
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRenameRevision(null)} disabled={renameLoading} className="cursor-pointer">
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleExecuteRename} disabled={renameLoading || !newQuotationNumber.trim()} className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer">
              {renameLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Super Admin Delete Revision Dialog */}
      <Dialog open={!!deleteRevisionItem} onOpenChange={(open) => !open && setDeleteRevisionItem(null)}>
        <DialogContent className="max-w-md rounded-xl border-destructive/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              Delete Revision (Super Admin)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-2 leading-relaxed">
              Are you sure you want to delete <span className="font-mono font-bold text-foreground">{deleteRevisionItem?.quotationNumber}</span> (Revision #{deleteRevisionItem?.revisionNumber})? This action will permanently remove this revision record from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteRevisionItem(null)} disabled={deleteLoading} className="cursor-pointer">
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleExecuteDelete} disabled={deleteLoading} className="font-bold cursor-pointer">
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Delete Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
