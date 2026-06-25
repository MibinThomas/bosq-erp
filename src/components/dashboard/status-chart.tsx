"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface StatusStat {
  status: string
  count: number
  value: number
}

interface StatusChartProps {
  data: StatusStat[]
  loading: boolean
}

const STATUS_COLORS: { [key: string]: string } = {
  DRAFT: "hsl(var(--muted-foreground)/0.5)",
  QUOTE_CREATED: "#3b82f6", // Blue
  REVISED: "#f59e0b", // Amber
  CLIENT_APPROVED: "#10b981", // Emerald
  PO_CONVERTED: "#059669", // Dark Green
  UNDER_PRODUCTION: "#ea580c", // Orange
  REJECTED: "#ef4444", // Rose
  CANCELLED: "#94a3b8" // Slate
}

const STATUS_LABELS: { [key: string]: string } = {
  DRAFT: "Draft",
  QUOTE_CREATED: "Quote Created",
  REVISED: "Revised",
  CLIENT_APPROVED: "Client Approved",
  PO_CONVERTED: "Converted to PO",
  UNDER_PRODUCTION: "Under Production",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled"
}

export function DashboardStatusChart({ data = [], loading }: StatusChartProps) {
  if (loading) {
    return (
      <Card className="col-span-1 lg:col-span-3">
        <CardHeader>
          <CardTitle>Quotation Status Distribution</CardTitle>
          <CardDescription>Quotation volume by pipeline stage</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  // Map to chart records
  const chartData = (data || [])
    .map(item => ({
      name: STATUS_LABELS[item.status] || item.status,
      value: item.count,
      amount: item.value,
      statusKey: item.status
    }))
    .filter(item => item.value > 0)

  return (
    <Card className="col-span-1 lg:col-span-3 flex flex-col h-full bg-card/65 backdrop-blur-md border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-3 border-b border-border/40 shrink-0">
        <CardTitle className="text-base font-bold tracking-tight">Quotation Status Distribution</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Quotation count by workflow stage</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-hidden min-h-[300px]">
        <div className="h-[280px] w-full relative">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              No quotations recorded for the selected period
            </div>
          ) : (
            <ResponsiveContainer width="99%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => {
                    const color = STATUS_COLORS[entry.statusKey] || `hsl(var(--chart-${(index % 5) + 1}))`
                    return <Cell key={`cell-${index}`} fill={color} />
                  })}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => {
                    const amt = props.payload.amount
                    const formattedAmt = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(amt || 0)
                    return [`${value} quote(s) (${formattedAmt})`, 'Count']
                  }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
