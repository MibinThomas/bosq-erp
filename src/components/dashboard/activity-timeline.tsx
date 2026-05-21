"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { Bell, FileText, Folder, Link as LinkIcon, User } from "lucide-react"
import Link from "next/link"

interface ActivityTimelineProps {
  activities: any[]
  followUps: any[]
  loading: boolean
}

export function DashboardTimeline({ activities, followUps, loading }: ActivityTimelineProps) {
  if (loading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Activity & Follow-ups</CardTitle>
          <CardDescription>Recent events and pending tasks</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const getActivityIcon = (action: string) => {
    if (action.includes("QUOTATION")) return <FileText className="h-4 w-4 text-blue-500" />
    if (action.includes("CLIENT")) return <User className="h-4 w-4 text-emerald-500" />
    if (action.includes("SHAREPOINT") || action.includes("FOLDER")) return <Folder className="h-4 w-4 text-yellow-500" />
    return <Bell className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <Card className="col-span-1 lg:col-span-2 flex flex-col h-full">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle>Activity & Follow-ups</CardTitle>
        <CardDescription>Recent events and pending tasks</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[400px] w-full px-6 pb-6">
          
          {followUps.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-amber-600 flex items-center gap-2 mb-3 sticky top-0 bg-card py-2">
                <Bell className="h-4 w-4" /> Pending Follow-ups ({followUps.length})
              </h4>
              <div className="space-y-3">
                {followUps.map((quote) => (
                  <Link href={`/quotations/${quote.id}`} key={`followup-${quote.id}`}>
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200/50 bg-amber-50/50 hover:bg-amber-100/50 transition-colors cursor-pointer group">
                      <div className="mt-0.5 rounded-full bg-amber-100 p-1.5 group-hover:scale-110 transition-transform">
                        <FileText className="h-3 w-3 text-amber-600" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none flex justify-between">
                          <span>{quote.quotationNumber}</span>
                          <span className="text-xs text-amber-600 font-normal">
                            {quote.followUpDate ? formatDistanceToNow(new Date(quote.followUpDate), { addSuffix: true }) : "Action needed"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {quote.client?.companyName} &bull; {quote.projectName || "No Project"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-4 sticky top-0 bg-card py-2">
              <Clock className="h-4 w-4" /> Recent Activity
            </h4>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity found.</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-background shrink-0 shadow-sm">
                        {getActivityIcon(activity.action)}
                      </div>
                      <div className="h-full w-px bg-border my-1" />
                    </div>
                    <div className="flex-1 pb-4 pt-1 space-y-1.5">
                      <p className="text-sm leading-snug">
                        <span className="font-semibold">{activity.user?.name || 'System'}</span>{" "}
                        <span className="text-muted-foreground">{activity.details}</span>
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        {activity.entityType === "QUOTATION" && activity.entityId && activity.entityId !== "BULK" && (
                          <>
                            <span className="text-border">&bull;</span>
                            <Link href={`/quotations/${activity.entityId}`} className="text-primary hover:underline flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" /> View
                            </Link>
                          </>
                        )}
                        {activity.entityType === "CLIENT" && activity.entityId && activity.entityId !== "BULK" && (
                          <>
                            <span className="text-border">&bull;</span>
                            <Link href={`/clients/${activity.entityId}`} className="text-primary hover:underline flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" /> View
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function Clock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
