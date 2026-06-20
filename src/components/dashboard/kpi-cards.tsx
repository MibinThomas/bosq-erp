"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  FileText, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  Percent, 
  Users, 
  UserCheck, 
  TrendingUp, 
  FileEdit, 
  RefreshCw, 
  Layers 
} from "lucide-react"
import { useSession } from "next-auth/react"

interface KPIStats {
  totalQuotes: number
  totalValue: number
  convertedCount: number
  convertedValue: number
  winRate: number
  pendingApprovalsCount: number
  pendingFollowUpsCount: number
  
  // 10 Team Overview KPIs
  totalDesignConsultants?: number
  totalAssignedClients?: number
  totalActiveQuotations?: number
  totalDraftQuotations?: number
  totalRevisedQuotations?: number
  totalClientConfirmedQuotations?: number
  totalBOQs?: number
  totalPendingBOQs?: number
  totalRevenuePipeline?: number
}

export function DashboardKPIs({ data, loading }: { data: KPIStats | null, loading: boolean }) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "SALES_MANAGER" || userRole === "MANAGER"

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  if (loading || !data) {
    const cardCount = isManagerOrAdmin ? 10 : 4
    const columnsClass = isManagerOrAdmin 
      ? "grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 animate-pulse"
      : "grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse"
    return (
      <div className={columnsClass}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <Card key={i} className="h-[105px] bg-muted/20" />
        ))}
      </div>
    )
  }

  if (isManagerOrAdmin) {
    return (
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
        {/* 1. Consultants */}
        <Card className="hover:scale-[1.02] transition-transform duration-200 shadow-sm border border-muted/50 bg-card/65 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Consultants</CardTitle>
            <Users className="h-4.5 w-4.5 text-purple-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold tracking-tight text-card-foreground">{data.totalDesignConsultants ?? 0}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Active team</p>
          </CardContent>
        </Card>

        {/* 2. Assigned Clients */}
        <Card className="hover:scale-[1.02] transition-transform duration-200 shadow-sm border border-muted/50 bg-card/65 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Clients</CardTitle>
            <UserCheck className="h-4.5 w-4.5 text-indigo-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold tracking-tight text-card-foreground">{data.totalAssignedClients ?? 0}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Unique accounts</p>
          </CardContent>
        </Card>

        {/* 3. Total Quotations */}
        <Card className="hover:scale-[1.02] transition-transform duration-200 shadow-sm border border-muted/50 bg-card/65 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Quotes</CardTitle>
            <FileText className="h-4.5 w-4.5 text-cyan-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold tracking-tight text-card-foreground">{data.totalQuotes}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Value: {formatCurrency(data.totalValue)}</p>
          </CardContent>
        </Card>

        {/* 4. Active (In-Progress) Quotations */}
        <Card className="hover:scale-[1.02] transition-transform duration-200 shadow-sm border border-muted/50 bg-card/65 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Quotes</CardTitle>
            <TrendingUp className="h-4.5 w-4.5 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold tracking-tight text-card-foreground">{data.totalActiveQuotations ?? 0}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">In-progress pipeline</p>
          </CardContent>
        </Card>

        {/* 5. Draft Quotations */}
        <Card className="hover:scale-[1.02] transition-transform duration-200 shadow-sm border border-muted/50 bg-card/65 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Draft Quotes</CardTitle>
            <FileEdit className="h-4.5 w-4.5 text-slate-400" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold tracking-tight text-card-foreground">{data.totalDraftQuotations ?? 0}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Not sent yet</p>
          </CardContent>
        </Card>

        {/* 6. Revised Quotations */}
        <Card className="hover:scale-[1.02] transition-transform duration-200 shadow-sm border border-muted/50 bg-card/65 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Revised</CardTitle>
            <RefreshCw className="h-4.5 w-4.5 text-amber-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold tracking-tight text-card-foreground">{data.totalRevisedQuotations ?? 0}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting updates</p>
          </CardContent>
        </Card>

        {/* 7. Confirmed Quotations */}
        <Card className="hover:scale-[1.02] transition-transform duration-200 shadow-sm border border-muted/50 bg-card/65 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Confirmed</CardTitle>
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold tracking-tight text-emerald-600">{data.totalClientConfirmedQuotations ?? 0}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Win: {formatCurrency(data.convertedValue)}</p>
          </CardContent>
        </Card>

        {/* 8. Total BOQs */}
        <Card className="hover:scale-[1.02] transition-transform duration-200 shadow-sm border border-muted/50 bg-card/65 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total BOQs</CardTitle>
            <Layers className="h-4.5 w-4.5 text-teal-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold tracking-tight text-card-foreground">{data.totalBOQs ?? 0}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Estimations total</p>
          </CardContent>
        </Card>

        {/* 9. Pending BOQs */}
        <Card className="hover:scale-[1.02] transition-transform duration-200 shadow-sm border border-muted/50 bg-card/65 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pending BOQs</CardTitle>
            <Clock className="h-4.5 w-4.5 text-orange-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold tracking-tight text-orange-600">{data.totalPendingBOQs ?? 0}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">In cost checks</p>
          </CardContent>
        </Card>

        {/* 10. Revenue Pipeline */}
        <Card className="hover:scale-[1.02] transition-transform duration-200 shadow-sm border border-muted/50 bg-card/65 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Revenue Pipe</CardTitle>
            <DollarSign className="h-4.5 w-4.5 text-rose-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-[14px] sm:text-base font-bold tracking-tight text-rose-600 truncate">{formatCurrency(data.totalRevenuePipeline ?? 0)}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Active value</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fallback / Standard View for other roles (e.g. Sales Executives or when not Admin/Manager)
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
