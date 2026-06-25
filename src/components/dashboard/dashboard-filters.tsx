"use client"

import { useState, useEffect } from "react"
import { Filter, X, Download, ChevronDown, ChevronUp, RotateCcw, Calendar, Users, Briefcase, FileCheck, Check, Sparkles, DollarSign } from "lucide-react"
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
}

interface DashboardFiltersProps {
  filters: DashboardFilterState
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilterState>>
  onExport?: () => void
}

export function DashboardFilters({ filters, setFilters, onExport }: DashboardFiltersProps) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "SALES_MANAGER" || userRole === "MANAGER"

  // Collapsible toggle
  const [isExpanded, setIsExpanded] = useState(false)

  // Local state to avoid trigger requests on every keystroke
  const [localFilters, setLocalFilters] = useState<DashboardFilterState>({ ...filters })

  // Sync local filters when parent filters change
  useEffect(() => {
    setLocalFilters({ ...filters })
  }, [filters])

  // Dropdown options
  const [users, setUsers] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])

  useEffect(() => {
    if (isManagerOrAdmin) {
      fetch("/api/users/sales-agents")
        .then(res => res.json())
        .then(data => setUsers(Array.isArray(data) ? data : []))
        .catch(err => console.error("Error loading users for filters:", err))
    }
  }, [isManagerOrAdmin])

  useEffect(() => {
    fetch("/api/clients?all=true")
      .then(res => res.json())
      .then(data => setClients(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error loading clients for filters:", err))
  }, [])

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
      start = localFilters.startDate
      end = localFilters.endDate
    }

    setLocalFilters(prev => ({
      ...prev,
      timeFrame: val,
      startDate: start,
      endDate: end
    }))
  }

  const applyFilters = () => {
    setFilters({ ...localFilters })
    setIsExpanded(false)
  }

  const resetFilters = () => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)

    const defaults: DashboardFilterState = {
      timeFrame: "last_month",
      startDate: thirtyDaysAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
      userId: "all",
      clientId: "all",
      clientType: "all",
      status: "all",
      projectName: ""
    }
    setLocalFilters(defaults)
    setFilters(defaults)
    setIsExpanded(false)
  }

  // Predefined Saved Filter Presets
  const applyPreset = (presetName: string) => {
    const today = new Date()
    let start = ""
    let end = today.toISOString().split("T")[0]
    let presetFilters = { ...localFilters }

    if (presetName === "this_month") {
      const m = new Date(today.getFullYear(), today.getMonth(), 1)
      start = m.toISOString().split("T")[0]
      presetFilters = {
        ...presetFilters,
        timeFrame: "this_month",
        startDate: start,
        endDate: end
      }
    } else if (presetName === "last_30_days") {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      start = d.toISOString().split("T")[0]
      presetFilters = {
        ...presetFilters,
        timeFrame: "custom",
        startDate: start,
        endDate: end
      }

    } else if (presetName === "pending_approvals") {
      presetFilters = {
        ...presetFilters,
        status: "QUOTE_CREATED"
      }
    }

    setLocalFilters(presetFilters)
    setFilters(presetFilters)
    setIsExpanded(false)
  }

  // Summary descriptions for the collapsed state bar
  const getActiveFilterSummary = () => {
    const summaryParts: string[] = []
    
    // Time frame description
    if (filters.timeFrame && filters.timeFrame !== "custom") {
      summaryParts.push(filters.timeFrame.replace("_", " "))
    } else if (filters.startDate && filters.endDate) {
      summaryParts.push(`${filters.startDate} to ${filters.endDate}`)
    }

    // Consultant name description
    if (filters.userId && filters.userId !== "all" && users.length > 0) {
      const selectedUser = users.find(u => u.id === filters.userId)
      if (selectedUser) {
        summaryParts.push(`Consultant: ${selectedUser.name}`)
      }
    }

    // Client name description
    if (filters.clientId && filters.clientId !== "all" && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === filters.clientId)
      if (selectedClient) {
        summaryParts.push(`Client: ${selectedClient.companyName}`)
      }
    }

    // Status description
    if (filters.status && filters.status !== "all") {
      summaryParts.push(`Status: ${filters.status.replace("_", " ")}`)
    }

    // Project Name description
    if (filters.projectName) {
      summaryParts.push(`Project: "${filters.projectName}"`)
    }



    return summaryParts.length > 0 ? summaryParts.join(" • ") : "No active filters"
  }

  return (
    <div className="bg-card/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm mb-6 transition-all duration-300 backdrop-blur-md overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 bg-muted/10">
        
        {/* Toggle Button / Active Summary */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 h-9 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium text-xs font-sans text-foreground cursor-pointer shrink-0"
          >
            <Filter className="h-3.5 w-3.5 text-zinc-500" />
            <span>Advanced Filters</span>
            {isExpanded ? <ChevronUp className="h-3 w-3 text-zinc-400" /> : <ChevronDown className="h-3 w-3 text-zinc-400" />}
          </Button>

          {/* Active summary pill */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground truncate font-medium">
            <span className="shrink-0 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-bold">Active:</span>
            <span className="truncate italic">{getActiveFilterSummary()}</span>
          </div>
        </div>

        {/* Saved Presets / Export */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1 bg-zinc-100/50 dark:bg-zinc-800/40 p-0.5 rounded-lg border border-border/40 mr-2">
            <Button variant="ghost" size="sm" onClick={() => applyPreset("this_month")} className="h-7 text-[10px] px-2 font-medium hover:bg-card">This Month</Button>
            <Button variant="ghost" size="sm" onClick={() => applyPreset("last_30_days")} className="h-7 text-[10px] px-2 font-medium hover:bg-card">Last 30 Days</Button>
            <Button variant="ghost" size="sm" onClick={() => applyPreset("pending_approvals")} className="h-7 text-[10px] px-2 font-medium hover:bg-card">Needs Approval</Button>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 h-8 text-xs font-semibold">
              <RotateCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport} className="h-8 text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <Download className="h-3 w-3 mr-1" /> Export CSV
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="p-5 border-b border-border/40 bg-card transition-all duration-300 ease-in-out">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* 1. Time Frame */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Time Frame
              </label>
              <Select value={localFilters.timeFrame || "custom"} onValueChange={handleTimeFrameChange}>
                <SelectTrigger className="h-9 text-xs border-zinc-200 dark:border-zinc-800"><SelectValue placeholder="Select period..." /></SelectTrigger>
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

            {/* Custom Dates */}
            {localFilters.timeFrame === "custom" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Start Date</label>
                  <Input 
                    type="date" 
                    value={localFilters.startDate} 
                    onChange={e => setLocalFilters(p => ({ ...p, startDate: e.target.value }))}
                    className="h-9 text-xs border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">End Date</label>
                  <Input 
                    type="date" 
                    value={localFilters.endDate} 
                    onChange={e => setLocalFilters(p => ({ ...p, endDate: e.target.value }))}
                    className="h-9 text-xs border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </>
            )}

            {/* 2. Quotation Status */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <FileCheck className="h-3 w-3" /> Quotation Status
              </label>
              <Select value={localFilters.status} onValueChange={v => setLocalFilters(p => ({ ...p, status: v as string }))}>
                <SelectTrigger className="h-9 text-xs border-zinc-200 dark:border-zinc-800"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="QUOTE_CREATED">Quote Created</SelectItem>
                  <SelectItem value="REVISED">Revised</SelectItem>
                  <SelectItem value="CLIENT_APPROVED">Client Approved</SelectItem>
                  <SelectItem value="PO_CONVERTED">Converted to PO</SelectItem>
                  <SelectItem value="UNDER_PRODUCTION">Under Production</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. Client Segment */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Client Segment
              </label>
              <Select value={localFilters.clientType} onValueChange={v => setLocalFilters(p => ({ ...p, clientType: v as string }))}>
                <SelectTrigger className="h-9 text-xs border-zinc-200 dark:border-zinc-800"><SelectValue placeholder="All Segments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="Interior">Interior Designer</SelectItem>
                  <SelectItem value="Dealer">Dealer</SelectItem>
                  <SelectItem value="Direct">Direct Client</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Client Search Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3" /> Client
              </label>
              <Select value={localFilters.clientId} onValueChange={v => setLocalFilters(p => ({ ...p, clientId: v as string }))}>
                <SelectTrigger className="h-9 text-xs border-zinc-200 dark:border-zinc-800"><SelectValue placeholder="All Clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 5. Design Consultant (Managers/Admins only) */}
            {isManagerOrAdmin && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Users className="h-3 w-3" /> Consultant
                </label>
                <Select value={localFilters.userId} onValueChange={v => setLocalFilters(p => ({ ...p, userId: v as string }))}>
                  <SelectTrigger className="h-9 text-xs border-zinc-200 dark:border-zinc-800"><SelectValue placeholder="All Consultants" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Consultants</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 6. Project Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Project Name</label>
              <Input 
                type="text" 
                placeholder="Search projects..."
                value={localFilters.projectName || ""} 
                onChange={e => setLocalFilters(p => ({ ...p, projectName: e.target.value }))}
                className="h-9 text-xs border-zinc-200 dark:border-zinc-800"
              />
            </div>



          </div>

          {/* Action buttons */}
          <div className="flex justify-end items-center gap-2 mt-6 pt-4 border-t border-border/40">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setLocalFilters({ ...filters })
                setIsExpanded(false)
              }}
              className="text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={applyFilters}
              className="text-xs h-9 font-medium flex items-center gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Check className="h-3.5 w-3.5" />
              Apply Filters
            </Button>
          </div>

        </div>
      )}

    </div>
  )
}
