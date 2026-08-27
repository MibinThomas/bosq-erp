"use client"

import React, { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { 
  Calculator, 
  Clock, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  FileText, 
  User, 
  Building2, 
  TrendingUp, 
  Filter, 
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Package,
  Layers
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { 
  QuotationCostingWorkspaceModal, 
  QuotationGroupData, 
  CostingItemData 
} from "@/components/costing/QuotationCostingWorkspaceModal"
import { usePermissions } from "@/components/providers/PermissionsProvider"

interface KPIStats {
  pendingCount: number
  inProgressCount: number
  completedCount: number
  revisionRequestedCount: number
  avgMarginPercentage: number
}

export default function CostingRequestsPage() {
  const { data: session } = useSession()
  const { hasPermission, loading: loadingPerms } = usePermissions()
  const userRole = (session?.user as any)?.role || ""
  const isIDC = userRole === "INTERIOR_DESIGN_CONSULTANT"
  const canViewCosting = hasPermission("COSTING_REQUESTS", "view")

  const [rawItems, setRawItems] = useState<CostingItemData[]>([])
  const [kpis, setKpis] = useState<KPIStats>({
    pendingCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    revisionRequestedCount: 0,
    avgMarginPercentage: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<string>("ALL")
  
  const [selectedQuotationGroup, setSelectedQuotationGroup] = useState<QuotationGroupData | null>(null)
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false)

  const fetchCostingRequests = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (activeTab !== "ALL") query.set("status", activeTab)
      if (searchQuery.trim()) query.set("search", searchQuery.trim())

      const res = await fetch(`/api/costing?${query.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch costing requests")
      const data = await res.json()
      setRawItems(data.items || [])
      setKpis(data.kpis || {
        pendingCount: 0,
        inProgressCount: 0,
        completedCount: 0,
        revisionRequestedCount: 0,
        avgMarginPercentage: 0
      })
    } catch (err: any) {
      console.error("Error fetching costing items:", err)
      toast.error("Failed to load costing requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCostingRequests()
  }, [activeTab])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCostingRequests()
  }

  // Group costing items by Quotation number
  const quotationGroups = useMemo(() => {
    const map = new Map<string, QuotationGroupData>()

    rawItems.forEach((item: any) => {
      const q = item.quotation
      if (!q) return
      const qId = q.id

      if (!map.has(qId)) {
        map.set(qId, {
          quotationId: q.id,
          quotationNumber: q.quotationNumber,
          projectName: q.projectName || null,
          status: q.status,
          costingStatus: q.costingStatus || null,
          client: q.client || { id: "", companyName: "Unknown Client", contactPerson: null, email: null, phone: null },
          preparedBy: q.preparedBy || { id: "", name: "Consultant", email: null, role: "" },
          assignedEstimator: q.assignedEstimator || null,
          requestDate: item.costingRequestedAt || item.updatedAt || null,
          items: []
        })
      }

      const existingGroup = map.get(qId)!
      existingGroup.items.push(item)
    })

    return Array.from(map.values())
  }, [rawItems])

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_COSTING":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 font-semibold text-[11px] py-0.5 px-2.5 flex items-center gap-1.5 shrink-0">
            <Clock className="h-3 w-3 animate-pulse text-amber-600" /> Pending Costing
          </Badge>
        )
      case "COSTING_IN_PROGRESS":
        return (
          <Badge className="bg-blue-600 text-white font-semibold text-[11px] py-0.5 px-2.5 flex items-center gap-1.5 shrink-0">
            <Loader2 className="h-3 w-3 animate-spin" /> In Progress
          </Badge>
        )
      case "COSTING_COMPLETED":
        return (
          <Badge className="bg-emerald-600 text-white font-semibold text-[11px] py-0.5 px-2.5 flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="h-3 w-3" /> Costing Completed
          </Badge>
        )
      case "REVISION_REQUESTED":
        return (
          <Badge className="bg-purple-600 text-white font-semibold text-[11px] py-0.5 px-2.5 flex items-center gap-1.5 shrink-0">
            <RefreshCw className="h-3 w-3 animate-spin" /> Revision Requested
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="text-[11px]">
            {status}
          </Badge>
        )
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Costing Requests &amp; Estimator Queue</h1>
              <p className="text-xs text-muted-foreground">Manage quotation pricing requests, calculate factory costs, margins, and complete estimation.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCostingRequests}
            disabled={loading}
            className="h-9 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {!loadingPerms && !canViewCosting && userRole !== "SUPER_ADMIN" ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-4 border rounded-2xl bg-card text-center">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-bold text-foreground">Access Restricted</h3>
            <p className="text-xs text-muted-foreground">
              You do not have permission to view Costing Requests &amp; Estimator Queue. Please contact your Super Administrator if you require access to this module.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => setActiveTab("PENDING_COSTING")}
              className={`p-4 border rounded-2xl bg-card transition-all cursor-pointer hover:border-amber-400 ${activeTab === "PENDING_COSTING" ? "ring-2 ring-amber-500/40 border-amber-500" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Costing</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-amber-600">{kpis.pendingCount}</span>
                <span className="text-[11px] text-muted-foreground">Awaiting Pricing</span>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab("COSTING_IN_PROGRESS")}
              className={`p-4 border rounded-2xl bg-card transition-all cursor-pointer hover:border-blue-400 ${activeTab === "COSTING_IN_PROGRESS" ? "ring-2 ring-blue-500/40 border-blue-500" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">In Progress</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Loader2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-blue-600">{kpis.inProgressCount}</span>
                <span className="text-[11px] text-muted-foreground">Under Estimation</span>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab("COSTING_COMPLETED")}
              className={`p-4 border rounded-2xl bg-card transition-all cursor-pointer hover:border-emerald-400 ${activeTab === "COSTING_COMPLETED" ? "ring-2 ring-emerald-500/40 border-emerald-500" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Costing Completed</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-emerald-600">{kpis.completedCount}</span>
                <span className="text-[11px] text-muted-foreground">Priced &amp; Approved</span>
              </div>
            </div>

            <div className="p-4 border rounded-2xl bg-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avg Gross Margin %</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-purple-600">{kpis.avgMarginPercentage}%</span>
                <span className="text-[11px] text-muted-foreground">Across Completed</span>
              </div>
            </div>
          </div>

          {/* Queue Toolbar: Search & Status Tabs */}
          <div className="bg-card border rounded-2xl p-4 space-y-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {[
                  { id: "ALL", label: "All Quotations" },
                  { id: "PENDING_COSTING", label: "Pending Costing", count: kpis.pendingCount },
                  { id: "COSTING_IN_PROGRESS", label: "In Progress", count: kpis.inProgressCount },
                  { id: "COSTING_COMPLETED", label: "Completed", count: kpis.completedCount },
                  { id: "REVISION_REQUESTED", label: "Revision Requested", count: kpis.revisionRequestedCount },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    variant={activeTab === tab.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className={`text-xs font-semibold h-8 rounded-xl shrink-0 cursor-pointer ${
                      activeTab === tab.id ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px] font-mono">
                        {tab.count}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>

              {/* Search */}
              <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80 shrink-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search Quote #, Client, Project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-9 text-xs rounded-xl"
                />
              </form>
            </div>

            {/* Quotation-Based Costing Queue Table */}
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b bg-muted/60 text-muted-foreground font-bold uppercase text-[10px]">
                    <th className="p-3 font-mono">#</th>
                    <th className="p-3 min-w-[150px]">Quotation Number</th>
                    <th className="p-3 min-w-[200px]">Client &amp; Project Name</th>
                    <th className="p-3 text-center min-w-[160px]">Products Pending Costing</th>
                    <th className="p-3 min-w-[160px]">Requested By &amp; Date</th>
                    <th className="p-3 text-center min-w-[140px]">Overall Status</th>
                    <th className="p-3 text-center min-w-[160px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                          <span className="text-xs font-semibold">Loading estimator queue...</span>
                        </div>
                      </td>
                    </tr>
                  ) : quotationGroups.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Calculator className="h-8 w-8 text-muted-foreground/40" />
                          <p className="font-semibold text-sm">No quotation costing requests found.</p>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            Quotations sent for costing by Interior Design Consultants will appear here grouped by quotation number for batch pricing.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    quotationGroups.map((group, idx) => {
                      const pendingItemsCount = group.items.filter(
                        (i) => i.costingStatus === "PENDING_COSTING" || i.costingStatus === "COSTING_IN_PROGRESS"
                      ).length

                      const completedItemsCount = group.items.filter(
                        (i) => i.costingStatus === "COSTING_COMPLETED"
                      ).length

                      // Determine overall status for this quotation group
                      let groupStatus = "PENDING_COSTING"
                      if (pendingItemsCount > 0 && completedItemsCount > 0) {
                        groupStatus = "COSTING_IN_PROGRESS"
                      } else if (pendingItemsCount === 0 && completedItemsCount > 0) {
                        groupStatus = "COSTING_COMPLETED"
                      } else if (group.items.some(i => i.costingStatus === "REVISION_REQUESTED")) {
                        groupStatus = "REVISION_REQUESTED"
                      }

                      return (
                        <tr key={group.quotationId} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-muted-foreground align-middle">{idx + 1}</td>
                          <td className="p-3 align-middle font-mono">
                            <Link 
                              href={`/quotations/${group.quotationId}/preview`}
                              className="font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline block"
                              target="_blank"
                            >
                              {group.quotationNumber}
                            </Link>
                            <span className="text-[10px] text-muted-foreground block font-sans capitalize">
                              Quote Status: {group.status.toLowerCase().replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="p-3 align-middle space-y-0.5">
                            <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span>{group.client?.companyName || "Unknown Client"}</span>
                            </div>
                            {group.projectName && (
                              <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                                Project: {group.projectName}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center align-middle">
                            <div className="inline-flex flex-col items-center space-y-1">
                              <Badge variant="outline" className="font-mono text-xs font-extrabold px-3 py-1 bg-amber-500/10 border-amber-300 text-amber-900 dark:text-amber-300">
                                {group.items.length} Product(s) Total
                              </Badge>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {pendingItemsCount > 0 && <span className="text-amber-600 font-bold">{pendingItemsCount} Pending</span>}
                                {pendingItemsCount > 0 && completedItemsCount > 0 && <span> • </span>}
                                {completedItemsCount > 0 && <span className="text-emerald-600 font-bold">{completedItemsCount} Completed</span>}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 align-middle space-y-0.5 text-muted-foreground">
                            <div className="font-semibold text-xs text-foreground flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {group.preparedBy?.name || group.preparedBy?.email || "Consultant"}
                            </div>
                            {group.requestDate && (
                              <div className="text-[10px] font-mono text-muted-foreground">
                                {new Date(group.requestDate).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center align-middle">
                            {renderStatusBadge(groupStatus)}
                          </td>
                          <td className="p-3 text-center align-middle">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setSelectedQuotationGroup(group)
                                  setIsWorkspaceOpen(true)
                                }}
                                className="h-8 text-xs px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs rounded-xl"
                              >
                                <Calculator className="h-3.5 w-3.5" />
                                Open Costing
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Quotation Costing Workspace Modal */}
      {selectedQuotationGroup && (
        <QuotationCostingWorkspaceModal
          quotationGroup={selectedQuotationGroup}
          open={isWorkspaceOpen}
          onOpenChange={setIsWorkspaceOpen}
          onSuccess={() => {
            fetchCostingRequests()
          }}
        />
      )}
    </div>
  )
}
