"use client"

import { useEffect, useState, useCallback } from "react"
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
  Loader2,
  Folder,
  Plus,
  Edit,
  Check,
  X,
  AlertCircle,
  FileQuestion,
  Activity,
  LayoutList,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ClientQuotationTimeline } from "@/components/clients/client-quotation-timeline"
import { AssignmentModal } from "@/components/clients/assignment-modal"
import { ClientDocuments } from "@/components/clients/client-documents"
import { Users } from "lucide-react"

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

interface Quotation extends QuotationRevision {
  paymentStatus: string | null
  notes: string | null
  revisionsList: QuotationRevision[]
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
  assignments?: {
    isPrimary: boolean
    user: { id: string; name: string | null; role: string }
  }[]
}

interface Boq {
  id: string
  boqNumber: string
  projectName: string | null
  status: string
  createdAt: string
  preparedBy: { name: string | null }
}

interface ActivityEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  details: string | null
  createdAt: string
  user: { name: string | null; role: string | null }
}

type Tab = "details" | "quotations" | "boqs" | "documents" | "activity"

// ─── Status badge helpers ──────────────────────────────────────────────────────

function boqStatusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-600 border-zinc-200",
    SENT_TO_ESTIMATOR: "bg-amber-100 text-amber-700 border-amber-200",
    COSTING_COMPLETED: "bg-green-100 text-green-700 border-green-200",
    REJECTED: "bg-red-100 text-red-700 border-red-200",
    CONVERTED: "bg-blue-100 text-blue-700 border-blue-200",
  }
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SENT_TO_ESTIMATOR: "Sent to Estimator",
    COSTING_COMPLETED: "Costing Completed",
    REJECTED: "Rejected",
    CONVERTED: "Converted",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[status] || "bg-muted text-muted-foreground border-border"}`}>
      {labels[status] || status}
    </span>
  )
}

function activityIcon(action: string) {
  if (action.includes("CREATED")) return "🟢"
  if (action.includes("APPROVED")) return "✅"
  if (action.includes("REJECTED")) return "❌"
  if (action.includes("UPDATED") || action.includes("RENAMED")) return "✏️"
  if (action.includes("DELETED")) return "🗑️"
  if (action.includes("CONFIRMED")) return "🏆"
  if (action.includes("PO")) return "📦"
  return "📋"
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const userId = (session?.user as any)?.id || ""
  const isManagerOrAdmin = ["ADMIN", "SALES_MANAGER", "SUPER_ADMIN"].includes(userRole)
  const isAuthorizedToConfirm =
    ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(userRole)

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("quotations")
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)

  // Lazy-loaded tab data
  const [boqs, setBoqs] = useState<Boq[]>([])
  const [boqsLoaded, setBoqsLoaded] = useState(false)
  const [boqsLoading, setBoqsLoading] = useState(false)

  const [activityLogs, setActivityLogs] = useState<ActivityEntry[]>([])
  const [activityLoaded, setActivityLoaded] = useState(false)
  const [activityLoading, setActivityLoading] = useState(false)

  // ── Fetch client details ───────────────────────────────────────────────────
  const fetchClient = useCallback(async () => {
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
  }, [clientId, router])

  useEffect(() => {
    if (clientId) fetchClient()
  }, [clientId, fetchClient])

  // ── Lazy load BOQs when tab selected ──────────────────────────────────────
  useEffect(() => {
    if (activeTab === "boqs" && !boqsLoaded) {
      setBoqsLoading(true)
      fetch(`/api/boq?clientId=${clientId}`)
        .then((r) => r.json())
        .then((data) => {
          setBoqs(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [])
          setBoqsLoaded(true)
        })
        .catch(() => toast.error("Failed to load BOQs."))
        .finally(() => setBoqsLoading(false))
    }
  }, [activeTab, boqsLoaded, clientId])

  // ── Lazy load Activity when tab selected ──────────────────────────────────
  useEffect(() => {
    if (activeTab === "activity" && !activityLoaded) {
      setActivityLoading(true)
      fetch(`/api/clients/${clientId}/activity`)
        .then((r) => r.json())
        .then((data) => {
          setActivityLogs(Array.isArray(data) ? data : [])
          setActivityLoaded(true)
        })
        .catch(() => toast.error("Failed to load activity logs."))
        .finally(() => setActivityLoading(false))
    }
  }, [activeTab, activityLoaded, clientId])

  // ── Status update handler ──────────────────────────────────────────────────
  async function handleStatusUpdate(newStatus: "Approved" | "Rejected") {
    try {
      setUpdatingStatus(true)
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: client?.companyName || "", status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update client status")
      toast.success(
        newStatus === "Approved"
          ? `Client "${client?.companyName}" approved!`
          : `Client "${client?.companyName}" rejected.`
      )
      setClient((prev) => (prev ? { ...prev, status: newStatus } : null))
    } catch (error: any) {
      toast.error(error.message || "An error occurred while updating status.")
    } finally {
      setUpdatingStatus(false)
    }
  }

  // ── Loading / empty states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading client profile...</p>
      </div>
    )
  }
  if (!client) return null

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "quotations", label: "Quotations & Revisions", icon: <LayoutList className="h-3.5 w-3.5" /> },
    { key: "details", label: "Client Details", icon: <User className="h-3.5 w-3.5" /> },
    { key: "boqs", label: "BOQs", icon: <ClipboardList className="h-3.5 w-3.5" /> },
    { key: "documents", label: "Documents", icon: <Folder className="h-3.5 w-3.5" /> },
    { key: "activity", label: "Activity Timeline", icon: <Activity className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="rounded-full shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{client.companyName}</h1>
              <Badge variant="outline" className="font-mono text-xs shrink-0">{client.clientId}</Badge>
              <Badge
                variant="outline"
                className={`font-semibold border text-xs px-2.5 py-0.5 rounded-full shrink-0 ${
                  client.status === "Approved"
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : client.status === "Pending Approval"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                }`}
              >
                {client.status || "Approved"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Client profile · {client.clientType || "Corporate"} · {client.quotations?.length || 0} quotation series
            </p>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex flex-wrap items-center gap-2">
          {isManagerOrAdmin && client.status !== "Approved" && (
            <Button
              onClick={() => handleStatusUpdate("Approved")}
              disabled={updatingStatus}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold"
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
            >
              {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="mr-2 h-4 w-4" />}
              Reject
            </Button>
          )}
          {isManagerOrAdmin && (
            <Link href={`/clients/new?editId=${client.id}`}>
              <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5">
                <Edit className="mr-2 h-4 w-4" /> Update Client
              </Button>
            </Link>
          )}
          {client.status === "Approved" ? (
            <Link href={`/quotations/new?clientId=${client.id}`}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> Create Quotation
              </Button>
            </Link>
          ) : (
            <Button disabled className="opacity-50">
              Quotation Locked
            </Button>
          )}
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="border-b border-border -mb-0">
        <nav className="flex gap-0 overflow-x-auto">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              {icon}
              {label}
              {key === "quotations" && client.quotations?.length > 0 && (
                <span className="ml-1 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-mono">
                  {client.quotations.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab Content ── */}

      {/* Quotations & Revisions */}
      {activeTab === "quotations" && (
        <ClientQuotationTimeline
          quotations={client.quotations || []}
          clientId={client.id}
          userRole={userRole}
          userId={userId}
          isAuthorizedToConfirm={isAuthorizedToConfirm}
          onStatusUpdate={fetchClient}
        />
      )}

      {/* Client Details */}
      {activeTab === "details" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Info */}
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
                    <a href={`mailto:${client.email}`} className="hover:underline text-primary">{client.email}</a>
                  ) : "Not Provided"}
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

          {/* Sidebar */}
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
                  {client.sharepointFolder ? (
                    <div className="flex items-center gap-2 p-2 border rounded-lg bg-yellow-50/50 dark:bg-yellow-950/10 border-yellow-200/50">
                      <Folder className="h-4 w-4 text-yellow-600 fill-yellow-600 shrink-0" />
                      <span className="text-xs font-medium text-yellow-900 dark:text-yellow-400">Folder Connected</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">None Created</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Assigned Team */}
            <Card className="rounded-2xl shadow-sm border bg-muted/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Assigned Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primary Consultant</span>
                  <div className="flex items-center gap-2 p-2.5 border bg-background rounded-lg shadow-sm">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold">
                      {client.assignments?.find(a => a.isPrimary)?.user.name || "Not Assigned"}
                    </span>
                  </div>
                </div>

                {client.assignments && client.assignments.filter(a => !a.isPrimary).length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Additional Access</span>
                    <div className="space-y-1.5">
                      {client.assignments.filter(a => !a.isPrimary).map(sec => (
                        <div key={sec.user.id} className="flex items-center gap-2 p-2 border bg-background/50 rounded-lg text-sm">
                          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{sec.user.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(userRole === "SUPER_ADMIN" || userRole === "ADMIN") && (
                  <Button 
                    variant="outline" 
                    className="w-full text-xs font-semibold mt-2" 
                    onClick={() => setShowAssignmentModal(true)}
                  >
                    Assign / Change Client
                  </Button>
                )}
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
      )}

      {/* BOQs */}
      {activeTab === "boqs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Bills of Quantities</h2>
            <Link href={`/boq?clientId=${clientId}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New BOQ
              </Button>
            </Link>
          </div>

          {boqsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : boqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-base font-semibold">No BOQs found</p>
              <p className="text-sm text-muted-foreground">No bills of quantities have been created for this client yet.</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="min-w-full text-sm divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-muted/50 text-muted-foreground text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">BOQ Number</th>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Prepared By</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {boqs.map((boq) => (
                    <tr key={boq.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{boq.boqNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{boq.projectName || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{boq.preparedBy?.name || "—"}</td>
                      <td className="px-4 py-3 text-center">{boqStatusBadge(boq.status)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(boq.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/boq/${boq.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Documents */}
      {activeTab === "documents" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          
          <div className="pt-2">
            <ClientDocuments clientId={client.id} />
          </div>

          {/* Quotation PDFs list */}
          {client.quotations && client.quotations.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Quotation PDFs</h3>
              <div className="space-y-3">
                {client.quotations.map((rootQuote) => (
                  <QuotationFolderGroup key={rootQuote.id} rootQuote={rootQuote} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Activity Timeline */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Activity Timeline</h2>
          {activityLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-base font-semibold">No activity recorded</p>
              <p className="text-sm text-muted-foreground">Activity logs will appear here once actions are taken on this client.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-primary/20 ml-4 space-y-4 py-2">
              {activityLogs.map((log) => (
                <div key={log.id} className="relative pl-7">
                  <span className="absolute -left-[9px] top-2 h-4 w-4 rounded-full bg-muted border-2 border-background shadow-sm flex items-center justify-center text-[10px]">
                    {activityIcon(log.action)}
                  </span>
                  <div className="bg-card border rounded-xl p-3.5 shadow-xs hover:shadow-sm transition-shadow space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{log.user?.name || "System"}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground font-mono">{log.action.replace(/_/g, " ")}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground">{log.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {client && (
        <AssignmentModal
          open={showAssignmentModal}
          onOpenChange={setShowAssignmentModal}
          clientId={client.id}
          clientName={client.companyName}
          quotations={client.quotations || []}
          onSuccess={() => {
            toast.success("Client team assignments updated!")
            fetchClient()
          }}
        />
      )}
    </div>
  )
}

function QuotationFolderGroup({ rootQuote }: { rootQuote: Quotation }) {
  const [expanded, setExpanded] = useState(false)
  const allVersions = [rootQuote, ...rootQuote.revisionsList].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const rootQuotationNumber = rootQuote.quotationNumber.split('-')[0]

  return (
    <div className="border rounded-xl bg-card shadow-sm overflow-hidden transition-all duration-200">
      <div 
        className="p-3 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer flex items-center gap-3 select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-muted-foreground shrink-0 transition-transform">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <Folder className="h-4 w-4 text-yellow-500 fill-yellow-400 shrink-0" />
        <span className="font-bold font-mono text-sm">{rootQuotationNumber}</span>
        <span className="text-xs text-muted-foreground ml-auto bg-background border px-2 py-0.5 rounded-full">
          {allVersions.length} {allVersions.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      {expanded && (
        <div className="divide-y divide-border border-t bg-background/50">
          {allVersions.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3 pl-10 hover:bg-muted/30 transition-colors group">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-red-500 shrink-0" />
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold font-mono group-hover:text-primary transition-colors">{v.quotationNumber}.pdf</p>
                  {v.status === "CLIENT_CONFIRMED" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30">
                      <Check className="h-2.5 w-2.5" /> Client Confirmed
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground ml-1">
                    {new Date(v.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(`/api/quotations/${v.id}/pdf`, "_blank")
                }}
              >
                Download
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

