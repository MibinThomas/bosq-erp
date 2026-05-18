"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, FileDown, Eye, Loader2, FolderOpen } from "lucide-react"

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
import { toast } from "sonner"
import { MoreHorizontal } from "lucide-react"

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
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    async function fetchQuotations() {
      try {
        const res = await fetch("/api/quotations")
        if (!res.ok) throw new Error("Failed to fetch quotations")
        const data = await res.json()
        setQuotations(data)
      } catch (error) {
        console.error("Error fetching quotations:", error)
        toast.error("Failed to load quotations. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    fetchQuotations()
  }, [])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="flex items-center justify-between">
        <div className="relative flex items-center w-full max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3" />
          <Input
            placeholder="Search quotations, clients, projects..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Quote No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client & Project</TableHead>
                <TableHead>Salesperson</TableHead>
                <TableHead className="text-right">Total Amount (AED)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PO Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotations.map((quote) => (
                <TableRow key={quote.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono font-medium text-primary">
                    {quote.quotationNumber}
                    {quote.revisionNumber > 0 ? `-${quote.revisionNumber}` : ""}
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
                      {/* Download PDF directly */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted"
                        title="Download PDF"
                        onClick={() => window.open(`/api/quotations/${quote.id}/pdf`, "_blank")}
                      >
                        <FileDown className="h-4 w-4 text-muted-foreground" />
                      </Button>

                      {/* SharePoint folder link */}
                      {quote.sharepointUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-muted"
                          title="Open SharePoint Folder"
                          onClick={() => window.open(quote.sharepointUrl || "", "_blank")}
                        >
                          <FolderOpen className="h-4 w-4 text-yellow-600" />
                        </Button>
                      )}

                      {/* Options Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 hover:bg-muted inline-flex items-center justify-center rounded-md cursor-pointer text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "APPROVED", "status")}>
                            Mark Approved
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "SENT", "status")}>
                            Mark Sent
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "FOLLOW_UP", "status")}>
                            Mark Follow-up
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>PO Tracking</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "RECEIVED", "poStatus")}>
                            PO Received
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, "PENDING", "poStatus")}>
                            PO Pending
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
