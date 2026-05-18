import Link from "next/link"
import { Plus, Search, MoreHorizontal } from "lucide-react"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

const clients = [
  {
    id: "C-1001",
    companyName: "Acme Corp",
    contactPerson: "John Smith",
    email: "john@acme.com",
    phone: "+971 50 123 4567",
    type: "Corporate",
  },
  {
    id: "C-1002",
    companyName: "TechFlow LLC",
    contactPerson: "Sarah Johnson",
    email: "sarah@techflow.ae",
    phone: "+971 55 987 6543",
    type: "Government",
  },
  {
    id: "C-1003",
    companyName: "Global Trade Inc",
    contactPerson: "Ahmed Ali",
    email: "ahmed@globaltrade.com",
    phone: "+971 52 456 7890",
    type: "Corporate",
  },
]

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client database and their folders.
          </p>
        </div>
        <Link href="/clients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 w-full max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute ml-3" />
          <Input placeholder="Search clients..." className="pl-9" />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client ID</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.id}</TableCell>
                <TableCell>{client.companyName}</TableCell>
                <TableCell>{client.contactPerson}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>
                  <Badge variant={client.type === 'Government' ? 'default' : 'secondary'}>
                    {client.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>View details</DropdownMenuItem>
                      <DropdownMenuItem>Edit client</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Create quotation</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
