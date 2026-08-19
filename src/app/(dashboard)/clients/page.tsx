"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Search, MoreHorizontal, Loader2, Folder, FileSpreadsheet, Edit, Trash2, Check, X, Eye, Key } from "lucide-react"
import { usePermissions } from "@/components/providers/PermissionsProvider"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BulkUploadModal } from "@/components/clients/bulk-upload-modal"
import { EditClientModal } from "@/components/clients/edit-client-modal"
import { BulkAssignModal } from "@/components/clients/bulk-assign-modal"
import { ClientAccessRequestsModal } from "@/components/clients/client-access-requests-modal"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  status: string
  salespersonId?: string | null
  assignments?: {
    isPrimary: boolean
    userId: string
    user: { name: string | null }
  }[]
}

import { useSession } from "next-auth/react"

export default function ClientsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission("CLIENTS", "create")
  const canBulkUpload = hasPermission("CLIENTS", "uploadFiles")
  const canManageCategory = hasPermission("CLIENTS", "manage")
  
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [consultantFilter, setConsultantFilter] = useState<string>("All")
  const [categoryFilter, setCategoryFilter] = useState<string>("All")
  const [usernameFilter, setUsernameFilter] = useState<string>("All")
  const [users, setUsers] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15

  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

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

  async function fetchPendingRequestsCount() {
    try {
      const res = await fetch("/api/clients/access-requests")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const pending = data.filter((r: any) => r.status === "Pending" || r.status === "Requested").length
          setPendingRequestsCount(pending)
        }
      }
    } catch (err) {
      console.error("Failed to fetch pending requests count", err)
    }
  }

  useEffect(() => {
    fetchClients()
    fetchPendingRequestsCount()
  }, [])

  // Admin-level functions still require SUPER_ADMIN or manage permissions for bulk reassign
  const isSuperAdmin = hasPermission("SETTINGS", "manage") // using settings manage as proxy or just rely on hasPermission
  const isManagerOrAdmin = hasPermission("CLIENTS", "manage") || isSuperAdmin

  useEffect(() => {
    if (hasPermission("USER_MANAGEMENT", "view") || userRole === "SUPER_ADMIN") {
      fetch("/api/settings/users")
        .then(res => {
          if (res.ok) return res.json()
          throw new Error("Failed to fetch users")
        })
        .then(data => {
          if (Array.isArray(data)) {
            setUsers(data)
          }
        })
        .catch(err => console.error("Error fetching users for filter:", err))
    }
  }, [isSuperAdmin])

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected client(s)?`)) return
    
    try {
      setDeleting(true)
      const res = await fetch("/api/clients/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || "Bulk delete failed")
      
      toast.success(data.warning ? `Deleted ${data.count} clients. ${data.warning}` : `Successfully deleted ${data.count} client(s)!`)
      setSelectedIds([])
      fetchClients()
    } catch (error: any) {
      console.error("Error bulk deleting clients:", error)
      toast.error(error.message || "Failed to delete clients. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

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

  async function handleStatusUpdate(id: string, companyName: string, newStatus: "Approved" | "Rejected") {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          status: newStatus,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to update client status`)

      toast.success(
        newStatus === "Approved"
          ? `Successfully approved client "${companyName}"!`
          : `Client "${companyName}" has been rejected.`
      )
      fetchClients()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "An error occurred while updating status.")
    }
  }

  // Filter clients dynamically
  const filteredClients = clients.filter((client) => {
    if (isManagerOrAdmin && statusFilter !== "All" && client.status !== statusFilter) {
      return false
    }

    if (isSuperAdmin) {
      if (categoryFilter !== "All" && client.clientType !== categoryFilter) {
        return false
      }
      if (usernameFilter !== "All") {
        const matchesSalesperson = client.salespersonId === usernameFilter
        const matchesAssignment = client.assignments?.some(a => a.userId === usernameFilter)
        if (!matchesSalesperson && !matchesAssignment) {
          return false
        }
      }
    } else {
      if (consultantFilter !== "All") {
        const primaryAssignment = client.assignments?.find(a => a.isPrimary)
        if (primaryAssignment?.user.name !== consultantFilter) {
          return false
        }
      }
    }

    const term = searchTerm.toLowerCase()
    return (
      client.companyName.toLowerCase().includes(term) ||
      client.clientId.toLowerCase().includes(term) ||
      (client.contactPerson && client.contactPerson.toLowerCase().includes(term)) ||
      (client.email && client.email.toLowerCase().includes(term))
    )
  })

  // Reset to first page when search/filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, consultantFilter, categoryFilter, usernameFilter])

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedClients = filteredClients.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE) || 1

  const uniqueConsultants = Array.from(new Set(clients.flatMap(c => c.assignments?.filter(a => a.isPrimary).map(a => a.user.name) || []))).filter(Boolean) as string[]
  const standardCategories = ["Project", "Interior", "Dealer", "Special"]
  const allCategories = Array.from(new Set([...standardCategories, ...clients.map(c => c.clientType).filter(Boolean)])) as string[]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client database and their SharePoint directories.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {selectedIds.length > 0 && isManagerOrAdmin && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete} 
              disabled={deleting}
              className="animate-in fade-in"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Selected ({selectedIds.length})
            </Button>
          )}
          {selectedIds.length > 0 && isManagerOrAdmin && (
            <Button 
              variant="outline" 
              onClick={() => setIsBulkAssignOpen(true)} 
              className="animate-in fade-in border-primary/20 text-primary hover:bg-primary/5"
            >
              <Check className="mr-2 h-4 w-4" />
              Assign Selected ({selectedIds.length})
            </Button>
          )}
          {isManagerOrAdmin && (
            <Button 
              variant="outline" 
              onClick={() => setIsRequestsModalOpen(true)} 
              className="border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold relative cursor-pointer"
            >
              <Key className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
              Access Requests
              {pendingRequestsCount > 0 && (
                <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 rounded-full font-bold ml-1.5">
                  {pendingRequestsCount}
                </Badge>
              )}
            </Button>
          )}
          {canBulkUpload && (
            <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="border-primary/20 text-primary hover:bg-primary/5 cursor-pointer">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
          )}
          {canCreate && (
            <Link href="/clients/new">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative flex items-center w-full sm:max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3" />
          <Input
            placeholder="Search clients by name, ID, or email..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {isSuperAdmin ? (
            <>
              <div className="w-full sm:w-[200px]">
                <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "All")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {allCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat === "Project" ? "Direct Client" :
                         cat === "Interior" ? "Interior Designer" :
                         cat === "Dealer" ? "Dealer" :
                         cat === "Special" ? "Online / Ecommerce" : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full sm:w-[220px]">
                <Select value={usernameFilter} onValueChange={(val) => setUsernameFilter(val || "All")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Username">
                      {(() => {
                        if (!usernameFilter || usernameFilter === "All") return "Filter by Username"
                        const u = users.find(usr => usr.id === usernameFilter)
                        return u ? `${u.name || u.email} (${u.role.replace(/_/g, " ")})` : "Filter by Username"
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    <SelectItem value="All">All Usernames</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email} ({u.role.replace(/_/g, " ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            isManagerOrAdmin && (
              <div className="w-full sm:w-[220px]">
                <Select value={consultantFilter} onValueChange={(val) => setConsultantFilter(val || "All")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Consultant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Consultants</SelectItem>
                    {uniqueConsultants.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          )}
        </div>
      </div>

      {isManagerOrAdmin && (
        <div className="flex border-b border-border gap-2 pb-px text-sm mt-2">
          {["All", "Pending Approval", "Approved", "Rejected"].map((status) => {
            const count = clients.filter(c => status === "All" ? true : c.status === status).length
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`pb-2.5 px-4 font-semibold border-b-2 transition-all cursor-pointer ${
                  statusFilter === status 
                    ? "border-primary text-primary font-bold" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {status} <span className="ml-1 text-xs opacity-70 font-mono">({count})</span>
              </button>
            )
          })}
        </div>
      )}

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
          <>
            <div className="overflow-x-auto w-full">
            <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {isManagerOrAdmin && (
                  <TableHead className="w-12 text-center">
                    <Checkbox 
                      checked={filteredClients.length > 0 && selectedIds.length === filteredClients.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(filteredClients.map(c => c.id))
                        } else {
                          setSelectedIds([])
                        }
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead>Client ID</TableHead>
                <TableHead>Company Name</TableHead>
                {isManagerOrAdmin && <TableHead>Assigned Consultant</TableHead>}
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>SharePoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                  {isManagerOrAdmin && (
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={selectedIds.includes(client.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds(prev => [...prev, client.id])
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== client.id))
                          }
                        }}
                        aria-label={`Select ${client.companyName}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono font-medium">{client.clientId}</TableCell>
                  <TableCell className="font-semibold">
                    <Link href={`/clients/${client.id}`} className="hover:underline text-primary">
                      {client.companyName}
                    </Link>
                  </TableCell>
                  {isManagerOrAdmin && (
                    <TableCell>
                      <Badge variant="outline" className="font-normal bg-muted/50">
                        {client.assignments?.find(a => a.isPrimary)?.user.name || "Unassigned"}
                      </Badge>
                    </TableCell>
                  )}
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
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`font-medium border text-xs ${
                        client.status === "Approved" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                        client.status === "Pending Approval" ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse" :
                        "bg-red-500/10 text-red-500 border-red-500/20"
                      }`}
                    >
                      {client.status || "Approved"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/clients/${client.id}`}>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 border-primary/20 text-primary hover:bg-primary/5 cursor-pointer">
                        <Eye className="h-3.5 w-3.5" />
                        View Client
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border bg-muted/20">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Showing <span className="font-medium text-foreground">{filteredClients.length > 0 ? startIndex + 1 : 0}</span> to{" "}
            <span className="font-medium text-foreground">
              {Math.min(endIndex, filteredClients.length)}
            </span>{" "}
            of <span className="font-medium text-foreground">{filteredClients.length}</span> clients
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-6">
              <span className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-9 border-primary/20 text-primary hover:bg-primary/5 cursor-pointer disabled:opacity-50"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-9 border-primary/20 text-primary hover:bg-primary/5 cursor-pointer disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </>
    )}
  </div>

      <BulkUploadModal 
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={() => fetchClients()}
      />

      <BulkAssignModal
        isOpen={isBulkAssignOpen}
        onClose={() => setIsBulkAssignOpen(false)}
        selectedIds={selectedIds}
        onSuccess={() => {
          setSelectedIds([])
          fetchClients()
        }}
      />

      <EditClientModal
        isOpen={isEditOpen}
        client={editingClient}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => fetchClients()}
      />

      <ClientAccessRequestsModal
        isOpen={isRequestsModalOpen}
        onClose={() => setIsRequestsModalOpen(false)}
        onSuccess={() => {
          fetchClients()
          fetchPendingRequestsCount()
        }}
      />
    </div>
  )
}
