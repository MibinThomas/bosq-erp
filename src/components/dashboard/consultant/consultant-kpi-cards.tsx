"use client"

import { Card, CardContent } from "@/components/ui/card"
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Users, 
  Briefcase, 
  TrendingUp, 
  TrendingDown,
  FileEdit, 
  MessageSquare,
  AlertCircle,
  DollarSign,
  ChevronRight
} from "lucide-react"
import { useSession } from "next-auth/react"

interface ConsultantKPIsProps {
  data: any
  onFilterChange?: (key: string, value: string) => void
}

export function ConsultantKPICards({ data, onFilterChange }: ConsultantKPIsProps) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"

  const formatCurrencyParts = (val: number) => {
    const formatted = new Intl.NumberFormat("en-AE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0)
    return formatted
  }

  // Handle loading or empty data state with full zero fallbacks
  const stats = data || {
    totalQuotes: 0,
    totalValue: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    convertedCount: 0,
    pendingClientApprovalsCount: 0,
    followUpsCount: 0,
    activeClientsCount: 0,
    activeQuotesCount: 0,
    draftQuotesCount: 0,
    pendingBoqsCount: 0,
    convertedValue: 0,
    totalRevenuePipeline: 0
  }

  const pendingRevenue = Math.max(0, (stats.totalValue || 0) - (stats.convertedValue || 0))

  return (
    <div className="space-y-6">
      
      {/* 1. MY SALES OVERVIEW */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-sans flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-zinc-400" />
            My Sales Overview
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
                <div className="text-2xl font-bold tracking-tight font-sans text-foreground">{stats.totalQuotes}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Gross quotes</span>
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
                <div className="text-2xl font-bold tracking-tight font-sans text-blue-600 dark:text-blue-400">{stats.activeQuotesCount}</div>
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
                <div className="text-2xl font-bold tracking-tight font-sans text-foreground">{stats.draftQuotesCount}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Awaiting submission</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approved / Confirmed */}
          <Card 
            onClick={() => onFilterChange?.("status", "CLIENT_APPROVED")}
            className="hover:scale-[1.015] transition-all duration-300 hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md cursor-pointer group"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Confirmed</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-emerald-600 dark:text-emerald-400">{stats.approvedCount}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Approved by clients</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card 
            onClick={() => onFilterChange?.("status", "QUOTE_CREATED")}
            className="hover:scale-[1.015] transition-all duration-300 hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md cursor-pointer group"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Awaiting Admin</span>
                <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-500 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-orange-600 dark:text-orange-400">{stats.pendingClientApprovalsCount}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Pending database verify</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* 2. MY BUSINESS OVERVIEW */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-sans flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-zinc-400" />
          My Business Overview
        </h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          
          {/* Active Clients */}
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md transition-all duration-300">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Assigned Clients</span>
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-foreground">{stats.activeClientsCount}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Clients assigned to account</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending BOQs */}
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md transition-all duration-300">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Pending BOQs</span>
                <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-500 dark:text-teal-400">
                  <Briefcase className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-foreground">{stats.pendingBoqsCount}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Awaiting estimation costs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Follow-ups */}
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md transition-all duration-300">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Follow-ups Needed</span>
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-500 dark:text-purple-400">
                  <MessageSquare className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-sans text-purple-600 dark:text-purple-400">{stats.followUpsCount}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>Quotations requiring touchpoint</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* 3. MY REVENUE OVERVIEW */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-sans flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-zinc-400" />
          My Revenue Overview (AED)
        </h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Own Quotation Value */}
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
                  <span className="text-2xl font-bold tracking-tight font-sans text-foreground">{formatCurrencyParts(stats.totalValue)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>My gross pipeline sum</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Own Confirmed Revenue */}
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md transition-all duration-300">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Confirmed Revenue</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1 truncate">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500">AED</span>
                  <span className="text-2xl font-bold tracking-tight font-sans text-emerald-600 dark:text-emerald-400">{formatCurrencyParts(stats.convertedValue)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>My closed/won transactions</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Own Revenue Pipeline */}
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
                  <span className="text-2xl font-bold tracking-tight font-sans text-pink-600 dark:text-pink-400">{formatCurrencyParts(stats.totalRevenuePipeline)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span className="text-pink-500 flex items-center font-bold gap-0.5">My active unclosed value</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Own Pending Revenue */}
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-card/65 backdrop-blur-md transition-all duration-300">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wider">Pending Revenue</span>
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1 truncate">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-500">AED</span>
                  <span className="text-2xl font-bold tracking-tight font-sans text-rose-600 dark:text-rose-400">{formatCurrencyParts(pendingRevenue)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-sans">
                  <span>My outstanding quotation sum</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

    </div>
  )
}
