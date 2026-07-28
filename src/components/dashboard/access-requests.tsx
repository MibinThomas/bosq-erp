"use client"

import { useEffect, useState } from "react"
import { Check, X, Loader2, ShieldAlert, KeyRound, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow } from "date-fns"

interface AccessRequest {
  id: string
  clientId: string
  userId: string
  status: "Requested" | "Approved" | "Rejected"
  createdAt: string
  rejectionReason: string | null
  notes: string | null
  client: {
    id: string
    companyName: string
    clientId: string
    assignments?: Array<{
      isPrimary: boolean
      user: {
        name: string | null
      }
    }>
  }
  user: {
    id: string
    name: string
    email: string
    role: string
    department: string
  }
}

interface ClientAccessRequestsProps {
  onChanged?: () => void
}

export function ClientAccessRequests({ onChanged }: ClientAccessRequestsProps) {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // Rejection dialog state
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejecting, setRejecting] = useState(false)

  async function fetchAccessRequests() {
    try {
      setLoading(true)
      const res = await fetch("/api/clients/access-requests")
      if (!res.ok) throw new Error("Failed to fetch access requests")
      const data = await res.json()
      // Filter only active "Requested" status to clean up the queue
      const pendingRequests = Array.isArray(data) 
        ? data.filter((r: AccessRequest) => r.status === "Requested")
        : []
      setRequests(pendingRequests)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load client access requests.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccessRequests()
  }, [])

  const handleApprove = async (requestId: string, companyName: string, userName: string) => {
    setProcessingId(requestId)
    try {
      const res = await fetch("/api/clients/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action: "Approve",
          assignmentType: "secondary" // default to secondary assignment
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to approve access request")
      }

      toast.success(`Successfully approved access for "${userName}" to "${companyName}"!`)
      fetchAccessRequests()
      if (onChanged) onChanged()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "An error occurred during approval.")
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectSubmit = async () => {
    if (!rejectId) return
    setRejecting(true)
    try {
      const res = await fetch("/api/clients/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: rejectId,
          action: "Reject",
          rejectionReason: rejectReason || "Request declined by administration"
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to reject access request")
      }

      toast.success("Access request successfully rejected.")
      setRejectId(null)
      setRejectReason("")
      fetchAccessRequests()
      if (onChanged) onChanged()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "An error occurred during rejection.")
    } finally {
      setRejecting(false)
    }
  }

  if (loading) {
    return (
      <Card className="rounded-xl border shadow-sm h-[320px] flex items-center justify-center bg-card">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium font-sans">Checking access requests...</span>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="rounded-xl border shadow-sm bg-card flex flex-col h-full">
        <CardHeader className="pb-3 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-lg flex items-center gap-2 font-bold tracking-tight">
                <KeyRound className="h-5 w-5 text-indigo-500" />
                Access Requests
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Manage requests from Interior design consultants seeking authorization to assigned clients.
              </CardDescription>
            </div>
            {requests.length > 0 && (
              <Badge variant="destructive" className="animate-pulse bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-bold font-mono">
                {requests.length} Requests
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-y-auto min-h-[220px]">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4 gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary/80 border border-primary/10">
                <Check className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-sm">All Authorized</h5>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                No pending client access requests found. All team members have correct permissions.
              </p>
            </div>
          ) : (
            <Table className="whitespace-nowrap">
              <TableHeader className="bg-muted/30 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-9">Consultant</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-9">Client Requested</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-9">Current Owner</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-9">Notes</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-9">Age</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-9 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-muted/10 transition-colors group">
                    <TableCell className="py-3">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-xs text-foreground truncate max-w-[180px]">{req.user?.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5">{req.user?.department || "No Dept"} • {req.user?.role}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-xs text-foreground truncate max-w-[180px]">{req.client?.companyName}</span>
                        <span className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">{req.client?.clientId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-355 text-xs">
                        {req.client?.assignments?.find(a => a.isPrimary)?.user?.name || "Unassigned"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-xs max-w-[200px] truncate" title={req.notes || ""}>
                      <span className="text-slate-400 italic text-xs">
                        {req.notes || "No note"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-slate-400">
                      {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="py-3 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleApprove(req.id, req.client.companyName, req.user.name)}
                          disabled={processingId !== null}
                          className="h-7 w-7 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                          title="Approve Access"
                        >
                          {processingId === req.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setRejectId(req.id)}
                          disabled={processingId !== null}
                          className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                          title="Reject Access"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rejection Reason Modal */}
      <Dialog open={rejectId !== null} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              Decline Access Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide a reason to justify this decision. The requesting consultant will be notified immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Reason for Rejection</label>
              <Input
                placeholder="e.g., Assigned to another executive or missing business context..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRejectId(null)
                setRejectReason("")
              }}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRejectSubmit}
              disabled={rejecting}
              className="text-xs h-9 font-medium"
            >
              {rejecting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Processing...
                </>
              ) : (
                "Decline Access"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
