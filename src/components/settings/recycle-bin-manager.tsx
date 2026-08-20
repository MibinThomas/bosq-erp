"use client"

import React, { useState, useEffect, useMemo } from "react"
import { 
  RotateCcw, 
  Trash2, 
  Search, 
  Building2, 
  FileText, 
  Layers, 
  Loader2, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle,
  UserCheck,
  Calendar,
  DollarSign
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface DeletedQuotation {
  id: string
  quotationNumber: string
  projectName: string | null
  customerSegment: string
  grandTotal: number
  revisionNumber: number
  deletedAt: string
  createdAt: string
  client?: {
    id: string
    companyName: string
    clientId: string
  }
  preparedBy?: {
    id: string
    name: string | null
    email: string | null
  }
}

interface DeletedBoq {
  id: string
  boqNumber: string
  projectName: string | null
  customerSegment: string
  totalSellingPrice: number
  status: string
  deletedAt: string
  createdAt: string
  client?: {
    id: string
    companyName: string
    clientId: string
  }
  preparedBy?: {
    id: string
    name: string | null
    email: string | null
  }
}

interface DeletedClient {
  id: string
  clientId: string
  companyName: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  clientType: string | null
  deletedAt: string
  createdAt: string
}

export function RecycleBinManager({ userRole }: { userRole: string }) {
  const isSuperAdmin = userRole === "SUPER_ADMIN"

  const [quotations, setQuotations] = useState<DeletedQuotation[]>([])
  const [boqs, setBoqs] = useState<DeletedBoq[]>([])
  const [clients, setClients] = useState<DeletedClient[]>([])
  
  const [loading, setLoading] = useState(true)
  const [restoringIds, setRestoringIds] = useState<Record<string, boolean>>({})
  const [bulkRestoring, setBulkRestoring] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"quotations" | "boqs" | "clients">("quotations")
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const fetchRecycleBinData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/restore")
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to load recycle bin records")
      }
      const data = await res.json()
      setQuotations(data.quotations || [])
      setBoqs(data.boqs || [])
      setClients(data.clients || [])
      setSelectedIds([])
    } catch (err: any) {
      console.error("Recycle Bin error:", err)
      toast.error(err.message || "Failed to fetch deleted records")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      fetchRecycleBinData()
    }
  }, [isSuperAdmin])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as any)
    setSelectedIds([])
  }

  // Filtered Lists
  const filteredQuotations = useMemo(() => {
    if (!searchQuery.trim()) return quotations
    const q = searchQuery.toLowerCase().trim()
    return quotations.filter(item => 
      item.quotationNumber.toLowerCase().includes(q) ||
      (item.projectName && item.projectName.toLowerCase().includes(q)) ||
      (item.client?.companyName && item.client.companyName.toLowerCase().includes(q)) ||
      (item.preparedBy?.name && item.preparedBy.name.toLowerCase().includes(q))
    )
  }, [quotations, searchQuery])

  const filteredBoqs = useMemo(() => {
    if (!searchQuery.trim()) return boqs
    const q = searchQuery.toLowerCase().trim()
    return boqs.filter(item => 
      item.boqNumber.toLowerCase().includes(q) ||
      (item.projectName && item.projectName.toLowerCase().includes(q)) ||
      (item.client?.companyName && item.client.companyName.toLowerCase().includes(q)) ||
      (item.preparedBy?.name && item.preparedBy.name.toLowerCase().includes(q))
    )
  }, [boqs, searchQuery])

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients
    const q = searchQuery.toLowerCase().trim()
    return clients.filter(item => 
      item.companyName.toLowerCase().includes(q) ||
      item.clientId.toLowerCase().includes(q) ||
      (item.contactPerson && item.contactPerson.toLowerCase().includes(q)) ||
      (item.email && item.email.toLowerCase().includes(q))
    )
  }, [clients, searchQuery])

  const activeItemsCount = activeTab === "quotations" ? filteredQuotations.length : activeTab === "boqs" ? filteredBoqs.length : filteredClients.length

  const handleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds([])
      return
    }
    if (activeTab === "quotations") {
      setSelectedIds(filteredQuotations.map(q => q.id))
    } else if (activeTab === "boqs") {
      setSelectedIds(filteredBoqs.map(b => b.id))
    } else {
      setSelectedIds(filteredClients.map(c => c.id))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleRestore = async (type: "QUOTATION" | "BOQ" | "CLIENT", ids: string[]) => {
    if (ids.length === 0) return

    if (ids.length === 1) {
      setRestoringIds(prev => ({ ...prev, [ids[0]]: true }))
    } else {
      setBulkRestoring(true)
    }

    try {
      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ids })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to restore records")
      }

      toast.success(data.message || `Successfully restored record(s)!`)
      await fetchRecycleBinData()
    } catch (err: any) {
      console.error("Restore error:", err)
      toast.error(err.message || "Failed to restore record(s)")
    } finally {
      if (ids.length === 1) {
        setRestoringIds(prev => ({ ...prev, [ids[0]]: false }))
      } else {
        setBulkRestoring(false)
      }
    }
  }

  if (!isSuperAdmin) {
    return (
      <Card className="bg-card border rounded-3xl p-8 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Access Restricted</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The Recycle Bin & Data Recovery features are restricted to Super Admin users only.
        </p>
      </Card>
    )
  }

  const totalQuotationValue = quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0)
  const totalBoqValue = boqs.reduce((sum, b) => sum + (b.totalSellingPrice || 0), 0)

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <Card className="bg-card border rounded-3xl shadow-xs overflow-hidden">
        <CardHeader className="border-b p-6 sm:p-8 bg-gradient-to-r from-purple-500/10 via-background to-blue-500/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                <RotateCcw className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                    Data Recovery & Recycle Bin
                  </CardTitle>
                  <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 font-mono text-[10px]">
                    Super Admin Exclusive
                  </Badge>
                </div>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                  View soft-deleted quotation history, BOQ records, and client records. Restore any record instantly to reactivate it.
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchRecycleBinData}
              disabled={loading}
              className="text-xs font-semibold h-10 px-4 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <RefreshCw className={cn("h-4 w-4 text-primary", loading && "animate-spin")} />
              <span>Refresh Records</span>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-card border rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deleted Quotations</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black font-mono text-foreground">{quotations.length}</span>
            <span className="text-xs font-semibold font-mono text-purple-600">
              AED {totalQuotationValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </Card>

        <Card className="bg-card border rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deleted BOQ Records</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black font-mono text-foreground">{boqs.length}</span>
            <span className="text-xs font-semibold font-mono text-blue-600">
              AED {totalBoqValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </Card>

        <Card className="bg-card border rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deleted Clients</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black font-mono text-foreground">{clients.length}</span>
            <span className="text-xs font-semibold text-muted-foreground">Soft-deleted profiles</span>
          </div>
        </Card>
      </div>

      {/* Main Recovery Workspace */}
      <Card className="bg-card border rounded-3xl shadow-xs p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <TabsList className="h-11 p-1 bg-muted/40 border rounded-2xl gap-1">
              <TabsTrigger value="quotations" className="text-xs font-bold px-4 py-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs">
                Quotations ({quotations.length})
              </TabsTrigger>
              <TabsTrigger value="boqs" className="text-xs font-bold px-4 py-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs">
                BOQs ({boqs.length})
              </TabsTrigger>
              <TabsTrigger value="clients" className="text-xs font-bold px-4 py-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs">
                Clients ({clients.length})
              </TabsTrigger>
            </TabsList>

            {/* Search & Bulk Action Bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search deleted ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-xl bg-background"
                />
              </div>

              {selectedIds.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const type = activeTab === "quotations" ? "QUOTATION" : activeTab === "boqs" ? "BOQ" : "CLIENT"
                    handleRestore(type, selectedIds)
                  }}
                  disabled={bulkRestoring}
                  className="h-10 text-xs font-bold px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {bulkRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  <span>Restore Selected ({selectedIds.length})</span>
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="text-xs font-medium text-muted-foreground">Loading deleted records from database...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: DELETED QUOTATIONS */}
              <TabsContent value="quotations" className="mt-0">
                {filteredQuotations.length === 0 ? (
                  <div className="py-16 text-center space-y-2 border border-dashed rounded-2xl bg-muted/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-bold text-foreground">No Deleted Quotations</h4>
                    <p className="text-xs text-muted-foreground">There are no deleted quotations matching your filter criteria.</p>
                  </div>
                ) : (
                  <div className="border rounded-2xl overflow-hidden bg-background">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/40 text-muted-foreground uppercase font-bold tracking-wider border-b">
                          <tr>
                            <th className="p-3.5 w-10 text-center">
                              <Checkbox 
                                checked={selectedIds.length > 0 && selectedIds.length === filteredQuotations.length}
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                              />
                            </th>
                            <th className="p-3.5">Quotation #</th>
                            <th className="p-3.5">Client Company</th>
                            <th className="p-3.5">Project Name</th>
                            <th className="p-3.5">Prepared By</th>
                            <th className="p-3.5 text-right">Grand Total</th>
                            <th className="p-3.5">Deleted Date</th>
                            <th className="p-3.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredQuotations.map((q) => (
                            <tr key={q.id} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3.5 text-center">
                                <Checkbox 
                                  checked={selectedIds.includes(q.id)}
                                  onCheckedChange={() => handleToggleSelect(q.id)}
                                />
                              </td>
                              <td className="p-3.5 font-bold font-mono text-foreground">
                                {q.quotationNumber} {q.revisionNumber > 0 && <Badge variant="outline" className="text-[9px] py-0 px-1 ml-1">Rev {q.revisionNumber}</Badge>}
                              </td>
                              <td className="p-3.5 font-medium text-foreground">
                                {q.client?.companyName || "Unknown Client"}
                              </td>
                              <td className="p-3.5 text-muted-foreground">
                                {q.projectName || "-"}
                              </td>
                              <td className="p-3.5 text-muted-foreground">
                                {q.preparedBy?.name || q.preparedBy?.email || "-"}
                              </td>
                              <td className="p-3.5 font-mono font-bold text-foreground text-right">
                                AED {q.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3.5 text-muted-foreground">
                                {new Date(q.deletedAt).toLocaleDateString()} {new Date(q.deletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-3.5 text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestore("QUOTATION", [q.id])}
                                  disabled={restoringIds[q.id]}
                                  className="text-xs h-8 px-3 font-semibold border-purple-300 text-purple-700 hover:bg-purple-50 cursor-pointer flex items-center gap-1.5 ml-auto"
                                >
                                  {restoringIds[q.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                  <span>Restore</span>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: DELETED BOQS */}
              <TabsContent value="boqs" className="mt-0">
                {filteredBoqs.length === 0 ? (
                  <div className="py-16 text-center space-y-2 border border-dashed rounded-2xl bg-muted/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-bold text-foreground">No Deleted BOQs</h4>
                    <p className="text-xs text-muted-foreground">There are no deleted BOQ records matching your filter criteria.</p>
                  </div>
                ) : (
                  <div className="border rounded-2xl overflow-hidden bg-background">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/40 text-muted-foreground uppercase font-bold tracking-wider border-b">
                          <tr>
                            <th className="p-3.5 w-10 text-center">
                              <Checkbox 
                                checked={selectedIds.length > 0 && selectedIds.length === filteredBoqs.length}
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                              />
                            </th>
                            <th className="p-3.5">BOQ #</th>
                            <th className="p-3.5">Client Company</th>
                            <th className="p-3.5">Project Name</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5 text-right">Total Value</th>
                            <th className="p-3.5">Deleted Date</th>
                            <th className="p-3.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredBoqs.map((b) => (
                            <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3.5 text-center">
                                <Checkbox 
                                  checked={selectedIds.includes(b.id)}
                                  onCheckedChange={() => handleToggleSelect(b.id)}
                                />
                              </td>
                              <td className="p-3.5 font-bold font-mono text-foreground">
                                {b.boqNumber}
                              </td>
                              <td className="p-3.5 font-medium text-foreground">
                                {b.client?.companyName || "Unknown Client"}
                              </td>
                              <td className="p-3.5 text-muted-foreground">
                                {b.projectName || "-"}
                              </td>
                              <td className="p-3.5">
                                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                  {b.status}
                                </Badge>
                              </td>
                              <td className="p-3.5 font-mono font-bold text-foreground text-right">
                                AED {b.totalSellingPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3.5 text-muted-foreground">
                                {new Date(b.deletedAt).toLocaleDateString()} {new Date(b.deletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-3.5 text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestore("BOQ", [b.id])}
                                  disabled={restoringIds[b.id]}
                                  className="text-xs h-8 px-3 font-semibold border-purple-300 text-purple-700 hover:bg-purple-50 cursor-pointer flex items-center gap-1.5 ml-auto"
                                >
                                  {restoringIds[b.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                  <span>Restore</span>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: DELETED CLIENTS */}
              <TabsContent value="clients" className="mt-0">
                {filteredClients.length === 0 ? (
                  <div className="py-16 text-center space-y-2 border border-dashed rounded-2xl bg-muted/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-bold text-foreground">No Deleted Clients</h4>
                    <p className="text-xs text-muted-foreground">There are no deleted client records matching your filter criteria.</p>
                  </div>
                ) : (
                  <div className="border rounded-2xl overflow-hidden bg-background">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/40 text-muted-foreground uppercase font-bold tracking-wider border-b">
                          <tr>
                            <th className="p-3.5 w-10 text-center">
                              <Checkbox 
                                checked={selectedIds.length > 0 && selectedIds.length === filteredClients.length}
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                              />
                            </th>
                            <th className="p-3.5">Client ID</th>
                            <th className="p-3.5">Company Name</th>
                            <th className="p-3.5">Contact Person</th>
                            <th className="p-3.5">Client Type</th>
                            <th className="p-3.5">Contact Details</th>
                            <th className="p-3.5">Deleted Date</th>
                            <th className="p-3.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredClients.map((c) => (
                            <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3.5 text-center">
                                <Checkbox 
                                  checked={selectedIds.includes(c.id)}
                                  onCheckedChange={() => handleToggleSelect(c.id)}
                                />
                              </td>
                              <td className="p-3.5 font-bold font-mono text-foreground">
                                {c.clientId}
                              </td>
                              <td className="p-3.5 font-semibold text-foreground">
                                {c.companyName}
                              </td>
                              <td className="p-3.5 text-muted-foreground">
                                {c.contactPerson || "-"}
                              </td>
                              <td className="p-3.5">
                                <Badge variant="outline" className="text-[10px]">
                                  {c.clientType || "Project"}
                                </Badge>
                              </td>
                              <td className="p-3.5 text-muted-foreground">
                                {c.phone || c.email || "-"}
                              </td>
                              <td className="p-3.5 text-muted-foreground">
                                {new Date(c.deletedAt).toLocaleDateString()} {new Date(c.deletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-3.5 text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestore("CLIENT", [c.id])}
                                  disabled={restoringIds[c.id]}
                                  className="text-xs h-8 px-3 font-semibold border-purple-300 text-purple-700 hover:bg-purple-50 cursor-pointer flex items-center gap-1.5 ml-auto"
                                >
                                  {restoringIds[c.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                  <span>Restore</span>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </Card>
    </div>
  )
}
