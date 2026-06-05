"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ConsultantKPICards } from "./consultant-kpi-cards"
import { ConsultantQuotations } from "./consultant-quotations"
import { ConsultantClients } from "./consultant-clients"
import { ConsultantCharts } from "./consultant-charts"
import { ConsultantFollowUps } from "./consultant-followups"
import { Loader2 } from "lucide-react"

export function ConsultantDashboard() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  
  const [summaryData, setSummaryData] = useState<any>(null)
  const [overviewData, setOverviewData] = useState<any>(null)
  const [chartData, setChartData] = useState<any>(null)
  const [activityData, setActivityData] = useState<any>(null)

  useEffect(() => {
    if (session) {
      fetchConsultantData()
    }
  }, [session])

  async function fetchConsultantData() {
    setLoading(true)
    try {
      const [summaryRes, overviewRes, chartsRes, activityRes] = await Promise.all([
        fetch("/api/dashboard/consultant/summary"),
        fetch("/api/dashboard/consultant/overview"),
        fetch("/api/dashboard/consultant/charts"),
        fetch("/api/dashboard/consultant/activity")
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

      <ConsultantKPICards data={summaryData} />

      {!hasData ? (
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
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-5 space-y-6">
              <ConsultantQuotations quotations={overviewData?.quotations || []} />
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
