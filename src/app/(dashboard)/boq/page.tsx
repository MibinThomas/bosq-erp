"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, Loader2, Edit, FileText, ArrowRightCircle } from "lucide-react"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Boq {
  id: string
  boqNumber: string
  projectName: string | null
  client: { companyName: string }
  preparedBy: { name: string | null }
  status: string
  totalCost: number
  totalSellingPrice: number
  createdAt: string
  isTemplate: boolean
}

export default function BoqDashboard() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"

  const [boqs, setBoqs] = useState<Boq[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [tab, setTab] = useState<"all" | "templates">("all")

  useEffect(() => {
    async function fetchBoqs() {
      try {
        setLoading(true)
        const isTemplateFlag = tab === "templates"
        const res = await fetch(`/api/boq?isTemplate=${isTemplateFlag}`)
        if (!res.ok) throw new Error("Failed to fetch BOQs")
        const data = await res.json()
        setBoqs(data)
      } catch (error) {
        console.error("Error fetching BOQs:", error)
        toast.error("Failed to load BOQs. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    fetchBoqs()
  }, [tab])

  const filteredBoqs = boqs.filter((boq) => {
    const term = searchTerm.toLowerCase()
    return (
      boq.boqNumber.toLowerCase().includes(term) ||
      boq.client.companyName.toLowerCase().includes(term) ||
      (boq.projectName && boq.projectName.toLowerCase().includes(term))
    )
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline" className="text-gray-500 font-medium">Draft</Badge>
      case "PENDING_COSTING":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium">Pending Costing</Badge>
      case "COSTING_COMPLETED":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Costing Completed</Badge>
      case "CONVERTED":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white font-medium">Converted to Quote</Badge>
      case "REJECTED":
        return <Badge variant="destructive" className="font-medium">Rejected</Badge>
      default:
        return <Badge className="font-medium">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bill of Quantities (BOQ)</h1>
          <p className="text-muted-foreground">
            Prepare BOQs, manage detailed costing, and convert to Quotations.
          </p>
        </div>
        <Link href="/boq/new">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Create BOQ
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Button 
          variant={tab === "all" ? "default" : "outline"}
          onClick={() => setTab("all")}
        >
          All BOQs
        </Button>
        <Button 
          variant={tab === "templates" ? "default" : "outline"}
          onClick={() => setTab("templates")}
        >
          Templates
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative flex items-center w-full max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3" />
          <Input
            placeholder="Search BOQs, clients, projects..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading BOQs...</p>
          </div>
        ) : filteredBoqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-lg font-medium">No BOQs found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "Try searching with a different term" : "Click 'Create BOQ' to get started"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>BOQ No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client & Project</TableHead>
                <TableHead>Prepared By</TableHead>
                <TableHead>Status</TableHead>
                {userRole !== "ESTIMATOR" && <TableHead className="text-right">Est. Cost</TableHead>}
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBoqs.map((boq) => (
                <TableRow key={boq.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono font-medium text-primary">
                    {boq.boqNumber}
                  </TableCell>
                  <TableCell>{new Date(boq.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{boq.client.companyName}</div>
                    <div className="text-xs text-muted-foreground">{boq.projectName || "N/A"}</div>
                  </TableCell>
                  <TableCell>{boq.preparedBy?.name || "N/A"}</TableCell>
                  <TableCell>{getStatusBadge(boq.status)}</TableCell>
                  
                  {userRole !== "ESTIMATOR" && (
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {boq.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  )}

                  <TableCell className="text-right font-mono font-medium">
                    {boq.totalSellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <Link href={`/boq/${boq.id}`}>
                      <Button variant="ghost" size="sm" className="hover:bg-muted text-primary hover:text-primary">
                        <ArrowRightCircle className="mr-2 h-4 w-4" />
                        Open
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
