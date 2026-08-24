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
  Eye, 
  FileText, 
  User, 
  Building2, 
  TrendingUp, 
  Filter, 
  RefreshCw,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { CostingUpdateModal } from "@/components/costing/CostingUpdateModal"

interface CostingItem {
  id: string
  quotationId: string
  itemNo: number
  description: string
  specifications: string | null
  productNotes: string | null
  quantity: number
  unitPrice: number
  amount: number
  unitCost: number
  materialCost: number
  laborCost: number
  overheadCost: number
  transportCost: number
  installationCost: number
  marginPercentage: number
  costingStatus: string
  estimatorNotes: string | null
  costingRequestedAt: string | null
  costingCompletedAt: string | null
  customImageUrl: string | null
  imageUrl: string | null
  categoryName: string | null
  chairType: string | null
  quotation: {
    id: string
    quotationNumber: string
    projectName: string | null
    status: string
    costingStatus: string | null
    client: {
      id: string
      companyName: string
      contactPerson: string | null
      email: string | null
      phone: string | null
    }
    preparedBy: {
      id: string
      name: string | null
      email: string | null
      role: string
    }
    assignedEstimator: {
      id: string
      name: string | null
      email: string | null
    } | null
  }
  product: {
    id: string
    productName: string
    sku: string | null
    imageUrl: string | null
  } | null
  estimator: {
    id: string
    name: string | null
    email: string | null
  } | null
}

interface KPIStats {
  pendingCount: number
  inProgressCount: number
  completedCount: number
  revisionRequestedCount: number
  avgMarginPercentage: number
}

import { usePermissions } from "@/components/providers/PermissionsProvider"

export default function CostingRequestsPage() {
  const { data: session } = useSession()
  const { hasPermission, loading: loadingPerms } = usePermissions()
  const userRole = (session?.user as any)?.role || ""
  const isIDC = userRole === "INTERIOR_DESIGN_CONSULTANT"
  const canViewCosting = hasPermission("COSTING_REQUESTS", "view")

  const [items, setItems] = useState<CostingItem[]>([])
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
  
  const [selectedCostItem, setSelectedCostItem] = useState<CostingItem | null>(null)
  const [isCostModalOpen, setIsCostModalOpen] = useState(false)

  const fetchCostingRequests = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (activeTab !== "ALL") query.set("status", activeTab)
      if (searchQuery.trim()) query.set("search", searchQuery.trim())

      const res = await fetch(`/api/costing?${query.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch costing requests")
      const data = await res.json()
      setItems(data.items || [])
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
              <p className="text-xs text-muted-foreground">Manage line-item pricing requests, calculate factory costs, margins, and update quotations.</p>
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
              { id: "ALL", label: "All Items" },
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
              placeholder="Search Quote #, Client, Product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-9 text-xs rounded-xl"
            />
          </form>
        </div>

        {/* Costing Queue Table */}
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b bg-muted/60 text-muted-foreground font-bold uppercase text-[10px]">
                <th className="p-3 font-mono">#</th>
                <th className="p-3 min-w-[140px]">Quote No.</th>
                <th className="p-3 min-w-[180px]">Client &amp; Project</th>
                <th className="p-3 min-w-[260px]">Product &amp; Specifications</th>
                <th className="p-3 text-center font-mono">Qty</th>
                <th className="p-3 text-right font-mono">Quoted Rate</th>
                {!isIDC && <th className="p-3 text-right font-mono">Unit Cost</th>}
                {!isIDC && <th className="p-3 text-right font-mono">Margin %</th>}
                <th className="p-3 min-w-[140px]">Requested By</th>
                <th className="p-3 text-center min-w-[130px]">Status</th>
                <th className="p-3 text-center min-w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                      <span className="text-xs font-semibold">Loading costing queue...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Calculator className="h-8 w-8 text-muted-foreground/40" />
                      <p className="font-semibold text-sm">No costing requests found.</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Products sent for costing by Interior Design Consultants will appear here for pricing and margin calculation.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const productImg = item.imageUrl || item.customImageUrl || item.product?.imageUrl
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-muted-foreground align-top">{idx + 1}</td>
                      <td className="p-3 align-top font-mono">
                        <Link 
                          href={`/quotations/${item.quotation.id}/preview`}
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline block"
                          target="_blank"
                        >
                          {item.quotation.quotationNumber}
                        </Link>
                        <span className="text-[10px] text-muted-foreground block font-sans capitalize">{item.quotation.status.toLowerCase().replace(/_/g, " ")}</span>
                      </td>
                      <td className="p-3 align-top space-y-0.5">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{item.quotation.client?.companyName || "Unknown Client"}</span>
                        </div>
                        {item.quotation.projectName && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[170px]">
                            {item.quotation.projectName}
                          </div>
                        )}
                      </td>
                      <td className="p-3 align-top space-y-1">
                        <div className="flex items-start gap-2.5">
                          {productImg ? (
                            <img src={productImg} alt={item.description} className="w-10 h-10 rounded-lg object-cover border shrink-0 bg-white" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg border border-dashed bg-muted flex items-center justify-center text-[9px] text-muted-foreground shrink-0 font-medium">
                              No Img
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <div className="font-bold text-foreground text-xs leading-tight">{item.description}</div>
                            {item.categoryName && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                                {item.categoryName}
                              </Badge>
                            )}
                            {item.specifications && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1 italic">{item.specifications}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono font-bold align-top text-xs">{item.quantity}</td>
                      <td className="p-3 text-right font-mono font-bold text-primary align-top text-xs">
                        AED {(item.unitPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      {!isIDC && (
                        <td className="p-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 align-top text-xs">
                          AED {(item.unitCost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      {!isIDC && (
                        <td className="p-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400 align-top text-xs">
                          {(item.marginPercentage || 0).toFixed(1)}%
                        </td>
                      )}
                      <td className="p-3 align-top space-y-0.5 text-muted-foreground">
                        <div className="font-semibold text-xs text-foreground flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {item.quotation.preparedBy?.name || item.quotation.preparedBy?.email || "Consultant"}
                        </div>
                        {item.costingRequestedAt && (
                          <div className="text-[10px] font-mono">
                            {new Date(item.costingRequestedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center align-top">
                        {renderStatusBadge(item.costingStatus)}
                      </td>
                      <td className="p-3 text-center align-top">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setSelectedCostItem(item)
                              setIsCostModalOpen(true)
                            }}
                            className="h-7 text-[11px] px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Calculator className="h-3.5 w-3.5" />
                            {item.costingStatus === "COSTING_COMPLETED" ? "Edit Cost" : "Price Item"}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/quotations/${item.quotation.id}/preview`, "_blank")}
                            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground border-border flex items-center gap-1 cursor-pointer"
                            title="Open quotation preview"
                          >
                            <Eye className="h-3.5 w-3.5" />
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

      {/* Costing Update Modal for Estimator */}
      {selectedCostItem && (
        <CostingUpdateModal
          quotationId={selectedCostItem.quotation.id}
          item={selectedCostItem}
          open={isCostModalOpen}
          onOpenChange={setIsCostModalOpen}
          onSuccess={() => {
            fetchCostingRequests()
            toast.success(`Costing updated for ${selectedCostItem.description}. Quotation owner notified.`)
          }}
        />
      )}
    </div>
  )
}
