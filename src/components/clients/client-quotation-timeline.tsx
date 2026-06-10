"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  Eye,
  FileDown,
  RefreshCw,
  Check,
  FolderOpen,
  Plus,
  LayoutList,
  GitBranch,
  Filter,
  X,
  Loader2,
  TrendingUp,
  Clock,
  CheckCircle2,
  DollarSign,
  FileQuestion,
  MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreparedBy {
  id: string
  name: string | null
  role: string | null
}

interface QuotationRevision {
  id: string
  quotationNumber: string
  projectName: string | null
  date: string
  status: string
  poStatus: string | null
  grandTotal: number
  subtotal: number
  revisionNumber: number
  sharepointUrl: string | null
  preparedBy: PreparedBy
  createdAt: string
}

interface QuotationSeries {
  id: string
  quotationNumber: string
  projectName: string | null
  date: string
  status: string
  poStatus: string | null
  grandTotal: number
  subtotal: number
  revisionNumber: number
  sharepointUrl: string | null
  preparedBy: PreparedBy
  createdAt: string
  revisionsList: QuotationRevision[]
}

interface Props {
  quotations: QuotationSeries[]
  clientId: string
  userRole: string
  userId: string
  isAuthorizedToConfirm: boolean
  onStatusUpdate?: () => void
}

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  QUOTE_CREATED: "Quote Created",
  SENT: "Sent",
  APPROVED: "Client Approved",
  CLIENT_APPROVED: "Client Approved",
  REVISED: "Revised",
  REJECTED: "Rejected",
  CLIENT_CONFIRMED: "Client Approved",
  PO_CONVERTED: "Converted to PO",
  PO_RECEIVED: "Converted to PO",
  UNDER_PRODUCTION: "Under Production",
  PENDING_APPROVAL: "Pending Approval",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
}

function getStatusBadge(status: string, isNotSelected = false) {
  if (isNotSelected) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
        Not Selected
      </span>
    )
  }
  switch (status) {
    case "CLIENT_APPROVED":
    case "CLIENT_CONFIRMED":
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30">
          <Check className="h-2.5 w-2.5" /> Client Approved
        </span>
      )
    case "PO_CONVERTED":
    case "PO_RECEIVED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          Converted to PO
        </span>
      )
    case "UNDER_PRODUCTION":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 border border-indigo-200">
          Under Production
        </span>
      )
    case "REVISED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-400 border border-purple-200">
          Revised
        </span>
      )
    case "SENT":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-400 border border-sky-200">
          Sent
        </span>
      )
    case "REJECTED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200">
          Rejected
        </span>
      )
    case "CANCELLED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200">
          Cancelled
        </span>
      )
    case "PENDING_APPROVAL":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200">
          Pending Approval
        </span>
      )
    case "DRAFT":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
          Draft
        </span>
      )
    case "QUOTE_CREATED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border border-blue-200">
          Quote Created
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border">
          {STATUS_LABELS[status] || status}
        </span>
      )
  }
}

// ─── Timeline event renderer ────────────────────────────────────────────────

function TimelineView({ series }: { series: QuotationSeries[] }) {
  // Flatten all quotations + revisions into a sorted event list
  const events = useMemo(() => {
    const all: { date: string; quotationNumber: string; status: string; value: number; project: string | null; isRevision: boolean }[] = []
    series.forEach((root) => {
      all.push({
        date: root.date,
        quotationNumber: root.quotationNumber,
        status: root.status,
        value: root.grandTotal,
        project: root.projectName,
        isRevision: false,
      })
      root.revisionsList.forEach((rev) => {
        all.push({
          date: rev.date,
          quotationNumber: rev.quotationNumber,
          status: rev.status,
          value: rev.grandTotal,
          project: rev.projectName,
          isRevision: true,
        })
      })
    })
    return all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [series])

  if (events.length === 0) {
    return <div className="text-center py-16 text-muted-foreground text-sm">No quotation events found.</div>
  }

  return (
    <div className="relative border-l-2 border-primary/20 ml-4 space-y-5 py-2">
      {events.map((ev, idx) => (
        <div key={idx} className="relative pl-7">
          {/* Timeline dot */}
          <span className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-background shadow-sm flex items-center justify-center ${
            ["CLIENT_APPROVED", "CLIENT_CONFIRMED", "APPROVED"].includes(ev.status) ? "bg-green-500" :
            ["PO_CONVERTED", "PO_RECEIVED"].includes(ev.status) ? "bg-blue-500" :
            ev.status === "REJECTED" ? "bg-red-500" :
            ev.isRevision ? "bg-orange-400" :
            "bg-primary"
          }`} />
          <div className="bg-card border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono text-sm text-primary">{ev.quotationNumber}</span>
                {ev.project && <span className="text-xs text-muted-foreground truncate max-w-[200px]">· {ev.project}</span>}
              </div>
              {getStatusBadge(ev.status)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {new Date(ev.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span className="font-mono font-semibold text-sm text-foreground">
                AED {ev.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Single Series Card ────────────────────────────────────────────────────────

function SeriesCard({
  series,
  userRole,
  userId,
  isAuthorizedToConfirm,
  onConfirm,
  onStatusUpdate,
}: {
  series: QuotationSeries
  userRole: string
  userId: string
  isAuthorizedToConfirm: boolean
  onConfirm: (id: string, force?: boolean) => Promise<void>
  onStatusUpdate: (id: string, status: string, field: "status" | "poStatus") => Promise<void>
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  // Build the full list for this series: root + revisions sorted by revisionNumber ASC
  const allVersions: QuotationRevision[] = [
    {
      id: series.id,
      quotationNumber: series.quotationNumber,
      projectName: series.projectName,
      date: series.date,
      status: series.status,
      poStatus: series.poStatus,
      grandTotal: series.grandTotal,
      subtotal: series.subtotal,
      revisionNumber: series.revisionNumber,
      sharepointUrl: series.sharepointUrl,
      preparedBy: series.preparedBy,
      createdAt: series.createdAt,
    },
    ...series.revisionsList,
  ].sort((a, b) => a.revisionNumber - b.revisionNumber)

  const hasConfirmedVersion = allVersions.some((v) =>
    ["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION"].includes(v.status)
  )

  // Determine the latest meaningful status for the series header badge
  const latestStatus = allVersions[allVersions.length - 1]?.status || series.status
  const totalRevisions = allVersions.length

  // Derive series prefix from the quotation number (everything before the dash or the full number if no revisions)
  const seriesPrefix = series.quotationNumber.includes("-")
    ? series.quotationNumber.split("-")[0]
    : series.quotationNumber

  return (
    <div className={`border rounded-xl overflow-hidden transition-shadow duration-200 ${expanded ? "shadow-md" : "hover:shadow-sm"}`}>
      {/* ── Series Header ── */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className={`w-full flex items-center justify-between p-4 text-left transition-colors duration-150 ${
          expanded ? "bg-muted/40" : "bg-card hover:bg-muted/20"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`transition-transform duration-200 shrink-0 ${expanded ? "rotate-90" : ""}`}>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold font-mono text-sm text-primary">{seriesPrefix}</span>
              {series.projectName && (
                <span className="text-sm text-foreground font-medium truncate max-w-[240px]">
                  · {series.projectName}
                </span>
              )}
              <span className="ml-1 text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-full">
                {totalRevisions} {totalRevisions === 1 ? "revision" : "revisions"}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Created {new Date(series.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span className="text-xs text-muted-foreground">
                by {series.preparedBy?.name || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pl-4">
          {getStatusBadge(latestStatus)}
          <span className="font-mono font-bold text-sm text-foreground">
            AED {(allVersions[allVersions.length - 1]?.grandTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </button>

      {/* ── Expanded Revision Table ── */}
      {expanded && (
        <div className="border-t">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
              <thead className="bg-muted/30 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-2.5 w-[20%]">Revision</th>
                  <th className="px-4 py-2.5 w-[14%]">Date</th>
                  <th className="px-4 py-2.5 w-[18%] text-right">Value (AED)</th>
                  <th className="px-4 py-2.5 w-[18%] text-center">Status</th>
                  <th className="px-4 py-2.5 w-[16%]">Sales Executive</th>
                  <th className="px-4 py-2.5 w-[14%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {allVersions.map((v) => {
                  const isConfirmed = v.status === "CLIENT_APPROVED" || v.status === "CLIENT_CONFIRMED"
                  const isProgressed = ["PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION"].includes(v.status)
                  const isNotSelected =
                    hasConfirmedVersion && !["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION"].includes(v.status)

                  return (
                    <tr
                      key={v.id}
                      className={`transition-colors duration-150 ${
                        isConfirmed
                          ? "bg-green-50/40 dark:bg-green-950/10 font-medium"
                          : isProgressed
                          ? "bg-blue-50/20 dark:bg-blue-950/10"
                          : isNotSelected
                          ? "opacity-60"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono font-semibold text-primary">{v.quotationNumber}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                        {new Date(v.date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold">
                        {v.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {getStatusBadge(v.status, isNotSelected)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[120px]">
                        {v.preparedBy?.name || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-7 w-7 p-0 hover:bg-muted inline-flex items-center justify-center rounded-md cursor-pointer text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs">Revision Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              className="cursor-pointer text-xs"
                              onClick={() => window.open(`/quotations/${v.id}/preview`, "_blank")}
                            >
                              <Eye className="mr-2 h-3.5 w-3.5 text-blue-600" /> View Quote
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-xs"
                              onClick={() => window.open(`/api/quotations/${v.id}/pdf`, "_blank")}
                            >
                              <FileDown className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-xs"
                              onClick={() => router.push(`/quotations/new?reviseId=${v.id}`)}
                            >
                              <RefreshCw className="mr-2 h-3.5 w-3.5 text-purple-600" /> Create Revision
                            </DropdownMenuItem>
                            {isAuthorizedToConfirm &&
                              !["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CANCELLED"].includes(v.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="cursor-pointer text-xs text-green-700 focus:text-green-700 focus:bg-green-50"
                                    onClick={() => onConfirm(v.id, false)}
                                  >
                                    <Check className="mr-2 h-3.5 w-3.5 text-green-600" /> Mark as Client Approved
                                  </DropdownMenuItem>
                                </>
                              )}
                            {isConfirmed && (
                              <DropdownMenuItem
                                className="cursor-pointer text-xs text-blue-700 focus:text-blue-700 focus:bg-blue-50"
                                onClick={() => onStatusUpdate(v.id, "PO_CONVERTED", "status")}
                              >
                                <Check className="mr-2 h-3.5 w-3.5 text-blue-600" /> Convert to PO
                              </DropdownMenuItem>
                            )}
                            {v.sharepointUrl && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="cursor-pointer text-xs"
                                  onClick={() => window.open(v.sharepointUrl!, "_blank")}
                                >
                                  <FolderOpen className="mr-2 h-3.5 w-3.5 text-yellow-600" /> Open SharePoint Folder
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            {allVersions.map((v) => {
              const isConfirmed = v.status === "CLIENT_APPROVED" || v.status === "CLIENT_CONFIRMED"
              const isNotSelected =
                hasConfirmedVersion &&
                !["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION"].includes(v.status)

              return (
                <div
                  key={v.id}
                  className={`p-4 space-y-3 ${
                    isConfirmed
                      ? "bg-green-50/30 dark:bg-green-950/10"
                      : isNotSelected
                      ? "opacity-60"
                      : "bg-card"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold font-mono text-sm text-primary">{v.quotationNumber}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(v.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })} · {v.preparedBy?.name || "—"}
                      </div>
                    </div>
                    {getStatusBadge(v.status, isNotSelected)}
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Total Value:</span>
                    <span className="font-mono font-bold text-sm">AED {v.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-blue-600"
                      onClick={() => window.open(`/quotations/${v.id}/preview`, "_blank")}
                    >
                      <Eye className="mr-1 h-3 w-3" /> View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => window.open(`/api/quotations/${v.id}/pdf`, "_blank")}
                    >
                      <FileDown className="mr-1 h-3 w-3" /> PDF
                    </Button>
                    {isAuthorizedToConfirm &&
                      !["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CANCELLED"].includes(v.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-green-600"
                          onClick={() => onConfirm(v.id, false)}
                        >
                          <Check className="mr-1 h-3 w-3" /> Approve
                        </Button>
                      )}
                    {isConfirmed && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-indigo-600"
                        onClick={() => onStatusUpdate(v.id, "PO_CONVERTED", "status")}
                      >
                        Convert to PO
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function ClientQuotationTimeline({
  quotations,
  clientId,
  userRole,
  userId,
  isAuthorizedToConfirm,
  onStatusUpdate,
}: Props) {
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table")
  const [searchProject, setSearchProject] = useState("")
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterExec, setFilterExec] = useState("")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false)
  const [conflictingQuoteNo, setConflictingQuoteNo] = useState("")
  const [targetQuoteId, setTargetQuoteId] = useState<string | null>(null)

  const isAdminOrAbove = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(userRole)

  // Collect unique executives for the filter dropdown
  const execOptions = useMemo(() => {
    const names = new Set<string>()
    quotations.forEach((q) => {
      if (q.preparedBy?.name) names.add(q.preparedBy.name)
      q.revisionsList.forEach((r) => {
        if (r.preparedBy?.name) names.add(r.preparedBy.name)
      })
    })
    return [...names].sort()
  }, [quotations])

  // Ownership scoping: SALES_EXECUTIVE sees only own quotations
  const ownedQuotations = useMemo(() => {
    if (isAdminOrAbove) return quotations
    return quotations.filter(
      (q) =>
        q.preparedBy?.id === userId ||
        q.revisionsList.some((r) => r.preparedBy?.id === userId)
    )
  }, [quotations, isAdminOrAbove, userId])

  // Apply filters
  const filteredSeries = useMemo(() => {
    return ownedQuotations.filter((q) => {
      const allVersions = [q, ...q.revisionsList]
      // Project name search
      if (searchProject) {
        const term = searchProject.toLowerCase()
        const matchesProject = (q.projectName || "").toLowerCase().includes(term)
        const matchesNumber = q.quotationNumber.toLowerCase().includes(term)
        if (!matchesProject && !matchesNumber) return false
      }
      // Status filter
      if (filterStatus.length > 0) {
        const hasMatchingStatus = allVersions.some((v) => filterStatus.includes(v.status))
        if (!hasMatchingStatus) return false
      }
      // Exec filter
      if (filterExec) {
        const hasMatchingExec = allVersions.some((v) => v.preparedBy?.name === filterExec)
        if (!hasMatchingExec) return false
      }
      // Date range
      if (filterDateFrom) {
        const from = new Date(filterDateFrom).getTime()
        const hasMatchingDate = allVersions.some((v) => new Date(v.date).getTime() >= from)
        if (!hasMatchingDate) return false
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo).getTime()
        const hasMatchingDate = allVersions.some((v) => new Date(v.date).getTime() <= to)
        if (!hasMatchingDate) return false
      }
      return true
    })
  }, [ownedQuotations, searchProject, filterStatus, filterExec, filterDateFrom, filterDateTo])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalSeries = ownedQuotations.length
    let totalRevisions = 0
    let confirmedCount = 0
    let wonValue = 0
    let pendingValue = 0
    let lostValue = 0

    ownedQuotations.forEach((q) => {
      const all = [q, ...q.revisionsList]
      totalRevisions += all.length

      const confirmed = all.find((v) =>
        ["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION"].includes(v.status)
      )
      if (confirmed) {
        confirmedCount++
        wonValue += confirmed.grandTotal
      } else {
        const rejected = all.find((v) => v.status === "REJECTED" || v.status === "CANCELLED")
        if (rejected) {
          lostValue += rejected.grandTotal
        } else {
          pendingValue += all[all.length - 1]?.grandTotal || 0
        }
      }
    })

    return { totalSeries, totalRevisions, confirmedCount, wonValue, pendingValue, lostValue }
  }, [ownedQuotations])

  // ── API actions ────────────────────────────────────────────────────────────

  const handleConfirmQuote = async (quoteId: string, forceReplace = false) => {
    try {
      const res = await fetch(`/api/quotations/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLIENT_CONFIRM", forceReplace }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === "ALREADY_CONFIRMED") {
          setTargetQuoteId(quoteId)
          setConflictingQuoteNo(data.confirmedQuotationNumber)
          setIsReplaceDialogOpen(true)
          return
        }
        throw new Error(data.error || "Failed to confirm quotation")
      }

      toast.success("Quotation marked as Client Approved!")
      if (onStatusUpdate) onStatusUpdate()
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm quotation.")
    }
  }

  const handleStatusUpdate = async (id: string, status: string, field: "status" | "poStatus") => {
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: status }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      toast.success("Status updated successfully!")
      if (onStatusUpdate) onStatusUpdate()
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.")
    }
  }

  const STATUS_FILTER_OPTIONS = [
    { key: "DRAFT", label: "Draft" },
    { key: "QUOTE_CREATED", label: "Quote Created" },
    { key: "REVISED", label: "Revised" },
    { key: "CLIENT_APPROVED", label: "Client Approved" },
    { key: "PO_CONVERTED", label: "Converted to PO" },
    { key: "REJECTED", label: "Rejected" },
    { key: "CANCELLED", label: "Cancelled" },
    { key: "UNDER_PRODUCTION", label: "In Production" },
  ]

  const hasActiveFilters =
    searchProject || filterStatus.length > 0 || filterExec || filterDateFrom || filterDateTo

  const clearFilters = () => {
    setSearchProject("")
    setFilterStatus([])
    setFilterExec("")
    setFilterDateFrom("")
    setFilterDateTo("")
  }

  return (
    <div className="space-y-6">
      {/* ── Overview Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            icon: <FileQuestion className="h-4 w-4 text-primary" />,
            label: "Total Series",
            value: stats.totalSeries,
            color: "text-primary",
          },
          {
            icon: <GitBranch className="h-4 w-4 text-purple-600" />,
            label: "Total Revisions",
            value: stats.totalRevisions,
            color: "text-purple-700 dark:text-purple-400",
          },
          {
            icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
            label: "Confirmed",
            value: stats.confirmedCount,
            color: "text-green-700 dark:text-green-400",
          },
          {
            icon: <DollarSign className="h-4 w-4 text-emerald-600" />,
            label: "Won Value",
            value: `AED ${stats.wonValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            color: "text-emerald-700 dark:text-emerald-400",
          },
          {
            icon: <Clock className="h-4 w-4 text-amber-500" />,
            label: "Pending Value",
            value: `AED ${stats.pendingValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            color: "text-amber-700 dark:text-amber-400",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-card border rounded-xl p-4 flex flex-col gap-1.5 shadow-xs hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              {stat.icon}
              {stat.label}
            </div>
            <div className={`font-bold text-lg leading-tight ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Controls: Filters + View Toggle ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Project search */}
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search project or quote no..."
                value={searchProject}
                onChange={(e) => setSearchProject(e.target.value)}
                className="pl-8 h-8 text-xs w-52"
              />
            </div>

            {/* Exec filter (admin only) */}
            {isAdminOrAbove && execOptions.length > 1 && (
              <select
                value={filterExec}
                onChange={(e) => setFilterExec(e.target.value)}
                className="h-8 text-xs rounded-md border border-input bg-background px-2.5 pr-7 cursor-pointer focus:ring-1 focus:ring-primary"
              >
                <option value="">All Executives</option>
                {execOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}

            {/* Date range */}
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-8 text-xs rounded-md border border-input bg-background px-2 cursor-pointer focus:ring-1 focus:ring-primary"
              title="From date"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-8 text-xs rounded-md border border-input bg-background px-2 cursor-pointer focus:ring-1 focus:ring-primary"
              title="To date"
            />

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground gap-1">
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === "timeline"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" /> Timeline
            </button>
          </div>
        </div>

        {/* Status pill filters */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTER_OPTIONS.map(({ key, label }) => {
            const active = filterStatus.includes(key)
            return (
              <button
                key={key}
                onClick={() =>
                  setFilterStatus((prev) =>
                    active ? prev.filter((s) => s !== key) : [...prev, key]
                  )
                }
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      {filteredSeries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <FileQuestion className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-base font-semibold text-foreground">No quotations found</p>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your filters or clearing them."
              : "No quotations have been created for this client yet."}
          </p>
          <Link href={`/quotations/new?clientId=${clientId}`}>
            <Button size="sm" className="mt-2 gap-2">
              <Plus className="h-4 w-4" /> Create First Quotation
            </Button>
          </Link>
        </div>
      ) : viewMode === "timeline" ? (
        <TimelineView series={filteredSeries} />
      ) : (
        <div className="space-y-3">
          {filteredSeries.map((series) => (
            <SeriesCard
              key={series.id}
              series={series}
              userRole={userRole}
              userId={userId}
              isAuthorizedToConfirm={isAuthorizedToConfirm}
              onConfirm={handleConfirmQuote}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>
      )}

      {/* ── Replace Confirmed Dialog ── */}
      {isReplaceDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <h2 className="text-lg font-bold">Confirm Replacement</h2>
            <p className="text-sm text-muted-foreground">
              Revision <strong>{conflictingQuoteNo}</strong> is already marked as Client Approved.
              Do you want to replace it with this revision?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsReplaceDialogOpen(false)
                  setTargetQuoteId(null)
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  if (targetQuoteId) {
                    handleConfirmQuote(targetQuoteId, true)
                  }
                  setIsReplaceDialogOpen(false)
                  setTargetQuoteId(null)
                }}
              >
                Replace Confirmed Quote
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
