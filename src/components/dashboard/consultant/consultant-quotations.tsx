"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, FileEdit, Download, MoreHorizontal, RefreshCw } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ConsultantQuotations({ quotations }: { quotations: any[] }) {
  
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, action: "UPDATE_STATUS" })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Quotation status updated successfully`)
        window.location.reload()
      } else {
        toast.error(data.error || "Failed to update status")
      }
    } catch (error) {
      console.error(error)
      toast.error("An error occurred while updating status")
    }
  }
  
  const getStatusBadge = (status: string, revisionNumber?: number) => {
    if (status === "DRAFT" && revisionNumber && revisionNumber > 1) {
      return <Badge variant="outline" className="bg-purple-100 text-purple-700">Revised</Badge>
    }
    switch (status) {
      case "DRAFT": return <Badge variant="outline" className="bg-slate-100 text-slate-700">Draft</Badge>
      case "QUOTE_CREATED": return <Badge variant="outline" className="bg-blue-100 text-blue-700">Quote Created</Badge>
      case "SUBMITTED": return <Badge variant="outline" className="bg-blue-100 text-blue-700">Submitted</Badge>
      case "SENT": return <Badge variant="outline" className="bg-blue-100 text-blue-700">Sent to Client</Badge>
      case "CLIENT_APPROVED":
      case "CLIENT_CONFIRMED":
      case "APPROVED": return <Badge variant="outline" className="bg-emerald-100 text-emerald-700">Client Approved</Badge>
      case "REJECTED": return <Badge variant="outline" className="bg-red-100 text-red-700">Rejected</Badge>
      case "CANCELLED": return <Badge variant="outline" className="bg-red-100 text-red-700">Cancelled</Badge>
      case "REVISED": return <Badge variant="outline" className="bg-purple-100 text-purple-700">Revised</Badge>
      case "PO_CONVERTED":
      case "PO_RECEIVED": return <Badge variant="outline" className="bg-indigo-100 text-indigo-700">Converted to PO</Badge>
      case "UNDER_PRODUCTION": return <Badge variant="outline" className="bg-orange-100 text-orange-700">Under Production</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(val)

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Recent Quotations</CardTitle>
        <Link href="/quotations">
          <Button variant="ghost" size="sm" className="text-primary">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {quotations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No recent quotations found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
                <tr>
                  <th className="px-4 py-3 rounded-tl-md">Quote #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right rounded-tr-md">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{q.quotationNumber}</td>
                    <td className="px-4 py-3 truncate max-w-[150px]" title={q.client?.companyName}>{q.client?.companyName || "-"}</td>
                    <td className="px-4 py-3 truncate max-w-[150px]" title={q.projectName}>{q.projectName || "-"}</td>
                    <td className="px-4 py-3">{new Date(q.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(q.subtotal || 0)}</td>
                    <td className="px-4 py-3">{getStatusBadge(q.status, q.revisionNumber)}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 hover:bg-muted inline-flex items-center justify-center rounded-md cursor-pointer text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>

                          {!["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED", "CANCELLED"].includes(q.status) && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(q.id, "CLIENT_APPROVED")} className="cursor-pointer font-semibold text-green-700 focus:text-green-700 focus:bg-green-50">
                              Mark Client Approved
                            </DropdownMenuItem>
                          )}
                          {["CLIENT_APPROVED", "CLIENT_CONFIRMED"].includes(q.status) && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(q.id, "PO_CONVERTED")} className="cursor-pointer">
                              Convert to PO
                            </DropdownMenuItem>
                          )}
                          {["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_CONVERTED", "PO_RECEIVED"].includes(q.status) && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(q.id, "UNDER_PRODUCTION")} className="cursor-pointer">
                              Mark Under Production
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleUpdateStatus(q.id, "REJECTED")} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                            Mark Rejected
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(q.id, "CANCELLED")} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                            Mark Cancelled
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <Link href={`/quotations/${q.id}`}>
                            <DropdownMenuItem className="flex items-center cursor-pointer">
                              <Eye className="mr-2 h-4 w-4 text-slate-600" />
                              View Details
                            </DropdownMenuItem>
                          </Link>
                          {q.status === "DRAFT" || q.status === "PENDING_APPROVAL" ? (
                            <Link href={`/quotations/new?editId=${q.id}`}>
                              <DropdownMenuItem className="flex items-center text-amber-600 focus:text-amber-600 focus:bg-amber-50 cursor-pointer">
                                <FileEdit className="mr-2 h-4 w-4 text-amber-600" />
                                Update Quotation
                              </DropdownMenuItem>
                            </Link>
                          ) : (
                            <Link href={`/quotations/new?reviseId=${q.id}`}>
                              <DropdownMenuItem className="flex items-center text-purple-600 focus:text-purple-600 focus:bg-purple-50 cursor-pointer">
                                <RefreshCw className="mr-2 h-4 w-4 text-purple-600" />
                                Revise Quotation
                              </DropdownMenuItem>
                            </Link>
                          )}
                          {q.pdfUrl && (
                            q.status !== "DRAFT" ? (
                              <a href={q.pdfUrl} target="_blank" rel="noopener noreferrer">
                                <DropdownMenuItem className="flex items-center text-blue-600 focus:text-blue-600 focus:bg-blue-50 cursor-pointer">
                                  <Download className="mr-2 h-4 w-4 text-blue-600" />
                                  Download PDF
                                </DropdownMenuItem>
                              </a>
                            ) : (
                              <DropdownMenuItem disabled title="Download PDF is disabled for Draft quotations" className="flex items-center text-slate-400 opacity-40 cursor-not-allowed">
                                <Download className="mr-2 h-4 w-4 text-slate-400" />
                                Download PDF (Draft)
                              </DropdownMenuItem>
                            )
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
