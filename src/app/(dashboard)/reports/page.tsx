"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileText, RefreshCw, CheckCircle, AlertTriangle, Loader2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { toast } from "sonner"

interface ReportsData {
  totalCreated: number
  totalRevisions: number
  clientConfirmed: number
  lostOrRejected: number
  chartData: any[]
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true)
        const res = await fetch(`/api/reports/summary?_t=${Date.now()}`, { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load reports summary")
        const json = await res.json()
        setData(json)
      } catch (err: any) {
        console.error(err)
        toast.error("Error loading reports statistics.")
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Generating quotation report...</p>
      </div>
    )
  }

  const stats = [
    {
      title: "Total Quotations Created",
      value: data?.totalCreated ?? 0,
      description: "Grand total of all quote entries",
      icon: FileText,
      color: "text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800",
      borderColor: "border-zinc-200 dark:border-zinc-800",
    },
    {
      title: "Pending Manager Approvals",
      value: (data as any)?.pendingApprovals ?? 0,
      description: "Quotes requiring Manager / GM approval",
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20",
      borderColor: "border-amber-200 dark:border-amber-900/30",
    },
    {
      title: "Total Consultant Discounts Given",
      value: `AED ${((data as any)?.totalDiscountAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      description: `Average Discount: ${((data as any)?.avgDiscountPct || 0).toFixed(1)}%`,
      icon: RefreshCw,
      color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20",
      borderColor: "border-purple-200 dark:border-purple-900/30",
    },
    {
      title: "Client Confirmed Quotations",
      value: data?.clientConfirmed ?? 0,
      description: "Final client-accepted quotes (won)",
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20",
      borderColor: "border-green-200 dark:border-green-900/30",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
          Quotation Analytics &amp; Managerial Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historical overview, discount analysis, approval status, and confirmation success.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, idx) => (
          <Card key={idx} className={`border border-solid ${s.borderColor} shadow-sm backdrop-blur-sm bg-white/50 dark:bg-zinc-900/50`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {s.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold tracking-tight">{s.value}</div>
              <p className="text-xs text-zinc-400 mt-1 font-medium">{s.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Section */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Quotation Value Comparison (Last 6 Months)</CardTitle>
            <CardDescription>
              Total Created vs Client Confirmed Quotation Value (AED)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              {!data?.chartData || data.chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No chart data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.15)" />
                    <XAxis 
                      dataKey="month" 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                      dx={-10}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: any) => [new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(Number(value) || 0), undefined]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="total" name="Total Value (AED)" fill="hsl(var(--chart-1, 221 83% 53%))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="confirmed" name="Client Confirmed Value (AED)" fill="hsl(var(--chart-2, 142 71% 45%))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
