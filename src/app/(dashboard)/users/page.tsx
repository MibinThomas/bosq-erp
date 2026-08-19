"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  ShieldCheck, 
  ShieldAlert, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Lock, 
  Key, 
  Eye, 
  Loader2, 
  Plus, 
  Sparkles, 
  Activity, 
  FileText, 
  Calculator, 
  UserCheck, 
  Shield, 
  RefreshCw,
  Check,
  AlertCircle,
  Copy,
  FolderGit2
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  department: string | null
  designation: string | null
  employeeId: string | null
  status: string
  isActive: boolean
  image: string | null
  signature: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    boqs: number
    quotations: number
    clientAssignments: number
    activities: number
  }
}

interface UserDetailRecord extends UserRecord {
  permissionOverrides?: any[]
  activities?: Array<{
    id: string
    action: string
    entityType: string
    entityId: string | null
    details: string | null
    createdAt: string
  }>
}

const SYSTEM_ROLES = [
  { value: "SUPER_ADMIN", label: "Super Administrator", category: "Governance", desc: "Full CRUD access over users, security, system settings, and approvals." },
  { value: "ADMIN", label: "Administrator", category: "Governance", desc: "Full operational access across clients, BOQs, quotations, and reports." },
  { value: "SALES_MANAGER", label: "Sales Manager", category: "Management", desc: "Manages IDC sales consultants, quote approvals, and client allocations." },
  { value: "SALES_EXECUTIVE", label: "Interior Design Consultant (IDC)", category: "Sales", desc: "Creates BOQs, builds quotations, manages client portfolio." },
  { value: "ESTIMATOR", label: "Cost Estimator", category: "Costing", desc: "Prepares raw material, labor, transport, and overhead cost breakdowns." },
  { value: "ACCOUNTS", label: "Finance & Accounts", category: "Finance", desc: "Manages payment terms, invoices, and financial compliance." },
  { value: "PROCUREMENT", label: "Procurement", category: "Operations", desc: "Purchasing and raw materials sourcing." },
  { value: "PRODUCTION", label: "Production", category: "Operations", desc: "Factory manufacturing and custom item production." },
  { value: "VIEWER", label: "Viewer", category: "Read-Only", desc: "Read-only access to master data and reports." }
]

export default function UserManagementPage() {
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id
  const currentUserRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN"
  const isAdminOrSuper = isSuperAdmin || currentUserRole === "ADMIN"

  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE")
  const [includeDeleted, setIncludeDeleted] = useState(false)

  // Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetailRecord | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Form Fields State
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formRole, setFormRole] = useState("SALES_EXECUTIVE")
  const [formPhone, setFormPhone] = useState("")
  const [formDepartment, setFormDepartment] = useState("")
  const [formDesignation, setFormDesignation] = useState("")
  const [formEmployeeId, setFormEmployeeId] = useState("")
  const [formIsActive, setFormIsActive] = useState(true)
  const [submittingForm, setSubmittingForm] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [includeDeleted])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/settings/users?includeDeleted=${includeDeleted}`)
      if (!res.ok) throw new Error("Failed to load user records")
      const data = await res.json()
      setUsers(data)
    } catch (err: any) {
      toast.error(err.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const fetchUserDetail = async (userId: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/settings/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setUserDetail(data)
      }
    } catch (err) {
      console.error("Failed to load user details:", err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleOpenCreateModal = () => {
    setFormName("")
    setFormEmail("")
    setFormPassword(generateRandomPassword())
    setFormRole("SALES_EXECUTIVE")
    setFormPhone("")
    setFormDepartment("Sales")
    setFormDesignation("Interior Design Consultant")
    setFormEmployeeId(`EMP-${Math.floor(100 + Math.random() * 900)}`)
    setFormIsActive(true)
    setIsCreateModalOpen(true)
  }

  const handleOpenEditModal = (user: UserRecord) => {
    setSelectedUser(user)
    setFormName(user.name || "")
    setFormEmail(user.email || "")
    setFormPassword("")
    setFormRole(user.role || "SALES_EXECUTIVE")
    setFormPhone(user.phone || "")
    setFormDepartment(user.department || "")
    setFormDesignation(user.designation || "")
    setFormEmployeeId(user.employeeId || "")
    setFormIsActive(user.isActive)
    setIsEditModalOpen(true)
  }

  const handleOpenDetailDrawer = (user: UserRecord) => {
    setSelectedUser(user)
    setIsDetailDrawerOpen(true)
    fetchUserDetail(user.id)
  }

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$"
    let password = "BOSQ@"
    for (let i = 0; i < 6; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName || !formEmail || !formPassword || !formRole || !formPhone) {
      toast.error("Please fill in all required fields (Name, Email, Password, Role, Phone).")
      return
    }

    setSubmittingForm(true)
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          phone: formPhone,
          department: formDepartment,
          designation: formDesignation,
          employeeId: formEmployeeId
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create user account")
      }

      toast.success(`User account for ${formName} created successfully!`)
      setIsCreateModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to create user")
    } finally {
      setSubmittingForm(false)
    }
  }

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setSubmittingForm(true)
    try {
      const res = await fetch(`/api/settings/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          role: formRole,
          phone: formPhone,
          department: formDepartment,
          designation: formDesignation,
          employeeId: formEmployeeId,
          isActive: formIsActive,
          password: formPassword.trim() ? formPassword : undefined
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update user account")
      }

      toast.success(`User account for ${formName} updated successfully!`)
      setIsEditModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to update user")
    } finally {
      setSubmittingForm(false)
    }
  }

  const handleToggleActiveStatus = async (user: UserRecord) => {
    try {
      const newStatus = !user.isActive
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || "",
          isActive: newStatus
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to toggle status")
      }

      toast.success(`Account status for ${user.name} set to ${newStatus ? 'Active' : 'Inactive'}`)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to change user active status")
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    setSubmittingForm(true)
    try {
      const res = await fetch(`/api/settings/users?id=${selectedUser.id}`, {
        method: "DELETE"
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete user account")
      }

      toast.success(`User account ${selectedUser.name} archived/soft-deleted successfully!`)
      setIsDeleteConfirmOpen(false)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user")
    } finally {
      setSubmittingForm(false)
    }
  }

  const handleRestoreUser = async (user: UserRecord) => {
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to restore user account")
      }

      toast.success(`User account ${user.name} restored successfully!`)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to restore user")
    }
  }

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search Match
      const searchStr = `${u.name} ${u.email} ${u.employeeId || ""} ${u.designation || ""} ${u.department || ""} ${u.role}`.toLowerCase()
      if (searchQuery.trim() && !searchStr.includes(searchQuery.toLowerCase().trim())) {
        return false
      }

      // Role Filter
      if (roleFilter !== "ALL") {
        if (roleFilter === "SALES_EXECUTIVE" && u.role !== "SALES_EXECUTIVE" && u.role !== "INTERIOR_DESIGN_CONSULTANT") return false
        if (roleFilter !== "SALES_EXECUTIVE" && u.role !== roleFilter) return false
      }

      // Status Filter
      if (statusFilter === "ACTIVE" && (!u.isActive || u.deletedAt)) return false
      if (statusFilter === "INACTIVE" && (u.isActive || u.deletedAt)) return false
      if (statusFilter === "DELETED" && !u.deletedAt) return false

      return true
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  // Statistics Summary
  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter(u => u.isActive && !u.deletedAt).length
    const idcCount = users.filter(u => (u.role === "SALES_EXECUTIVE" || u.role === "INTERIOR_DESIGN_CONSULTANT") && !u.deletedAt).length
    const estimatorsCount = users.filter(u => u.role === "ESTIMATOR" && !u.deletedAt).length
    const adminsCount = users.filter(u => (u.role === "SUPER_ADMIN" || u.role === "ADMIN") && !u.deletedAt).length

    return { total, active, idcCount, estimatorsCount, adminsCount }
  }, [users])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-semibold text-[11px] px-2 py-0.5"><ShieldAlert className="h-3 w-3 mr-1 text-purple-600" /> Super Admin</Badge>
      case "ADMIN":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-semibold text-[11px] px-2 py-0.5"><ShieldCheck className="h-3 w-3 mr-1 text-blue-600" /> Administrator</Badge>
      case "SALES_MANAGER":
      case "MANAGER":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-medium text-[11px] px-2 py-0.5"><Briefcase className="h-3 w-3 mr-1 text-amber-600" /> Manager</Badge>
      case "SALES_EXECUTIVE":
      case "INTERIOR_DESIGN_CONSULTANT":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-medium text-[11px] px-2 py-0.5"><UserCheck className="h-3 w-3 mr-1 text-emerald-600" /> IDC Consultant</Badge>
      case "ESTIMATOR":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 font-medium text-[11px] px-2 py-0.5"><Calculator className="h-3 w-3 mr-1 text-indigo-600" /> Cost Estimator</Badge>
      case "ACCOUNTS":
        return <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800 font-medium text-[11px] px-2 py-0.5">Accounts</Badge>
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px] px-2 py-0.5">{role}</Badge>
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-24 px-3 sm:px-6 lg:px-8">
      {/* 1. Header & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> User Management Workbench
            </h1>
            {isSuperAdmin && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs font-semibold py-0.5 px-2">
                Super Admin Access
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Centralized governance for user accounts, role allocations, permission overrides, and profile administration.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="text-xs h-9 font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {isAdminOrSuper && (
            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreateModal}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Create New User</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-2xs border-border/80 rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Users</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Registered accounts</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-border/80 rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Employees</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</h3>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">Enabled & authorized</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-border/80 rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">IDC Consultants</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.idcCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Sales & interior design</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-border/80 rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estimators & Admins</p>
              <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.estimatorsCount + stats.adminsCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stats.estimatorsCount} Estimators · {stats.adminsCount} Admins</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Calculator className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search & Filters Bar */}
      <Card className="shadow-2xs border-border/80 rounded-xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Filter className="h-3.5 w-3.5" /> Filter:
              </div>

              {/* Role Select */}
              <Select value={roleFilter} onValueChange={(val) => val && setRoleFilter(val)}>
                <SelectTrigger className="h-9 w-40 text-xs bg-background">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Roles</SelectItem>
                  <SelectItem value="SUPER_ADMIN" className="text-xs">Super Admin</SelectItem>
                  <SelectItem value="ADMIN" className="text-xs">Administrator</SelectItem>
                  <SelectItem value="SALES_MANAGER" className="text-xs">Manager</SelectItem>
                  <SelectItem value="SALES_EXECUTIVE" className="text-xs">IDC Consultant</SelectItem>
                  <SelectItem value="ESTIMATOR" className="text-xs">Cost Estimator</SelectItem>
                  <SelectItem value="ACCOUNTS" className="text-xs">Accounts</SelectItem>
                  <SelectItem value="VIEWER" className="text-xs">Viewer</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Select */}
              <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
                <SelectTrigger className="h-9 w-36 text-xs bg-background">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE" className="text-xs">Active Only</SelectItem>
                  <SelectItem value="INACTIVE" className="text-xs">Inactive Only</SelectItem>
                  {includeDeleted && <SelectItem value="DELETED" className="text-xs">Archived / Soft-Deleted</SelectItem>}
                </SelectContent>
              </Select>

              {/* Show Archived Toggle */}
              {isSuperAdmin && (
                <div className="flex items-center gap-2 pl-2 border-l border-border/80">
                  <Switch
                    id="show-deleted-toggle"
                    checked={includeDeleted}
                    onCheckedChange={setIncludeDeleted}
                  />
                  <label htmlFor="show-deleted-toggle" className="text-xs text-muted-foreground font-medium cursor-pointer">
                    Show Archived
                  </label>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Users Data Table */}
      <Card className="shadow-2xs border-border/80 rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 border-b py-3 px-4 sm:px-6 flex flex-row items-center justify-between">
          <CardTitle className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            User Accounts ({filteredUsers.length})
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Showing {filteredUsers.length} of {users.length} accounts</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading employee accounts...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h4 className="text-sm font-semibold text-foreground">No user accounts found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                No users match your current search query or filter criteria. Try clearing search filters or create a new user account.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/80 text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Employee User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Department & Designation</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Activity Stats</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map((user) => {
                    const isSoftDeleted = !!user.deletedAt
                    const isSelf = user.id === currentUserId

                    return (
                      <tr key={user.id} className={`hover:bg-muted/30 transition-colors ${isSoftDeleted ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/10' : ''}`}>
                        {/* User Identity Column */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                              {user.image ? (
                                <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                              ) : (
                                (user.name || "U").split(" ").map(n => n[0]).join("").toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground truncate">{user.name || "Unnamed User"}</span>
                                {isSelf && (
                                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] py-0 px-1 font-semibold">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate mt-0.5">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{user.email}</span>
                                {user.phone && (
                                  <>
                                    <span>·</span>
                                    <span>{user.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Column */}
                        <td className="py-3.5 px-4">
                          {getRoleBadge(user.role)}
                        </td>

                        {/* Department & Designation Column */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="font-medium text-foreground">{user.designation || "—"}</div>
                            <div className="text-[11px] text-muted-foreground">{user.department || "General"}</div>
                          </div>
                        </td>

                        {/* Employee ID */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] bg-muted/50 px-2 py-0.5 rounded border border-border/60">
                            {user.employeeId || "N/A"}
                          </span>
                        </td>

                        {/* Active Status Column */}
                        <td className="py-3.5 px-4">
                          {isSoftDeleted ? (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-[10px]">
                              Archived
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`user-status-${user.id}`}
                                checked={user.isActive}
                                disabled={!isAdminOrSuper || (user.role === "SUPER_ADMIN" && !isSuperAdmin)}
                                onCheckedChange={() => handleToggleActiveStatus(user)}
                              />
                              <span className={`text-[11px] font-medium ${user.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                {user.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Activity Stats */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                            <span title="BOQs Created"><Calculator className="h-3 w-3 inline mr-0.5 text-indigo-500" /> {user._count?.boqs || 0}</span>
                            <span title="Quotations Created"><FileText className="h-3 w-3 inline mr-0.5 text-blue-500" /> {user._count?.quotations || 0}</span>
                            <span title="Assigned Clients"><Building2 className="h-3 w-3 inline mr-0.5 text-emerald-500" /> {user._count?.clientAssignments || 0}</span>
                          </div>
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>

                        {/* Actions Dropdown Column */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDetailDrawer(user)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="View Full User Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {isSoftDeleted ? (
                              isSuperAdmin && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestoreUser(user)}
                                  className="h-8 text-[11px] border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 flex items-center gap-1 cursor-pointer"
                                >
                                  <RotateCcw className="h-3 w-3" /> Restore
                                </Button>
                              )
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                                <DropdownMenuContent align="end" className="w-48 text-xs">
                                  <DropdownMenuLabel>Account Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem onClick={() => handleOpenDetailDrawer(user)} className="cursor-pointer">
                                    <Eye className="h-3.5 w-3.5 mr-2 text-blue-500" />
                                    View Full Profile
                                  </DropdownMenuItem>

                                  {isAdminOrSuper && (
                                    <DropdownMenuItem onClick={() => handleOpenEditModal(user)} className="cursor-pointer">
                                      <Edit3 className="h-3.5 w-3.5 mr-2 text-amber-500" />
                                      Edit Information & Role
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem>
                                    <Link href={`/settings/access-control`} className="flex items-center w-full">
                                      <Shield className="h-3.5 w-3.5 mr-2 text-purple-500" />
                                      Access Rights Matrix
                                    </Link>
                                  </DropdownMenuItem>

                                  {isAdminOrSuper && !isSelf && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedUser(user)
                                          setIsDeleteConfirmOpen(true)
                                        }}
                                        className="text-destructive focus:bg-destructive/10 cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                        Archive / Soft Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. CREATE USER MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Create New Employee User Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new user record to the ERP system with role assignment and initial access password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUserSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Full Name <span className="text-destructive">*</span></label>
                <Input
                  placeholder="e.g., Sarah Al Mansoori"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Work Email <span className="text-destructive">*</span></label>
                <Input
                  type="email"
                  placeholder="e.g., sarah@bosq.ae"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>Initial Password <span className="text-destructive">*</span></span>
                  <button
                    type="button"
                    onClick={() => setFormPassword(generateRandomPassword())}
                    className="text-[11px] text-primary hover:underline font-normal flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Auto-Generate
                  </button>
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="h-9 text-xs font-mono pr-8"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(formPassword)
                      toast.success("Password copied to clipboard!")
                    }}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title="Copy Password"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Contact Phone <span className="text-destructive">*</span></label>
                <Input
                  placeholder="e.g., +971 50 123 4567"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Employee ID</label>
                <Input
                  placeholder="e.g., EMP-105"
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Department</label>
                <Input
                  placeholder="e.g., Sales / Commercial"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold">Designation</label>
                <Input
                  placeholder="e.g., Senior Interior Design Consultant"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold">System Role <span className="text-destructive">*</span></label>
                <Select value={formRole} onValueChange={(val) => val && setFormRole(val)}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Select system role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SYSTEM_ROLES.map((role) => (
                      <SelectItem
                        key={role.value}
                        value={role.value}
                        disabled={(role.value === "SUPER_ADMIN" || role.value === "ADMIN" || role.value === "SALES_MANAGER") && !isSuperAdmin}
                        className="text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold">{role.label} ({role.category})</span>
                          <span className="text-[10px] text-muted-foreground font-normal">{role.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingForm}
                className="text-xs h-9 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {submittingForm ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                Create User Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. EDIT USER MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-amber-500" />
              Edit User Account & Role Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify account info, reassign system roles, or reset access for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditUserSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Full Name <span className="text-destructive">*</span></label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Work Email <span className="text-destructive">*</span></label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Contact Phone</label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Employee ID</label>
                <Input
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Department</label>
                <Input
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Designation</label>
                <Input
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold">System Role <span className="text-destructive">*</span></label>
                <Select value={formRole} onValueChange={(val) => val && setFormRole(val)}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Select system role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SYSTEM_ROLES.map((role) => (
                      <SelectItem
                        key={role.value}
                        value={role.value}
                        disabled={(role.value === "SUPER_ADMIN" || role.value === "ADMIN" || role.value === "SALES_MANAGER") && !isSuperAdmin}
                        className="text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold">{role.label} ({role.category})</span>
                          <span className="text-[10px] text-muted-foreground font-normal">{role.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2 pt-2 border-t">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Reset Password (Optional)</span>
                  <button
                    type="button"
                    onClick={() => setFormPassword(generateRandomPassword())}
                    className="text-[11px] text-primary hover:underline font-normal cursor-pointer"
                  >
                    Auto-Generate
                  </button>
                </label>
                <Input
                  type="text"
                  placeholder="Leave blank to keep existing password unchanged"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-between sm:col-span-2 p-3 bg-muted/40 rounded-xl border">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">Account Active Status</span>
                  <p className="text-[11px] text-muted-foreground">Enabled users can sign in and perform authorized actions.</p>
                </div>
                <Switch
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingForm}
                className="text-xs h-9 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {submittingForm ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. USER PROFILE INSPECTOR DRAWER */}
      <Dialog open={isDetailDrawerOpen} onOpenChange={setIsDetailDrawerOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Employee Profile Inspector
              </span>
              {selectedUser && getRoleBadge(selectedUser.role)}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Complete profile metrics, activity feed, and permissions history for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Fetching profile details...</span>
            </div>
          ) : userDetail ? (
            <div className="space-y-6 py-2">
              {/* Profile Card Header */}
              <div className="p-4 bg-muted/30 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary font-bold text-xl flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                  {userDetail.image ? (
                    <img src={userDetail.image} alt={userDetail.name} className="h-full w-full object-cover" />
                  ) : (
                    (userDetail.name || "U").split(" ").map(n => n[0]).join("").toUpperCase()
                  )}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {userDetail.name}
                    <Badge variant={userDetail.isActive ? "default" : "destructive"} className="text-[10px] py-0 px-1.5">
                      {userDetail.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </h3>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-primary" /> {userDetail.email}</span>
                    {userDetail.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-emerald-500" /> {userDetail.phone}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 pt-1 font-mono">
                    <span>Emp ID: {userDetail.employeeId || "N/A"}</span>
                    <span>·</span>
                    <span>Dept: {userDetail.department || "General"}</span>
                    <span>·</span>
                    <span>Title: {userDetail.designation || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-card border rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Assigned Clients</span>
                  <span className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {userDetail._count?.clientAssignments || 0}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">BOQs Created</span>
                  <span className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {userDetail._count?.boqs || 0}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Quotations</span>
                  <span className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-1 block">
                    {userDetail._count?.quotations || 0}
                  </span>
                </div>
              </div>

              {/* Signature Preview */}
              {userDetail.signature && (
                <div className="p-3 bg-card border rounded-xl space-y-1.5">
                  <span className="text-xs font-semibold text-foreground block">Digital Authorization Signature</span>
                  <div className="h-16 w-full max-w-xs bg-white dark:bg-slate-900 border rounded-lg p-2 flex items-center justify-center">
                    <img src={userDetail.signature} alt="Signature" className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
              )}

              {/* Activity Audit History Feed */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-primary" />
                  Recent Activity Audit Logs ({userDetail.activities?.length || 0})
                </h4>

                {userDetail.activities && userDetail.activities.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {userDetail.activities.map((act) => (
                      <div key={act.id} className="p-2.5 bg-muted/40 border rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between font-medium">
                          <span className="font-semibold text-primary">{act.action}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {act.details && <p className="text-muted-foreground text-[11px]">{act.details}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2">No recent logged activities for this user account.</p>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDetailDrawerOpen(false)}
              className="text-xs h-9"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. DELETE / ARCHIVE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Archive / Soft Delete User Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to archive <strong>{selectedUser?.name}</strong> ({selectedUser?.email})?
              This will disable their account login while preserving historical BOQs and Quotations for audit compliance.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={submittingForm}
              onClick={handleDeleteUser}
              className="text-xs h-9 font-semibold"
            >
              {submittingForm ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
              Confirm Archive / Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
