"use client"

import { useEffect, useState } from "react"
import { Check, X, Loader2, ShieldCheck, UserCheck, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface PendingClient {
  id: string
  clientId: string
  companyName: string
  contactPerson: string | null
  clientType: string | null
  salespersonName: string
  phone: string | null
  email: string | null
}

interface PendingClientApprovalsProps {
  onApprovalChanged?: () => void
}

export function PendingClientApprovals({ onApprovalChanged }: PendingClientApprovalsProps) {
  const [pending, setPending] = useState<PendingClient[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  async function fetchPendingClients() {
    try {
      setLoading(true)
      const res = await fetch("/api/clients/pending")
      if (!res.ok) throw new Error("Failed to fetch pending approvals")
      const data = await res.json()
      setPending(data)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load pending client approvals.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingClients()
  }, [])

  const handleAction = async (id: string, companyName: string, action: "Approved" | "Rejected") => {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName, // Put route requires companyName
          status: action,
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to ${action.toLowerCase()} client`)
      }

      toast.success(
        action === "Approved"
          ? `Successfully approved "${companyName}"! They can now be selected for quotations.`
          : `Client "${companyName}" has been rejected.`
      )
      
      // Refresh pending list
      fetchPendingClients()
      if (onApprovalChanged) {
        onApprovalChanged()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || `An error occurred while updating status.`)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <Card className="rounded-xl border shadow-sm h-[320px] flex items-center justify-center bg-card">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Checking approvals...</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border shadow-sm bg-card flex flex-col h-full">
      <CardHeader className="pb-3 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-lg flex items-center gap-2 font-bold tracking-tight">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Client Approvals
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Review clients registered by consultants requiring database approval.
            </CardDescription>
          </div>
          {pending.length > 0 && (
            <Badge variant="destructive" className="animate-pulse bg-destructive/10 text-destructive border-destructive/20 font-bold font-mono">
              {pending.length} Pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-y-auto min-h-[220px]">
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4 gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary/80 border border-primary/10">
              <UserCheck className="h-5 w-5" />
            </div>
            <h5 className="font-semibold text-sm">All Caught Up!</h5>
            <p className="text-xs text-muted-foreground max-w-[280px]">
              No clients are currently awaiting approval. Newly registered corporate entities are fully verified.
            </p>
          </div>
        ) : (
          <Table className="whitespace-nowrap">
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase tracking-wider h-9">ID</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider h-9">Company</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider h-9">Type</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider h-9">Salesperson</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider h-9 text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/10 transition-colors group">
                  <TableCell className="font-mono font-medium py-3 text-xs">{client.clientId}</TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-xs text-foreground truncate max-w-[180px]">{client.companyName}</span>
                      {client.contactPerson && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5">{client.contactPerson}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {client.clientType || "Direct"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-xs font-medium text-slate-300">
                    {client.salespersonName}
                  </TableCell>
                  <TableCell className="py-3 text-right pr-6 gap-2">
                    <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleAction(client.id, client.companyName, "Approved")}
                        disabled={processingId !== null}
                        className="h-7 w-7 rounded-lg text-green-500 hover:text-green-600 hover:bg-green-500/10 cursor-pointer"
                        title="Approve Client"
                      >
                        {processingId === client.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleAction(client.id, client.companyName, "Rejected")}
                        disabled={processingId !== null}
                        className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                        title="Reject Client"
                      >
                        {processingId === client.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
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
  )
}
