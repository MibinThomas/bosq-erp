"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { Bell, FileText, ChevronRight } from "lucide-react"
import Link from "next/link"

interface PendingActionsProps {
  followUps: any[]
  loading: boolean
}

export function DashboardPendingActions({ followUps = [], loading }: PendingActionsProps) {
  if (loading) {
    return (
      <Card className="col-span-1 h-[320px] flex items-center justify-center bg-card">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground font-medium font-sans">Checking tasks...</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border shadow-sm bg-card flex flex-col h-full">
      <CardHeader className="pb-3 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-lg flex items-center gap-2 font-bold tracking-tight">
              <Bell className="h-5 w-5 text-amber-500" />
              Pending Actions
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Quotations marked for client follow-up.
            </CardDescription>
          </div>
          {followUps.length > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold font-mono">
              {followUps.length} Tasks
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-y-auto min-h-[220px]">
        {followUps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4 gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary/80 border border-primary/10">
              <FileText className="h-5 w-5" />
            </div>
            <h5 className="font-semibold text-sm">All Actioned</h5>
            <p className="text-xs text-muted-foreground max-w-[280px]">
              No quotations require follow-up contacts today.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] w-full px-4 py-3">
            <div className="space-y-2.5">
              {followUps.map((quote) => (
                <Link href={`/quotations/${quote.id}`} key={`pending-action-${quote.id}`} className="block">
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200/40 bg-amber-50/20 hover:bg-amber-50/50 transition-colors cursor-pointer group">
                    <div className="mt-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 p-1.5 group-hover:scale-105 transition-transform">
                      <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="font-semibold text-xs text-foreground group-hover:text-primary truncate">{quote.quotationNumber}</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium shrink-0">
                          {quote.followUpDate ? formatDistanceToNow(new Date(quote.followUpDate), { addSuffix: true }) : "Action needed"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {quote.client?.companyName} &bull; {quote.projectName || "No Project"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
