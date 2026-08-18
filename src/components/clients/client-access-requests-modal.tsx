"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Key, 
  Check, 
  X, 
  Loader2, 
  Search, 
  Building2, 
  User, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Mail,
  Briefcase
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"

interface ClientAccessRequestItem {
  id: string
  clientId: string
  userId: string
  reason?: string | null
  status: "Requested" | "Pending" | "Approved" | "Rejected"
  rejectionReason?: string | null
  createdAt: string
  client: {
    id: string
    companyName: string
    clientId: string
  }
  user: {
    id: string
    name: string | null
    email: string
    role: string
    department?: string | null
  }
}

interface ClientAccessRequestsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ClientAccessRequestsModal({
  isOpen,
  onClose,
  onSuccess
}: ClientAccessRequestsModalProps) {
  const router = useRouter()
  const [requests, setRequests] = useState<ClientAccessRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("Pending")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/clients/access-requests")
      if (!res.ok) throw new Error("Failed to fetch client access requests")
      const data = await res.json()
      setRequests(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to load access requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen])

  const handleAction = async (requestId: string, action: "Approve" | "Reject") => {
    setProcessingId(requestId)
    try {
      const res = await fetch("/api/clients/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action.toLowerCase()} request`)
      }

      toast.success(`Client access request ${action === "Approve" ? "approved" : "rejected"} successfully!`)
      await fetchRequests()
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to process access request")
    } finally {
      setProcessingId(null)
    }
  }

  const filteredRequests = requests.filter(req => {
    const statusNorm = req.status === "Requested" ? "Pending" : req.status
    const matchesStatus = filterStatus === "ALL" || statusNorm.toLowerCase() === filterStatus.toLowerCase()
    
    const userName = req.user?.name || req.user?.email || ""
    const clientName = req.client?.companyName || ""
    const matchesQuery = searchQuery === "" ||
      userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.reason || "").toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesQuery
  })

  const pendingCount = requests.filter(r => r.status === "Pending" || r.status === "Requested").length
  const approvedCount = requests.filter(r => r.status === "Approved").length
  const rejectedCount = requests.filter(r => r.status === "Rejected").length

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl lg:max-w-6xl w-full max-h-[90vh] flex flex-col font-sans p-6 sm:p-8 rounded-2xl overflow-hidden">
        
        {/* Fixed Header */}
        <DialogHeader className="space-y-1.5 border-b pb-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2.5 flex-wrap">
                  <span>Client Access Requests Management</span>
                  {pendingCount > 0 && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                      {pendingCount} Pending Action
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Review, approve, or reject client profile access requests submitted by sales representatives and consultants.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto font-mono text-xs">
              <Badge variant="outline" className="bg-muted/40 font-bold">
                Total Requests: {requests.length}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Search & Filter Toolbar */}
        <div className="py-4 space-y-3 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/30 p-2 rounded-2xl border">
            {/* Status Filter Tabs */}
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilterStatus("Pending")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${filterStatus === "Pending" ? "bg-primary text-white shadow-2xs" : "text-muted-foreground hover:bg-muted"}`}
              >
                <span>Pending</span>
                <Badge className={`text-[10px] px-1.5 py-0 rounded-full font-mono ${filterStatus === "Pending" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {pendingCount}
                </Badge>
              </button>
              
              <button
                type="button"
                onClick={() => setFilterStatus("Approved")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${filterStatus === "Approved" ? "bg-emerald-600 text-white shadow-2xs" : "text-muted-foreground hover:bg-muted"}`}
              >
                <span>Approved</span>
                <Badge className={`text-[10px] px-1.5 py-0 rounded-full font-mono ${filterStatus === "Approved" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {approvedCount}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus("Rejected")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${filterStatus === "Rejected" ? "bg-rose-600 text-white shadow-2xs" : "text-muted-foreground hover:bg-muted"}`}
              >
                <span>Rejected</span>
                <Badge className={`text-[10px] px-1.5 py-0 rounded-full font-mono ${filterStatus === "Rejected" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {rejectedCount}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus("ALL")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${filterStatus === "ALL" ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-2xs" : "text-muted-foreground hover:bg-muted"}`}
              >
                <span>All Requests</span>
                <Badge className={`text-[10px] px-1.5 py-0 rounded-full font-mono ${filterStatus === "ALL" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {requests.length}
                </Badge>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search sales rep, client, or reason..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none font-sans"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Requests List Area */}
        <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Loading access requests...</p>
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-3">
              {filteredRequests.map(req => {
                const normStatus = req.status === "Requested" ? "Pending" : req.status
                const isPending = normStatus === "Pending"
                const isApproved = normStatus === "Approved"
                const isProcessing = processingId === req.id

                return (
                  <div key={req.id} className="p-4 bg-card border rounded-2xl shadow-2xs space-y-3 hover:border-border transition-all">
                    
                    {/* Header Row: Applicant & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {(req.user?.name || req.user?.email || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-foreground">
                              {req.user?.name || req.user?.email || "Sales Consultant"}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono font-medium">
                              {req.user?.role?.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground text-[11px] mt-0.5">
                            {req.user?.email && <span className="flex items-center gap-1 font-mono"><Mail className="h-3 w-3" /> {req.user.email}</span>}
                            <span className="flex items-center gap-1 font-mono"><Clock className="h-3 w-3" /> Requested: {new Date(req.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <Badge 
                        className={`text-xs font-bold px-3 py-1 shrink-0 ${
                          isPending 
                            ? "bg-amber-500 hover:bg-amber-600 text-white" 
                            : isApproved 
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                            : "bg-rose-600 hover:bg-rose-700 text-white"
                        }`}
                      >
                        {normStatus}
                      </Badge>
                    </div>

                    {/* Content Grid: Target Client & Reason */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      
                      {/* Target Client Details */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-blue-500" /> Target Client Profile
                        </span>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-extrabold text-sm text-foreground">{req.client?.companyName || "Client Company"}</p>
                            {req.client?.clientId && (
                              <p className="text-[10px] text-muted-foreground font-mono">Client ID: {req.client.clientId}</p>
                            )}
                          </div>
                          {req.client?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                onClose()
                                router.push(`/clients/${req.client.id}`)
                              }}
                              className="h-7 text-xs font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer shrink-0"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Profile
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Justification Reason */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Reason / Justification Text
                        </span>
                        <p className="text-xs text-foreground font-medium italic">
                          "{req.reason || "No explicit justification reason provided."}"
                        </p>
                      </div>

                    </div>

                    {/* Action Bar for Pending Requests */}
                    {isPending && (
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isProcessing}
                          onClick={() => handleAction(req.id, "Reject")}
                          className="h-8 text-xs border-rose-300 text-rose-600 hover:bg-rose-50 dark:text-rose-400 font-bold cursor-pointer"
                        >
                          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <X className="h-3.5 w-3.5 mr-1" />}
                          Reject Request
                        </Button>
                        <Button
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleAction(req.id, "Approve")}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs"
                        >
                          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                          Approve Access
                        </Button>
                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-dashed rounded-2xl bg-muted/20">
              <Key className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-base font-bold">No Matching Client Access Requests</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                No access requests match your selected status filter or search query.
              </p>
              {(filterStatus !== "ALL" || searchQuery !== "") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterStatus("ALL")
                    setSearchQuery("")
                  }}
                  className="h-8 text-xs font-bold gap-1 mt-1 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="border-t pt-4 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-bold px-5">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
