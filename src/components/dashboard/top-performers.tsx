"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trophy, TrendingUp, Users, Target } from "lucide-react"

interface Consultant {
  id: string
  name: string
  image: string | null
  role: string
  count: number
  value: number
  clientCount?: number
  conversionRate?: number
}

interface Client {
  id: string
  companyName: string
  clientType: string
  count: number
  value: number
}

interface TopPerformersProps {
  topConsultants: Consultant[]
  topClients: Client[]
  loading: boolean
}

export function DashboardTopPerformers({ topConsultants = [], topClients = [], loading }: TopPerformersProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(val)
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 animate-pulse">
        <Card className="col-span-1 lg:col-span-3 h-[380px] bg-muted/20" />
        <Card className="col-span-1 lg:col-span-2 h-[380px] bg-muted/20" />
      </div>
    )
  }

  // Find max value to draw relative progress bars
  const maxConsultantVal = topConsultants.length > 0 ? Math.max(...topConsultants.map(c => c.value)) : 1
  const maxClientVal = topClients.length > 0 ? Math.max(...topClients.map(c => c.value)) : 1

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
      {/* Top Consultants Leaderboard */}
      <Card className="col-span-1 lg:col-span-3 flex flex-col h-full bg-card/65 backdrop-blur-sm border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-3 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2 tracking-tight">
                <Trophy className="h-5 w-5 text-amber-500 animate-bounce" />
                Top Design Consultants
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Leading sales executives by quotation volume.
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold px-2 py-0.5">
              Top 5 Performers
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-y-auto min-h-[300px]">
          {topConsultants.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center text-muted-foreground gap-2">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-sm font-medium">No performance data yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {topConsultants.map((consultant, idx) => {
                const percentage = (consultant.value / maxConsultantVal) * 100
                const rankColors = [
                  "bg-amber-500 text-white border-amber-400", // Gold
                  "bg-slate-300 text-slate-900 border-slate-200", // Silver
                  "bg-amber-700 text-white border-amber-600", // Bronze
                ]
                const rankText = ["1st", "2nd", "3rd", "4th", "5th"]

                return (
                  <div key={consultant.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/15 transition-colors duration-200 group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Rank Badge */}
                      <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${idx < 3 ? rankColors[idx] : "bg-muted text-muted-foreground border-border"}`}>
                        {rankText[idx]}
                      </span>
                      {/* Avatar */}
                      <Avatar className="h-9 w-9 shrink-0 border border-border group-hover:scale-105 transition-transform duration-200">
                        <AvatarImage src={consultant.image || undefined} alt={consultant.name} />
                        <AvatarFallback className="font-bold bg-primary/10 text-primary">
                          {consultant.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Name and Relative performance bar */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex justify-between items-baseline gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm text-foreground truncate">{consultant.name}</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {consultant.clientCount !== undefined ? `${consultant.clientCount} client(s)` : "0 client(s)"}
                              {consultant.conversionRate !== undefined ? ` • ${consultant.conversionRate}% win rate` : " • 0% win rate"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{consultant.count} quote(s)</span>
                        </div>
                        {/* Custom progress bar */}
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-primary"
                            }`} 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Quotation Value */}
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-sm text-foreground group-hover:text-primary transition-colors duration-200">
                        {formatCurrency(consultant.value)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Clients by Value */}
      <Card className="col-span-1 lg:col-span-2 flex flex-col h-full bg-card/65 backdrop-blur-sm border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-3 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2 tracking-tight">
                <Target className="h-5 w-5 text-indigo-500" />
                Top Client Accounts
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Highest value client corporations.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-y-auto min-h-[300px]">
          {topClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center text-muted-foreground gap-2">
              <TrendingUp className="h-8 w-8 opacity-30" />
              <p className="text-sm font-medium">No client transactions recorded</p>
            </div>
          ) : (
            <Table className="whitespace-nowrap">
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent border-b/40">
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-9 py-2">Company</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-9 text-right pr-4 py-2">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/10 transition-colors border-b/40 group">
                    <TableCell className="py-2.5">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-foreground truncate max-w-[170px]">{client.companyName}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {client.clientType || "Direct"} &bull; {client.count} quote(s)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right pr-4 font-mono font-bold text-xs text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                      {formatCurrency(client.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
