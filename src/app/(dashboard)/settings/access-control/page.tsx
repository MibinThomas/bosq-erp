"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Shield, ShieldAlert, User, History, Check, Save, Copy, Trash2, Plus, AlertCircle, Info } from "lucide-react"
import { toast } from "sonner"

const modules = [
  { id: "DASHBOARD", name: "Dashboard" },
  { id: "CLIENTS", name: "Clients" },
  { id: "PRODUCTS", name: "Products" },
  { id: "QUOTATIONS", name: "Quotations" },
  { id: "BOQS", name: "BOQs" },
  { id: "PURCHASE_ORDERS", name: "Purchase Orders" },
  { id: "REPORTS", name: "Reports" },
  { id: "USER_MANAGEMENT", name: "User Management" },
  { id: "SETTINGS", name: "Settings" },
  { id: "PRICING_MARKUP", name: "Pricing Markup" },
  { id: "ACCESS_CONTROL", name: "Access Control" },
  { id: "NOTIFICATIONS", name: "Notifications" },
  { id: "SHAREPOINT", name: "SharePoint Files" },
  { id: "SYSTEM_CONFIGURATION", name: "System Configuration" },
]

const actions = [
  { id: "view", label: "View" },
  { id: "create", label: "Create" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
  { id: "approve", label: "Approve" },
  { id: "reject", label: "Reject" },
  { id: "export", label: "Export" },
  { id: "downloadPdf", label: "PDF" },
  { id: "uploadFiles", label: "Upload" },
  { id: "share", label: "Share" },
  { id: "manage", label: "Manage" },
  { id: "canConfirmQuotation", label: "Confirm Quote" },
]

const pricingVisibilities = [
  { id: "costPriceVisible", label: "Cost Price" },
  { id: "dealerPriceVisible", label: "Dealer Price" },
  { id: "marginVisible", label: "Margin" },
  { id: "profitVisible", label: "Profit" },
  { id: "markupVisible", label: "Markup" },
]

export default function AccessControlPage() {
  const { data: session } = useSession()
  const currentUserRole = (session?.user as any)?.role || ""
  const currentUserId = (session?.user as any)?.id || ""

  const [activeTab, setActiveTab] = useState<"roles" | "overrides" | "logs">("roles")
  const [loading, setLoading] = useState(true)
  
  // Data lists
  const [roles, setRoles] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])

  // Selection state
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [selectedUserId, setSelectedUserId] = useState<string>("")

  // Edit states
  const [editingPermissions, setEditingPermissions] = useState<Record<string, any>>({})
  const [editingOverrides, setEditingOverrides] = useState<any[]>([])
  
  // New role modal
  const [showNewRoleModal, setShowNewRoleModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleDesc, setNewRoleDesc] = useState("")
  const [baseRoleId, setBaseRoleId] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/access-control")
      if (res.ok) {
        const data = await res.json()
        
        // Filter out Super Admin if current user is only Admin
        let filteredRoles = data.roles || []
        let filteredUsers = data.users || []
        
        if (currentUserRole !== "SUPER_ADMIN") {
          filteredRoles = filteredRoles.filter((r: any) => r.name !== "SUPER_ADMIN")
          filteredUsers = filteredUsers.filter((u: any) => u.role !== "SUPER_ADMIN")
        }

        setRoles(filteredRoles)
        setUsers(filteredUsers)
        setLogs(data.logs || [])

        // Set default selection
        if (filteredRoles.length > 0 && !selectedRoleId) {
          setSelectedRoleId(filteredRoles[0].id)
          loadRolePermissions(filteredRoles[0], filteredRoles[0].permissions)
        }
        if (filteredUsers.length > 0 && !selectedUserId) {
          setSelectedUserId(filteredUsers[0].id)
          loadUserOverrides(filteredUsers[0].permissionOverrides)
        }
      } else {
        toast.error("Failed to load access control configuration data")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while fetching configurations")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchData()
    }
  }, [session])

  const loadRolePermissions = (role: any, permissions: any[]) => {
    const matrix: Record<string, any> = {}
    modules.forEach(m => {
      const perm = permissions?.find((p: any) => p.module === m.id)
      matrix[m.id] = {
        view: perm?.view ?? false,
        create: perm?.create ?? false,
        edit: perm?.edit ?? false,
        delete: perm?.delete ?? false,
        approve: perm?.approve ?? false,
        reject: perm?.reject ?? false,
        export: perm?.export ?? false,
        downloadPdf: perm?.downloadPdf ?? false,
        uploadFiles: perm?.uploadFiles ?? false,
        share: perm?.share ?? false,
        manage: perm?.manage ?? false,
        ownership: perm?.ownership ?? "ALL",
        approvalLimit: perm?.approvalLimit ?? "",
        costPriceVisible: perm?.costPriceVisible ?? false,
        dealerPriceVisible: perm?.dealerPriceVisible ?? false,
        marginVisible: perm?.marginVisible ?? false,
        profitVisible: perm?.profitVisible ?? false,
        markupVisible: perm?.markupVisible ?? false,
        canConfirmQuotation: perm?.canConfirmQuotation ?? false,
      }
    })
    setEditingPermissions(matrix)
  }

  const loadUserOverrides = (overrides: any[]) => {
    setEditingOverrides(overrides || [])
  }

  // Handle Role change selection
  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId)
    const role = roles.find(r => r.id === roleId)
    if (role) {
      loadRolePermissions(role, role.permissions)
    }
  }

  // Handle User change selection
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    const user = users.find(u => u.id === userId)
    if (user) {
      loadUserOverrides(user.permissionOverrides)
    }
  }

  // Modify local role permission cell
  const handleRolePermChange = (moduleId: string, actionId: string, value: any) => {
    setEditingPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [actionId]: value
      }
    }))
  }

  // Modify user overrides
  const handleOverrideChange = (moduleId: string, actionId: string, actionType: "boolean" | "ownership" | "limit", value: any) => {
    setEditingOverrides(prev => {
      // Find if override exists
      const filtered = prev.filter(o => !(o.module === moduleId && o.action === actionId))
      
      if (actionType === "boolean") {
        if (value === null) {
          // No override (inherited)
          return filtered
        }
        return [...filtered, { module: moduleId, action: actionId, value }]
      } else if (actionType === "ownership") {
        const currentOverride = prev.find(o => o.module === moduleId && o.action === actionId)
        return [...filtered, { 
          module: moduleId, 
          action: actionId, 
          value: currentOverride?.value ?? true, 
          ownership: value 
        }]
      } else {
        const currentOverride = prev.find(o => o.module === moduleId && o.action === actionId)
        return [...filtered, { 
          module: moduleId, 
          action: actionId, 
          value: currentOverride?.value ?? true, 
          approvalLimit: value 
        }]
      }
    })
  }

  // Save Role permissions to DB
  const saveRolePermissions = async () => {
    const selectedRole = roles.find(r => r.id === selectedRoleId)
    if (!selectedRole) return

    if (selectedRole.name === "SUPER_ADMIN" && currentUserRole !== "SUPER_ADMIN") {
      toast.error("Only Super Admins can save SUPER_ADMIN configurations")
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
        fetchData()
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to update role permissions")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error saving role permissions")
    } finally {
      setLoading(false)
    }
  }

  // Save User overrides to DB
  const saveUserOverrides = async () => {
    const targetUser = users.find(u => u.id === selectedUserId)
    if (!targetUser) return

    if (targetUser.role === "SUPER_ADMIN" && currentUserRole !== "SUPER_ADMIN") {
      toast.error("Only Super Admins can save SUPER_ADMIN overrides")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/settings/access-control", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update_overrides",
          targetUserId: selectedUserId,
          overrides: editingOverrides
        })
      })

      if (res.ok) {
        toast.success("User overrides saved successfully")
        fetchData()
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to save user overrides")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error saving user overrides")
    } finally {
      setLoading(false)
    }
  }

  // Create custom role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName) return

    setLoading(true)
    try {
      const res = await fetch("/api/settings/access-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_role",
          roleName: newRoleName,
          description: newRoleDesc,
          baseRoleId: baseRoleId || undefined
        })
      })

      if (res.ok) {
        toast.success("Custom role created successfully")
        setShowNewRoleModal(false)
        setNewRoleName("")
        setNewRoleDesc("")
        setBaseRoleId("")
        fetchData()
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to create custom role")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error creating custom role")
    } finally {
      setLoading(false)
    }
  }

  // Delete custom role
  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    if (!role) return
    if (role.isSystem) {
      toast.error("Cannot delete system default roles")
      return
    }

    if (!confirm(`Are you sure you want to delete the role ${role.name}? This action cannot be undone.`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/settings/access-control?roleId=${roleId}`, {
        method: "DELETE"
      })

      if (res.ok) {
        toast.success("Role deleted successfully")
        setSelectedRoleId("")
        fetchData()
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to delete role")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error deleting role")
    } finally {
      setLoading(false)
    }
  }

  const selectedRole = roles.find(r => r.id === selectedRoleId)
  const isSelectedRoleSystem = selectedRole?.isSystem ?? false

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-5 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
            Access Control Panel
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configure dynamic roles, action matrix permissions, granular user overrides, and view compliance logs.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === "roles" && (
            <button
              onClick={() => setShowNewRoleModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-zinc-800 transition-all dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              <Plus size={14} />
              Create Custom Role
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 gap-2">
        <button
          onClick={() => setActiveTab("roles")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "roles"
              ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <Shield size={16} />
          Role Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab("overrides")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "overrides"
              ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <User size={16} />
          User-Level Overrides
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "logs"
              ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <History size={16} />
          Access Control Audit Logs
        </button>
      </div>

      {loading && (
        <div className="py-20 text-center text-zinc-500 text-sm animate-pulse">
          Loading access configuration data, please wait...
        </div>
      )}

      {!loading && activeTab === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Roles</h3>
            <div className="space-y-1.5">
              {roles.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleRoleSelect(r.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-sm font-medium transition-all cursor-pointer ${
                    selectedRoleId === r.id
                      ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white"
                      : "hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate">{r.name}</span>
                    <span className="block text-[10px] text-zinc-400 truncate mt-0.5">{r.description || "No description"}</span>
                  </div>
                  {r.isSystem && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border font-semibold shrink-0">
                      System
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Permissions Matrix Grid */}
          <div className="lg:col-span-3 space-y-4">
            {selectedRole && (
              <div className="bg-white dark:bg-zinc-900 border rounded-xl p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{selectedRole.name} Permissions</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">{selectedRole.description}</p>
                  </div>
                  <div className="flex gap-2">
                    {!isSelectedRoleSystem && (
                      <button
                        onClick={() => handleDeleteRole(selectedRole.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/20"
                      >
                        <Trash2 size={13} />
                        Delete Role
                      </button>
                    )}
                    <button
                      onClick={saveRolePermissions}
                      disabled={selectedRole.name === "SUPER_ADMIN"}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 px-4 py-1.5 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Save size={13} />
                      Save Permissions Matrix
                    </button>
                  </div>
                </div>

                {selectedRole.name === "SUPER_ADMIN" && (
                  <div className="p-3.5 bg-yellow-50 dark:bg-yellow-950/25 border border-yellow-200 dark:border-yellow-900/40 rounded-xl text-yellow-800 dark:text-yellow-400 text-xs flex items-start gap-2">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <strong>Super Admin Bypass Rule Enabled:</strong> The SUPER_ADMIN role bypasses all authorization matrix constraints and has hardcoded full system access. Editing Super Admin permissions is disabled.
                    </div>
                  </div>
                )}

                {/* Table Matrix */}
                <div className="overflow-x-auto border rounded-xl max-h-[500px]">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="p-3 border-r">Module</th>
                        {actions.map(a => (
                          <th key={a.id} className="p-3 text-center min-w-[70px]">{a.label}</th>
                        ))}
                        <th className="p-3 text-center min-w-[110px] border-l">Ownership</th>
                        <th className="p-3 text-center min-w-[100px] border-l">Appr. Limit (AED)</th>
                        <th className="p-3 text-center min-w-[350px] border-l">Pricing Visibilities</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {modules.map((m) => {
                        const rowPerm = editingPermissions[m.id] || {}
                        return (
                          <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                            <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-200 border-r">{m.name}</td>
                            {actions.map((a) => {
                              const isConfirmAndNotQuote = a.id === "canConfirmQuotation" && m.id !== "QUOTATIONS"
                              return (
                                <td key={a.id} className="p-3 text-center">
                                  {!isConfirmAndNotQuote && (
                                    <input
                                      type="checkbox"
                                      checked={rowPerm[a.id] ?? false}
                                      disabled={selectedRole.name === "SUPER_ADMIN"}
                                      onChange={(e) => handleRolePermChange(m.id, a.id, e.target.checked)}
                                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900 dark:bg-zinc-800"
                                    />
                                  )}
                                </td>
                              )
                            })}
                            <td className="p-3 text-center border-l">
                              <select
                                value={rowPerm.ownership || "ALL"}
                                disabled={selectedRole.name === "SUPER_ADMIN"}
                                onChange={(e) => handleRolePermChange(m.id, "ownership", e.target.value)}
                                className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-transparent p-1 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                              >
                                <option value="ALL">All (ALL)</option>
                                <option value="DEPARTMENT">Department</option>
                                <option value="OWN">Own Only</option>
                                <option value="ASSIGNED">Assigned</option>
                                <option value="NONE">None</option>
                              </select>
                            </td>
                            <td className="p-3 text-center border-l">
                              <input
                                type="number"
                                placeholder="None"
                                disabled={selectedRole.name === "SUPER_ADMIN"}
                                value={rowPerm.approvalLimit ?? ""}
                                onChange={(e) => handleRolePermChange(m.id, "approvalLimit", e.target.value === "" ? null : parseFloat(e.target.value))}
                                className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-transparent p-1 text-center dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                              />
                            </td>
                            <td className="p-3 border-l">
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {pricingVisibilities.map((pv) => (
                                  <label key={pv.id} className="inline-flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={rowPerm[pv.id] ?? false}
                                      disabled={selectedRole.name === "SUPER_ADMIN"}
                                      onChange={(e) => handleRolePermChange(m.id, pv.id, e.target.checked)}
                                      className="h-3 w-3 rounded text-zinc-900 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                                    />
                                    <span className="text-[10px] text-zinc-500">{pv.label}</span>
                                  </label>
                                ))}
                              </div>
                            </td>
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

      {/* User Overrides Matrix tab */}
      {!loading && activeTab === "overrides" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Users list */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Users</h3>
            <div className="space-y-1.5">
              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleUserSelect(u.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-sm font-medium transition-all cursor-pointer ${
                    selectedUserId === u.id
                      ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white"
                      : "hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate">{u.name || u.email}</span>
                    <span className="block text-[10px] text-zinc-400 truncate mt-0.5">{u.role}</span>
                  </div>
                  {u.permissionOverrides && u.permissionOverrides.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950/45 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 font-semibold shrink-0">
                      Overrides
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Overrides configurator */}
          <div className="lg:col-span-3 space-y-4">
            {selectedUserId && (
              <div className="bg-white dark:bg-zinc-900 border rounded-xl p-5 shadow-sm space-y-5">
                {(() => {
                  const targetUser = users.find(u => u.id === selectedUserId)
                  return (
                    <>
                      <div className="flex items-center justify-between gap-4 border-b pb-4">
                        <div>
                          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Overrides for {targetUser?.name || targetUser?.email}</h2>
                          <p className="text-xs text-zinc-400 mt-0.5">Role: {targetUser?.role} | Department: {targetUser?.department || "None"}</p>
                        </div>
                        <div>
                          <button
                            onClick={saveUserOverrides}
                            className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 px-4 py-1.5 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100"
                          >
                            <Save size={13} />
                            Save User Overrides
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-2">
                        <Info size={16} className="shrink-0 mt-0.5 text-zinc-400" />
                        <div>
                          Select explicitly <strong>Grant (Allow)</strong> or <strong>Deny (Restrict)</strong> to override this user&apos;s default role-level permissions. Selecting <strong>Inherit</strong> clears the override.
                        </div>
                      </div>

                      {/* Overrides Table */}
                      <div className="overflow-x-auto border rounded-xl max-h-[500px]">
                        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
                          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold sticky top-0 z-10">
                            <tr>
                              <th className="p-3 border-r">Module</th>
                              <th className="p-3 border-r">Action / Variable</th>
                              <th className="p-3 text-center">Override Value</th>
                              <th className="p-3 text-center border-l">Granular Constraint</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {modules.flatMap((m) => {
                              const moduleActions = [
                                ...actions
                                  .filter(a => a.id !== "canConfirmQuotation" || m.id === "QUOTATIONS")
                                  .map(a => ({ id: a.id, label: a.label, type: "boolean" as const })),
                                ...pricingVisibilities.map(pv => ({ id: pv.id, label: `Pricing: ${pv.label}`, type: "boolean" as const })),
                                { id: "ownership", label: "Ownership Constraint Override", type: "ownership" as const },
                                { id: "approvalLimit", label: "Approval limit Override (AED)", type: "limit" as const }
                              ]

                              return moduleActions.map((act) => {
                                const userOverride = editingOverrides.find(o => o.module === m.id && o.action === act.id)
                                let selectVal = "inherit"
                                if (userOverride !== undefined) {
                                  if (act.type === "boolean") {
                                    selectVal = userOverride.value ? "allow" : "deny"
                                  } else {
                                    selectVal = "custom"
                                  }
                                }

                                return (
                                  <tr key={`${m.id}-${act.id}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                                    <td className="p-2.5 font-medium text-zinc-900 dark:text-zinc-200 border-r">{m.name}</td>
                                    <td className="p-2.5 text-zinc-600 dark:text-zinc-400 border-r">{act.label}</td>
                                    <td className="p-2.5 text-center">
                                      {act.type === "boolean" ? (
                                        <select
                                          value={selectVal}
                                          onChange={(e) => {
                                            const v = e.target.value
                                            if (v === "inherit") {
                                              handleOverrideChange(m.id, act.id, "boolean", null)
                                            } else {
                                              handleOverrideChange(m.id, act.id, "boolean", v === "allow")
                                            }
                                          }}
                                          className="text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-transparent p-1 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                                        >
                                          <option value="inherit">Inherit (Default)</option>
                                          <option value="allow" className="text-green-600 font-semibold">Grant / Allow</option>
                                          <option value="deny" className="text-red-600 font-semibold">Deny / Restrict</option>
                                        </select>
                                      ) : (
                                        <select
                                          value={selectVal}
                                          onChange={(e) => {
                                            const v = e.target.value
                                            if (v === "inherit") {
                                              handleOverrideChange(m.id, act.id, act.type, null)
                                            } else {
                                              handleOverrideChange(m.id, act.id, act.type, act.type === "ownership" ? "ALL" : 0.0)
                                            }
                                          }}
                                          className="text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-transparent p-1 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                                        >
                                          <option value="inherit">Inherit (Default)</option>
                                          <option value="custom">Custom Override</option>
                                        </select>
                                      )}
                                    </td>
                                    <td className="p-2.5 border-l text-center">
                                      {selectVal === "custom" && act.type === "ownership" && (
                                        <select
                                          value={userOverride?.ownership || "ALL"}
                                          onChange={(e) => handleOverrideChange(m.id, act.id, "ownership", e.target.value)}
                                          className="text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-transparent p-1 dark:bg-zinc-800 text-zinc-850 dark:text-zinc-200"
                                        >
                                          <option value="ALL">All (ALL)</option>
                                          <option value="DEPARTMENT">Department</option>
                                          <option value="OWN">Own Only</option>
                                          <option value="ASSIGNED">Assigned</option>
                                          <option value="NONE">None</option>
                                        </select>
                                      )}
                                      {selectVal === "custom" && act.type === "limit" && (
                                        <input
                                          type="number"
                                          placeholder="AED limit"
                                          value={userOverride?.approvalLimit ?? ""}
                                          onChange={(e) => handleOverrideChange(m.id, act.id, "limit", e.target.value)}
                                          className="text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-transparent p-1 text-center dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                                        />
                                      )}
                                    </td>
                                  </tr>
                                )
                              })
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {!loading && activeTab === "logs" && (
        <div className="bg-white dark:bg-zinc-900 border rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Compliance &amp; Access Control Audit Logs</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Read-only historical view of updates made to roles and user overrides.</p>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Operator</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Target User</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-zinc-400">
                      No logs available or found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                      <td className="p-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3 font-medium text-zinc-900 dark:text-zinc-200">
                        {log.user?.name || log.user?.email || "Unknown"}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3">
                        {log.targetUser ? (
                          <span className="font-medium text-zinc-900 dark:text-zinc-200">
                            {log.targetUser.name || log.targetUser.email}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Global/Role</span>
                        )}
                      </td>
                      <td className="p-3 text-zinc-500 dark:text-zinc-400 max-w-sm truncate" title={log.details}>
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
      {showNewRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Create Custom Role</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Define a new custom role with standard permissions template.</p>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Coordinator"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Description</label>
                <textarea
                  placeholder="e.g. Supports sales executives with coordination tasks."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Duplicate/Copy Permissions From (Optional)</label>
                <select
                  value={baseRoleId}
                  onChange={(e) => setBaseRoleId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2.5 dark:bg-zinc-800 text-zinc-850 dark:text-white"
                >
                  <option value="">None (Standard Default)</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRoleModal(false)}
                  className="px-4 py-2 text-xs font-semibold border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100"
                >
                  Create Custom Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
