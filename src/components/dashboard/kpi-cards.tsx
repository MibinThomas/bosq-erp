"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, CheckCircle2, DollarSign, Clock, Percent } from "lucide-react"

interface KPIStats {
  totalQuotes: number
  totalValue: number
  convertedCount: number
  convertedValue: number
  winRate: number
  pendingApprovalsCount: number
  pendingFollowUpsCount: number
}

export function DashboardKPIs({ data, loading }: { data: KPIStats | null, loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="h-[120px] bg-muted/20" />
        ))}
      </div>
    )
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalQuotes}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Value: {formatCurrency(data.totalValue)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Converted (Won)</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">{data.convertedCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Value: {formatCurrency(data.convertedValue)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          <Percent className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{data.winRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            Of total quotes generated
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{data.pendingApprovalsCount + data.pendingFollowUpsCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.pendingApprovalsCount} Created &bull; {data.pendingFollowUpsCount} Draft/Revised
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
