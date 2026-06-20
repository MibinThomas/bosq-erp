"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ConsultantKPICards } from "./consultant-kpi-cards"
import { ConsultantQuotations } from "./consultant-quotations"
import { ConsultantBoqs } from "./consultant-boqs"
import { ConsultantClients } from "./consultant-clients"
import { ConsultantCharts } from "./consultant-charts"
import { ConsultantFollowUps } from "./consultant-followups"
import { Loader2 } from "lucide-react"
import { DashboardFilters, DashboardFilterState } from "../dashboard-filters"

export function ConsultantDashboard() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  
  const [summaryData, setSummaryData] = useState<any>(null)
  const [overviewData, setOverviewData] = useState<any>(null)
  const [chartData, setChartData] = useState<any>(null)
  const [activityData, setActivityData] = useState<any>(null)

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
      fetchConsultantData()
    }
  }, [filters, session])

  async function fetchConsultantData() {
    setLoading(true)
    const qs = buildQueryString()
    try {
      const [summaryRes, overviewRes, chartsRes, activityRes] = await Promise.all([
        fetch(`/api/dashboard/consultant/summary?${qs}`),
        fetch(`/api/dashboard/consultant/overview?${qs}`),
        fetch(`/api/dashboard/consultant/charts?${qs}`),
        fetch(`/api/dashboard/consultant/activity?${qs}`)
      ])

      if (summaryRes.ok) setSummaryData(await summaryRes.json())
      if (overviewRes.ok) setOverviewData(await overviewRes.json())
      if (chartsRes.ok) setChartData(await chartsRes.json())
      if (activityRes.ok) setActivityData(await activityRes.json())
    } catch (error) {
      console.error("Failed to fetch consultant dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"

  const hasData = overviewData?.quotations?.length > 0 || overviewData?.clients?.length > 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
          <p className="text-muted-foreground">
            Personalized overview of your quotations, clients, and performance.
          </p>
        </div>
      </div>

      <DashboardFilters filters={filters} setFilters={setFilters} />

      <ConsultantKPICards data={summaryData} />

      {!hasData ? (
        userRole === "DESIGN_CONSULTANT" ? (
          <div className="bg-card border border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">No clients assigned yet</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1">
                No clients assigned yet. Contact your administrator to assign clients to your account. Your dashboard will populate automatically when clients are assigned.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">No quotations created yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                Start by creating your first quotation. Your performance metrics, recent activities, and clients will appear here.
              </p>
            </div>
            <a href="/quotations/new" className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors">
              Create Quotation
            </a>
          </div>
        )
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-5 space-y-6">
              <ConsultantQuotations quotations={overviewData?.quotations || []} />
              {userRole === "DESIGN_CONSULTANT" && (
                <ConsultantBoqs boqs={overviewData?.boqs || []} />
              )}
              <div className="grid gap-6 md:grid-cols-2">
                <ConsultantClients clients={overviewData?.clients || []} />
                <ConsultantFollowUps followUps={activityData?.followUps || []} />
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <ConsultantCharts chartData={chartData} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
