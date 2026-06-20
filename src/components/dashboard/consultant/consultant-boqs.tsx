"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, FileEdit, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ConsultantBoqs({ boqs }: { boqs: any[] }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-slate-100 text-slate-700">Draft</Badge>
      case "SENT_TO_ESTIMATOR":
        return <Badge variant="outline" className="bg-amber-100 text-amber-700">Sent to Estimator</Badge>
      case "COSTING_COMPLETED":
        return <Badge variant="outline" className="bg-green-100 text-green-700">Costing Completed</Badge>
      case "REJECTED":
        return <Badge variant="outline" className="bg-red-100 text-red-700">Rejected</Badge>
      case "CONVERTED":
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-700">Converted</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(val)

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Recent BOQs</CardTitle>
        <Link href="/boq">
          <Button variant="ghost" size="sm" className="text-primary">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {boqs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No recent BOQs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
                <tr>
                  <th className="px-4 py-3 rounded-tl-md">BOQ #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right rounded-tr-md">Actions</th>
                </tr>
              </thead>
              <tbody>
                {boqs.map((boq) => (
                  <tr key={boq.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{boq.boqNumber}</td>
                    <td className="px-4 py-3 truncate max-w-[150px]" title={boq.client?.companyName}>
                      {boq.client?.companyName || "-"}
                    </td>
                    <td className="px-4 py-3 truncate max-w-[150px]" title={boq.projectName}>
                      {boq.projectName || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCurrency(boq.totalSellingPrice || 0)}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(boq.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 hover:bg-muted inline-flex items-center justify-center rounded-md cursor-pointer text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <Link href={`/boq/${boq.id}`}>
                            <DropdownMenuItem className="flex items-center cursor-pointer">
                              <Eye className="mr-2 h-4 w-4 text-slate-600" />
                              View Details
                            </DropdownMenuItem>
                          </Link>
                          {boq.status === "DRAFT" && (
                            <Link href={`/boq/${boq.id}`}>
                              <DropdownMenuItem className="flex items-center text-amber-600 focus:text-amber-600 focus:bg-amber-50 cursor-pointer">
                                <FileEdit className="mr-2 h-4 w-4 text-amber-600" />
                                Edit BOQ
                              </DropdownMenuItem>
                            </Link>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
