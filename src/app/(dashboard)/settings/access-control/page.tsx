"use client"

import { useState, useEffect } from "react"
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
  Sparkles
} from "lucide-react"
import { toast } from "sonner"

const modules = [
  { id: "CLIENTS", name: "Clients" },
  { id: "QUOTATIONS", name: "Quotations" },
  { id: "PRODUCTS", name: "Products" },
  { id: "BOQS", name: "BOQs" },
  { id: "REPORTS", name: "Reports" },
  { id: "USER_MANAGEMENT", name: "Users" },
  { id: "DASHBOARD", name: "Dashboard" },
  { id: "PURCHASE_ORDERS", name: "Purchase Orders" },
  { id: "SETTINGS", name: "Settings" },
  { id: "PRICING_MARKUP", name: "Pricing Markup" },
  { id: "ACCESS_CONTROL", name: "Access Control" },
  { id: "NOTIFICATIONS", name: "Notifications" },
  { id: "SHAREPOINT", name: "SharePoint Files" },
  { id: "SYSTEM_CONFIGURATION", name: "System Configuration" },
]

const primaryActions = [
  { id: "view", label: "View" },
  { id: "create", label: "Create" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
  { id: "approve", label: "Approve" },
  { id: "export", label: "Export" },
  { id: "uploadFiles", label: "Bulk Upload" },
  { id: "manage", label: "Manage / Category Mgmt" },
  { id: "share", label: "Share / Add to Quote" },
  { id: "canApplySpecialDiscount", label: "Special Discount" },
  { id: "canExportBoqExcel", label: "Export Admin Costing Excel" },
  { id: "costPriceVisible", label: "View Costing & BOQ Details" },
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

  const [activeTab, setActiveTab] = useState<"dashboard" | "roles" | "users" | "requests" | "logs">("dashboard")
  const [loading, setLoading] = useState(true)
  
  // Dynamic statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingRequests: 0,
    suspendedUsers: 0,
    totalRoles: 0
  })
  
  // Data lists
  const [roles, setRoles] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [clientAccessRequests, setClientAccessRequests] = useState<any[]>([])
  const [recentlyAddedUsers, setRecentlyAddedUsers] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  
  // Approval settings
  const [approvalSettings, setApprovalSettings] = useState<Record<string, boolean>>({})
  const [workstationConfiguratorEnabled, setWorkstationConfiguratorEnabled] = useState<boolean>(false)

  // Selection states
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [selectedUserId, setSelectedUserId] = useState<string>("")

  // Edit states
  const [editingPermissions, setEditingPermissions] = useState<Record<string, any>>({})
  const [newRoleModal, setNewRoleModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleDesc, setNewRoleDesc] = useState("")
  const [baseRoleId, setBaseRoleId] = useState("")

  const [editRoleModal, setEditRoleModal] = useState(false)
  const [editRoleName, setEditRoleName] = useState("")
  const [editRoleDesc, setEditRoleDesc] = useState("")

  // User Profile Edit states
  const [editingUserProfile, setEditingUserProfile] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
    employeeId: "",
    status: "Active",
    password: "",
    clientAssignments: [] as string[]
  })

  // Add User State
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserPhone, setNewUserPhone] = useState("")
  const [newUserDepartment, setNewUserDepartment] = useState("")
  const [newUserRole, setNewUserRole] = useState("")
  const [addingUser, setAddingUser] = useState(false)

  // Transfer client state
  const [transferModal, setTransferModal] = useState({
    isOpen: false,
    clientId: "",
    clientName: "",
    fromUserId: "",
    toUserId: ""
  })

  // Access request process states
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    requestId: "",
    clientName: "",
    userName: "",
    reason: ""
  })

  const [reassignModal, setReassignModal] = useState({
    isOpen: false,
    requestId: "",
    clientName: "",
    userName: "",
    newOwnerId: ""
  })

  // Search filter states
  const [userSearchTerm, setUserSearchTerm] = useState("")
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [logFilterTerm, setLogFilterTerm] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/access-control")
      if (res.ok) {
        const data = await res.json()
        
        let filteredRoles = data.roles || []
        let filteredUsers = data.users || []
        
        if (currentUserRole !== "SUPER_ADMIN") {
          filteredRoles = filteredRoles.filter((r: any) => r.name !== "SUPER_ADMIN")
          filteredUsers = filteredUsers.filter((u: any) => u.role !== "SUPER_ADMIN")
        }

        setRoles(filteredRoles)
        setUsers(filteredUsers)
        setClients(data.clients || [])
        setClientAccessRequests(data.clientAccessRequests || [])
        setRecentlyAddedUsers(data.recentlyAddedUsers || [])
        setLogs(data.logs || [])
        
        if (data.stats) {
          setStats(data.stats)
        }

        // Map system settings to local approvals state
        const approvalsMap: Record<string, boolean> = {
          client_creation: false,
          client_access: false,
          product_creation: false,
          product_bulk_upload: false,
          quotation: false,
          revision: false
        }
        data.systemSettings?.forEach((setting: any) => {
          const suffix = setting.key.replace("approval_control_", "")
          approvalsMap[suffix] = setting.value === "true"
        })
        setApprovalSettings(approvalsMap)

        const cfgSetting = data.systemSettings?.find((s: any) => s.key === "enable_workstation_configurator")
        setWorkstationConfiguratorEnabled(cfgSetting?.value === "true")

        // Default selections
        if (filteredRoles.length > 0 && !selectedRoleId) {
          setSelectedRoleId(filteredRoles[0].id)
          loadRolePermissions(filteredRoles[0].permissions)
        }
        if (filteredUsers.length > 0 && !selectedUserId) {
          setSelectedUserId(filteredUsers[0].id)
          loadUserProfile(filteredUsers[0])
        }
      } else {
        toast.error("Failed to load access control configurations")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error fetching access control data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const loadRolePermissions = (permissions: any[]) => {
    const matrix: Record<string, any> = {}
    modules.forEach(m => {
      const perm = permissions?.find((p: any) => p.module === m.id)
      matrix[m.id] = {
        view: perm?.view ?? false,
        create: perm?.create ?? false,
        edit: perm?.edit ?? false,
        delete: perm?.delete ?? false,
        approve: perm?.approve ?? false,
        export: perm?.export ?? false,
        uploadFiles: perm?.uploadFiles ?? false,
        manage: perm?.manage ?? false,
        share: perm?.share ?? false,
      }
    })
    setEditingPermissions(matrix)
  }

  const loadUserProfile = (user: any) => {
    if (!user) return
    const clientIds = user.clientAssignments ? user.clientAssignments.filter((ca: any) => !ca.isPrimary).map((ca: any) => ca.clientId) : []
    
    setEditingUserProfile({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      department: user.department || "",
      employeeId: user.employeeId || "",
      status: user.status || "Active",
      password: "",
      clientAssignments: clientIds
    })
  }

  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId)
    const role = roles.find(r => r.id === roleId)
    if (role) {
      loadRolePermissions(role.permissions)
    }
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    const user = users.find(u => u.id === userId)
    if (user) {
      loadUserProfile(user)
    }
  }

  const handleRolePermChange = (moduleId: string, actionId: string, value: boolean) => {
    setEditingPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [actionId]: value
      }
    }))
  }

  const saveRolePermissions = async () => {
    const selectedRole = roles.find(r => r.id === selectedRoleId)
    if (!selectedRole) return

    if (selectedRole.name === "SUPER_ADMIN") {
      toast.error("Super Admin permissions cannot be modified")
      return
    }

    setLoading(true)
    try {
      const payload = Object.entries(editingPermissions).map(([module, perms]) => ({
        module,
        ...perms
      }))

      const res = await fetch("/api/settings/access-control", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update_role",
          roleId: selectedRoleId,
          permissions: payload
        })
      })

      if (res.ok) {
        toast.success("Role permissions updated successfully")
        window.dispatchEvent(new CustomEvent("visibility-refresh"))
        fetchData()
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to update role permissions")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error saving workflow configuration")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleWorkstationConfigurator = async (newValue: boolean) => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enable_workstation_configurator: String(newValue)
        })
      })

      if (res.ok) {
        setWorkstationConfiguratorEnabled(newValue)
        toast.success(
          newValue
            ? "Workstation Product Configurator is now ENABLED for all users!"
            : "Workstation Product Configurator is now HIDDEN for non-Super Admins."
        )
        fetchData()
      } else {
        toast.error("Failed to update feature setting")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error updating system feature setting")
    } finally {
      setLoading(false)
    }
  }

  // Handle adding new user profile
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserRole) {
      toast.error("Please select a system role")
      return
    }
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserPhone) {
      toast.error("Name, email, password, and contact number are required")
      return
    }
    setAddingUser(true)
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          phone: newUserPhone,
          department: newUserDepartment
        })
      })

      if (res.ok) {
        toast.success(`User ${newUserName} added successfully!`)
        setShowAddUserModal(false)
        setNewUserName("")
        setNewUserEmail("")
        setNewUserPassword("")
        setNewUserPhone("")
        setNewUserDepartment("")
        fetchData()
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to create user account")
      }
    } catch (err) {
      console.error(err)
      toast.error("Connection failed")
    } finally {
      setAddingUser(false)
    }
  }

  // Update user profile info & client assignments
  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetUser = users.find(u => u.id === selectedUserId)
    if (!targetUser) return

    setLoading(true)
    try {
      const res = await fetch("/api/settings/access-control", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update_user_profile",
          targetUserId: selectedUserId,
          name: editingUserProfile.name,
          email: editingUserProfile.email,
          role: editingUserProfile.role,
          department: editingUserProfile.department,
          employeeId: editingUserProfile.employeeId,
          status: editingUserProfile.status,
          password: editingUserProfile.password || undefined,
          clientAssignments: editingUserProfile.clientAssignments
        })
      })

      if (res.ok) {
        toast.success(
          editingUserProfile.password && editingUserProfile.password.trim() !== ""
            ? "User profile & password updated successfully!"
            : "User profile and assignments saved successfully"
        )
        setEditingUserProfile(prev => ({ ...prev, password: "" }))
        window.dispatchEvent(new CustomEvent("visibility-refresh"))
        fetchData()
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to update user profile")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error updating user details")
    } finally {
      setLoading(false)
    }
  }

  // Toggle global approval workflows
  const handleToggleApprovalSetting = async (key: string, currentValue: boolean) => {
    const updatedValue = !currentValue
    const settingKey = `approval_control_${key}`

    // Optimistic UI update
    setApprovalSettings(prev => ({
      ...prev,
      [key]: updatedValue
    }))

    try {
      const res = await fetch("/api/settings/access-control", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update_approval_settings",
          settings: {
            [settingKey]: String(updatedValue)
          }
        })
      })

      if (res.ok) {
        toast.success(`Workflow setting updated: ${key.replace("_", " ")} approval ${updatedValue ? "Enabled" : "Disabled"}`)
      } else {
        toast.error("Failed to update approval workflow setting")
        // Revert
        setApprovalSettings(prev => ({
          ...prev,
          [key]: currentValue
        }))
      }
    } catch (err) {
      console.error(err)
      toast.error("Error updating approval workflow setting")
      // Revert
      setApprovalSettings(prev => ({
        ...prev,
        [key]: currentValue
      }))
    }
  }

  // Assign client to user
  const handleAssignClient = (clientId: string) => {
    if (!clientId) return
    if (editingUserProfile.clientAssignments.includes(clientId)) {
      toast.warning("Client is already assigned to this user")
      return
    }

    setEditingUserProfile(prev => ({
      ...prev,
      clientAssignments: [...prev.clientAssignments, clientId]
    }))
    toast.success("Added client to user's pending assignments list (Click Save changes to commit)")
  }

  // Revoke client access instantly
  const handleRevokeClientAccess = async (clientId: string) => {
    if (!confirm("Are you sure you want to instantly revoke access to this client for the user?")) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/settings/access-control", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "remove_client_access",
          clientId,
          userId: selectedUserId
        })
      })

      if (res.ok) {
        toast.success("Client access revoked successfully")
        fetchData()
      } else {
        toast.error("Failed to revoke client access")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error revoking client access")
    } finally {
      setLoading(false)
    }
  }

  // Transfer client ownership from user profile
  const handleTransferClient = async () => {
    if (!transferModal.toUserId) {
      toast.error("Please select the target consultant to transfer ownership to")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/settings/access-control", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "transfer_client",
          clientId: transferModal.clientId,
          fromUserId: transferModal.fromUserId,
          toUserId: transferModal.toUserId
        })
      })

      if (res.ok) {
        toast.success("Client ownership transferred successfully")
        setTransferModal(prev => ({ ...prev, isOpen: false }))
        fetchData()
      } else {
        toast.error("Failed to transfer client ownership")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error transferring client ownership")
    } finally {
      setLoading(false)
    }
  }

  // Access Requests processing
  const handleProcessAccessRequest = async (requestId: string, action: "Approve" | "Reject" | "Reassign", payload: any = {}) => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/access-control", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "process_access_request",
          requestId,
          action,
          ...payload
        })
      })

      if (res.ok) {
        toast.success(`Access request successfully ${action === "Approve" ? "Approved" : action === "Reject" ? "Rejected" : "Reassigned"}`)
        setRejectModal(prev => ({ ...prev, isOpen: false }))
        setReassignModal(prev => ({ ...prev, isOpen: false }))
        fetchData()
      } else {
        toast.error("Failed to process access request")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error processing access request")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = async () => {
    if (!newRoleName) {
      toast.error("Role name is required")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/settings/access-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_role",
          roleName: newRoleName,
          description: newRoleDesc,
          baseRoleId
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Role created successfully")
        setNewRoleModal(false)
        setNewRoleName("")
        setNewRoleDesc("")
        setBaseRoleId("")
        fetchData()
        if (data.role?.id) {
          setSelectedRoleId(data.role.id)
          loadRolePermissions(data.role.permissions || [])
        }
      } else {
        toast.error(data.error || "Failed to create role")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error creating role")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRoleDetails = async () => {
    if (!editRoleName) {
      toast.error("Role name is required")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/settings/access-control", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update_role_details",
          roleId: selectedRoleId,
          roleName: editRoleName,
          description: editRoleDesc
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Role details updated")
        setEditRoleModal(false)
        fetchData()
      } else {
        toast.error(data.error || "Failed to update role")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error updating role details")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRole = async (id: string) => {
    if (!confirm("Are you sure you want to delete this custom role? Users assigned to this role will lose their permissions. This action cannot be undone.")) {
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/settings/access-control?roleId=${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        toast.success("Role deleted successfully")
        setSelectedRoleId("")
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete role")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error deleting role")
    } finally {
      setLoading(false)
    }
  }

  // Filtered lists
  const filteredUsersList = users.filter(u => {
    const search = userSearchTerm.toLowerCase()
    return (
      (u.name && u.name.toLowerCase().includes(search)) ||
      u.email.toLowerCase().includes(search) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(search)) ||
      u.role.toLowerCase().includes(search)
    )
  })

  const filteredClientsForAssign = clients.filter(c => {
    const search = clientSearchTerm.toLowerCase()
    return (
      c.companyName.toLowerCase().includes(search) ||
      c.clientId.toLowerCase().includes(search)
    )
  })

  const filteredLogs = logs.filter(l => {
    const search = logFilterTerm.toLowerCase()
    return (
      l.action.toLowerCase().includes(search) ||
      l.details.toLowerCase().includes(search) ||
      (l.user?.name && l.user.name.toLowerCase().includes(search)) ||
      (l.user?.email && l.user.email.toLowerCase().includes(search)) ||
      (l.targetUser?.name && l.targetUser.name.toLowerCase().includes(search))
    )
  })

  const selectedRole = roles.find(r => r.id === selectedRoleId)
  const selectedUser = users.find(u => u.id === selectedUserId)

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent">
            Super Admin Access Control Panel
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Redesigned centralized dashboard for user roles, granular module permissions, approvals configuration, client assignments, and audit compliance logs.
          </p>
        </div>
      </div>

      {/* Overview Cards (Static stats loaded from API) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:scale-[1.01] transition-all flex items-center space-x-3.5">
          <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            <Users size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total Users</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">{stats.totalUsers}</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:scale-[1.01] transition-all flex items-center space-x-3.5">
          <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400">
            <UserCheck size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Active Users</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">{stats.activeUsers}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:scale-[1.01] transition-all flex items-center space-x-3.5">
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 relative">
            <Clock size={20} />
            {stats.pendingRequests > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Pending Access</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">{stats.pendingRequests}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:scale-[1.01] transition-all flex items-center space-x-3.5">
          <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
            <Ban size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Suspended</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">{stats.suspendedUsers}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:scale-[1.01] transition-all flex items-center space-x-3.5">
          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400">
            <Shield size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total Roles</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">{stats.totalRoles}</div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "dashboard"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <Settings size={16} />
          Overview Dashboard
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "roles"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <Shield size={16} />
          Role Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "users"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <User size={16} />
          User &amp; Client Access Console
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === "requests"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <Clock size={16} />
          Access Requests
          {stats.pendingRequests > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-white font-bold">
              {stats.pendingRequests}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "logs"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <History size={16} />
          Compliance Logs
        </button>
      </div>

      {loading && (
        <div className="py-20 text-center text-zinc-400 text-sm animate-pulse flex flex-col items-center justify-center space-y-2">
          <Clock size={24} className="animate-spin text-amber-500" />
          <span>Synchronizing access control data, please wait...</span>
        </div>
      )}

      {/* Tab 1: Dashboard Overview */}
      {!loading && activeTab === "dashboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Approval Controls ON/OFF */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Workflow Approval Controls</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Toggle which core ERP transactions require strict Admin/Super Admin approval before final processing.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "client_creation", label: "Client Creation Approval", desc: "Requires admin confirmation when a consultant adds a new client." },
                { key: "client_access", label: "Client Access Approval", desc: "Requires admin review when a consultant requests client records transfer." },
                { key: "product_creation", label: "Product Creation Approval", desc: "Requires authorization when new items are added to catalog." },
                { key: "product_bulk_upload", label: "Product Bulk Upload Approval", desc: "Requires verification when products are imported via CSV files." },
                { key: "quotation", label: "Quotation Approval", desc: "Requires manager signature for quotes above default margin thresholds." },
                { key: "revision", label: "Revision Confirmation Approval", desc: "Requires authorization when quotations are revised with custom items." },
              ].map((setting) => (
                <div key={setting.key} className="flex items-start justify-between p-3.5 border dark:border-zinc-800 rounded-xl hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-all">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="block text-xs font-bold text-zinc-900 dark:text-zinc-200">{setting.label}</span>
                    <span className="block text-[10px] text-zinc-400 leading-normal">{setting.desc}</span>
                  </div>
                  <button
                    onClick={() => handleToggleApprovalSetting(setting.key, approvalSettings[setting.key] || false)}
                    className={`h-5 w-9 rounded-full transition-all shrink-0 relative ${
                      approvalSettings[setting.key]
                        ? "bg-amber-500"
                        : "bg-zinc-200 dark:bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 bg-white h-4 w-4 rounded-full transition-all ${
                        approvalSettings[setting.key]
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* System Feature Controls (Super Admin Only) */}
            <div className="pt-4 border-t dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  System Feature Toggles (Super Admin)
                </h3>
              </div>

              <div className="p-3.5 border dark:border-zinc-800 rounded-xl hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-all flex items-start justify-between gap-4">
                <div className="space-y-1 max-w-[80%]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">
                      Workstation Product Configurator
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        workstationConfiguratorEnabled
                          ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                      }`}
                    >
                      {workstationConfiguratorEnabled ? "Enabled (All Users)" : "Disabled (Super Admin Only)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Allows sales executives and consultants to configure workstation products by attributes (Model, Leg Type, Table Top Finish, Dimensions). When disabled, this feature is hidden from non-Super Admin users.
                  </p>
                </div>

                <button
                  onClick={() => handleToggleWorkstationConfigurator(!workstationConfiguratorEnabled)}
                  disabled={currentUserRole !== "SUPER_ADMIN"}
                  className={`h-5 w-9 rounded-full transition-all shrink-0 relative mt-1 ${
                    workstationConfiguratorEnabled
                      ? "bg-amber-500"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  } ${currentUserRole !== "SUPER_ADMIN" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  title={currentUserRole !== "SUPER_ADMIN" ? "Super Admin permission required" : "Toggle feature"}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 bg-white h-4 w-4 rounded-full transition-all ${
                      workstationConfiguratorEnabled
                        ? "translate-x-4"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Recently Added Users & Quick Actions */}
          <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider border-b pb-2.5">Recently Added Users</h3>
            <div className="divide-y dark:divide-zinc-800">
              {recentlyAddedUsers.map((user) => (
                <div key={user.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="block font-semibold text-zinc-800 dark:text-zinc-200 truncate">{user.name || user.email}</span>
                    <span className="block text-[10px] text-zinc-400 truncate mt-0.5">{getRoleDisplayName(user.role)} | {user.department || "No Dept"}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    user.status === "Active" ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400" :
                    user.status === "Suspended" ? "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400" :
                    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                    {user.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Role Permissions Matrix */}
      {!loading && activeTab === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Roles Side Panel */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Roles List</h3>
              <button
                onClick={() => setNewRoleModal(true)}
                className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
              >
                <Plus size={10} /> Add Custom
              </button>
            </div>
            
            <div className="space-y-1.5">
              {roles.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleRoleSelect(r.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-sm font-medium transition-all cursor-pointer border ${
                    selectedRoleId === r.id
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                      : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-300"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-xs">{r.name}</span>
                    <span className="block text-[10px] text-zinc-400 truncate mt-0.5">{r.description || "No description"}</span>
                  </div>
                  {r.isSystem && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border font-semibold shrink-0">
                      System
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Permissions Matrix display */}
          <div className="lg:col-span-3 space-y-4">
            {selectedRole && (
              <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-5">
                
                {/* Header detail */}
                <div className="flex items-center justify-between gap-4 border-b dark:border-zinc-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{selectedRole.name} Permissions Matrix</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">{selectedRole.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditRoleName(selectedRole.name)
                        setEditRoleDesc(selectedRole.description || "")
                        setEditRoleModal(true)
                      }}
                      disabled={selectedRole.name === "SUPER_ADMIN"}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 text-zinc-600 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Settings size={12} />
                      Edit Details
                    </button>
                    {!selectedRole.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(selectedRole.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 dark:border-red-950/20 dark:hover:bg-red-950/40"
                      >
                        <Trash2 size={12} />
                        Delete Role
                      </button>
                    )}
                    <button
                      onClick={saveRolePermissions}
                      disabled={selectedRole.name === "SUPER_ADMIN"}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white px-4 py-1.5 text-xs font-bold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <Save size={12} />
                      Save Permissions Matrix
                    </button>
                  </div>
                </div>

                {selectedRole.name === "SUPER_ADMIN" && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-800 dark:text-amber-400 text-xs flex items-start gap-2">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <strong>Super Admin Bypass Rule Enabled:</strong> The SUPER_ADMIN role bypasses all authorization matrix constraints and has hardcoded full system access. Editing Super Admin permissions is disabled.
                    </div>
                  </div>
                )}

                {/* Grid matrix */}
                <div className="overflow-x-auto border dark:border-zinc-800 rounded-xl max-h-[500px]">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="p-3 border-r dark:border-zinc-800">Module</th>
                        {primaryActions.map(a => (
                          <th key={a.id} className="p-3 text-center min-w-[70px]">{a.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {modules.map((m) => {
                        const rowPerm = editingPermissions[m.id] || {}
                        return (
                          <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-all">
                            <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-200 border-r dark:border-zinc-800">{m.name}</td>
                            {primaryActions.map((a) => {
                              const isSpecialDiscount = a.id === "canApplySpecialDiscount";
                              const isExportBoqExcel = a.id === "canExportBoqExcel";
                              const isCostBreakdown = a.id === "costPriceVisible";
                              const shouldRender = (!isSpecialDiscount || m.id === "QUOTATIONS") && (!isExportBoqExcel || m.id === "BOQS") && (!isCostBreakdown || m.id === "QUOTATIONS" || m.id === "BOQS");
                              return (
                                <td key={a.id} className="p-3 text-center">
                                  {shouldRender && (
                                    <input
                                      type="checkbox"
                                      checked={rowPerm[a.id] ?? false}
                                      disabled={selectedRole.name === "SUPER_ADMIN"}
                                      onChange={(e) => handleRolePermChange(m.id, a.id, e.target.checked)}
                                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-amber-600 focus:ring-amber-500 dark:bg-zinc-800 cursor-pointer"
                                    />
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: User & Client Access Console */}
      {!loading && activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* User selection panel */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">User Accounts</h3>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="inline-flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-700 text-white rounded px-2 py-1 text-[10px] font-bold"
              >
                <Plus size={10} /> Add
              </button>
            </div>
            <div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter users..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent pl-8 pr-3 py-2 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {filteredUsersList.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleUserSelect(u.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-sm font-medium transition-all cursor-pointer border ${
                    selectedUserId === u.id
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                      : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-300"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-xs">{u.name || u.email}</span>
                    <span className="block text-[10px] text-zinc-400 truncate mt-0.5">{getRoleDisplayName(u.role)}</span>
                  </div>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                    u.status === "Active" ? "bg-green-50 text-green-700 border border-green-200" :
                    u.status === "Suspended" ? "bg-red-50 text-red-700 border border-red-200" :
                    "bg-zinc-100 text-zinc-700 border border-zinc-200"
                  }`}>
                    {u.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* User profile & Client Assignments detail */}
          <div className="lg:col-span-3 space-y-4">
            {selectedUser && (
              <form onSubmit={handleSaveUserProfile} className="space-y-4">
                
                {/* Profile Editor */}
                <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-5">
                  <div className="flex items-center justify-between gap-4 border-b dark:border-zinc-800 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-white">User Information</h2>
                      <p className="text-xs text-zinc-400 mt-0.5">Manage permissions, status, employee IDs and assigned clients.</p>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={selectedUser.role === "SUPER_ADMIN" && currentUserRole !== "SUPER_ADMIN"}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white px-4 py-1.5 text-xs font-bold hover:bg-amber-700 disabled:opacity-40 transition-all shadow-sm"
                    >
                      <Save size={12} />
                      Save Changes
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={editingUserProfile.name}
                        onChange={(e) => setEditingUserProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={editingUserProfile.email}
                        onChange={(e) => setEditingUserProfile(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Employee ID</label>
                      <input
                        type="text"
                        placeholder="e.g. EMP-1002"
                        value={editingUserProfile.employeeId}
                        onChange={(e) => setEditingUserProfile(prev => ({ ...prev, employeeId: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">System Role</label>
                      <select
                        value={editingUserProfile.role}
                        onChange={(e) => setEditingUserProfile(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-850 dark:text-white"
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Department</label>
                      <select
                        value={editingUserProfile.department}
                        onChange={(e) => setEditingUserProfile(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-850 dark:text-white"
                      >
                        <option value="">No Department</option>
                        <option value="SALES">Sales</option>
                        <option value="DESIGN">Design</option>
                        <option value="ESTIMATION">Estimation</option>
                        <option value="ACCOUNTS">Accounts</option>
                        <option value="PRODUCTION">Production</option>
                        <option value="ADMIN">Administration</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Access Status</label>
                      <select
                        value={editingUserProfile.status}
                        onChange={(e) => setEditingUserProfile(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-850 dark:text-white"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Pending Approval">Pending Approval</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1 flex items-center justify-between">
                        <span>New Password (Reset)</span>
                        {currentUserRole !== "SUPER_ADMIN" && (
                          <span className="text-[10px] text-amber-500 font-normal">Super Admin Only</span>
                        )}
                      </label>
                      <input
                        type="password"
                        disabled={currentUserRole !== "SUPER_ADMIN"}
                        placeholder={currentUserRole === "SUPER_ADMIN" ? "Leave blank to keep current password" : "Only Super Admin can reset user passwords"}
                        value={editingUserProfile.password || ""}
                        onChange={(e) => setEditingUserProfile(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Client Assignment editor */}
                <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Client Access Control</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Assign, transfer, or remove client ownership instantly.</p>
                  </div>

                  {/* Add client input search */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Search Clients to Assign (Secondary Access)</label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search client catalog by company name or ID..."
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent pl-7 pr-3 py-2 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                        />
                      </div>
                      
                      {clientSearchTerm && (
                        <div className="absolute z-20 mt-1 max-h-40 overflow-y-auto w-[400px] border bg-white dark:bg-zinc-900 dark:border-zinc-800 rounded-lg shadow-lg text-xs divide-y dark:divide-zinc-800">
                          {filteredClientsForAssign.slice(0, 5).map(c => (
                            <div
                              key={c.id}
                              onClick={() => {
                                handleAssignClient(c.id)
                                setClientSearchTerm("")
                              }}
                              className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer flex justify-between items-center"
                            >
                              <span>{c.companyName} ({c.clientId})</span>
                              <span className="text-[10px] text-zinc-400">Add</span>
                            </div>
                          ))}
                          {filteredClientsForAssign.length === 0 && (
                            <div className="p-2 text-zinc-400 text-center">No clients match query.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assigned Clients table */}
                  <div className="overflow-x-auto border dark:border-zinc-800 rounded-xl">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold">
                        <tr>
                          <th className="p-3">Client ID</th>
                          <th className="p-3">Company Name</th>
                          <th className="p-3">Assignment Type</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {/* Primary Assignments */}
                        {clients.filter(c => c.salespersonId === selectedUserId).map(c => (
                          <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                            <td className="p-3 font-semibold text-zinc-950 dark:text-zinc-100">{c.clientId}</td>
                            <td className="p-3 font-semibold text-zinc-950 dark:text-zinc-100">{c.companyName}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30">
                                Primary Owner
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setTransferModal({
                                  isOpen: true,
                                  clientId: c.id,
                                  clientName: c.companyName,
                                  fromUserId: selectedUserId,
                                  toUserId: ""
                                })}
                                className="inline-flex items-center gap-1 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded"
                              >
                                <ArrowLeftRight size={10} /> Transfer
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeClientAccess(c.id)}
                                className="inline-flex items-center gap-1 border border-red-200 hover:bg-red-50 text-[10px] font-semibold text-red-600 px-2.5 py-1 rounded dark:border-red-950/30 dark:hover:bg-red-950/20"
                              >
                                <Ban size={10} /> Revoke
                              </button>
                            </td>
                          </tr>
                        ))}

                        {/* Secondary Assignments (Loaded from user's current selected assignments list) */}
                        {editingUserProfile.clientAssignments.map(clientId => {
                          const client = clients.find(c => c.id === clientId)
                          if (!client) return null
                          return (
                            <tr key={clientId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                              <td className="p-3 text-zinc-700 dark:text-zinc-300">{client.clientId}</td>
                              <td className="p-3 text-zinc-700 dark:text-zinc-300">{client.companyName}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                  Secondary Access
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    // If saved in DB, request direct API delete. Otherwise, remove from local state list
                                    const savedAssignment = selectedUser.clientAssignments?.find((ca: any) => ca.clientId === clientId)
                                    if (savedAssignment) {
                                      handleRevokeClientAccess(clientId)
                                    } else {
                                      setEditingUserProfile(prev => ({
                                        ...prev,
                                        clientAssignments: prev.clientAssignments.filter(id => id !== clientId)
                                      }))
                                      toast.info("Removed client from unsaved secondary access list")
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 border border-red-200 hover:bg-red-50 text-[10px] font-semibold text-red-600 px-2.5 py-1 rounded dark:border-red-950/30 dark:hover:bg-red-950/20"
                                >
                                  <Ban size={10} /> Revoke
                                </button>
                              </td>
                            </tr>
                          )
                        })}

                        {clients.filter(c => c.salespersonId === selectedUserId).length === 0 &&
                         editingUserProfile.clientAssignments.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-zinc-400">No client assignments map to this user.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Access Requests Queue */}
      {!loading && activeTab === "requests" && (
        <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Client Access Request Queue</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Approve, reject, or reassign requests submitted by Interior design consultants requesting access to other owners&apos; clients.</p>
          </div>

          <div className="overflow-x-auto border dark:border-zinc-800 rounded-xl">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold">
                <tr>
                  <th className="p-3">Requesting User</th>
                  <th className="p-3">Current Owner</th>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Submitted Date</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-650 dark:text-zinc-450">
                {clientAccessRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-zinc-400">
                      No client access requests are in the queue.
                    </td>
                  </tr>
                ) : (
                  clientAccessRequests.map((req) => {
                    const owner = users.find(u => u.id === req.client.salespersonId)
                    return (
                      <tr key={req.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                        <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                          {req.user?.name || req.userName || req.user?.email || "Unknown"}
                        </td>
                        <td className="p-3">
                          {owner ? (
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{owner.name || owner.email}</span>
                          ) : (
                            <span className="text-zinc-400">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                          {req.client.companyName} ({req.client.clientId})
                        </td>
                        <td className="p-3 whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 max-w-[200px] truncate" title={req.notes}>{req.notes || "-"}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            req.status === "Requested" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 animate-pulse" :
                            req.status === "Approved" ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400" :
                            "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          {req.status === "Requested" ? (
                            <>
                              <button
                                onClick={() => handleProcessAccessRequest(req.id, "Approve", { assignmentType: "secondary" })}
                                className="inline-flex items-center gap-0.5 rounded bg-green-600 text-white px-2 py-1 text-[10px] font-bold hover:bg-green-700"
                              >
                                <Check size={10} /> Approve
                              </button>
                              <button
                                onClick={() => setReassignModal({
                                  isOpen: true,
                                  requestId: req.id,
                                  clientName: req.client.companyName,
                                  userName: req.user?.name || req.userName || "Consultant",
                                  newOwnerId: ""
                                })}
                                className="inline-flex items-center gap-0.5 rounded bg-amber-600 text-white px-2 py-1 text-[10px] font-bold hover:bg-amber-700"
                              >
                                <ArrowLeftRight size={10} /> Reassign
                              </button>
                              <button
                                onClick={() => setRejectModal({
                                  isOpen: true,
                                  requestId: req.id,
                                  clientName: req.client.companyName,
                                  userName: req.user?.name || req.userName || "Consultant",
                                  reason: ""
                                })}
                                className="inline-flex items-center gap-0.5 rounded bg-red-650 text-white px-2 py-1 text-[10px] font-bold hover:bg-red-750"
                              >
                                <XCircle size={10} /> Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-zinc-400">Processed</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Logs */}
      {!loading && activeTab === "logs" && (
        <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Compliance &amp; Access Control Audit Logs</h2>
              <p className="text-xs text-zinc-400 mt-0.5">View compliance trails for actions performed by supervisors and system administrators.</p>
            </div>
            
            <div className="relative w-64 shrink-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search audit trail logs..."
                value={logFilterTerm}
                onChange={(e) => setLogFilterTerm(e.target.value)}
                className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent pl-8 pr-3 py-2 dark:bg-zinc-800 text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto border dark:border-zinc-800 rounded-xl max-h-[500px]">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold sticky top-0 z-10">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Operator</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-zinc-400">
                      No matching audit logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                      <td className="p-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-250">
                        {log.user?.name || log.user?.email || "System"}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border dark:border-zinc-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3">
                        {log.targetUser ? (
                          <span className="font-semibold text-zinc-900 dark:text-zinc-250">
                            {log.targetUser.name || log.targetUser.email}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Global/Role</span>
                        )}
                      </td>
                      <td className="p-3 max-w-sm truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Role Modal */}
      {newRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Create Custom Role</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Define a new custom role with standard permissions template.</p>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-500 font-semibold mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Coordinator"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-500 font-semibold mb-1">Description</label>
                <textarea
                  placeholder="e.g. Supports sales executives with coordination tasks."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-zinc-500 font-semibold mb-1">Copy Permissions From (Optional)</label>
                <select
                  value={baseRoleId}
                  onChange={(e) => setBaseRoleId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-850 dark:text-white"
                >
                  <option value="">None (Empty Slate)</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewRoleModal(false)}
                  className="px-4 py-2 font-semibold border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all"
                >
                  Create Custom Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {transferModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl max-w-sm w-full shadow-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <ArrowLeftRight size={16} className="text-amber-500" />
                Transfer Client Ownership
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1">
                Reassign the primary owner of client <strong>&quot;{transferModal.clientName}&quot;</strong> to a different consultant.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 font-semibold mb-1">Select New Owner</label>
                <select
                  value={transferModal.toUserId}
                  onChange={(e) => setTransferModal(prev => ({ ...prev, toUserId: e.target.value }))}
                  className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-850 dark:text-white"
                >
                  <option value="">-- Choose Consultant --</option>
                  {users.filter(u => u.id !== transferModal.fromUserId).map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setTransferModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-1.5 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferClient}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
                >
                  Transfer Ownership
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Access Request Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl max-w-sm w-full shadow-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-red-650 dark:text-red-400 flex items-center gap-1.5">
                <XCircle size={16} />
                Reject Access Request
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1">
                Provide a reason for rejecting the client access request from <strong>{rejectModal.userName}</strong> for client <strong>&quot;{rejectModal.clientName}&quot;</strong>.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 font-semibold mb-1">Rejection Reason</label>
                <textarea
                  required
                  placeholder="e.g. This client belongs to another region and should not be shared."
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setRejectModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-1.5 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleProcessAccessRequest(rejectModal.requestId, "Reject", { rejectionReason: rejectModal.reason })}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
                >
                  Reject Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Access Request Modal */}
      {reassignModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl max-w-sm w-full shadow-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-amber-500 flex items-center gap-1.5">
                <ArrowLeftRight size={16} />
                Reassign Client &amp; Approve Request
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1">
                Reassign client <strong>&quot;{reassignModal.clientName}&quot;</strong> to a different primary consultant, while granting secondary access to the requesting user <strong>{reassignModal.userName}</strong>.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 font-semibold mb-1">Select New Primary Owner</label>
                <select
                  value={reassignModal.newOwnerId}
                  onChange={(e) => setReassignModal(prev => ({ ...prev, newOwnerId: e.target.value }))}
                  className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-850 dark:text-white"
                >
                  <option value="">-- Choose Consultant --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setReassignModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-1.5 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleProcessAccessRequest(reassignModal.requestId, "Reassign", { newOwnerId: reassignModal.newOwnerId })}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
                >
                  Reassign &amp; Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {newRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl max-w-md w-full shadow-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Plus size={16} className="text-amber-500" />
                Create Custom Role
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1">
                Define a new role and optionally clone base permissions from an existing role.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 font-semibold mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Junior Estimator"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-500 font-semibold mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Describe the role's responsibilities"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-zinc-500 font-semibold mb-1">Clone Base Permissions</label>
                <select
                  value={baseRoleId}
                  onChange={(e) => setBaseRoleId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                >
                  <option value="">-- None (Start Blank) --</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setNewRoleModal(false)}
                  className="px-3.5 py-1.5 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
                >
                  Create Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl max-w-md w-full shadow-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Settings size={16} className="text-amber-500" />
                Edit Role Details
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1">
                Update the name and description of this role.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 font-semibold mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Estimator"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  disabled={selectedRole?.isSystem}
                  className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-50"
                />
                {selectedRole?.isSystem && (
                  <p className="text-[10px] text-red-500 mt-1">System role names cannot be changed.</p>
                )}
              </div>

              <div>
                <label className="block text-zinc-500 font-semibold mb-1">Description</label>
                <textarea
                  placeholder="Describe the role's responsibilities"
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditRoleModal(false)}
                  className="px-3.5 py-1.5 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRoleDetails}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-250">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-zinc-900 dark:text-white shadow-2xl rounded-xl overflow-hidden">
            <div className="border-b dark:border-zinc-800 p-4">
              <h3 className="text-lg font-bold">Add User Account</h3>
              <p className="text-xs text-zinc-500">Create new credentials to access BOSQ ERP.</p>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="newName" className="text-xs font-semibold text-zinc-500">Full Name</label>
                  <input 
                    id="newName"
                    placeholder="e.g. Alice Smith"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newEmail" className="text-xs font-semibold text-zinc-500">Corporate Email</label>
                  <input 
                    id="newEmail"
                    type="email"
                    placeholder="e.g. alice@bosq.ae"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newPass" className="text-xs font-semibold text-zinc-500">Initial Password</label>
                  <input 
                    id="newPass"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newPhone" className="text-xs font-semibold text-zinc-500">Contact Number</label>
                  <input 
                    id="newPhone"
                    type="tel"
                    placeholder="+971 XXXXXXXX"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newDepartment" className="text-xs font-semibold text-zinc-500">Department (Optional)</label>
                  <input 
                    id="newDepartment"
                    type="text"
                    placeholder="e.g. Sales"
                    value={newUserDepartment}
                    onChange={(e) => setNewUserDepartment(e.target.value)}
                    className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newRole" className="text-xs font-semibold text-zinc-500">System Role</label>
                  <select 
                    id="newRole"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    required
                  >
                    <option value="" disabled>-- Select System Role --</option>
                    {roles.map((r: any) => {
                      return (
                        <option key={r.id} value={r.name}>
                          {getRoleDisplayName(r.name)}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
              <div className="p-4 border-t dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-900/50">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-3.5 py-1.5 border rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Cancel
                </button>
                <button type="submit" className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-2 text-xs font-semibold" disabled={addingUser}>
                  {addingUser ? "Adding..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
