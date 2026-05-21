"use client"

import { useState, useEffect } from "react"
import { Filter, X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSession } from "next-auth/react"

export interface DashboardFilterState {
  startDate: string
  endDate: string
  userId: string
  clientId: string
  clientType: string
  status: string
}

interface DashboardFiltersProps {
  filters: DashboardFilterState
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilterState>>
  onExport: () => void
}

export function DashboardFilters({ filters, setFilters, onExport }: DashboardFiltersProps) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER"

  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    if (isManagerOrAdmin) {
      fetch("/api/users")
        .then(res => res.json())
        .then(data => setUsers(Array.isArray(data) ? data : []))
        .catch(err => console.error(err))
    }
  }, [isManagerOrAdmin])

  const handleClear = () => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    setFilters({
      startDate: thirtyDaysAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
      userId: "all",
      clientId: "all",
      clientType: "all",
      status: "all"
    })
  }

  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4" /> Filters
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground h-8 text-xs">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
          <Button variant="outline" size="sm" onClick={onExport} className="h-8 text-xs">
            <Download className="h-3 w-3 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Date Range */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Start Date</label>
          <Input 
            type="date" 
            value={filters.startDate} 
            onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">End Date</label>
          <Input 
            type="date" 
            value={filters.endDate} 
            onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
            className="h-9 text-sm"
          />
        </div>

        {/* Client Type */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Client Segment</label>
          <Select value={filters.clientType} onValueChange={v => setFilters(p => ({ ...p, clientType: v as string }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Segments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Segments</SelectItem>
              <SelectItem value="Interior">Interior</SelectItem>
              <SelectItem value="Dealer">Dealer</SelectItem>
              <SelectItem value="Direct">Direct</SelectItem>
              <SelectItem value="Online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={filters.status} onValueChange={v => setFilters(p => ({ ...p, status: v as string }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="PO_RECEIVED">PO Received</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Design Consultant - Only for managers */}
        {isManagerOrAdmin && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Design Consultant</label>
            <Select value={filters.userId} onValueChange={v => setFilters(p => ({ ...p, userId: v as string }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Users" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
