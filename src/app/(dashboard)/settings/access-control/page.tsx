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
      case "SALES_EXECUTIVE":
      case "INTERIOR_DESIGN_CONSULTANT": return "Interior Design Consultant"
      case "ESTIMATOR": return "Cost Estimator"
      case "ACCOUNTS": return "Finance & Accounts"
      case "PROCUREMENT": return "Procurement"
      case "PRODUCTION": return "Production"
      case "VIEWER": return "Viewer"
      default: return role ? role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "User"
    }
  }

  const [activeTab, setActiveTab] = useState<"roles" | "overrides" | "passwordResets" | "logs">("roles")
  const [loading, setLoading] = useState(true)
  const [savingMatrix, setSavingMatrix] = useState(false)
  
  // Data lists
  const [roles, setRoles] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [clientAccessRequests, setClientAccessRequests] = useState<any[]>([])
  const [passwordResetRequests, setPasswordResetRequests] = useState<any[]>([])
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

  // Add User modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPhone, setNewUserPhone] = useState("")
  const [newUserDesignation, setNewUserDesignation] = useState("")
  const [newUserDepartment, setNewUserDepartment] = useState("")
  const [newUserRole, setNewUserRole] = useState("")
  const [newUserStatus, setNewUserStatus] = useState("Active")
  const [newUserPassword, setNewUserPassword] = useState("Bosq@2026")
  const [submittingNewUser, setSubmittingNewUser] = useState(false)

  // Comprehensive Edit User modal state
  const [editingUserObj, setEditingUserObj] = useState<any | null>(null)
  const [editUserTab, setEditUserTab] = useState<"profile" | "password" | "overrides">("profile")
  const [editUserName, setEditUserName] = useState("")
  const [editUserEmail, setEditUserEmail] = useState("")
  const [editUserPhone, setEditUserPhone] = useState("")
  const [editUserDesignation, setEditUserDesignation] = useState("")
  const [editUserDepartment, setEditUserDepartment] = useState("")
  const [editUserRole, setEditUserRole] = useState("")
  const [editUserStatus, setEditUserStatus] = useState("Active")
  const [editUserPassword, setEditUserPassword] = useState("")
  const [confirmUserPassword, setConfirmUserPassword] = useState("")
  const [savingUserProfile, setSavingUserProfile] = useState(false)

  // Password Reset Request modal state
  const [selectedResetReq, setSelectedResetReq] = useState<any | null>(null)
  const [resetTempPassword, setResetTempPassword] = useState("")
  const [processingReset, setProcessingReset] = useState(false)

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
      setPasswordResetRequests(data.passwordResetRequests || [])
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

  // Users assigned to selected role
  const assignedUsers = useMemo(() => {
    if (!selectedRole) return []
    return users.filter(u => u.role === selectedRole.name)
  }, [users, selectedRole])

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
        type: "update_role",
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

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserEmail || !newUserEmail.trim()) {
      toast.error("User email is required.")
      return
    }

    setSubmittingNewUser(true)
    try {
      const res = await fetch("/api/settings/access-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_user",
          name: newUserName,
          email: newUserEmail,
          phone: newUserPhone,
          designation: newUserDesignation,
          department: newUserDepartment,
          role: newUserRole || selectedRole?.name || "INTERIOR_DESIGN_CONSULTANT",
          status: newUserStatus,
          password: newUserPassword
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user account.")
      }

      toast.success(`User account for ${data.user?.name || newUserEmail} created successfully!`)
      setIsAddUserOpen(false)
      setNewUserName("")
      setNewUserEmail("")
      setNewUserPhone("")
      setNewUserDesignation("")
      setNewUserDepartment("")
      setNewUserPassword("Bosq@2026")
      await loadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to create user account.")
    } finally {
      setSubmittingNewUser(false)
    }
  }

  // Open Edit User Modal
  const handleOpenEditUserModal = (user: any) => {
    setEditingUserObj(user)
    setEditUserTab("profile")
    setEditUserName(user.name || "")
    setEditUserEmail(user.email || "")
    setEditUserPhone(user.phone || "")
    setEditUserDesignation(user.designation || "")
    setEditUserDepartment(user.department || "")
    setEditUserRole(user.role || "INTERIOR_DESIGN_CONSULTANT")
    setEditUserStatus(user.status || (user.isActive ? "Active" : "Inactive"))
    setEditUserPassword("")
    setConfirmUserPassword("")
    
    // Load overrides into editingOverrides map
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

  // Save Edit User Profile
  const handleSaveEditUserProfile = async () => {
    if (!editingUserObj) return
    setSavingUserProfile(true)
    try {
      // 1. Update user profile details
      const profileRes = await fetch(`/api/settings/users/${editingUserObj.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editUserName,
          email: editUserEmail,
          phone: editUserPhone,
          designation: editUserDesignation,
          department: editUserDepartment,
          role: editUserRole,
          status: editUserStatus,
          isActive: editUserStatus === "Active"
        })
      })

      if (!profileRes.ok) {
        // Fallback to update via general access control endpoint if user-specific API returns 404
        const fallbackRes = await fetch("/api/settings/access-control", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "update_user_role",
            userId: editingUserObj.id,
            roleName: editUserRole
          })
        })
        if (!fallbackRes.ok) throw new Error("Failed to update user profile")
      }

      // 2. If password provided, update password
      if (editUserPassword && editUserPassword.trim() !== "") {
        if (editUserPassword !== confirmUserPassword) {
          throw new Error("Passwords do not match.")
        }
        await fetch(`/api/settings/users/${editingUserObj.id}/password`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: editUserPassword })
        })
      }

      // 3. Save permission overrides
      await fetch(`/api/settings/access-control/users/${editingUserObj.id}/overrides`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: editingOverrides })
      })

      toast.success(`User profile & access configuration for ${editUserName || editUserEmail} saved!`)
      setEditingUserObj(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to update user account.")
    } finally {
      setSavingUserProfile(false)
    }
  }

  // Resolve Password Reset Request
  const handleResolvePasswordReset = async (requestId: string, action: "APPROVE" | "REJECT") => {
    setProcessingReset(true)
    try {
      const res = await fetch("/api/settings/access-control", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "resolve_password_reset",
          requestId,
          action,
          newPassword: resetTempPassword
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to process password reset request")

      if (action === "APPROVE") {
        toast.success(`Password reset approved! Temporary Password: ${data.tempPassword || resetTempPassword || "Generated"}`)
      } else {
        toast.info("Password reset request rejected.")
      }

      setSelectedResetReq(null)
      setResetTempPassword("")
      await loadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to process password reset request")
    } finally {
      setProcessingReset(false)
    }
  }

  const pendingResetCount = passwordResetRequests.filter(r => r.status === "PENDING").length

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
          onClick={() => setActiveTab("passwordResets")}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${activeTab === "passwordResets" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Key className="h-4 w-4 text-amber-500" /> Password Reset Requests
          {pendingResetCount > 0 && (
            <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
              {pendingResetCount}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${activeTab === "logs" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:bg-muted"}`}
        >
          <History className="h-4 w-4" /> Security Audit Logs ({logs.length})
        </button>
      </div>

      {/* TAB 1: ROLE PERMISSIONS MATRIX & USER MANAGEMENT */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          
          {/* 1. ROLE SELECTION DROPDOWN CARD */}
          <div className="p-5 bg-card border rounded-2xl shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Role Dropdown Selector */}
              <div className="flex-1 max-w-md space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  Select Role:
                </label>
                <div className="relative">
                  <select
                    value={selectedRoleId}
                    onChange={e => setSelectedRoleId(e.target.value)}
                    className="w-full h-10 pl-3.5 pr-10 bg-background border-2 border-primary/20 hover:border-primary/40 focus:border-primary rounded-xl text-xs font-bold text-foreground focus:outline-none transition-all cursor-pointer shadow-2xs"
                  >
                    {roles.map(r => {
                      const count = users.filter(u => u.role === r.name).length
                      return (
                        <option key={r.id} value={r.id}>
                          {getRoleDisplayName(r.name)} ({count} User{count !== 1 ? "s" : ""})
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              {/* Action Button & Metadata */}
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-3 py-2 text-xs font-mono font-bold bg-muted/50 border-border">
                  {assignedUsers.length} User(s) Assigned
                </Badge>
                {selectedRole && selectedRole.name !== "SUPER_ADMIN" && (
                  <Button
                    onClick={handleSaveRoleMatrix}
                    disabled={savingMatrix}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-2xs h-10 px-4 rounded-xl"
                  >
                    {savingMatrix ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Permissions Matrix
                  </Button>
                )}
              </div>
            </div>

            {/* Role Description Sub-text */}
            {selectedRole && (
              <div className="text-xs text-muted-foreground pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-border/40">
                <span>{selectedRole.description || `Configuring access permissions and user list for ${getRoleDisplayName(selectedRole.name)}`}</span>
                <span className="font-mono text-[11px] shrink-0">System Identifier: <code className="font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">{selectedRole.name}</code></span>
              </div>
            )}
          </div>

          {/* Super Admin Notice */}
          {selectedRole?.name === "SUPER_ADMIN" && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Super Admin Bypass Active:</strong> The SUPER_ADMIN role bypasses matrix permissions and has full unrestricted access across all modules.
              </span>
            </div>
          )}

          {/* 2. ASSIGNED USERS SECTION */}
          <div className="p-5 bg-card border rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Assigned Users ({selectedRole ? getRoleDisplayName(selectedRole.name) : ""})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Active employee accounts currently operating under this role.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewUserRole(selectedRole?.name || "INTERIOR_DESIGN_CONSULTANT")
                    setIsAddUserOpen(true)
                  }}
                  className="h-8 text-xs font-bold border-rose-500 text-rose-600 hover:bg-rose-50 dark:border-rose-400 dark:text-rose-400 dark:hover:bg-rose-950/30 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add New User
                </Button>
                <Badge variant="secondary" className="text-xs font-mono font-bold">
                  {assignedUsers.length} Account(s)
                </Badge>
              </div>
            </div>

            {assignedUsers.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl bg-muted/20 space-y-2">
                <Users className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                <p className="text-xs font-semibold text-muted-foreground">No users currently assigned to this role.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b bg-slate-50 dark:bg-slate-900/80 text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3">User Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Designation / Role</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 font-mono">Assigned Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {assignedUsers.map(u => {
                      return (
                        <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-bold text-foreground">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-xs leading-tight">{u.name || "User"}</p>
                                {u.employeeId && <p className="text-[10px] text-muted-foreground font-mono">ID: {u.employeeId}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-muted-foreground text-xs">{u.email}</td>
                          <td className="p-3 text-muted-foreground font-medium">
                            {u.department ? `${u.department} (${getRoleDisplayName(u.role)})` : getRoleDisplayName(u.role)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] font-bold px-2 py-0.5 ${
                                u.isActive || u.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300" 
                                  : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300"
                              }`}
                            >
                              {u.status || (u.isActive ? "Active" : "Inactive")}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-muted-foreground text-xs">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditUserModal(u)}
                              className="h-7 text-[11px] font-bold cursor-pointer hover:bg-primary/10 hover:text-primary border-slate-300 shadow-2xs"
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3. PERMISSIONS MATRIX SECTION */}
          <div className="p-5 bg-card border rounded-2xl shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Permissions Matrix ({selectedRole ? getRoleDisplayName(selectedRole.name) : ""})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Module access levels and action permissions for this role.
                </p>
              </div>

              {/* Module Filter / Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none font-sans"
                />
              </div>
            </div>

            {/* Clean Role Permission Matrix Table */}
            <div className="border rounded-2xl shadow-2xs overflow-hidden">
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

            {/* Bottom Save Bar */}
            {selectedRole && selectedRole.name !== "SUPER_ADMIN" && (
              <div className="pt-2 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Configuring matrix for <strong className="text-foreground">{getRoleDisplayName(selectedRole.name)}</strong>.
                </div>
                <Button
                  onClick={handleSaveRoleMatrix}
                  disabled={savingMatrix}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-2xs h-9 px-4 rounded-xl"
                >
                  {savingMatrix ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Permissions Matrix
                </Button>
              </div>
            )}
          </div>

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

      {/* 1. ADD NEW USER DIALOG MODAL */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-3xl max-w-3xl w-full font-sans p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Create New User Account
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Enter employee details and pre-assign to role: <strong>{selectedRole ? getRoleDisplayName(selectedRole.name) : "Selected Role"}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Jipsa Abraham"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Corporate Email <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  placeholder="e.g. jipsa@bosq.ae"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Mobile Phone</label>
                <input
                  type="text"
                  placeholder="+971 50 123 4567"
                  value={newUserPhone}
                  onChange={e => setNewUserPhone(e.target.value)}
                  className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Interior Designer"
                  value={newUserDesignation}
                  onChange={e => setNewUserDesignation(e.target.value)}
                  className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Design &amp; Sales"
                  value={newUserDepartment}
                  onChange={e => setNewUserDepartment(e.target.value)}
                  className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Assigned Role</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value)}
                  className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>
                      {getRoleDisplayName(r.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Account Status</label>
                <select
                  value={newUserStatus}
                  onChange={e => setNewUserStatus(e.target.value)}
                  className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Initial Password</label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs font-mono focus:outline-none"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddUserOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingNewUser}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {submittingNewUser ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                Create User Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. COMPLETE EDIT USER DIALOG MODAL */}
      {editingUserObj && (
        <Dialog open={!!editingUserObj} onOpenChange={() => setEditingUserObj(null)}>
          <DialogContent className="sm:max-w-5xl md:max-w-5xl max-w-5xl w-full max-h-[90vh] overflow-y-auto font-sans p-7 rounded-2xl shadow-2xl">
            <DialogHeader className="border-b pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
                    {editUserName ? editUserName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2.5">
                      Edit User Account: {editingUserObj.name || editingUserObj.email}
                      <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/10 text-primary border-primary/20">
                        {getRoleDisplayName(editUserRole)}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] font-bold px-2 py-0.5 ${
                          editUserStatus === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300" 
                            : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}
                      >
                        {editUserStatus}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Configure complete employee metadata, role assignment, password credentials, and permission overrides.
                    </DialogDescription>
                  </div>
                </div>

                {/* Modal Sub-Tabs */}
                <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditUserTab("profile")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editUserTab === "profile" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Profile &amp; Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUserTab("password")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editUserTab === "password" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Password &amp; Security
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUserTab("overrides")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editUserTab === "overrides" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Permission Overrides
                  </button>
                </div>
              </div>
            </DialogHeader>

            <div className="py-4 text-xs">
              {/* TAB A: PROFILE & ACCOUNT (Spacious 3-Column Layout) */}
              {editUserTab === "profile" && (
                <div className="space-y-6">
                  
                  {/* Card 1: User Identity */}
                  <div className="p-4 border rounded-xl bg-card space-y-3 shadow-2xs">
                    <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <User className="h-3.5 w-3.5 text-primary" /> Personal Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-bold text-foreground">User Name <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={editUserName}
                          onChange={e => setEditUserName(e.target.value)}
                          className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-foreground">Corporate Email Address <span className="text-rose-500">*</span></label>
                        <input
                          type="email"
                          value={editUserEmail}
                          onChange={e => setEditUserEmail(e.target.value)}
                          className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-foreground">Mobile Phone Number</label>
                        <input
                          type="text"
                          placeholder="+971 50 123 4567"
                          value={editUserPhone}
                          onChange={e => setEditUserPhone(e.target.value)}
                          className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Role Allocation & Account Status */}
                  <div className="p-4 border rounded-xl bg-card space-y-3 shadow-2xs">
                    <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <Shield className="h-3.5 w-3.5 text-primary" /> Role Assignment &amp; System Access
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-bold text-foreground">Assigned Role</label>
                        <select
                          value={editUserRole}
                          onChange={e => setEditUserRole(e.target.value)}
                          className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold focus:outline-none cursor-pointer focus:border-primary"
                        >
                          {roles.map(r => (
                            <option key={r.id} value={r.name}>
                              {getRoleDisplayName(r.name)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-foreground">Account Status</label>
                        <select
                          value={editUserStatus}
                          onChange={e => setEditUserStatus(e.target.value)}
                          className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold focus:outline-none cursor-pointer focus:border-primary"
                        >
                          <option value="Active">Active (Full Access Enabled)</option>
                          <option value="Inactive">Inactive (Disabled)</option>
                          <option value="Suspended">Suspended (Locked)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-foreground">Employee ID</label>
                        <input
                          type="text"
                          placeholder="e.g. EMP-104"
                          value={editingUserObj.employeeId || ""}
                          disabled
                          className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs font-mono text-muted-foreground"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Organizational Details */}
                  <div className="p-4 border rounded-xl bg-card space-y-3 shadow-2xs">
                    <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <Briefcase className="h-3.5 w-3.5 text-primary" /> Department &amp; Organizational Profile
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-bold text-foreground">Department Information</label>
                        <input
                          type="text"
                          placeholder="e.g. Design &amp; Commercial Sales"
                          value={editUserDepartment}
                          onChange={e => setEditUserDepartment(e.target.value)}
                          className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-foreground">Designation Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Senior Interior Design Consultant"
                          value={editUserDesignation}
                          onChange={e => setEditUserDesignation(e.target.value)}
                          className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB B: PASSWORD MANAGEMENT (Spacious Layout) */}
              {editUserTab === "password" && (
                <div className="space-y-5 p-5 border rounded-xl bg-card shadow-2xs">
                  <div className="space-y-1 border-b pb-3">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Lock className="h-4.5 w-4.5 text-amber-500" /> Security Credentials &amp; Password Reset
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Set a new corporate password or generate temporary credentials for {editingUserObj.name || editingUserObj.email}.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    <div className="space-y-1.5">
                      <label className="font-bold text-foreground">New Password</label>
                      <input
                        type="password"
                        placeholder="Enter new password"
                        value={editUserPassword}
                        onChange={e => setEditUserPassword(e.target.value)}
                        className="w-full h-10 px-3.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-foreground">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="Re-enter new password"
                        value={confirmUserPassword}
                        onChange={e => setConfirmUserPassword(e.target.value)}
                        className="w-full h-10 px-3.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const temp = "Bosq@" + Math.floor(1000 + Math.random() * 9000)
                        setEditUserPassword(temp)
                        setConfirmUserPassword(temp)
                        toast.info(`Generated temporary password: ${temp}`)
                      }}
                      className="text-xs font-bold cursor-pointer h-9 px-4 rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    >
                      <Key className="h-3.5 w-3.5 mr-1.5" />
                      Generate Temp Password
                    </Button>
                    <span className="text-[11px] text-muted-foreground font-mono">Note: Password changes are applied immediately when you save.</span>
                  </div>
                </div>
              )}

              {/* TAB C: PERMISSION OVERRIDES (Multi-Column Matrix) */}
              {editUserTab === "overrides" && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="p-3 bg-muted/40 border rounded-xl text-xs text-muted-foreground">
                    Explicitly override permissions for <strong>{editUserName || editUserEmail}</strong>. Setting to &quot;Inherit Role&quot; will use the default role permission matrix.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modules.map(m => (
                      <div key={m.id} className="p-4 border rounded-xl bg-card space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            {m.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{m.id}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {matrixColumns.map(col => {
                            const key = `${m.id}:${col.id}`
                            const currentVal = editingOverrides[key]
                            return (
                              <div key={col.id} className="p-1.5 border rounded-lg bg-muted/20 flex flex-col space-y-1">
                                <span className="font-semibold text-[10px] text-foreground truncate" title={col.label}>{col.label}</span>
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
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border cursor-pointer ${
                                    currentVal === true 
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                                      : currentVal === false 
                                      ? "bg-rose-100 text-rose-800 border-rose-300" 
                                      : "bg-background text-muted-foreground"
                                  }`}
                                >
                                  <option value="default">Inherit Role</option>
                                  <option value="true">Force Grant</option>
                                  <option value="false">Force Deny</option>
                                </select>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t pt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Editing user profile for <strong className="text-foreground">{editUserEmail}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingUserObj(null)} className="h-9 px-4 rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={savingUserProfile}
                  onClick={handleSaveEditUserProfile}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-5 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  {savingUserProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 3. RESOLVE PASSWORD RESET MODAL */}
      {selectedResetReq && (
        <Dialog open={!!selectedResetReq} onOpenChange={() => setSelectedResetReq(null)}>
          <DialogContent className="max-w-md font-sans p-6 rounded-2xl">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">
                    Approve Password Reset
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Reset password for user: <strong>{selectedResetReq.userName || selectedResetReq.userEmail}</strong>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">New Temporary Password (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-generate password"
                  value={resetTempPassword}
                  onChange={e => setResetTempPassword(e.target.value)}
                  className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs font-mono focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  If left empty, a password will be automatically generated and sent to the user.
                </p>
              </div>
            </div>

            <DialogFooter className="border-t pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedResetReq(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={processingReset}
                onClick={() => handleResolvePasswordReset(selectedResetReq.id, "APPROVE")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {processingReset ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Approve &amp; Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}
