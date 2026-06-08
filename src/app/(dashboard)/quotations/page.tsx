"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, FileDown, Eye, Loader2, FolderOpen, History, RefreshCw, Lock, Check, AlertCircle, Edit, Map } from "lucide-react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { QuotationJourneyModal } from "@/components/quotations/QuotationJourneyModal"

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
  subtotal: number
  grandTotal: number
  sharepointUrl: string | null
  revisionNumber: number
  client: {
    companyName: string
  }
  preparedBy: {
    name: string | null
  }
  revisions: QuotationRevision[]
}

export default function QuotationsPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER"

  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 20
  
  const [historyQuote, setHistoryQuote] = useState<any | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [journeyQuoteId, setJourneyQuoteId] = useState<string | null>(null)
  const [isJourneyOpen, setIsJourneyOpen] = useState(false)

  const [userPermissions, setUserPermissions] = useState<any>(null)
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false)
  const [conflictingQuoteNo, setConflictingQuoteNo] = useState("")
  const [targetQuoteToConfirm, setTargetQuoteToConfirm] = useState<any | null>(null)

  useEffect(() => {
    fetch("/api/users/me/permissions")
      .then(res => res.json())
      .then(data => {
        if (data && data.permissions) {
          setUserPermissions(data.permissions.QUOTATIONS || {})
        }
      })
      .catch(err => console.error("Failed to load permissions", err))
  }, [])

  const isSuperAdmin = userRole === "SUPER_ADMIN"
  const isAuthorizedToConfirm = isSuperAdmin || isManagerOrAdmin || (userPermissions?.canConfirmQuotation === true)

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
          const conflictingQuote = quotations.find(q => q.id === quoteId) || (historyQuote?.seriesQuotations?.find((q: any) => q.id === quoteId))
          if (conflictingQuote) {
            setTargetQuoteToConfirm(conflictingQuote)
          }
          setConflictingQuoteNo(data.confirmedQuotationNumber)
          setIsReplaceDialogOpen(true)
          return
        }
        throw new Error(data.error || "Failed to confirm quotation")
      }

      // Update local state in lists
      setQuotations((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, ...data } : q))
      )

      if (historyQuote && (historyQuote.id === quoteId || historyQuote.parentId === data.parentId || historyQuote.id === data.parentId)) {
        // Re-fetch details to sync the revisions modal state
        const hRes = await fetch(`/api/quotations/${historyQuote.id}`)
        if (hRes.ok) {
          const hData = await hRes.json()
          setHistoryQuote(hData)
        }
      }

      setIsReplaceDialogOpen(false)
      setTargetQuoteToConfirm(null)
      toast.success("Quotation marked as Client Confirmed successfully!")
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm quotation.")
    }
  }

  // Effect to load full details including seriesQuotations when revision modal opens
  useEffect(() => {
    if (isHistoryOpen && historyQuote) {
      const loadHistoryDetails = async () => {
        try {
          const res = await fetch(`/api/quotations/${historyQuote.id}`)
          if (res.ok) {
            const data = await res.json()
            setHistoryQuote(data)
          }
        } catch (err) {
          console.error("Failed to load full quotation history:", err)
        }
      }
      loadHistoryDetails()
    }
  }, [isHistoryOpen])

  useEffect(() => {
    async function fetchQuotations() {
      try {
        setLoading(true)
        const res = await fetch(`/api/quotations?page=${currentPage}&limit=${limit}`)
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
    }
    fetchQuotations()
  }, [currentPage])

  // Filter quotations dynamically
  const filteredQuotations = quotations.filter((quote) => {
    const term = searchTerm.toLowerCase()
    return (
      quote.quotationNumber.toLowerCase().includes(term) ||
      quote.client.companyName.toLowerCase().includes(term) ||
      (quote.projectName && quote.projectName.toLowerCase().includes(term))
    )
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CLIENT_CONFIRMED":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-1 shrink-0"><Check size={11} />Client Confirmed Quote</Badge>
      case "APPROVED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">Client Approved</Badge>
      case "SENT":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Sent to Client</Badge>
      case "DRAFT":
        return <Badge variant="outline" className="text-gray-500 font-medium border-gray-300">Quote Created</Badge>
      case "REJECTED":
        return <Badge variant="destructive" className="font-medium">Rejected</Badge>
      case "REVISED":
        return <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-medium">Quote Revised</Badge>
      case "PO_RECEIVED":
        return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">PO Received</Badge>
      case "UNDER_PRODUCTION":
        return <Badge className="bg-orange-600 hover:bg-orange-700 text-white font-medium">Under Production</Badge>
      default:
        return <Badge className="font-medium">{status}</Badge>
    }
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

      // Update state
      setQuotations((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...updated } : q))
      )
      toast.success("Status updated successfully!")
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update status.")
    }
  }

  // --- Bulk Delete Logic (Admin Only) ---
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredQuotations.map(q => q.id))
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
      
      // Update local state
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
        <Link href="/quotations/new">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Create Quotation
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:max-w-md">
          <div className="relative flex items-center w-full">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3" />
            <Input
              placeholder="Search quotations, clients, projects..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {userRole === "ADMIN" && selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="shrink-0"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete Selected ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading quotations...</p>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-lg font-medium">No quotations found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "Try searching with a different term" : "Click 'Create Quotation' to get started"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[1000px]">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    {userRole === "ADMIN" && (
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedIds.length > 0 && selectedIds.length === filteredQuotations.length}
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
                    <TableHead>PO Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.map((quote) => (
                    <TableRow key={quote.id} className="hover:bg-muted/30 transition-colors">
                      {userRole === "ADMIN" && (
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.includes(quote.id)}
                            onCheckedChange={(checked) => handleSelectOne(checked as boolean, quote.id)}
                            aria-label={`Select ${quote.quotationNumber}`}
                          />
                        </TableCell>
                      )}
                  <TableCell className="font-mono font-medium text-primary">
                    {userRole === "ADMIN" ? (
                      <span 
                        className="cursor-pointer hover:underline text-blue-600"
                        onClick={() => {
                          setJourneyQuoteId(quote.id)
                          setIsJourneyOpen(true)
                        }}
                      >
                        {quote.quotationNumber}
                      </span>
                    ) : (
                      quote.quotationNumber
                    )}
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
                  <TableCell>{getStatusBadge(quote.status)}</TableCell>
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
                        title={quote.status === "PENDING_APPROVAL" && userRole === "SALES_EXECUTIVE" ? "Pending Approval (Locked)" : "Download PDF"}
                        disabled={quote.status === "PENDING_APPROVAL" && userRole === "SALES_EXECUTIVE"}
                        onClick={() => window.open(`/api/quotations/${quote.id}/pdf`, "_blank")}
                      >
                        {quote.status === "PENDING_APPROVAL" && userRole === "SALES_EXECUTIVE" ? (
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
                          title={quote.status === "PENDING_APPROVAL" && userRole === "SALES_EXECUTIVE" ? "Pending Approval (Locked)" : "Open SharePoint Folder"}
                          disabled={quote.status === "PENDING_APPROVAL" && userRole === "SALES_EXECUTIVE"}
                          onClick={() => window.open(quote.sharepointUrl || "", "_blank")}
                        >
                          <FolderOpen className={`h-4 w-4 ${quote.status === "PENDING_APPROVAL" && userRole === "SALES_EXECUTIVE" ? "text-muted-foreground/60" : "text-yellow-600"}`} />
                        </Button>
                      )}

                      {/* Preview button - always visible for all quotations */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted text-blue-600 hover:text-blue-700"
                        title="Preview Quotation"
                        onClick={() => window.open(`/quotations/${quote.id}/preview`, "_blank")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Update or Revise button based on status */}
                      {quote.status === "PENDING_APPROVAL" ? (
                        <Link href={`/quotations/new?editId=${quote.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-muted text-amber-600 hover:text-amber-700"
                            title="Update Quotation"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/quotations/new?reviseId=${quote.id}`}>
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
                              setHistoryQuote(quote)
                              setIsHistoryOpen(true)
                            }}
                            className="flex items-center cursor-pointer"
                          >
                            <History className="mr-2 h-4 w-4 text-purple-600" />
                            Revision History
                          </DropdownMenuItem>
                          
                          {userRole === "ADMIN" && (
                            <DropdownMenuItem 
                              onClick={() => {
                                setJourneyQuoteId(quote.id)
                                setIsJourneyOpen(true)
                              }}
                              className="flex items-center cursor-pointer font-medium"
                            >
                              <Map className="mr-2 h-4 w-4 text-blue-600" />
                              View Journey
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "DRAFT", "status")} className="cursor-pointer">
                            Mark Quote Created
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "REVISED", "status")} className="cursor-pointer">
                            Mark Quote Revised
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "SENT", "status")} className="cursor-pointer">
                            Mark Sent to Client
                          </DropdownMenuItem>
                          {isAuthorizedToConfirm && !["CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED", "CANCELLED"].includes(quote.status) && (
                            <DropdownMenuItem onClick={() => handleConfirmQuote(quote.id, false)} className="cursor-pointer font-semibold text-green-700 focus:text-green-700 focus:bg-green-50">
                              <Check className="mr-2 h-4 w-4 text-green-600" />
                              Mark as Client Confirmed
                            </DropdownMenuItem>
                          )}
                          {quote.status === "CLIENT_CONFIRMED" && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "PO_RECEIVED", "status")} className="cursor-pointer">
                              Mark PO Received
                            </DropdownMenuItem>
                          )}
                          {(quote.status === "CLIENT_CONFIRMED" || quote.status === "PO_RECEIVED") && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "UNDER_PRODUCTION", "status")} className="cursor-pointer">
                              Mark Under Production
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {quote.status === "DRAFT" || quote.status === "PENDING_APPROVAL" ? (
                            <Link href={`/quotations/new?editId=${quote.id}`}>
                              <DropdownMenuItem className="flex items-center text-amber-600 focus:text-amber-600 focus:bg-amber-50 cursor-pointer">
                                <Edit className="mr-2 h-4 w-4 text-amber-600" />
                                Update Quotation
                              </DropdownMenuItem>
                            </Link>
                          ) : (
                            <Link href={`/quotations/new?reviseId=${quote.id}`}>
                              <DropdownMenuItem className="flex items-center text-purple-600 focus:text-purple-600 focus:bg-purple-50 cursor-pointer">
                                <RefreshCw className="mr-2 h-4 w-4 text-purple-600" />
                                Revise Quotation
                              </DropdownMenuItem>
                            </Link>
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
      />

      {/* Revision History Modal */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="w-[90vw] sm:max-w-[720px] md:max-w-[800px] lg:max-w-[850px] rounded-xl overflow-hidden flex flex-col max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <History className="h-5 w-5 text-purple-600" />
              Quotation Revision History
            </DialogTitle>
            <DialogDescription className="text-sm">
              Full revisions and confirmation status for Quotation Series: **{historyQuote?.quotationNumber?.split("-")[0]}**
            </DialogDescription>
          </DialogHeader>

          {historyQuote && (
            <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/40 border border-zinc-150 dark:border-zinc-800 rounded-xl p-4 text-sm">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</span>
                  <div className="font-bold text-foreground truncate">{historyQuote.client?.companyName}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Version</span>
                  <div className="font-bold text-foreground">
                    Revision #{historyQuote.revisionNumber}{" "}
                    <span className="text-xs font-normal text-muted-foreground">({historyQuote.quotationNumber})</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Total</span>
                  <div className="font-mono font-bold text-primary text-base">
                    AED {historyQuote.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {!historyQuote.seriesQuotations || historyQuote.seriesQuotations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                  <p className="font-semibold text-zinc-500 animate-pulse">Loading revisions...</p>
                </div>
              ) : (
                <>
                  {/* Desktop view: Table */}
                  <div className="hidden md:block border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-card">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs table-fixed">
                      <thead className="bg-muted/50 text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-3 w-[22%]">Revision</th>
                          <th className="p-3 w-[18%]">Date</th>
                          <th className="p-3 w-[22%] text-right">Value</th>
                          <th className="p-3 w-[22%] text-center">Status</th>
                          <th className="p-3 w-[16%] text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {historyQuote.seriesQuotations.map((item: any) => {
                          const isConfirmed = item.status === "CLIENT_CONFIRMED"
                          const isProgressed = ["PO_RECEIVED", "UNDER_PRODUCTION"].includes(item.status)

                          let displayStatus = item.status
                          if (item.status === "CLIENT_CONFIRMED") displayStatus = "Client Confirmed"
                          else if (item.status === "PO_RECEIVED") displayStatus = "PO Received"
                          else if (item.status === "UNDER_PRODUCTION") displayStatus = "Under Production"
                          else if (item.status === "REVISED") displayStatus = "Revised"
                          else if (item.status === "APPROVED") displayStatus = "Approved"
                          else if (item.status === "REJECTED") displayStatus = "Rejected"
                          else if (item.status === "CANCELLED") displayStatus = "Cancelled"
                          else if (item.status === "DRAFT") displayStatus = "Draft"

                          // Show Not Selected if another quote is confirmed
                          const hasConfirmedInSeries = historyQuote.seriesQuotations.some((q: any) =>
                            ["CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION"].includes(q.status)
                          )
                          if (hasConfirmedInSeries && !["CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION"].includes(item.status)) {
                            displayStatus = "Not Selected"
                          }

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors duration-150 ${
                                isConfirmed
                                  ? "bg-green-50/40 dark:bg-green-950/15 hover:bg-green-50/60 dark:hover:bg-green-950/25 font-semibold text-green-900 dark:text-green-300"
                                  : isProgressed
                                  ? "bg-blue-50/20 dark:bg-blue-950/10 hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                                  : displayStatus === "Not Selected"
                                  ? "opacity-80 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 text-muted-foreground"
                                  : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10"
                              }`}
                            >
                              <td className="p-3 font-semibold font-mono truncate">{item.quotationNumber}</td>
                              <td className="p-3 whitespace-nowrap">
                                {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </td>
                              <td className="p-3 text-right font-mono font-medium">
                                AED {item.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-center">
                                {isConfirmed ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30 shadow-xs">
                                    <Check className="h-3 w-3 shrink-0" /> Client Confirmed
                                  </span>
                                ) : displayStatus === "Not Selected" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500 border border-zinc-200/50 dark:border-zinc-700/50">
                                    Not Selected
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
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex flex-col items-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 w-fit"
                                    onClick={() => window.open(`/quotations/${item.id}/preview`, "_blank")}
                                  >
                                    View
                                  </Button>

                                  {isAuthorizedToConfirm && !["CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED", "CANCELLED"].includes(item.status) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1.5 text-[10px] font-bold text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 w-fit"
                                      onClick={() => handleConfirmQuote(item.id, false)}
                                    >
                                      Confirm
                                    </Button>
                                  )}

                                  {item.status === "CLIENT_CONFIRMED" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 w-fit"
                                      onClick={() => handleUpdateStatus(item.id, "PO_RECEIVED", "status")}
                                    >
                                      Convert to PO
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile/Tablet view: Stacked Cards */}
                  <div className="md:hidden space-y-3">
                    {historyQuote.seriesQuotations.map((item: any) => {
                      const isConfirmed = item.status === "CLIENT_CONFIRMED"
                      const isProgressed = ["PO_RECEIVED", "UNDER_PRODUCTION"].includes(item.status)

                      let displayStatus = item.status
                      if (item.status === "CLIENT_CONFIRMED") displayStatus = "Client Confirmed"
                      else if (item.status === "PO_RECEIVED") displayStatus = "PO Received"
                      else if (item.status === "UNDER_PRODUCTION") displayStatus = "Under Production"
                      else if (item.status === "REVISED") displayStatus = "Revised"
                      else if (item.status === "APPROVED") displayStatus = "Approved"
                      else if (item.status === "REJECTED") displayStatus = "Rejected"
                      else if (item.status === "CANCELLED") displayStatus = "Cancelled"
                      else if (item.status === "DRAFT") displayStatus = "Draft"

                      const hasConfirmedInSeries = historyQuote.seriesQuotations.some((q: any) =>
                        ["CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION"].includes(q.status)
                      )
                      if (hasConfirmedInSeries && !["CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION"].includes(item.status)) {
                        displayStatus = "Not Selected"
                      }

                      return (
                        <div
                          key={item.id}
                          className={`p-4 border rounded-xl space-y-3 transition-colors duration-150 ${
                            isConfirmed
                              ? "bg-green-50/40 dark:bg-green-950/15 border-green-300 dark:border-green-800"
                              : isProgressed
                              ? "bg-blue-50/10 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900"
                              : displayStatus === "Not Selected"
                              ? "bg-zinc-50/50 dark:bg-zinc-900/50 opacity-90 border-zinc-200 dark:border-zinc-850 text-muted-foreground"
                              : "bg-card text-card-foreground border-zinc-200 dark:border-zinc-800"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-sm font-mono text-foreground">{item.quotationNumber}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                            </div>
                            <div>
                              {isConfirmed ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30 shadow-xs">
                                  <Check className="h-3 w-3" /> Client Confirmed
                                </span>
                              ) : displayStatus === "Not Selected" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500 border border-zinc-200/50 dark:border-zinc-700/50">
                                  Not Selected
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

                          <div className="flex justify-between items-baseline pt-1">
                            <span className="text-xs text-muted-foreground">Total Value:</span>
                            <span className="font-mono font-bold text-sm text-foreground">
                              AED {item.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              onClick={() => window.open(`/quotations/${item.id}/preview`, "_blank")}
                            >
                              View
                            </Button>

                            {isAuthorizedToConfirm && !["CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED", "CANCELLED"].includes(item.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 font-semibold"
                                onClick={() => handleConfirmQuote(item.id, false)}
                              >
                                Confirm
                              </Button>
                            )}

                            {item.status === "CLIENT_CONFIRMED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-semibold"
                                onClick={() => handleUpdateStatus(item.id, "PO_RECEIVED", "status")}
                              >
                                Convert to PO
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Replace Confirmation Modal */}
      <Dialog open={isReplaceDialogOpen} onOpenChange={setIsReplaceDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              Confirm Replacement
            </DialogTitle>
            <DialogDescription className="text-sm">
              A quotation revision (<strong>{conflictingQuoteNo}</strong>) is already marked as Client Confirmed. Do you want to replace the confirmed quotation?
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
    </div>
  )
}
