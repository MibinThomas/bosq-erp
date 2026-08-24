"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface RevenueTrendChartProps {
  data: any[]
  loading: boolean
}

export function DashboardRevenueTrendChart({ data, loading }: RevenueTrendChartProps) {
  if (loading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Daily confirmed revenue overview</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  // Filter out dates with no converted value to keep the line clean, or map directly
  const chartData = data || []

  return (
    <Card className="col-span-1 lg:col-span-2 flex flex-col h-full bg-card/65 backdrop-blur-md border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-3 border-b border-border/40 shrink-0">
        <CardTitle className="text-base font-bold tracking-tight">Revenue Trend</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Daily confirmed revenue timeline</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-hidden min-h-[300px]">
        <div className="h-[280px] w-full relative">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              No revenue recorded for the selected period
            </div>
          ) : (
            <ResponsiveContainer width="99%" height="100%" minWidth={0}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2, 142 71% 45%))" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2, 142 71% 45%))" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  dy={10}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                  dx={-5}
                />
                <Tooltip 
                  cursor={{ stroke: 'hsl(var(--muted-foreground)/0.2)', strokeWidth: 1 }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  itemStyle={{ fontSize: '11px' }}
                  formatter={(value: any) => [new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(Number(value) || 0), 'Confirmed (AED)']}
                />
                <Area 
                  type="monotone" 
                  dataKey="convertedValue" 
                  stroke="hsl(var(--chart-2, 142 71% 45%))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorConverted)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
