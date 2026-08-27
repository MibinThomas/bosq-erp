"use client"

import { useEffect, useState, Fragment, useCallback } from "react"
import Link from "next/link"
import { Plus, Search, FileDown, Eye, Loader2, FolderOpen, History, RefreshCw, Lock, Check, AlertCircle, Edit, Map, ChevronDown, ChevronRight, Calendar, User, Copy, Trash2, AlertTriangle } from "lucide-react"
import { usePermissions } from "@/components/providers/PermissionsProvider"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { MoreHorizontal } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { QuotationJourneyModal } from "@/components/quotations/QuotationJourneyModal"
import { QuotationStatusModal, STATUS_BADGES, STATUS_LABELS } from "@/components/quotations/QuotationStatusModal"
import { QuotationBulkUploadModal } from "@/components/quotations/bulk-upload-modal"

interface QuotationRevision {
  id: string
  revisionNumber: number
  revisionDate: string
  previousTotal: number
  newTotal: number
  notes: string | null
}

interface Quotation {
  id: string
  quotationNumber: string
  projectName: string | null
  date: string
  validityDate: string
  status: string
  poStatus: string | null
  paymentStatus: string | null
  costingStatus?: string | null
  subtotal: number
  grandTotal: number
  sharepointUrl: string | null
  revisionNumber: number
  client: {
    companyName: string
  }
  preparedById: string
  preparedBy: {
    name: string | null
  }
  revisions: QuotationRevision[]
}

export default function QuotationsPage() {
  const { data: session } = useSession()
  const { hasPermission } = usePermissions()
  
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [segmentFilter, setSegmentFilter] = useState("all")
  const [poStatusFilter, setPoStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("quotationNumber")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [limit] = useState(20)
  
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [journeyQuoteId, setJourneyQuoteId] = useState<string | null>(null)
  const [isJourneyOpen, setIsJourneyOpen] = useState(false)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [targetStatusQuote, setTargetStatusQuote] = useState<any>(null)
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false)
  const [conflictingQuoteNo, setConflictingQuoteNo] = useState<string | null>(null)
  const [targetQuoteToConfirm, setTargetQuoteToConfirm] = useState<any>(null)
  
  const [editNameQuote, setEditNameQuote] = useState<{ id: string; quotationNumber: string } | null>(null)
  const [newQuotationNumber, setNewQuotationNumber] = useState("")
  const [isUpdatingName, setIsUpdatingName] = useState(false)

  const [deleteSingleQuote, setDeleteSingleQuote] = useState<Quotation | null>(null)
  const [isDeletingSingle, setIsDeletingSingle] = useState(false)

  const handleConfirmDeleteSingle = async () => {
    if (!deleteSingleQuote) return
    setIsDeletingSingle(true)
    try {
      const res = await fetch(`/api/quotations/${deleteSingleQuote.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to delete quotation")
      }
      toast.success(`Quotation revision ${deleteSingleQuote.quotationNumber} deleted successfully!`)
      setDeleteSingleQuote(null)
      fetchQuotations()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete quotation")
    } finally {
      setIsDeletingSingle(false)
    }
  }

  const handleOpenEditName = (quote: Quotation) => {
    setEditNameQuote({ id: quote.id, quotationNumber: quote.quotationNumber })
    setNewQuotationNumber(quote.quotationNumber)
  }

  const handleSaveQuotationName = async () => {
    if (!editNameQuote || !newQuotationNumber.trim()) return
    setIsUpdatingName(true)
    try {
      const res = await fetch(`/api/quotations/${editNameQuote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotationNumber: newQuotationNumber.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to update quotation name")
        return
      }
      toast.success(`Quotation name updated to "${data.quotationNumber}"`)
      setEditNameQuote(null)
      fetchQuotations()
    } catch (err) {
      console.error(err)
      toast.error("Failed to update quotation name")
    } finally {
      setIsUpdatingName(false)
    }
  }

  const canCreate = hasPermission("QUOTATIONS", "create")
  const canEdit = hasPermission("QUOTATIONS", "edit")
  const canDelete = hasPermission("QUOTATIONS", "delete")
  const isSuperAdmin = hasPermission("SETTINGS", "manage")
  const isManagerOrAdmin = canDelete || isSuperAdmin
  const isAdminOrSuperAdmin = isSuperAdmin
  
  const isAuthorizedToConfirm = isSuperAdmin || isManagerOrAdmin || hasPermission("QUOTATIONS", "canConfirmQuotation")

  const handleConfirmQuote = async (quoteId: string, forceReplace: boolean = false) => {
    try {
      const res = await fetch(`/api/quotations/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLIENT_CONFIRM", forceReplace })
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === "ALREADY_CONFIRMED") {
          const conflictingQuote = quotations.find(q => q.id === quoteId) || { id: quoteId, quotationNumber: data.confirmedQuotationNumber }
          if (conflictingQuote) {
            setTargetQuoteToConfirm(conflictingQuote)
          }
          setConflictingQuoteNo(data.confirmedQuotationNumber)
          setIsReplaceDialogOpen(true)
          return
        }
        throw new Error(data.error || "Failed to confirm quotation")
      }

      setQuotations((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, ...data } : q))
      )

      setIsReplaceDialogOpen(false)
      setTargetQuoteToConfirm(null)
      toast.success("Quotation marked as Client Approved successfully!")
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm quotation.")
    }
  }

  const handleCopyQuote = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/quotations/${quoteId}/copy`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to copy quotation")
      }
      const newQuote = await res.json()
      toast.success(`Created copy "${newQuote.quotationNumber}"!`)
      fetchQuotations()
    } catch (error: any) {
      toast.error(error.message || "Failed to copy quotation.")
    }
  }

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append("page", currentPage.toString())
      params.append("limit", limit.toString())
      if (searchTerm) params.append("search", searchTerm)
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)
      if (segmentFilter && segmentFilter !== "all") params.append("customerSegment", segmentFilter)
      if (poStatusFilter && poStatusFilter !== "all") params.append("poStatus", poStatusFilter)
      params.append("sortBy", sortBy)
      params.append("sortOrder", sortOrder)

      const res = await fetch(`/api/quotations?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch quotations")
      const json = await res.json()
      if (json.data) {
        setQuotations(json.data)
        setTotalPages(json.totalPages)
      } else {
        setQuotations(json)
      }
    } catch (error) {
      console.error("Error fetching quotations:", error)
      toast.error("Failed to load quotations. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [currentPage, limit, searchTerm, statusFilter, segmentFilter, poStatusFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchQuotations()
  }, [fetchQuotations])

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setSegmentFilter("all")
    setPoStatusFilter("all")
    setSortBy("quotationNumber")
    setSortOrder("desc")
    setCurrentPage(1)
  }

  const getStatusBadge = (status: string, revisionNumber?: number) => {
    let resolvedStatus = status
    if (status === "APPROVED") resolvedStatus = "CLIENT_APPROVED"
    else if (status === "QUOTE_CREATED") resolvedStatus = "SUBMITTED"
    else if (status === "PO_CONVERTED") resolvedStatus = "PO_RECEIVED"

    const label = STATUS_LABELS[resolvedStatus] || resolvedStatus
    const badgeClass = STATUS_BADGES[resolvedStatus] || "bg-zinc-100 text-zinc-800 border-zinc-200"
    return <Badge className={`${badgeClass} font-semibold border hover:opacity-90`}>{label}</Badge>
  }

  const getCombinedWorkflowStatusBadge = (status: string, costingStatus?: string | null) => {
    const normalizedStatus = (status || "").toUpperCase()
    const normalizedCosting = (costingStatus || "").toUpperCase()

    if (normalizedStatus === "APPROVED" || normalizedStatus === "CLIENT_APPROVED") {
      return <Badge className="bg-emerald-800 text-white font-bold border-emerald-900 shadow-2xs">Client Approved</Badge>
    }
    if (normalizedStatus === "CLOSED" || normalizedStatus === "REJECTED") {
      return <Badge className="bg-slate-700 text-white font-semibold">Closed</Badge>
    }

    if (normalizedCosting === "COSTING_REVISION_REQUESTED") {
      return <Badge className="bg-rose-600 text-white font-bold border-rose-700 animate-bounce shadow-2xs">Revision Requested</Badge>
    }
    if (normalizedCosting === "REOPENED_FOR_COSTING") {
      return <Badge className="bg-indigo-600 text-white font-bold border-indigo-700 shadow-2xs">Reopened for Costing</Badge>
    }
    if (normalizedCosting === "COSTING_COMPLETED") {
      return <Badge className="bg-emerald-600 text-white font-bold border-emerald-700 shadow-2xs">Costing Completed</Badge>
    }
    if (normalizedCosting === "PARTIALLY_COSTED") {
      return <Badge className="bg-purple-600 text-white font-bold border-purple-700 shadow-2xs">Partially Costed</Badge>
    }
    if (normalizedCosting === "COSTING_IN_PROGRESS" || normalizedCosting === "UNDER_COSTING") {
      return <Badge className="bg-blue-600 text-white font-bold border-blue-700 shadow-2xs">Under Costing</Badge>
    }
    if (normalizedCosting === "PENDING_COSTING" || normalizedCosting === "ADDED_FOR_COSTING") {
      return <Badge className="bg-orange-500 text-white font-bold border-orange-600 animate-pulse shadow-2xs">Pending Costing</Badge>
    }

    if (normalizedStatus === "SENT_TO_CLIENT" || normalizedStatus === "ACTIVE" || normalizedStatus === "SUBMITTED") {
      return <Badge className="bg-teal-700 text-white font-bold border-teal-800 shadow-2xs">Active Quotation</Badge>
    }

    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-300 font-semibold">Draft</Badge>
  }

  const handleUpdateStatus = async (id: string, newStatus: string, field: "status" | "poStatus") => {
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newStatus }),
      })

      if (!res.ok) throw new Error("Failed to update status")
      const updated = await res.json()

      setQuotations((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...updated } : q))
      )
      toast.success("Status updated successfully!")
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update status.")
    }
  }

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(quotations.map(q => q.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected quotation(s)? This cannot be undone.`)) return

    setIsDeleting(true)
    try {
      const res = await fetch("/api/quotations/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to delete quotations")
      }

      toast.success(`Successfully deleted ${selectedIds.length} quotation(s)`)
      
      setQuotations(prev => prev.filter(q => !selectedIds.includes(q.id)))
      setSelectedIds([])
    } catch (error: any) {
      console.error("Error deleting quotations:", error)
      toast.error(error.message || "Failed to delete quotations.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground">
            Generate and track sales quotations, PDF archives, and SharePoint storage.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {isSuperAdmin && (
            <Button variant="outline" className="border-orange-500/30 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10" onClick={() => setIsBulkUploadOpen(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
          )}
          {canCreate && (
            <a href="/quotations/new">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Create Quotation
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex items-center flex-1 max-w-xl">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3" />
            <Input
              placeholder="Search quotations, clients, projects..."
              className="pl-9 bg-background border-zinc-200 dark:border-zinc-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdminOrSuperAdmin && selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="shrink-0 h-9"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete Selected ({selectedIds.length})
              </Button>
            )}
            {(searchTerm || statusFilter !== "all" || segmentFilter !== "all" || poStatusFilter !== "all" || sortBy !== "quotationNumber" || sortOrder !== "desc") && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-xs border-zinc-200 dark:border-zinc-800"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || "all"); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 w-full bg-background border-zinc-200 dark:border-zinc-800"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="REVISED">Revised</SelectItem>
                <SelectItem value="SENT_TO_CLIENT">Sent to Client</SelectItem>
                <SelectItem value="CLIENT_REVIEWING">Client Reviewing</SelectItem>
                <SelectItem value="CLIENT_APPROVED">Client Approved</SelectItem>
                <SelectItem value="CLIENT_CONFIRMED">Client Confirmed</SelectItem>
                <SelectItem value="CLIENT_REJECTED">Client Rejected</SelectItem>
                <SelectItem value="UNDER_PRODUCTION">Under Production</SelectItem>
                <SelectItem value="READY_FOR_DELIVERY">Ready for Delivery</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="PO_RECEIVED">PO Received</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Segment</label>
            <Select value={segmentFilter} onValueChange={(val) => { setSegmentFilter(val || "all"); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 w-full bg-background border-zinc-200 dark:border-zinc-800"><SelectValue placeholder="All Segments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="Interior">Interior</SelectItem>
                <SelectItem value="Dealer">Dealer</SelectItem>
                <SelectItem value="Project">Direct</SelectItem>
                <SelectItem value="Special">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">PO Status</label>
            <Select value={poStatusFilter} onValueChange={(val) => { setPoStatusFilter(val || "all"); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 w-full bg-background border-zinc-200 dark:border-zinc-800"><SelectValue placeholder="All PO Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PO Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sort By</label>
            <Select value={sortBy} onValueChange={(val) => { setSortBy(val || "quotationNumber"); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 w-full bg-background border-zinc-200 dark:border-zinc-800"><SelectValue placeholder="Quotation No." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quotationNumber">Quotation No.</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="grandTotal">Total Amount</SelectItem>
                <SelectItem value="client">Client Name</SelectItem>
                <SelectItem value="preparedBy">Prepared By</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Order</label>
            <Select value={sortOrder} onValueChange={(val) => { setSortOrder((val as "asc" | "desc") || "desc"); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 w-full bg-background border-zinc-200 dark:border-zinc-800"><SelectValue placeholder="Descending" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading quotations...</p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-lg font-medium">No quotations found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all" || segmentFilter !== "all" || poStatusFilter !== "all" 
                ? "Try searching or filtering with a different term/value" 
                : "Click 'Create Quotation' to get started"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[1000px]">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    {isAdminOrSuperAdmin && (
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedIds.length > 0 && selectedIds.length === quotations.length}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    <TableHead>Quote No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client & Project</TableHead>
                    <TableHead>Interior Design Consultant (IDC)</TableHead>
                    <TableHead className="text-right">Total Amount (AED)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Costing Status</TableHead>
                    <TableHead>PO Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((quote) => (
                    <TableRow key={quote.id} className="hover:bg-muted/30 transition-colors">
                      {isAdminOrSuperAdmin && (
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.includes(quote.id)}
                            onCheckedChange={(checked) => handleSelectOne(checked as boolean, quote.id)}
                            aria-label={`Select ${quote.quotationNumber}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono font-medium text-primary">
                        <span 
                          className="cursor-pointer hover:underline text-blue-600"
                          onClick={() => {
                            setJourneyQuoteId(quote.id)
                            setIsJourneyOpen(true)
                          }}
                        >
                          {quote.quotationNumber}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(quote.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</TableCell>
                      <TableCell>
                        <div className="font-semibold">{quote.client.companyName}</div>
                        <div className="text-xs text-muted-foreground">{quote.projectName || "Office Furnishing"}</div>
                      </TableCell>
                      <TableCell>{quote.preparedBy?.name || "Sales Rep"}</TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {quote.grandTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>{getCombinedWorkflowStatusBadge(quote.status, quote.costingStatus)}</TableCell>
                      <TableCell>
                        {quote.costingStatus === "COSTING_REVISION_REQUESTED" ? (
                          <Badge className="bg-rose-600 text-white font-semibold">Revision Requested</Badge>
                        ) : quote.costingStatus === "PENDING_COSTING" ? (
                          <Badge className="bg-orange-500 text-white font-semibold">Pending Costing</Badge>
                        ) : quote.costingStatus === "COSTING_IN_PROGRESS" || quote.costingStatus === "UNDER_COSTING" ? (
                          <Badge className="bg-blue-600 text-white font-semibold">Under Costing</Badge>
                        ) : quote.costingStatus === "PARTIALLY_COSTED" ? (
                          <Badge className="bg-purple-600 text-white font-semibold">Partially Costed</Badge>
                        ) : quote.costingStatus === "COSTING_COMPLETED" ? (
                          <Badge className="bg-emerald-600 text-white font-semibold">Costing Completed</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Standard</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {quote.poStatus === "RECEIVED" ? (
                          <Badge variant="outline" className="border-green-600 text-green-600 font-medium">
                            PO Received
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {/* Approve button for managers if pending approval */}
                          {quote.status === "PENDING_APPROVAL" && isManagerOrAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-green-50 text-green-600 hover:text-green-700"
                              title="Approve Quotation"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/quotations/${quote.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "APPROVE" }),
                                  })
                                  if (!res.ok) throw new Error("Failed to approve")
                                  const updated = await res.json()
                                  setQuotations(prev => prev.map(q => q.id === quote.id ? { ...q, ...updated } : q))
                                  toast.success("Quotation approved successfully!")
                                } catch (e) {
                                  toast.error("Failed to approve quotation.")
                                }
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Download PDF directly */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-muted"
                            title={quote.status === "PENDING_APPROVAL" && !canEdit ? "Pending Approval (Locked)" : "Download PDF"}
                            disabled={quote.status === "PENDING_APPROVAL" && !canEdit}
                            onClick={() => window.open(`/api/quotations/${(quote as any).activeQuotationId || quote.id}/pdf`, "_blank")}
                          >
                            {quote.status === "PENDING_APPROVAL" && !canEdit ? (
                              <Lock className="h-4 w-4 text-muted-foreground/60" />
                            ) : (
                              <FileDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>

                          {/* SharePoint folder link */}
                          {quote.sharepointUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-muted"
                              title={quote.status === "PENDING_APPROVAL" && !canEdit ? "Pending Approval (Locked)" : "Open SharePoint Folder"}
                              disabled={quote.status === "PENDING_APPROVAL" && !canEdit}
                              onClick={() => window.open(quote.sharepointUrl || "", "_blank")}
                            >
                              <FolderOpen className={`h-4 w-4 ${quote.status === "PENDING_APPROVAL" && !canEdit ? "text-muted-foreground/60" : "text-yellow-600"}`} />
                            </Button>
                          )}

                          {/* Preview button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-muted text-blue-600 hover:text-blue-700"
                            title="Preview Quotation"
                            onClick={() => window.open(`/quotations/${(quote as any).activeQuotationId || quote.id}/preview`, "_blank")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Update or Revise button based on status */}
                          {quote.status === "DRAFT" ? (
                            <Link href={`/quotations/new?editId=${(quote as any).activeQuotationId || quote.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted text-amber-600 hover:text-amber-700"
                                title="Update Draft Quotation"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/quotations/new?reviseId=${(quote as any).activeQuotationId || quote.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted text-purple-600 hover:text-purple-700"
                                title="Revise Quotation"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}

                          {/* Options Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 p-0 hover:bg-muted inline-flex items-center justify-center rounded-md cursor-pointer text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel>View Options</DropdownMenuLabel>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setJourneyQuoteId(quote.id)
                                  setIsJourneyOpen(true)
                                }}
                                className="flex items-center cursor-pointer font-medium"
                              >
                                <Map className="mr-2 h-4 w-4 text-blue-600" />
                                Quotation Journey
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setTargetStatusQuote({
                                    id: (quote as any).activeQuotationId || quote.id,
                                    quotationNumber: quote.quotationNumber,
                                    status: quote.status
                                  })
                                  setStatusModalOpen(true)
                                }}
                                className="flex items-center cursor-pointer font-medium"
                              >
                                <RefreshCw className="mr-2 h-4 w-4 text-emerald-600" />
                                Change Status...
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              {quote.status === "DRAFT" ? (
                                <Link href={`/quotations/new?editId=${(quote as any).activeQuotationId || quote.id}`}>
                                  <DropdownMenuItem className="flex items-center text-amber-600 focus:text-amber-600 focus:bg-amber-50 cursor-pointer">
                                    <Edit className="mr-2 h-4 w-4 text-amber-600" />
                                    Update Quotation
                                  </DropdownMenuItem>
                                </Link>
                              ) : (
                                <Link href={`/quotations/new?reviseId=${(quote as any).activeQuotationId || quote.id}`}>
                                  <DropdownMenuItem className="flex items-center text-purple-600 focus:text-purple-600 focus:bg-purple-50 cursor-pointer">
                                    <RefreshCw className="mr-2 h-4 w-4 text-purple-600" />
                                    Revise Quotation
                                  </DropdownMenuItem>
                                </Link>
                              )}

                              {isSuperAdmin && (
                                <DropdownMenuItem
                                  onClick={() => handleCopyQuote((quote as any).activeQuotationId || quote.id)}
                                  className="flex items-center text-teal-600 focus:text-teal-600 focus:bg-teal-50 cursor-pointer font-medium"
                                >
                                  <Copy className="mr-2 h-4 w-4 text-teal-600" />
                                  Copy Quotation (Super Admin)...
                                </DropdownMenuItem>
                              )}

                          {isSuperAdmin && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleOpenEditName(quote)}
                                className="flex items-center text-indigo-600 focus:text-indigo-600 focus:bg-indigo-50 cursor-pointer font-medium"
                              >
                                <Edit className="mr-2 h-4 w-4 text-indigo-600" />
                                Rename Revision...
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteSingleQuote(quote)}
                                className="flex items-center text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium"
                              >
                                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                Delete Revision...
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <div className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 hover:bg-slate-800 text-slate-300"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 hover:bg-slate-800 text-slate-300"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
        </>
      )}
    </div>

      <QuotationJourneyModal 
        quotationId={journeyQuoteId} 
        open={isJourneyOpen} 
        onOpenChange={(val) => {
          setIsJourneyOpen(val)
          if (!val) setJourneyQuoteId(null)
        }} 
        onConfirmed={fetchQuotations}
      />

      <QuotationStatusModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        quotation={targetStatusQuote}
        onSuccess={() => {
          fetchQuotations()
          // Dispatch a background event to update other metrics
          window.dispatchEvent(new Event("dashboard-refresh"))
        }}
      />



      {/* Replace Confirmation Modal */}
      <Dialog open={isReplaceDialogOpen} onOpenChange={setIsReplaceDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              Confirm Replacement
            </DialogTitle>
            <DialogDescription className="text-sm">
              A quotation revision (<strong>{conflictingQuoteNo}</strong>) is already marked as Client Approved. Do you want to replace the confirmed quotation?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => {
              setIsReplaceDialogOpen(false)
              setTargetQuoteToConfirm(null)
            }}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={() => {
              if (targetQuoteToConfirm) {
                handleConfirmQuote(targetQuoteToConfirm.id, true)
              }
            }}>
              Replace Confirmed Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <QuotationBulkUploadModal 
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={() => {
          setIsBulkUploadOpen(false)
          fetchQuotations()
        }}
      />

      {/* Edit Quotation Name / Number Modal (Super Admin) */}
      <Dialog open={!!editNameQuote} onOpenChange={(open) => !open && setEditNameQuote(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Rename Revision / Edit Identifier
            </DialogTitle>
            <DialogDescription>
              As Super Admin, you can edit the identifier name or number for this quotation revision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Quotation Number / Name</label>
              <Input
                value={newQuotationNumber}
                onChange={(e) => setNewQuotationNumber(e.target.value)}
                placeholder="e.g. P1001-1 or Custom Name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newQuotationNumber.trim() && !isUpdatingName) {
                    handleSaveQuotationName()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditNameQuote(null)} disabled={isUpdatingName}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuotationName} disabled={isUpdatingName || !newQuotationNumber.trim()}>
              {isUpdatingName ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Revision Confirmation Modal (Super Admin) */}
      <Dialog open={!!deleteSingleQuote} onOpenChange={(open) => !open && setDeleteSingleQuote(null)}>
        <DialogContent className="sm:max-w-md border-destructive/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              Delete Revision (Super Admin)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Are you sure you want to delete quotation revision <span className="font-mono font-bold text-foreground">{deleteSingleQuote?.quotationNumber}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteSingleQuote(null)} disabled={isDeletingSingle}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDeleteSingle} disabled={isDeletingSingle} className="font-bold">
              {isDeletingSingle ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Revision"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
