import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Briefcase,
  Users,
  AlertCircle,
  MessageSquare,
  ShoppingCart,
  TrendingUp,
} from "lucide-react"

import { useSession } from "next-auth/react"

export function ConsultantKPICards({ data }: { data: any }) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"

  if (!data) return null

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  const kpis = userRole === "DESIGN_CONSULTANT"
    ? [
        {
          title: "Assigned Clients",
          value: data.activeClientsCount || 0,
          icon: Users,
          color: "text-cyan-600",
          bg: "bg-cyan-100 dark:bg-cyan-900/20",
        },
        {
          title: "Active Quotations",
          value: data.activeQuotesCount || 0,
          icon: Clock,
          color: "text-blue-600",
          bg: "bg-blue-100 dark:bg-blue-900/20",
        },
        {
          title: "Draft Quotations",
          value: data.draftQuotesCount || 0,
          icon: FileText,
          color: "text-slate-600",
          bg: "bg-slate-100 dark:bg-slate-900/20",
        },
        {
          title: "Approved / Client Confirmed",
          value: data.approvedCount || 0,
          icon: CheckCircle,
          color: "text-emerald-600",
          bg: "bg-emerald-100 dark:bg-emerald-900/20",
        },
        {
          title: "Pending BOQs",
          value: data.pendingBoqsCount || 0,
          icon: Briefcase,
          color: "text-indigo-600",
          bg: "bg-indigo-100 dark:bg-indigo-900/20",
        },
      ]
    : [
        {
          title: "My Total Quotations",
          value: data.totalQuotes || 0,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "My Quotation Value",
      value: formatCurrency(data.totalValue),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "My Approved Quotations",
      value: data.approvedCount || 0,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-100 dark:bg-emerald-900/20",
    },
    {
      title: "My Pending Quotations",
      value: data.pendingCount || 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-100 dark:bg-amber-900/20",
    },
    {
      title: "My Rejected Quotations",
      value: data.rejectedCount || 0,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-100 dark:bg-red-900/20",
    },
    {
      title: "My Converted Quotations",
      value: data.convertedCount || 0,
      icon: Briefcase,
      color: "text-indigo-600",
      bg: "bg-indigo-100 dark:bg-indigo-900/20",
    },
    {
      title: "Pending Client Approvals",
      value: data.pendingClientApprovalsCount || 0,
      icon: AlertCircle,
      color: "text-orange-600",
      bg: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      title: "My Follow-ups",
      value: data.followUpsCount || 0,
      icon: MessageSquare,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      title: "My Active Clients",
      value: data.activeClientsCount || 0,
      icon: Users,
      color: "text-cyan-600",
      bg: "bg-cyan-100 dark:bg-cyan-900/20",
    },
    {
      title: "Quote Cart Items",
      value: "Manage", // We can turn this into a link later
      icon: ShoppingCart,
      color: "text-pink-600",
      bg: "bg-pink-100 dark:bg-pink-900/20",
      link: "/products"
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {kpis.map((kpi, idx) => (
        <Card key={idx} className="shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-muted-foreground">{kpi.title}</span>
              <div className={`p-2 rounded-full ${kpi.bg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </div>
            {kpi.link ? (
              <a href={kpi.link} className="text-2xl font-bold tracking-tight text-primary hover:underline">
                {kpi.value}
              </a>
            ) : (
              <span className="text-2xl font-bold tracking-tight">{kpi.value}</span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
