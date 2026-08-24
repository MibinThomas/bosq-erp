"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { 
  Shield, 
  ShieldAlert, 
  User, 
  History, 
  Check, 
  Save, 
  Trash2, 
  Plus, 
  AlertCircle, 
  Info,
  Users,
  Clock,
  MapPin,
  Search,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Ban,
  Settings,
  UserCheck,
  Building,
  AlertTriangle,
  Sparkles,
  Filter,
  Lock,
  Unlock,
  Coins,
  DollarSign,
  Eye,
  FileSpreadsheet,
  PackagePlus,
  Edit3,
  UserPlus,
  FolderGit2,
  ChevronDown,
  ChevronUp,
  Layers,
  Percent,
  Calculator,
  Briefcase,
  Loader2,
  Key,
  X
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

const modules = [
  { id: "QUOTATIONS", name: "Quotations & Revisions", category: "Sales & Pricing", icon: FileSpreadsheet },
  { id: "APPROVALS", name: "Executive Approvals & Workflow", category: "Sales & Pricing", icon: Shield },
  { id: "COSTING_REQUESTS", name: "Costing Requests & Estimations", category: "Costing & BOQ", icon: Calculator },
  { id: "BOQS", name: "BOQs & Costing", category: "Costing & BOQ", icon: Calculator },
  { id: "CLIENTS", name: "Clients & CRM", category: "Sales & Pricing", icon: Building },
  { id: "PRODUCTS", name: "Products & Master Catalog", category: "Catalog & Inventory", icon: PackagePlus },
  { id: "PURCHASE_ORDERS", name: "Purchase Orders", category: "Sales & Pricing", icon: Coins },
  { id: "REPORTS", name: "Analytics & Reports", category: "System & Governance", icon: Layers },
  { id: "USER_MANAGEMENT", name: "Users & Employee Profiles", category: "System & Governance", icon: Users },
  { id: "DASHBOARD", name: "Executive Dashboard", category: "System & Governance", icon: Sparkles },
  { id: "PRICING_MARKUP", name: "Pricing Markups & Margins", category: "Catalog & Inventory", icon: Percent },
  { id: "SETTINGS", name: "System Settings", category: "System & Governance", icon: Settings },
  { id: "ACCESS_CONTROL", name: "Access Control & Security", category: "System & Governance", icon: Shield },
  { id: "NOTIFICATIONS", name: "Notifications & Alerts", category: "System & Governance", icon: Clock },
  { id: "SHAREPOINT", name: "SharePoint File Manager", category: "System & Governance", icon: FolderGit2 },
  { id: "SYSTEM_CONFIGURATION", name: "System Configuration", category: "System & Governance", icon: Settings },
]

// Primary columns for the matrix table (similar to old UI, but cleaner)
const matrixColumns = [
  { id: "view", label: "View", title: "View module records" },
  { id: "create", label: "Create", title: "Create new records" },
  { id: "edit", label: "Edit", title: "Edit existing records" },
  { id: "delete", label: "Delete", title: "Delete or archive records" },
  { id: "approve", label: "Approve", title: "Approve submitted records" },
  { id: "export", label: "Export", title: "Export data to Excel / CSV" },
  { id: "uploadFiles", label: "Bulk Upload", title: "Upload attachments or files" },
  { id: "manage", label: "Manage", title: "Manage master settings & categories" },
  { id: "costPriceVisible", label: "View Costing & BOQ", title: "View raw unit cost and factory allocations" },
  { id: "canApplySpecialDiscount", label: "Special Discount", title: "Apply un-capped special discount" },
  { id: "canExportBoqExcel", label: "Export BOQ Excel", title: "Export raw BOQ estimator spreadsheets" },
  { id: "canConfirmQuotation", label: "Confirm Quote", title: "Mark quote as Client Approved / Confirmed" },
  { id: "canSaveToCatalog", label: "Save to Catalog", title: "Save custom items into master product catalog" },
]

export default function AccessControlPage() {
  const { data: session } = useSession()
  const currentUserRole = (session?.user as any)?.role || ""
  const currentUserId = (session?.user as any)?.id || ""

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN": return "Super Admin"
      case "ADMIN": return "Administrator"
      case "MANAGER":
      case "SALES_MANAGER": return "Manager"
      case "SALES_EXECUTIVE": return "Interior Design Consultant (IDC)"
      case "INTERIOR_DESIGN_CONSULTANT": return "Interior Design Consultant"
      case "ESTIMATOR": return "Cost Estimator"
      case "ACCOUNTS": return "Finance & Accounts"
      case "PROCUREMENT": return "Procurement"
      case "PRODUCTION": return "Production"
      case "VIEWER": return "Viewer"
      default: return role ? role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "User"
    }
  }

  const [activeTab, setActiveTab] = useState<"roles" | "overrides" | "requests" | "logs">("roles")
  const [loading, setLoading] = useState(true)
  const [savingMatrix, setSavingMatrix] = useState(false)
  
  // Data lists
  const [roles, setRoles] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [clientAccessRequests, setClientAccessRequests] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  
  // Matrix selection & filters
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Edit states
  const [editingPermissions, setEditingPermissions] = useState<Record<string, any>>({})
  
  // User Overrides modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userOverrideQuery, setUserOverrideQuery] = useState("")
  const [editingOverrides, setEditingOverrides] = useState<Record<string, any>>({})
  const [savingUserOverride, setSavingUserOverride] = useState(false)

  // Fetch access control data
  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/access-control")
      if (!res.ok) throw new Error("Failed to fetch access control data")
      const data = await res.json()
      
      setRoles(data.roles || [])
      setUsers(data.users || [])
      setClientAccessRequests(data.clientAccessRequests || [])
      setLogs(data.logs || [])

      if (data.roles && data.roles.length > 0 && !selectedRoleId) {
        setSelectedRoleId(data.roles[0].id)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load access control configuration")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Selected role object
  const selectedRole = useMemo(() => {
    return roles.find(r => r.id === selectedRoleId) || roles[0] || null
  }, [roles, selectedRoleId])

  // Sync editing permissions when selected role changes
  useEffect(() => {
    if (!selectedRole) return
    const initialPerms: Record<string, any> = {}
    for (const m of modules) {
      const existing = selectedRole.permissions?.find((p: any) => p.module === m.id)
      if (existing) {
        initialPerms[m.id] = { ...existing }
      } else {
        initialPerms[m.id] = {
          module: m.id,
          view: false, create: false, edit: false, delete: false, approve: false, reject: false,
          export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false,
          ownership: "NONE", approvalLimit: null,
          costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false,
          maxDiscountPercent: 0, canOverrideVat: false, canAddCustomCharges: false, canConfirmQuotation: false,
          canApplySpecialDiscount: false, canExportBoqExcel: false, canSaveToCatalog: false, canReviseQuotation: false,
          canAssignClients: false, canApproveClientAccess: false
        }
      }
    }
    setEditingPermissions(initialPerms)
  }, [selectedRole])

  // Handle matrix permission toggle
  const handleRolePermChange = (moduleId: string, actionKey: string, value: any) => {
    if (selectedRole?.name === "SUPER_ADMIN") return
    setEditingPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [actionKey]: value
      }
    }))
  }

  // Save role permissions matrix
  const handleSaveRoleMatrix = async () => {
    if (!selectedRole || selectedRole.name === "SUPER_ADMIN") return
    setSavingMatrix(true)
    try {
      const payload = {
        roleId: selectedRole.id,
        permissions: Object.values(editingPermissions)
      }
      const res = await fetch("/api/settings/access-control", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update role permissions")
      }
      toast.success(`Role permissions matrix for "${getRoleDisplayName(selectedRole.name)}" updated successfully!`)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to save permissions matrix")
    } finally {
      setSavingMatrix(false)
    }
  }

  // Handle Client Access Request Approval/Rejection
  const handleActionClientRequest = async (requestId: string, status: "Approved" | "Rejected") => {
    try {
      const res = await fetch(`/api/clients/access-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Failed to ${status.toLowerCase()} request`)
      }
      toast.success(`Client access request ${status.toLowerCase()} successfully!`)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to process request")
    }
  }

  // Filter modules based on search
  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      return searchQuery === "" || 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.id.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [searchQuery])

  // Open User Override modal
  const handleOpenUserOverride = (user: any) => {
    setSelectedUserId(user.id)
    const existingOverridesMap: Record<string, any> = {}
    if (user.permissionOverrides) {
      for (const ov of user.permissionOverrides) {
        existingOverridesMap[`${ov.module}:${ov.action}`] = ov.value
        if (ov.action === "ownership") {
          existingOverridesMap[`${ov.module}:ownership`] = ov.ownership
        }
      }
    }
    setEditingOverrides(existingOverridesMap)
  }

  // Selected user for override modal
  const selectedUserObj = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || null
  }, [users, selectedUserId])

  // Save User Override
  const handleSaveUserOverrides = async () => {
    if (!selectedUserObj) return
    setSavingUserOverride(true)
    try {
      const res = await fetch(`/api/settings/access-control/users/${selectedUserObj.id}/overrides`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: editingOverrides })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save user overrides")
      }
      toast.success(`User permission overrides for ${selectedUserObj.name} saved!`)
      setSelectedUserId(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to save user overrides")
    } finally {
      setSavingUserOverride(false)
    }
  }

  const pendingRequestsCount = clientAccessRequests.filter(r => r.status === "Pending").length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading Access Control &amp; Security Hub...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Access Control Settings
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-mono font-bold">
                Super Admin Matrix
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure role permissions, module visibility, and individual user permission overrides.
            </p>
          </div>
        </div>

        {activeTab === "roles" && selectedRole && selectedRole.name !== "SUPER_ADMIN" && (
          <Button
            onClick={handleSaveRoleMatrix}
            disabled={savingMatrix}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
          >
            {savingMatrix ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Permissions Matrix
          </Button>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${activeTab === "roles" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Shield className="h-4 w-4" /> Role Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab("overrides")}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${activeTab === "overrides" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:bg-muted"}`}
        >
          <UserCheck className="h-4 w-4" /> User Level Overrides ({users.filter(u => u.permissionOverrides && u.permissionOverrides.length > 0).length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${activeTab === "logs" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:bg-muted"}`}
        >
          <History className="h-4 w-4" /> Security Audit Logs ({logs.length})
        </button>
      </div>

      {/* TAB 1: ROLE PERMISSIONS MATRIX (Clean Tabular View - Similar to Old UI) */}
      {activeTab === "roles" && (
        <div className="space-y-5">
          
          {/* Role Selector Horizontal Tabs */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Configure Role Matrix:</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {roles.map(r => {
                const isSelected = selectedRoleId === r.id
                const isSuper = r.name === "SUPER_ADMIN"
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-2 cursor-pointer ${
                      isSelected 
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 shadow-xs" 
                        : "bg-card hover:bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {isSuper ? <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> : <Shield className="h-3.5 w-3.5" />}
                    <span>{getRoleDisplayName(r.name)}</span>
                    <span className="text-[10px] opacity-75 font-mono">({users.filter(u => u.role === r.name).length})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Super Admin Notice */}
          {selectedRole?.name === "SUPER_ADMIN" && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Super Admin Bypass Active:</strong> The SUPER_ADMIN role bypasses matrix permissions and has full access across all modules.
              </span>
            </div>
          )}

          {/* Module Filter / Search */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-card border border-border rounded-xl text-xs focus:outline-none font-sans"
              />
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Editing: <strong className="text-foreground font-sans">{selectedRole ? getRoleDisplayName(selectedRole.name) : ""}</strong>
            </div>
          </div>

          {/* Clean Role Permission Matrix Table */}
          <div className="bg-card border rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-900/80 text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3.5 min-w-[200px] sticky left-0 bg-slate-50 dark:bg-slate-900/90 z-10 border-r">Module Name</th>
                    {matrixColumns.map(col => (
                      <th key={col.id} className="p-3 text-center min-w-[85px]" title={col.title}>
                        {col.label}
                      </th>
                    ))}
                    <th className="p-3 min-w-[160px] text-left border-l">Ownership Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b">
                  {filteredModules.map((m, idx) => {
                    const rowPerm = editingPermissions[m.id] || {}
                    const ModuleIcon = m.icon
                    const isEven = idx % 2 === 0
                    return (
                      <tr 
                        key={m.id} 
                        className={`transition-colors ${isEven ? "bg-card" : "bg-muted/20"} hover:bg-slate-100/60 dark:hover:bg-slate-800/40`}
                      >
                        {/* Module Name & Icon Column */}
                        <td className="p-3.5 font-bold text-foreground sticky left-0 bg-card z-10 border-r shadow-2xs">
                          <div className="flex items-center space-x-2.5">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                              <ModuleIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-foreground leading-tight">{m.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono font-normal">{m.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* Permission Checkboxes */}
                        {matrixColumns.map(col => {
                          const isChecked = rowPerm[col.id] ?? false
                          const isHighRisk = ["costPriceVisible", "canApplySpecialDiscount"].includes(col.id)
                          return (
                            <td key={col.id} className={`p-3 text-center align-middle ${isHighRisk ? "bg-amber-500/5 dark:bg-amber-950/10" : ""}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={selectedRole?.name === "SUPER_ADMIN"}
                                onChange={e => handleRolePermChange(m.id, col.id, e.target.checked)}
                                className={`h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:opacity-40 transition-transform hover:scale-110 ${isHighRisk ? "accent-amber-600" : ""}`}
                              />
                            </td>
                          )
                        })}

                        {/* Ownership Scope Dropdown */}
                        <td className="p-3 align-middle border-l">
                          <select
                            value={rowPerm.ownership || "NONE"}
                            disabled={selectedRole?.name === "SUPER_ADMIN"}
                            onChange={e => handleRolePermChange(m.id, "ownership", e.target.value)}
                            className="w-full bg-muted/60 border border-border rounded-lg px-2 py-1 text-xs font-bold text-foreground focus:outline-none disabled:opacity-40 cursor-pointer font-mono"
                          >
                            <option value="ALL">ALL (Full)</option>
                            <option value="DEPARTMENT">DEPARTMENT</option>
                            <option value="ASSIGNED">ASSIGNED</option>
                            <option value="OWN">OWN</option>
                            <option value="NONE">NONE</option>
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Bottom Save Bar */}
          {selectedRole && selectedRole.name !== "SUPER_ADMIN" && (
            <div className="p-4 bg-card border rounded-2xl flex items-center justify-between shadow-sm">
              <div className="text-xs text-muted-foreground">
                Configuring access matrix for <strong className="text-foreground">{getRoleDisplayName(selectedRole.name)}</strong>.
              </div>
              <Button
                onClick={handleSaveRoleMatrix}
                disabled={savingMatrix}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {savingMatrix ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Permissions Matrix
              </Button>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: USER LEVEL OVERRIDES */}
      {activeTab === "overrides" && (
        <div className="space-y-4">
          <div className="p-4 bg-card border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter users by name, email, department, or role..."
                value={userOverrideQuery}
                onChange={e => setUserOverrideQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:outline-none font-sans"
              />
            </div>
            <Badge variant="outline" className="text-xs font-mono font-bold self-start md:self-auto">
              {users.length} Total Users
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users
              .filter(u => 
                userOverrideQuery === "" || 
                u.name?.toLowerCase().includes(userOverrideQuery.toLowerCase()) || 
                u.email.toLowerCase().includes(userOverrideQuery.toLowerCase()) ||
                u.role.toLowerCase().includes(userOverrideQuery.toLowerCase())
              )
              .map(u => {
                const overridesCount = u.permissionOverrides?.length || 0
                return (
                  <div key={u.id} className="p-4 bg-card border rounded-2xl shadow-2xs space-y-3 flex flex-col justify-between hover:border-border transition-all">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm text-foreground leading-tight">{u.name || "User"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {getRoleDisplayName(u.role)}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        {u.department && <p>Department: <strong className="text-foreground">{u.department}</strong></p>}
                        <p>Status: <strong className={u.isActive ? "text-emerald-600" : "text-rose-600"}>{u.isActive ? "Active" : "Inactive"}</strong></p>
                      </div>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">
                        {overridesCount > 0 ? (
                          <span className="text-amber-600 font-bold">{overridesCount} Explicit Overrides</span>
                        ) : (
                          "Role Default"
                        )}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenUserOverride(u)}
                        className="h-8 text-xs font-bold cursor-pointer"
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1" /> Configure Overrides
                      </Button>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* SECURITY AUDIT LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-bold text-base text-foreground">Security &amp; Access Control Audit Logs</h3>
              <p className="text-xs text-muted-foreground">Audited records of system permission changes, role matrix updates, and access grants.</p>
            </div>
            <Badge variant="outline" className="text-xs font-mono font-bold">
              {logs.length} Log Entries
            </Badge>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground font-bold uppercase text-[10px]">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Operator User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b">
                {logs.map((log: any, idx: number) => (
                  <tr key={log.id || idx} className="hover:bg-muted/20">
                    <td className="p-3 font-mono text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-3 font-bold text-foreground">{log.userName || log.userEmail || log.userId}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">{log.entityType}</td>
                    <td className="p-3 text-muted-foreground font-mono text-[11px] max-w-md truncate" title={log.details}>
                      {log.details || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USER OVERRIDE DIALOG MODAL */}
      {selectedUserObj && (
        <Dialog open={!!selectedUserObj} onOpenChange={() => setSelectedUserId(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto font-sans p-6 rounded-2xl">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    User Permission Overrides: {selectedUserObj.name}
                    <Badge variant="secondary" className="text-xs">
                      {getRoleDisplayName(selectedUserObj.role)}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Explicitly grant or deny module permissions for this specific user account.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {modules.map(m => (
                <div key={m.id} className="p-3.5 border rounded-xl bg-card space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-sm text-foreground">{m.name} ({m.id})</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Category: {m.category}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {matrixColumns.map(col => {
                      const key = `${m.id}:${col.id}`
                      const currentVal = editingOverrides[key]
                      return (
                        <div key={col.id} className="p-2 border rounded-lg bg-muted/20 flex flex-col space-y-1">
                          <span className="font-semibold text-[11px] text-foreground truncate" title={col.label}>{col.label}</span>
                          <select
                            value={currentVal === true ? "true" : currentVal === false ? "false" : "default"}
                            onChange={e => {
                              const val = e.target.value
                              setEditingOverrides(prev => {
                                const next = { ...prev }
                                if (val === "default") {
                                  delete next[key]
                                } else {
                                  next[key] = val === "true"
                                }
                                return next
                              })
                            }}
                            className={`text-[10px] font-bold px-2 py-1 rounded border cursor-pointer ${
                              currentVal === true 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                                : currentVal === false 
                                ? "bg-rose-100 text-rose-800 border-rose-300" 
                                : "bg-background text-muted-foreground"
                            }`}
                          >
                            <option value="default">Inherit Role Default</option>
                            <option value="true">Force Grant (Allow)</option>
                            <option value="false">Force Deny (Restrict)</option>
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedUserId(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={savingUserOverride}
                onClick={handleSaveUserOverrides}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {savingUserOverride ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save User Overrides
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}
