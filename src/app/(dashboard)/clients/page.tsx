"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Search, MoreHorizontal, Loader2, Folder, FileSpreadsheet, Edit, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BulkUploadModal } from "@/components/clients/bulk-upload-modal"
import { EditClientModal } from "@/components/clients/edit-client-modal"
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
import { toast } from "sonner"

interface Client {
  id: string
  clientId: string
  companyName: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  trn: string | null
  clientType: string | null
  sharepointFolder: string | null
  notes: string | null
}

import { useSession } from "next-auth/react"

export default function ClientsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER"

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  async function fetchClients() {
    try {
      setLoading(true)
      const res = await fetch("/api/clients")
      if (!res.ok) throw new Error("Failed to fetch clients")
      const data = await res.json()
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
      toast.error("Failed to load clients. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return
    
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || "Failed to delete client")
      
      toast.success("Client deleted successfully")
      fetchClients()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "An error occurred while deleting the client.")
    }
  }

  // Filter clients dynamically
  const filteredClients = clients.filter((client) => {
    const term = searchTerm.toLowerCase()
    return (
      client.companyName.toLowerCase().includes(term) ||
      client.clientId.toLowerCase().includes(term) ||
      (client.contactPerson && client.contactPerson.toLowerCase().includes(term)) ||
      (client.email && client.email.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client database and their SharePoint directories.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isManagerOrAdmin && (
            <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="border-primary/20 text-primary hover:bg-primary/5">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
          )}
          <Link href="/clients/new">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative flex items-center w-full max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3" />
          <Input
            placeholder="Search clients by name, ID, or email..."
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
            <p className="text-sm text-muted-foreground">Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-lg font-medium">No clients found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "Try searching with a different term" : "Click 'Add Client' to create your first client"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Client ID</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>SharePoint</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono font-medium">{client.clientId}</TableCell>
                  <TableCell className="font-semibold">
                    <Link href={`/clients/${client.id}`} className="hover:underline text-primary">
                      {client.companyName}
                    </Link>
                  </TableCell>
                  <TableCell>{client.contactPerson || "-"}</TableCell>
                  <TableCell>{client.email || "-"}</TableCell>
                  <TableCell>{client.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={client.clientType === "Government" ? "default" : "secondary"}>
                      {client.clientType || "Corporate"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {client.sharepointFolder ? (
                      <Badge variant="outline" className="flex items-center gap-1 w-max text-xs">
                        <Folder className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        Connected
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 p-0 hover:bg-muted inline-flex items-center justify-center rounded-md cursor-pointer text-muted-foreground hover:text-foreground">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          render={
                            <Link href={`/quotations/new?clientId=${client.id}`} className="cursor-pointer" />
                          }
                        >
                          Create Quotation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)} className="cursor-pointer">
                          View details
                        </DropdownMenuItem>
                        {isManagerOrAdmin && (
                          <>
                            <DropdownMenuItem onClick={() => { setEditingClient(client); setIsEditOpen(true) }} className="cursor-pointer flex items-center gap-2">
                              <Edit className="h-4 w-4" /> Edit client
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(client.id, client.companyName)} className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4" /> Delete client
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <BulkUploadModal 
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={() => fetchClients()}
      />

      <EditClientModal
        isOpen={isEditOpen}
        client={editingClient}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => fetchClients()}
      />
    </div>
  )
}
