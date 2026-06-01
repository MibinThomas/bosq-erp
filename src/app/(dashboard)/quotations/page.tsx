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
  
  const [historyQuote, setHistoryQuote] = useState<Quotation | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [journeyQuoteId, setJourneyQuoteId] = useState<string | null>(null)
  const [isJourneyOpen, setIsJourneyOpen] = useState(false)

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
      case "APPROVED":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white font-medium">Approved</Badge>
      case "PENDING_APPROVAL":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center gap-1 w-fit">
            <Lock className="h-3 w-3" /> Pending Approval
          </Badge>
        )
      case "SENT":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Sent</Badge>
      case "DRAFT":
        return <Badge variant="outline" className="text-gray-500 font-medium">Draft</Badge>
      case "REJECTED":
        return <Badge variant="destructive" className="font-medium">Rejected</Badge>
      case "REVISED":
        return <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-medium">Revised</Badge>
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
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "APPROVED", "status")} className="cursor-pointer">
                            Mark Approved
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "SENT", "status")} className="cursor-pointer">
                            Mark Sent
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "FOLLOW_UP", "status")} className="cursor-pointer">
                            Mark Follow-up
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>PO Tracking</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "RECEIVED", "poStatus")} className="cursor-pointer">
                            PO Received
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "PENDING", "poStatus")} className="cursor-pointer">
                            PO Pending
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {quote.status === "PENDING_APPROVAL" ? (
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
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <History className="h-5 w-5 text-purple-600" />
              Quotation Revision History
            </DialogTitle>
            <DialogDescription className="text-sm">
              Full audit log and revision timeline for **{historyQuote?.quotationNumber}**
            </DialogDescription>
          </DialogHeader>

          {historyQuote && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/30 border rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Client:</span>
                  <span>{historyQuote.client.companyName}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Active Version:</span>
                  <span>Revision #{historyQuote.revisionNumber}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Current Total:</span>
                  <span className="font-mono">AED {historyQuote.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {!historyQuote.revisions || historyQuote.revisions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm space-y-1">
                  <p className="font-semibold">No revisions yet</p>
                  <p className="text-xs">This is the original quotation version (Revision #0).</p>
                </div>
              ) : (
                <div className="relative border-l pl-4 ml-2 space-y-5">
                  {/* Current Active Version Indicator */}
                  <div className="relative">
                    <div className="absolute -left-[21px] mt-1 h-3 w-3 rounded-full bg-green-500 ring-4 ring-background" />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-green-600">Active (Revision #{historyQuote.revisionNumber})</span>
                        <span className="text-muted-foreground">Current</span>
                      </div>
                      <p className="text-sm font-semibold">Active Finalized Quotation</p>
                    </div>
                  </div>

                  {/* Map revisions */}
                  {historyQuote.revisions.map((rev) => (
                    <div key={rev.id} className="relative">
                      <div className="absolute -left-[21px] mt-1 h-3 w-3 rounded-full bg-purple-600 ring-4 ring-background" />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-purple-700">Revision #{rev.revisionNumber}</span>
                          <span className="text-muted-foreground font-mono">
                            {new Date(rev.revisionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-muted-foreground bg-purple-50 dark:bg-purple-950/20 p-2.5 rounded border border-purple-100 dark:border-purple-900/50 mt-1 italic">
                          &ldquo;{rev.notes || "Revised quotation details"}&rdquo;
                        </div>
                        <div className="flex justify-between text-xs pt-1 font-mono">
                          <span className="text-muted-foreground">Amount Shifted:</span>
                          <span>
                            AED {rev.previousTotal.toLocaleString()} &rarr; AED {rev.newTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
