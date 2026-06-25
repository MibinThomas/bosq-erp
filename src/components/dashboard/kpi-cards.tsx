"use client"

import { Card, CardContent } from "@/components/ui/card"
import { 
  FileText, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  Users, 
  UserCheck, 
  TrendingUp, 
  TrendingDown,
  FileEdit, 
  RefreshCw, 
  Layers,
  ArrowUpRight,
  ChevronRight,
  PieChart
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface KPIStats {
  totalQuotes: number
  totalValue: number
  convertedCount: number
  convertedValue: number
  winRate: number
  pendingApprovalsCount: number
  pendingFollowUpsCount: number
  statusStats?: Array<{ status: string; count: number; value: number }>
  
  // 10 Team Overview KPIs
  totalDesignConsultants?: number
  totalAssignedClients?: number
  totalGlobalClients?: number
  totalActiveQuotations?: number
  totalDraftQuotations?: number
  totalRevisedQuotations?: number
  totalClientConfirmedQuotations?: number
  totalBOQs?: number
  totalPendingBOQs?: number
  totalRevenuePipeline?: number
}

interface DashboardKPIsProps {
  data: KPIStats | null
  loading: boolean
  onFilterChange?: (key: string, value: string) => void
}

export function DashboardKPIs({ data, loading, onFilterChange }: DashboardKPIsProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "SALES_MANAGER" || userRole === "MANAGER"
  const isAdminOrSuperAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN"

  const formatCurrencyParts = (val: number) => {
    const formatted = new Intl.NumberFormat("en-AE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0)
    return formatted
  }

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-muted rounded-md" />
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="h-28 bg-muted/20 border-none shadow-none" />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-28 bg-muted rounded-md" />
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-28 bg-muted/20 border-none shadow-none" />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-28 bg-muted rounded-md" />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-28 bg-muted/20 border-none shadow-none" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Calculate lost/rejected quotations
  const rejectedStats = data.statusStats?.filter((s: any) => ["REJECTED", "CANCELLED"].includes(s.status)) || []
  const lostQuotesCount = rejectedStats.reduce((sum: number, s: any) => sum + s.count, 0)
  const lostQuotesValue = rejectedStats.reduce((sum: number, s: any) => sum + s.value, 0)

  return (
    <div className="space-y-6">
      
      {/* 1. SALES OVERVIEW SECTION */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-sans flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-zinc-400" />
            Sales Overview
          </h3>
          <span className="text-[10px] text-muted-foreground/80 bg-zinc-100 dark:bg-zinc-800/50 px-2 py-0.5 rounded-full font-sans">
            Interactive metrics
          </span>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          
          {/* Total Quotes */}
          <Card 
            onClick={() => onFilterChange?.("status", "all")}
            className="hover:scale-[1.015] transition-all duration-300 hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md cursor-pointer group"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Total Quotes</span>
                <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-foreground">{data.totalQuotes}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Gross document volume</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Quotes */}
          <Card 
            onClick={() => onFilterChange?.("status", "QUOTE_CREATED")}
            className="hover:scale-[1.015] transition-all duration-300 hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md cursor-pointer group"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Active Quotes</span>
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-500 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-blue-600 dark:text-blue-400">{data.totalActiveQuotations ?? 0}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span className="flex items-center gap-0.5 text-emerald-600 font-bold"><TrendingUp className="h-3 w-3" /> Active</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Draft Quotes */}
          <Card 
            onClick={() => onFilterChange?.("status", "DRAFT")}
            className="hover:scale-[1.015] transition-all duration-300 hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md cursor-pointer group"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Draft Quotes</span>
                <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-500 group-hover:text-white transition-colors duration-300">
                  <FileEdit className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-foreground">{data.totalDraftQuotations ?? 0}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Awaiting submission</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revised Quotes */}
          <Card 
            onClick={() => onFilterChange?.("status", "REVISED")}
            className="hover:scale-[1.015] transition-all duration-300 hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md cursor-pointer group"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Revised</span>
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                  <RefreshCw className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-amber-600 dark:text-amber-400">{data.totalRevisedQuotations ?? 0}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Requires action</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmed Quotes */}
          <Card 
            onClick={() => onFilterChange?.("status", "CLIENT_APPROVED")}
            className="hover:scale-[1.015] transition-all duration-300 hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md cursor-pointer group"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Confirmed</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-emerald-600 dark:text-emerald-400">{data.totalClientConfirmedQuotations ?? 0}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span className="font-bold text-emerald-600 font-mono">Win: {(data.winRate ?? 0).toFixed(0)}%</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* 2. BUSINESS OVERVIEW SECTION */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-sans flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-zinc-400" />
          Business Overview
        </h3>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          
          {/* Total Clients */}
          <Card 
            onClick={() => router.push("/clients")}
            className="hover:scale-[1.015] transition-all duration-300 hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md cursor-pointer group"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Total Clients</span>
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                  <UserCheck className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-foreground">{data.totalGlobalClients ?? 0}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Unique accounts database</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Clients / Total Clients for admin */}
          <Card 
            onClick={() => router.push("/clients")}
            className="hover:scale-[1.015] transition-all duration-300 hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md cursor-pointer group"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">
                  {isAdminOrSuperAdmin ? "Total Clients" : "My Clients"}
                </span>
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-500 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-foreground">{data.totalAssignedClients ?? 0}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>{isAdminOrSuperAdmin ? "All Company Accounts" : "Assigned / Managed Accounts"}</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total BOQs */}
          <Card 
            onClick={() => router.push("/boq")}
            className="hover:scale-[1.015] transition-all duration-300 hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md cursor-pointer group"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Total BOQs</span>
                <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-500 dark:text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors duration-300">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-foreground">{data.totalBOQs ?? 0}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Estimations drafted</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending BOQs */}
          <Card 
            onClick={() => router.push("/boq")}
            className="hover:scale-[1.015] transition-all duration-300 hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md cursor-pointer group"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Pending BOQs</span>
                <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-500 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-orange-600 dark:text-orange-400">{data.totalPendingBOQs ?? 0}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>In costing operations</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* 3. REVENUE OVERVIEW SECTION */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-sans flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-zinc-400" />
          Revenue Overview (AED)
        </h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Quotation Value */}
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md transition-all duration-300">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Quotation Value</span>
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-500 dark:text-blue-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1 truncate">
                  <span className="text-xs font-bold text-muted-foreground">AED</span>
                  <span className="text-2xl font-bold tracking-tight font-sans text-foreground">{formatCurrencyParts(data.totalValue)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Gross pipeline sum</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmed Revenue */}
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md transition-all duration-300">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Confirmed Revenue</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1 truncate">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500">AED</span>
                  <span className="text-2xl font-bold tracking-tight font-sans text-emerald-600 dark:text-emerald-400">{formatCurrencyParts(data.convertedValue)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Closed &amp; signed transactions</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Pipeline */}
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md transition-all duration-300">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Revenue Pipeline</span>
                <div className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/30 text-pink-500 dark:text-pink-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1 truncate">
                  <span className="text-xs font-bold text-pink-600 dark:text-pink-500">AED</span>
                  <span className="text-2xl font-bold tracking-tight font-sans text-pink-600 dark:text-pink-400">{formatCurrencyParts(data.totalRevenuePipeline ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span className="text-pink-500 flex items-center font-bold gap-0.5">Unclosed value</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lost / Rejected */}
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md transition-all duration-300">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Lost / Rejected</span>
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1 truncate">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-500">AED</span>
                  <span className="text-2xl font-bold tracking-tight font-sans text-rose-600 dark:text-rose-400">{formatCurrencyParts(lostQuotesValue)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>{lostQuotesCount} quote(s) lost/rejected</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

    </div>
  )
}
