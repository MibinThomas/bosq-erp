"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { DashboardFilters, DashboardFilterState } from "@/components/dashboard/dashboard-filters"
import { DashboardKPIs } from "@/components/dashboard/kpi-cards"
import { DashboardSalesChart } from "@/components/dashboard/sales-chart"
import { DashboardSegmentChart } from "@/components/dashboard/segment-pie-chart"
import { DashboardTimeline } from "@/components/dashboard/activity-timeline"
import { Download } from "lucide-react"
import { PendingClientApprovals } from "@/components/dashboard/pending-approvals"
import { ConsultantDashboard } from "@/components/dashboard/consultant/consultant-dashboard"

export default function DashboardPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER"

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
    projectName: "",
    minVal: "",
    maxVal: ""
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
    if (filters.minVal) params.append("minVal", filters.minVal)
    if (filters.maxVal) params.append("maxVal", filters.maxVal)
    return params.toString()
  }

  useEffect(() => {
    if (session) {
      fetchDashboardData()
    }
  }, [filters, session])

  async function fetchDashboardData() {
    const qs = buildQueryString()
    
    // Fetch Summary
    setLoadingKPIs(true)
    fetch(`/api/dashboard/summary?${qs}`)
      .then(res => res.json())
      .then(data => setSummaryData(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingKPIs(false))

    // Fetch Charts
    setLoadingCharts(true)
    fetch(`/api/dashboard/charts?${qs}`)
      .then(res => res.json())
      .then(data => setChartData(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingCharts(false))

    // Fetch Timeline
    setLoadingTimeline(true)
    fetch(`/api/dashboard/activities?${qs}`)
      .then(res => res.json())
      .then(data => setTimelineData(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingTimeline(false))
  }

  const handleExport = () => {
    // In a real app, this would generate a CSV from the summary/chart data.
    // We'll trigger a simple CSV download of the sales performance data for now.
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

  if (userRole === "SALES_EXECUTIVE" || userRole === "DESIGN_CONSULTANT") {
    return <ConsultantDashboard />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Advanced overview of your quotation and sales performance.
        </p>
      </div>

      <DashboardFilters 
        filters={filters} 
        setFilters={setFilters} 
        onExport={handleExport} 
      />

      <DashboardKPIs data={summaryData} loading={loadingKPIs} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <DashboardSalesChart data={chartData?.salesData || []} loading={loadingCharts} />
        <DashboardSegmentChart data={chartData?.segmentData || []} loading={loadingCharts} />
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-3 h-full">
          {isManagerOrAdmin ? (
            <PendingClientApprovals onApprovalChanged={fetchDashboardData} />
          ) : (
            <div className="h-full border border-dashed rounded-xl bg-card flex items-center justify-center p-8 text-center text-muted-foreground min-h-[220px]">
              <p className="text-xs">Advanced sales analytics and administrative operations are role-gated.</p>
            </div>
          )}
        </div>
        <DashboardTimeline 
          activities={timelineData?.activities || []} 
          followUps={timelineData?.followUps || []} 
          loading={loadingTimeline} 
        />
      </div>

    </div>
  )
}
