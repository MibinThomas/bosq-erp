import Link from "next/link"
import { Plus, Search, FileDown, Eye, Edit, Copy, History } from "lucide-react"

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

const quotations = [
  {
    id: "I1951",
    date: "2026-05-15",
    client: "Acme Corp",
    project: "HQ Office Fitout",
    salesperson: "John Doe",
    amount: 145000.00,
    status: "APPROVED",
    revision: 2,
    poStatus: "RECEIVED"
  },
  {
    id: "I1952",
    date: "2026-05-16",
    client: "TechFlow LLC",
    project: "Meeting Rooms Upgrade",
    salesperson: "Jane Smith",
    amount: 32000.00,
    status: "SENT",
    revision: 0,
    poStatus: "PENDING"
  },
  {
    id: "I1953",
    date: "2026-05-17",
    client: "Global Trade Inc",
    project: "Executive Desks",
    salesperson: "John Doe",
    amount: 18500.50,
    status: "DRAFT",
    revision: 0,
    poStatus: "PENDING"
  }
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED': return <Badge className="bg-green-600 hover:bg-green-700">Approved</Badge>
    case 'SENT': return <Badge className="bg-blue-600 hover:bg-blue-700">Sent</Badge>
    case 'DRAFT': return <Badge variant="outline" className="text-gray-500">Draft</Badge>
    case 'REJECTED': return <Badge variant="destructive">Rejected</Badge>
    case 'REVISED': return <Badge className="bg-purple-600 hover:bg-purple-700">Revised</Badge>
    default: return <Badge>{status}</Badge>
  }
}

export default function QuotationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground">
            Manage, track, and generate quotations.
          </p>
        </div>
        <Link href="/quotations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Quotation
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 w-full max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute ml-3" />
          <Input placeholder="Search quotes, clients, projects..." className="pl-9" />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Client & Project</TableHead>
              <TableHead>Salesperson</TableHead>
              <TableHead className="text-right">Total Amount (AED)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>PO Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="font-medium">
                  {quote.id}{quote.revision > 0 ? `-${quote.revision}` : ''}
                </TableCell>
                <TableCell>{quote.date}</TableCell>
                <TableCell>
                  <div className="font-medium">{quote.client}</div>
                  <div className="text-xs text-muted-foreground">{quote.project}</div>
                </TableCell>
                <TableCell>{quote.salesperson}</TableCell>
                <TableCell className="text-right font-medium">
                  {quote.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  {getStatusBadge(quote.status)}
                </TableCell>
                <TableCell>
                  {quote.poStatus === 'RECEIVED' ? (
                    <Badge variant="outline" className="border-green-600 text-green-600">PO Received</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pending</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" title="View">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Download PDF">
                      <FileDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
