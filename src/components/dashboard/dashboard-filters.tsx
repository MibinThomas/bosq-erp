"use client"

import { useState, useEffect } from "react"
import { Filter, X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSession } from "next-auth/react"

export interface DashboardFilterState {
  timeFrame: string
  startDate: string
  endDate: string
  userId: string
  clientId: string
  clientType: string
  status: string
  projectName: string
  minVal: string
  maxVal: string
}

interface DashboardFiltersProps {
  filters: DashboardFilterState
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilterState>>
  onExport?: () => void
}

export function DashboardFilters({ filters, setFilters, onExport }: DashboardFiltersProps) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "SALES_MANAGER"

  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    if (isManagerOrAdmin) {
      fetch("/api/settings/users")
        .then(res => res.json())
        .then(data => setUsers(Array.isArray(data) ? data : []))
        .catch(err => console.error(err))
    }
  }, [isManagerOrAdmin])

  const handleTimeFrameChange = (val: string | null) => {
    if (!val) return;
    const today = new Date()
    let start = ""
    let end = today.toISOString().split("T")[0]

    if (val === "today") {
      start = end
    } else if (val === "yesterday") {
      const y = new Date()
      y.setDate(y.getDate() - 1)
      start = y.toISOString().split("T")[0]
      end = start
    } else if (val === "this_week") {
      const w = new Date()
      w.setDate(w.getDate() - w.getDay()) // Sunday
      start = w.toISOString().split("T")[0]
    } else if (val === "last_week") {
      const lwStart = new Date()
      lwStart.setDate(lwStart.getDate() - lwStart.getDay() - 7)
      const lwEnd = new Date()
      lwEnd.setDate(lwEnd.getDate() - lwEnd.getDay() - 1)
      start = lwStart.toISOString().split("T")[0]
      end = lwEnd.toISOString().split("T")[0]
    } else if (val === "this_month") {
      const m = new Date(today.getFullYear(), today.getMonth(), 1)
      start = m.toISOString().split("T")[0]
    } else if (val === "last_month") {
      const lmStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lmEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      start = lmStart.toISOString().split("T")[0]
      end = lmEnd.toISOString().split("T")[0]
    } else if (val === "this_quarter") {
      const q = Math.floor(today.getMonth() / 3)
      const qStart = new Date(today.getFullYear(), q * 3, 1)
      start = qStart.toISOString().split("T")[0]
    } else if (val === "this_year") {
      const y = new Date(today.getFullYear(), 0, 1)
      start = y.toISOString().split("T")[0]
    } else if (val === "custom") {
      start = filters.startDate
      end = filters.endDate
    }

    setFilters(prev => ({
      ...prev,
      timeFrame: val,
      startDate: start,
      endDate: end
    }))
  }

  const handleClear = () => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    setFilters({
      timeFrame: "custom",
      startDate: thirtyDaysAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
      userId: "all",
      clientId: "all",
      clientType: "all",
      status: "all",
      projectName: "",
      minVal: "",
      maxVal: ""
    })
  }

  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4" /> Filters
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground h-8 text-xs">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="h-8 text-xs">
              <Download className="h-3 w-3 mr-1" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Time Frame */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Time Frame</label>
          <Select value={filters.timeFrame || "custom"} onValueChange={handleTimeFrameChange}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Time Frame" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="custom">Custom Date Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range */}
        {filters.timeFrame === "custom" && (
          <>
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
          </>
        )}

        {/* Status */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Quotation Status</label>
          <Select value={filters.status} onValueChange={v => setFilters(p => ({ ...p, status: v as string }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="QUOTE_CREATED">Quote Created</SelectItem>
              <SelectItem value="REVISED">Revised</SelectItem>
              <SelectItem value="CLIENT_APPROVED">Client Approved</SelectItem>
              <SelectItem value="PO_CONVERTED">Converted to PO</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Client Type */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Client Segment</label>
          <Select value={filters.clientType} onValueChange={v => setFilters(p => ({ ...p, clientType: v as string }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Segments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Segments</SelectItem>
              <SelectItem value="Interior">Interior Designer</SelectItem>
              <SelectItem value="Dealer">Dealer</SelectItem>
              <SelectItem value="Direct">Direct Client</SelectItem>
              <SelectItem value="Online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Project Name */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Project Name</label>
          <Input 
            type="text" 
            placeholder="Search project..."
            value={filters.projectName || ""} 
            onChange={e => setFilters(p => ({ ...p, projectName: e.target.value }))}
            className="h-9 text-sm"
          />
        </div>

        {/* Value Range */}
        <div className="space-y-1 flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">Min Value</label>
            <Input 
              type="number" 
              placeholder="Min"
              value={filters.minVal || ""} 
              onChange={e => setFilters(p => ({ ...p, minVal: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">Max Value</label>
            <Input 
              type="number" 
              placeholder="Max"
              value={filters.maxVal || ""} 
              onChange={e => setFilters(p => ({ ...p, maxVal: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Design Consultant - Only for managers/admins */}
        {isManagerOrAdmin && (
          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Design Consultant</label>
            <Select value={filters.userId} onValueChange={v => setFilters(p => ({ ...p, userId: v as string }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Design Consultants" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Design Consultants</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
