"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { DashboardFilters, DashboardFilterState } from "@/components/dashboard/dashboard-filters"
import { DashboardKPIs } from "@/components/dashboard/kpi-cards"
import { DashboardSalesChart } from "@/components/dashboard/sales-chart"
import { DashboardRevenueTrendChart } from "@/components/dashboard/revenue-trend-chart"
import { DashboardStatusChart } from "@/components/dashboard/status-chart"
import { DashboardSegmentChart } from "@/components/dashboard/segment-pie-chart"
import { DashboardTimeline } from "@/components/dashboard/activity-timeline"
import { PendingClientApprovals } from "@/components/dashboard/pending-approvals"
import { ClientAccessRequests } from "@/components/dashboard/access-requests"
import { DashboardPendingActions } from "@/components/dashboard/pending-actions"
import { ConsultantDashboard } from "@/components/dashboard/consultant/consultant-dashboard"
import { DashboardTopPerformers } from "@/components/dashboard/top-performers"
import { ShieldAlert, RefreshCw } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function DashboardPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isSuperAdminOrAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN"
  const isManagerOrAdmin = isSuperAdminOrAdmin || userRole === "SALES_MANAGER" || userRole === "MANAGER"

  const [profile, setProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    const loadProfile = () => {
      if (session?.user) {
        setLoadingProfile(true)
        fetch(`/api/settings/access-control/profile?_t=${Date.now()}`, { cache: "no-store" })
          .then(res => {
            if (res.ok) return res.json()
            throw new Error("Failed to load profile")
          })
          .then(data => {
            setProfile(data)
          })
          .catch(err => console.error("Error loading permissions profile:", err))
          .finally(() => setLoadingProfile(false))
      }
    }

    loadProfile()

    window.addEventListener("visibility-refresh", loadProfile)
    return () => {
      window.removeEventListener("visibility-refresh", loadProfile)
    }
  }, [session])

  const [loadingKPIs, setLoadingKPIs] = useState(true)
  const [loadingCharts, setLoadingCharts] = useState(true)
  const [loadingTimeline, setLoadingTimeline] = useState(true)

  const [summaryData, setSummaryData] = useState<any>(null)
  const [chartData, setChartData] = useState<any>({ salesData: [], segmentData: [] })
  const [timelineData, setTimelineData] = useState<any>({ activities: [], followUps: [] })

  const [filters, setFilters] = useState<DashboardFilterState>({
    timeFrame: "last_month",
    startDate: (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0] })(),
    endDate: new Date().toISOString().split("T")[0],
    userId: "all",
    clientId: "all",
    clientType: "all",
    status: "all",
    projectName: ""
  })

  const buildQueryString = () => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append("startDate", filters.startDate)
    if (filters.endDate) params.append("endDate", filters.endDate)
    if (filters.userId && filters.userId !== "all") params.append("userId", filters.userId)
    if (filters.clientId && filters.clientId !== "all") params.append("clientId", filters.clientId)
    if (filters.clientType && filters.clientType !== "all") params.append("clientType", filters.clientType)
    if (filters.status && filters.status !== "all") params.append("status", filters.status)
    if (filters.projectName) params.append("projectName", filters.projectName)
    return params.toString()
  }

  useEffect(() => {
    if (session) {
      fetchDashboardData()
    }
  }, [filters, session])

  useEffect(() => {
    const handleRefresh = () => {
      if (session) {
        fetchDashboardData()
      }
    }
    window.addEventListener("focus", handleRefresh)
    document.addEventListener("visibilitychange", handleRefresh)
    window.addEventListener("dashboard-refresh", handleRefresh)
    return () => {
      window.removeEventListener("focus", handleRefresh)
      document.removeEventListener("visibilitychange", handleRefresh)
      window.removeEventListener("dashboard-refresh", handleRefresh)
    }
  }, [filters, session])

  async function fetchDashboardData() {
    const qs = buildQueryString()
    const t = Date.now()
    
    // Fetch Summary
    setLoadingKPIs(true)
    fetch(`/api/dashboard/summary?${qs}&_t=${t}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => setSummaryData(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingKPIs(false))

    // Fetch Charts
    setLoadingCharts(true)
    fetch(`/api/dashboard/charts?${qs}&_t=${t}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => setChartData(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingCharts(false))

    // Fetch Timeline
    setLoadingTimeline(true)
    fetch(`/api/dashboard/activities?${qs}&_t=${t}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => setTimelineData(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingTimeline(false))
  }

  const handleExport = () => {
    if (!chartData?.salesData?.length) return
    
    const headers = ["Date", "Converted Value (AED)", "Pending Value (AED)"]
    const rows = chartData.salesData.map((row: any) => [
      row.date,
      row.convertedValue,
      row.pendingValue
    ])
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map((e: any[]) => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `dashboard_export_${filters.startDate}_to_${filters.endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (loadingProfile) {
    return (
      <div className="py-20 text-center text-zinc-400 text-sm animate-pulse flex flex-col items-center justify-center space-y-2 font-sans">
        <RefreshCw className="animate-spin text-primary h-6 w-6" />
        <span>Loading dashboard panel, please wait...</span>
      </div>
    )
  }

  if (profile && !profile.isSuperAdmin && profile.permissions["DASHBOARD"]?.view === false) {
    return (
      <div className="flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-card p-12 text-center max-w-2xl mx-auto my-12 shadow-lg space-y-4 font-sans">
        <div className="p-3 bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          You do not have the required permissions to view the overview dashboard statistics. Please request access from your Super Administrator.
        </p>
      </div>
    )
  }

  if (userRole === "SALES_EXECUTIVE" || userRole === "INTERIOR_DESIGN_CONSULTANT") {
    return <ConsultantDashboard />
  }

  return (
    <div className="space-y-8 pb-12 font-sans">
      
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Executive Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time analytics and management dashboard for quotation workflows, pipelines, and team performance.
        </p>
      </div>

      {/* Filter panel */}
      <DashboardFilters 
        filters={filters} 
        setFilters={setFilters} 
        onExport={handleExport} 
      />

      {/* Row 1: KPI Summary Cards */}
      <DashboardKPIs 
        data={summaryData} 
        loading={loadingKPIs} 
        onFilterChange={handleFilterChange} 
      />

      {/* Row 2: Revenue Trend & Sales Performance Charts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <DashboardRevenueTrendChart 
          data={chartData?.salesData || []} 
          loading={loadingCharts} 
        />
        <DashboardSalesChart 
          data={chartData?.salesData || []} 
          loading={loadingCharts} 
        />
      </div>

      {/* Row 3: Quotation Status & Client Segment Breakdown Charts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <DashboardStatusChart 
          data={summaryData?.statusStats || []} 
          loading={loadingKPIs} 
        />
        <DashboardSegmentChart 
          data={chartData?.segmentData || []} 
          loading={loadingCharts} 
        />
      </div>

      {/* Row 4: Top Performers & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-7">
        {isManagerOrAdmin && (
          <div className="lg:col-span-5 h-full">
            <DashboardTopPerformers 
              topConsultants={summaryData?.topConsultants || []}
              topClients={summaryData?.topClients || []}
              loading={loadingKPIs} 
            />
          </div>
        )}
        <div className={isManagerOrAdmin ? "lg:col-span-2 h-full" : "lg:col-span-7 h-full"}>
          <DashboardTimeline 
            activities={timelineData?.activities || []} 
            followUps={[]} // Extracted to pending actions in Row 5
            loading={loadingTimeline} 
          />
        </div>
      </div>

      {/* Row 5: Pending Actions, Approval Queue & Client Access Requests */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        
        {/* Widget 1: Pending Actions (Followups) */}
        <DashboardPendingActions 
          followUps={timelineData?.followUps || []} 
          loading={loadingTimeline} 
        />

        {/* Widget 2: Approval Queue */}
        {isManagerOrAdmin ? (
          <PendingClientApprovals onApprovalChanged={fetchDashboardData} />
        ) : (
          <Card className="rounded-xl border shadow-sm p-8 flex items-center justify-center text-center text-muted-foreground min-h-[320px] bg-card/50">
            <p className="text-xs">Client approval operations are role-gated.</p>
          </Card>
        )}

        {/* Widget 3: Client Access Requests */}
        {isSuperAdminOrAdmin ? (
          <ClientAccessRequests onChanged={fetchDashboardData} />
        ) : (
          <Card className="rounded-xl border shadow-sm p-8 flex items-center justify-center text-center text-muted-foreground min-h-[320px] bg-card/50">
            <p className="text-xs">Client assignment access requests are role-gated for administrators.</p>
          </Card>
        )}

      </div>

    </div>
  )
}
