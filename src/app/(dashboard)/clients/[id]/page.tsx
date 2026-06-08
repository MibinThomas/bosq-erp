"use client"

import { useEffect, useState, use } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Hash,
  History,
  FileDown,
  Lock,
  Loader2,
  Folder,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Check,
  X,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface RevisionLog {
  id: string
  revisionNumber: number
  revisionDate: string
  previousTotal: number
  newTotal: number
  notes: string | null
}

interface QuotationItem {
  id: string
  itemNo: number
  description: string
  specifications: string | null
  quantity: number
  basePrice: number
  unitPrice: number
  discount: number
  margin: number
  amount: number
}

interface Quotation {
  id: string
  quotationNumber: string
  projectName: string | null
  date: string
  status: string
  poStatus: string | null
  paymentStatus: string | null
  grandTotal: number
  sharepointUrl: string | null
  revisionNumber: number
  items: QuotationItem[]
  preparedBy: {
    name: string | null
    role: string | null
  }
  revisionLogs: RevisionLog[]
}

interface ClientDetail {
  id: string
  clientId: string
  companyName: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  trn: string | null
  clientType: string | null
  notes: string | null
  sharepointFolder: string | null
  status: string
  quotations: Quotation[]
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER" || userRole === "SUPER_ADMIN"

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview")
  const [updatingStatus, setUpdatingStatus] = useState(false)

  async function handleStatusUpdate(newStatus: "Approved" | "Rejected") {
    try {
      setUpdatingStatus(true)
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: client?.companyName || "",
          status: newStatus,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update client status")

      toast.success(
        newStatus === "Approved"
          ? `Successfully approved client "${client?.companyName}"!`
          : `Client "${client?.companyName}" has been rejected.`
      )
      
      // Update state instantly
      setClient(prev => prev ? { ...prev, status: newStatus } : null)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "An error occurred while updating status.")
    } finally {
      setUpdatingStatus(false)
    }
  }

  useEffect(() => {
    async function fetchClientDetails() {
      try {
        const res = await fetch(`/api/clients/${clientId}`)
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Client not found")
            router.push("/clients")
            return
          }
          throw new Error("Failed to fetch client details")
        }
        const data = await res.json()
        setClient(data)
      } catch (error) {
        console.error("Error fetching client details:", error)
        toast.error("Failed to load client profile details.")
      } finally {
        setLoading(false)
      }
    }
    if (clientId) {
      fetchClientDetails()
    }
  }, [clientId, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading client profile...</p>
      </div>
    )
  }

  if (!client) return null

  return (
    <div className="space-y-8">
      {/* Header and Back navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{client.companyName}</h1>
              <Badge variant="outline" className="font-mono text-xs">
                {client.clientId}
              </Badge>
              <Badge 
                variant="outline" 
                className={`font-semibold border text-xs px-2.5 py-0.5 rounded-full ${
                  client.status === "Approved" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                  client.status === "Pending Approval" ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse" :
                  "bg-red-500/10 text-red-500 border-red-500/20"
                }`}
              >
                {client.status || "Approved"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Client profile overview and comprehensive quotation audit trail.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isManagerOrAdmin && client.status !== "Approved" && (
            <Button 
              onClick={() => handleStatusUpdate("Approved")} 
              disabled={updatingStatus}
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer font-semibold"
            >
              {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="mr-2 h-4 w-4" />}
              Approve Client
            </Button>
          )}
          {isManagerOrAdmin && client.status === "Pending Approval" && (
            <Button 
              onClick={() => handleStatusUpdate("Rejected")} 
              disabled={updatingStatus}
              variant="destructive"
              className="cursor-pointer font-semibold"
            >
              {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="mr-2 h-4 w-4" />}
              Reject Client
            </Button>
          )}
          
          {isManagerOrAdmin && (
            <Link href={`/clients/new?editId=${client.id}`}>
              <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5 cursor-pointer">
                <Edit className="mr-2 h-4 w-4" />
                Update Client
              </Button>
            </Link>
          )}
          
          {client.status === "Approved" ? (
            <Link href={`/quotations/new?clientId=${client.id}`}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Create Quotation
              </Button>
            </Link>
          ) : (
            <Button 
              disabled 
              className="bg-muted text-muted-foreground border cursor-not-allowed opacity-50"
            >
              <Lock className="mr-2 h-4 w-4" />
              Quotation Locked
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-muted">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-3 text-sm font-semibold transition-colors relative ${
            activeTab === "overview"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-5 py-3 text-sm font-semibold transition-colors relative ${
            activeTab === "history"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Quotation History ({client.quotations?.length || 0})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Info Card */}
          <Card className="md:col-span-2 rounded-2xl shadow-sm border">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
              <CardDescription>Primary contacts and corporate profile details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Contact Person
                </span>
                <p className="font-medium text-foreground">{client.contactPerson || "Not Provided"}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> Email Address
                </span>
                <p className="font-medium text-foreground">
                  {client.email ? (
                    <a href={`mailto:${client.email}`} className="hover:underline text-primary">
                      {client.email}
                    </a>
                  ) : (
                    "Not Provided"
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" /> Phone Number
                </span>
                <p className="font-medium text-foreground">{client.phone || "Not Provided"}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-primary" /> Tax Registration (TRN)
                </span>
                <p className="font-mono font-medium text-foreground">{client.trn || "Not Registered"}</p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Physical Address
                </span>
                <p className="font-medium text-foreground whitespace-pre-wrap">{client.address || "Not Provided"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Meta Info Sidebar Card */}
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm border bg-muted/10">
              <CardHeader>
                <CardTitle className="text-lg">Segment & Folders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client Category</span>
                  <div>
                    <Badge variant={client.clientType === "Government" ? "default" : "secondary"}>
                      {client.clientType || "Corporate"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SharePoint Connection</span>
                  <div>
                    {client.sharepointFolder ? (
                      <div className="flex items-center gap-2 p-2 border rounded-lg bg-yellow-50/50 dark:bg-yellow-950/10 border-yellow-200/50">
                        <Folder className="h-4 w-4 text-yellow-600 fill-yellow-600 shrink-0" />
                        <span className="text-xs font-medium text-yellow-900 dark:text-yellow-400 truncate">
                          Folder Connected
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">None Created</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {client.notes && (
              <Card className="rounded-2xl shadow-sm border">
                <CardHeader>
                  <CardTitle className="text-lg">Internal Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Quotation History Panel */
        <div className="space-y-6">
          {(!client.quotations || client.quotations.length === 0) ? (
            <Card className="rounded-2xl border p-12 text-center">
              <CardContent className="space-y-3 pt-6">
                <p className="text-lg font-medium text-foreground">No quotation history</p>
                <p className="text-sm text-muted-foreground">
                  This client does not have any quotations or revisions logged in the system yet.
                </p>
                <Link href={`/quotations/new?clientId=${client.id}`}>
                  <Button className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Quotation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {client.quotations.map((quote) => {
                const isPending = quote.status === "PENDING_APPROVAL"
                const isLockedForIDC = isPending && userRole === "SALES_EXECUTIVE"

                return (
                  <Card key={quote.id} className="rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="bg-muted/5 border-b pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg font-bold font-mono text-primary">
                              {quote.quotationNumber}
                            </span>
                            <Badge variant={quote.status === "APPROVED" ? "default" : "secondary"}>
                              {quote.status}
                            </Badge>
                            {isPending && (
                              <Badge className="bg-amber-500 text-white font-medium flex items-center gap-1">
                                <Lock className="h-3 w-3" /> Needs Approval
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Prepared by <span className="font-semibold text-foreground">{quote.preparedBy?.name || "Sales Rep"}</span> ({quote.preparedBy?.role || "IDC"}) on {new Date(quote.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            title={isLockedForIDC ? "Pending Approval (Locked)" : "Download PDF"}
                            disabled={isLockedForIDC}
                            onClick={() => window.open(`/api/quotations/${quote.id}/pdf`, "_blank")}
                            className="h-9 gap-2"
                          >
                            {isLockedForIDC ? (
                              <>
                                <Lock className="h-4 w-4 text-muted-foreground/60" />
                                Locked
                              </>
                            ) : (
                              <>
                                <FileDown className="h-4 w-4" />
                                Download PDF
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      {/* Items List inside Quotation */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quotation Items</h4>
                        <div className="border rounded-xl overflow-x-auto">
                          <table className="w-full text-sm text-left min-w-[600px]">
                            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b">
                              <tr>
                                <th className="p-3">#</th>
                                <th className="p-3">Product Name</th>
                                <th className="p-3 text-right">Base Price</th>
                                <th className="p-3 text-right">Margin (%)</th>
                                <th className="p-3 text-right">Unit Price</th>
                                <th className="p-3 text-right">Qty</th>
                                <th className="p-3 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {quote.items.map((item) => (
                                <tr key={item.id} className="hover:bg-muted/10">
                                  <td className="p-3 font-mono text-muted-foreground">{item.itemNo}</td>
                                  <td className="p-3">
                                    <div className="font-medium text-foreground">{item.description}</div>
                                    {item.specifications && (
                                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                        {item.specifications}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 text-right font-mono">
                                    AED {item.basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 text-right font-mono text-primary font-medium">
                                    {item.margin}%
                                  </td>
                                  <td className="p-3 text-right font-mono">
                                    AED {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 text-right font-mono">{item.quantity}</td>
                                  <td className="p-3 text-right font-mono font-semibold">
                                    AED {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Totals Summary */}
                      <div className="flex justify-between items-center bg-muted/10 p-4 rounded-xl border border-dashed">
                        <span className="text-sm font-medium text-muted-foreground">Total Quotation Value:</span>
                        <span className="text-xl font-bold font-mono text-primary">
                          AED {quote.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Revision Logs under Quotation */}
                      {quote.revisionLogs && quote.revisionLogs.length > 0 && (
                        <div className="space-y-4 pt-4 border-t">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <History className="h-3.5 w-3.5 text-purple-600" /> Revision Audit History
                          </h4>
                          <div className="relative border-l border-muted pl-4 ml-2 space-y-4">
                            {quote.revisionLogs.map((rev) => {
                              const amountDiff = rev.newTotal - rev.previousTotal
                              const isIncrease = amountDiff > 0

                              return (
                                <div key={rev.id} className="relative group">
                                  {/* Dot */}
                                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border bg-background group-hover:bg-purple-600 transition-colors" />
                                  
                                  <div className="bg-muted/5 hover:bg-muted/20 border border-muted/50 p-3 rounded-lg space-y-1 transition-colors">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                      <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                                        Revision #{rev.revisionNumber}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(rev.revisionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-0.5">
                                      {rev.notes || "Revised quotation details"}
                                    </p>
                                    <div className="flex items-center gap-3 pt-2 text-xs font-mono">
                                      <span className="text-muted-foreground">
                                        Previous: AED {rev.previousTotal.toLocaleString()}
                                      </span>
                                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-semibold text-foreground">
                                        New: AED {rev.newTotal.toLocaleString()}
                                      </span>
                                      
                                      {amountDiff !== 0 && (
                                        <span className={`inline-flex items-center gap-0.5 font-bold ${isIncrease ? "text-green-600" : "text-red-500"}`}>
                                          {isIncrease ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                          {isIncrease ? "+" : ""}
                                          {amountDiff.toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
