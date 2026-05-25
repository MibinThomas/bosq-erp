"use client"

import React, { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast, Toaster } from "sonner"
import { 
  Building, 
  Key, 
  Users, 
  FileText, 
  Trash2, 
  Plus, 
  Loader2, 
  UserPlus,
  Shield,
  Briefcase,
  UserCheck,
  Eye,
  EyeOff,
  Pencil,
  Tag
} from "lucide-react"

// Types matching system models
interface SystemUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface PaymentTerm {
  id: string
  name: string
  description: string | null
  isDefault: boolean
}

interface TermsCondition {
  id: string
  title: string
  content: string
  isDefault: boolean
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company")
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  // 1. Company & Integration Settings State
  const [companyName, setCompanyName] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [companyTrn, setCompanyTrn] = useState("")
  const [companyEmail, setCompanyEmail] = useState("")
  const [tenantId, setTenantId] = useState("")
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [siteId, setSiteId] = useState("")
  const [driveId, setDriveId] = useState("")
  const [showSecret, setShowSecret] = useState(false)

  // 2. Users Tab State
  const [users, setUsers] = useState<SystemUser[]>([])
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserPhone, setNewUserPhone] = useState("")
  const [newUserDepartment, setNewUserDepartment] = useState("")
  const [newUserRole, setNewUserRole] = useState("SALES_EXECUTIVE")
  
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editUserData, setEditUserData] = useState<{id: string, name: string, email: string, role: string, phone?: string, department?: string, password?: string} | null>(null)

  // 3. Terms & Conditions Tab State
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [termsConditions, setTermsConditions] = useState<TermsCondition[]>([])
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [showAddTermsModal, setShowAddTermsModal] = useState(false)

  // Add term form states
  const [paymentName, setPaymentName] = useState("")
  const [paymentDesc, setPaymentDesc] = useState("")
  const [paymentIsDefault, setPaymentIsDefault] = useState(false)

  const [termTitle, setTermTitle] = useState("")
  const [termContent, setTermContent] = useState("")
  const [termIsDefault, setTermIsDefault] = useState(true)

  // Deletion modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: "payment" | "condition" | "user"; label: string } | null>(null)

  // 4. Pricing Markup State
  const [dealerPct, setDealerPct] = useState(15)
  const [interiorPct, setInteriorPct] = useState(30)
  const [directPct, setDirectPct] = useState(50)
  const [onlinePct, setOnlinePct] = useState(75)
  const [savingPricing, setSavingPricing] = useState(false)

  // Fetch all system settings on load
  useEffect(() => {
    fetchSettings()
    fetchUsers()
    fetchTerms()
    fetchPricing()
  }, [])

  const fetchPricing = async () => {
    try {
      const res = await fetch("/api/settings/pricing")
      if (res.ok) {
        const data = await res.json()
        setDealerPct(data.dealer || 15)
        setInteriorPct(data.interior || 30)
        setDirectPct(data.direct || 50)
        setOnlinePct(data.online || 75)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings/system")
      if (res.ok) {
        const data = await res.json()
        setCompanyName(data.company_name || "")
        setCompanyAddress(data.company_address || "")
        setCompanyTrn(data.company_trn || "")
        setCompanyEmail(data.company_email || "")
        setTenantId(data.sharepoint_tenant_id || "")
        setClientId(data.sharepoint_client_id || "")
        setClientSecret(data.sharepoint_client_secret || "")
        setSiteId(data.sharepoint_site_id || "")
        setDriveId(data.sharepoint_drive_id || "")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to load company settings")
    } finally {
      setPageLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/settings/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchTerms = async () => {
    try {
      const res = await fetch("/api/settings/terms")
      if (res.ok) {
        const data = await res.json()
        setPaymentTerms(data.paymentTerms || [])
        setTermsConditions(data.termsConditions || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Handle saving company and integration settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/settings/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          company_address: companyAddress,
          company_trn: companyTrn,
          company_email: companyEmail,
          sharepoint_tenant_id: tenantId,
          sharepoint_client_id: clientId,
          sharepoint_client_secret: clientSecret,
          sharepoint_site_id: siteId,
          sharepoint_drive_id: driveId
        })
      })

      if (res.ok) {
        toast.success("System configurations updated successfully!")
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to save settings")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error communicating with configurations API")
    } finally {
      setLoading(false)
    }
  }

  // Handle adding new user profile
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserRole || !newUserPhone) {
      toast.error("Name, email, password, role, and contact number are required")
      return
    }
    setLoading(true)
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
        fetchUsers()
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to create user account")
      }
    } catch (err) {
      console.error(err)
      toast.error("Connection failed")
    } finally {
      setLoading(false)
    }
  }

  // Handle updating user profile
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUserData?.id || !editUserData.name || !editUserData.email || !editUserData.role || !editUserData.phone) {
      toast.error("Name, email, role, and contact number are required")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/settings/users/${editUserData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editUserData.name,
          email: editUserData.email,
          role: editUserData.role,
          phone: editUserData.phone,
          department: editUserData.department,
          password: editUserData.password || undefined // Only send if entered
        })
      })

      if (res.ok) {
        toast.success(`User ${editUserData.name} updated successfully!`)
        setShowEditUserModal(false)
        setEditUserData(null)
        fetchUsers()
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to update user account")
      }
    } catch (err) {
      console.error(err)
      toast.error("Connection failed")
    } finally {
      setLoading(false)
    }
  }

  // Handle deleting a user profile
  const handleDeleteUser = async (userId: string, userName: string) => {
    setDeleteConfirm({ id: userId, type: "user", label: userName })
  }

  const executeDeleteUser = async (userId: string, userName: string) => {
    try {
      const res = await fetch(`/api/settings/users?id=${userId}`, {
        method: "DELETE"
      })

      if (res.ok) {
        toast.success(`User ${userName} deleted successfully`)
        fetchUsers()
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to delete user account")
      }
    } catch (err) {
      console.error(err)
      toast.error("Connection failed")
    }
  }

  // Handle adding custom payment term
  const handleAddPaymentTerm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentName) {
      toast.error("Payment term name is required")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/settings/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment",
          name: paymentName,
          description: paymentDesc,
          isDefault: paymentIsDefault
        })
      })

      if (res.ok) {
        toast.success("Payment term added successfully!")
        setShowAddPaymentModal(false)
        setPaymentName("")
        setPaymentDesc("")
        setPaymentIsDefault(false)
        fetchTerms()
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to save payment terms")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Handle adding custom default terms condition
  const handleAddTermsCondition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!termTitle || !termContent) {
      toast.error("Title and content are required")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/settings/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "condition",
          title: termTitle,
          content: termContent,
          isDefault: termIsDefault
        })
      })

      if (res.ok) {
        toast.success("Terms & Conditions clause added!")
        setShowAddTermsModal(false)
        setTermTitle("")
        setTermContent("")
        setTermIsDefault(true)
        fetchTerms()
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to save terms condition")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Handle deleting term/condition
  const handleDeleteTerm = async (type: "payment" | "condition", id: string, label: string) => {
    setDeleteConfirm({ id, type, label })
  }

  const executeDeleteTerm = async (type: "payment" | "condition", id: string, label: string) => {
    try {
      const res = await fetch(`/api/settings/terms?type=${type}&id=${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        toast.success("Default configuration entry removed")
        fetchTerms()
      } else {
        toast.error("Failed to delete entry")
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPricing(true)
    try {
      const res = await fetch("/api/settings/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealer: dealerPct, interior: interiorPct, direct: directPct, online: onlinePct })
      })
      if (res.ok) {
        toast.success("Pricing markup percentages saved!")
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to save pricing percentages")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while saving pricing percentages")
    } finally {
      setSavingPricing(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Settings Console</h1>
          <p className="text-slate-400 mt-1">
            Manage organization details, user accounts, and default quotation terms.
          </p>
        </div>
      </div>

      <Tabs defaultValue="company" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-slate-900/60 p-1 border border-slate-800 rounded-xl max-w-4xl">
          <TabsTrigger value="company" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
            <Building className="h-4 w-4" />
            Company Details
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
            <Tag className="h-4 w-4" />
            Pricing Markup
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
            <Users className="h-4 w-4" />
            Users Console
          </TabsTrigger>
          <TabsTrigger value="terms" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
            <FileText className="h-4 w-4" />
            Default Terms
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
            <Key className="h-4 w-4" />
            SharePoint Keys
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Company Profile Info */}
        <TabsContent value="company" className="mt-6">
          <form onSubmit={handleSaveSettings}>
            <Card className="bg-slate-950 border-slate-800 text-white shadow-2xl">
              <CardHeader className="border-b border-slate-800/80 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Building className="text-orange-500 h-5 w-5" />
                  Corporate Details
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure details that will be rendered directly on the PDF quotation documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-slate-300">Company Name</Label>
                    <Input 
                      id="companyName" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail" className="text-slate-300">Support / Sales Email</Label>
                    <Input 
                      id="companyEmail" 
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="companyAddress" className="text-slate-300">Company Office Address</Label>
                    <Input 
                      id="companyAddress" 
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyTrn" className="text-slate-300">Company TRN (Tax Registration Number)</Label>
                    <Input 
                      id="companyTrn" 
                      value={companyTrn}
                      onChange={(e) => setCompanyTrn(e.target.value)}
                      className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600"
                      required
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center gap-2" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Company Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* Tab: Pricing Markup */}
        <TabsContent value="pricing" className="mt-6">
          <form onSubmit={handleSavePricing}>
            <Card className="bg-slate-950 border-slate-800 text-white shadow-2xl">
              <CardHeader className="border-b border-slate-800/80 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Tag className="text-orange-500 h-5 w-5" />
                  Pricing Markup
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Set the default markup percentages used to auto-calculate price tiers from the Base Price during bulk imports.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Dealer Markup (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={dealerPct}
                        onChange={(e) => setDealerPct(parseFloat(e.target.value))}
                        className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600 pl-8"
                        required
                        min="0"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Interior Markup (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={interiorPct}
                        onChange={(e) => setInteriorPct(parseFloat(e.target.value))}
                        className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600 pl-8"
                        required
                        min="0"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Direct Markup (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={directPct}
                        onChange={(e) => setDirectPct(parseFloat(e.target.value))}
                        className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600 pl-8"
                        required
                        min="0"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Online Markup (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={onlinePct}
                        onChange={(e) => setOnlinePct(parseFloat(e.target.value))}
                        className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600 pl-8"
                        required
                        min="0"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800 flex justify-end mt-4">
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center gap-2" disabled={savingPricing}>
                    {savingPricing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Pricing Markup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* Tab 2: Users Management Console */}
        <TabsContent value="users" className="mt-6">
          <Card className="bg-slate-950 border-slate-800 text-white shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users className="text-orange-500 h-5 w-5" />
                  Users Management Console
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Manage active employees, roles, and credential parameters.
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddUserModal(true)} className="bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add User Account
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs uppercase bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th scope="col" className="px-6 py-4">Name</th>
                      <th scope="col" className="px-6 py-4">Email</th>
                      <th scope="col" className="px-6 py-4">Role</th>
                      <th scope="col" className="px-6 py-4">Created Date</th>
                      <th scope="col" className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((usr) => (
                      <tr key={usr.id} className="border-b border-slate-800 bg-slate-950/40 hover:bg-slate-900/60 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-100 flex items-center gap-2">
                          {usr.name}
                        </td>
                        <td className="px-6 py-4">{usr.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            usr.role === "ADMIN" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            usr.role === "SALES_MANAGER" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                            "bg-slate-500/15 text-slate-300 border border-slate-500/10"
                          }`}>
                            {usr.role === "SALES_EXECUTIVE" ? "Interior Design Consultant (IDC)" : usr.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {new Date(usr.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-500 hover:text-blue-400 hover:bg-blue-950/30 mr-2"
                            onClick={() => {
                              setEditUserData({ ...usr })
                              setShowEditUserModal(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-400 hover:bg-red-950/30"
                            onClick={() => handleDeleteUser(usr.id, usr.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Default Terms & Conditions */}
        <TabsContent value="terms" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Column A: Payment Terms */}
            <Card className="bg-slate-950 border-slate-800 text-white shadow-2xl">
              <CardHeader className="border-b border-slate-800 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="text-orange-500 h-5 w-5" />
                    Payment Terms
                  </CardTitle>
                  <CardDescription className="text-slate-400">Default settings for quotations.</CardDescription>
                </div>
                <Button onClick={() => setShowAddPaymentModal(true)} variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-900 flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {paymentTerms.map((term) => (
                  <div key={term.id} className="p-4 rounded-lg bg-slate-900/60 border border-slate-850 flex items-start justify-between hover:border-slate-800 transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{term.name}</span>
                        {term.isDefault && (
                          <span className="text-[10px] bg-orange-600/10 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{term.description || "No description provided."}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-400 hover:bg-red-950/20"
                      onClick={() => handleDeleteTerm("payment", term.id, term.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Column B: Terms & Conditions default list */}
            <Card className="bg-slate-950 border-slate-800 text-white shadow-2xl">
              <CardHeader className="border-b border-slate-800 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="text-orange-500 h-5 w-5" />
                    Terms & Conditions Clauses
                  </CardTitle>
                  <CardDescription className="text-slate-400">Generated automatically on PDF page footers.</CardDescription>
                </div>
                <Button onClick={() => setShowAddTermsModal(true)} variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-900 flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {termsConditions.map((cond) => (
                  <div key={cond.id} className="p-4 rounded-lg bg-slate-900/60 border border-slate-850 flex items-start justify-between hover:border-slate-800 transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{cond.title}</span>
                        {cond.isDefault && (
                          <span className="text-[10px] bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                            ON BY DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cond.content}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-400 hover:bg-red-950/20 ml-2 shrink-0"
                      onClick={() => handleDeleteTerm("condition", cond.id, cond.title)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: SharePoint Credentials */}
        <TabsContent value="integrations" className="mt-6">
          <form onSubmit={handleSaveSettings}>
            <Card className="bg-slate-950 border-slate-800 text-white shadow-2xl">
              <CardHeader className="border-b border-slate-800 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Key className="text-orange-500 h-5 w-5" />
                  Microsoft SharePoint & Graph API Configuration
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure directory access properties. Set values to override environment variables. Empty fields fall back to local `.env`.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tenantId" className="text-slate-300">Directory (Tenant) ID</Label>
                    <Input 
                      id="tenantId" 
                      type="password"
                      placeholder="e.g. 98d74360-a4e2-4ad2-9247-f406c295d619"
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                      className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientId" className="text-slate-300">Application (Client) ID</Label>
                    <Input 
                      id="clientId" 
                      type="password"
                      placeholder="e.g. 7118d073-306f-4c1a-a7af-a924ad85671a"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="clientSecret" className="text-slate-300 flex items-center justify-between">
                      <span>Application Client Secret</span>
                      <button 
                        type="button" 
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-xs text-orange-500 hover:text-orange-400 focus:outline-none flex items-center gap-1"
                      >
                        {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {showSecret ? "Hide secret" : "Show secret"}
                      </button>
                    </Label>
                    <Input 
                      id="clientSecret" 
                      type={showSecret ? "text" : "password"}
                      placeholder="Enter Client Secret token"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="siteId" className="text-slate-300">SharePoint Target Site ID</Label>
                    <Input 
                      id="siteId" 
                      placeholder="site.sharepoint.com,site-uuid-1,site-uuid-2"
                      value={siteId}
                      onChange={(e) => setSiteId(e.target.value)}
                      className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="driveId" className="text-slate-300">SharePoint Target Drive ID</Label>
                    <Input 
                      id="driveId" 
                      placeholder="Documents Library ID"
                      value={driveId}
                      onChange={(e) => setDriveId(e.target.value)}
                      className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center gap-2" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Integration Credentials
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-250">
          <Card className="w-full max-w-md bg-slate-950 border-slate-800 text-white shadow-2xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg">Add User Account</CardTitle>
              <CardDescription className="text-slate-400">Create new credentials to access BOSQ ERP.</CardDescription>
            </CardHeader>
            <form onSubmit={handleAddUser}>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="newName" className="text-slate-300">Full Name</Label>
                  <Input 
                    id="newName"
                    placeholder="e.g. Alice Smith"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="bg-slate-900 border-slate-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newEmail" className="text-slate-300">Corporate Email</Label>
                  <Input 
                    id="newEmail"
                    type="email"
                    placeholder="e.g. alice@bosq.ae"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="bg-slate-900 border-slate-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPass" className="text-slate-300">Initial Password</Label>
                  <Input 
                    id="newPass"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="bg-slate-900 border-slate-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPhone" className="text-slate-300">Contact Number</Label>
                  <Input 
                    id="newPhone"
                    type="tel"
                    placeholder="+971 XXXXXXXX"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="bg-slate-900 border-slate-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newDepartment" className="text-slate-300">Department (Optional)</Label>
                  <Input 
                    id="newDepartment"
                    type="text"
                    placeholder="e.g. Sales"
                    value={newUserDepartment}
                    onChange={(e) => setNewUserDepartment(e.target.value)}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newRole" className="text-slate-300">System Role</Label>
                  <select 
                    id="newRole"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-600"
                  >
                    <option value="SALES_EXECUTIVE">Interior Design Consultant (IDC)</option>
                    <option value="SALES_MANAGER">Sales Manager</option>
                    <option value="ESTIMATOR">Estimator</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </CardContent>
              <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-200">
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-2" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editUserData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-250">
          <Card className="w-full max-w-md bg-slate-950 border-slate-800 text-white shadow-2xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg">Edit User Account</CardTitle>
              <CardDescription className="text-slate-400">Update employee details or role.</CardDescription>
            </CardHeader>
            <form onSubmit={handleEditUser}>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="editName" className="text-slate-300">Full Name</Label>
                  <Input 
                    id="editName"
                    value={editUserData.name}
                    onChange={(e) => setEditUserData({...editUserData, name: e.target.value})}
                    className="bg-slate-900 border-slate-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmail" className="text-slate-300">Corporate Email</Label>
                  <Input 
                    id="editEmail"
                    type="email"
                    value={editUserData.email}
                    onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
                    className="bg-slate-900 border-slate-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPass" className="text-slate-300">New Password (Optional)</Label>
                  <Input 
                    id="editPass"
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={editUserData.password || ""}
                    onChange={(e) => setEditUserData({...editUserData, password: e.target.value})}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone" className="text-slate-300">Contact Number</Label>
                  <Input 
                    id="editPhone"
                    type="tel"
                    placeholder="+971 XXXXXXXX"
                    value={editUserData.phone || ""}
                    onChange={(e) => setEditUserData({...editUserData, phone: e.target.value})}
                    className="bg-slate-900 border-slate-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDepartment" className="text-slate-300">Department (Optional)</Label>
                  <Input 
                    id="editDepartment"
                    type="text"
                    placeholder="e.g. Sales"
                    value={editUserData.department || ""}
                    onChange={(e) => setEditUserData({...editUserData, department: e.target.value})}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editRole" className="text-slate-300">System Role</Label>
                  <select 
                    id="editRole"
                    value={editUserData.role}
                    onChange={(e) => setEditUserData({...editUserData, role: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-600"
                  >
                    <option value="SALES_EXECUTIVE">Interior Design Consultant (IDC)</option>
                    <option value="SALES_MANAGER">Sales Manager</option>
                    <option value="ESTIMATOR">Estimator</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </CardContent>
              <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => { setShowEditUserModal(false); setEditUserData(null); }} className="text-slate-400 hover:text-slate-200">
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-2" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add Payment Term Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-slate-950 border-slate-800 text-white shadow-2xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg">Add Payment Term Option</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddPaymentTerm}>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="payName" className="text-slate-300">Payment Term Label</Label>
                  <Input 
                    id="payName"
                    placeholder="e.g. 50% Advance, 50% on Delivery"
                    value={paymentName}
                    onChange={(e) => setPaymentName(e.target.value)}
                    className="bg-slate-900 border-slate-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payDesc" className="text-slate-300">Detailed Description</Label>
                  <Input 
                    id="payDesc"
                    placeholder="Details about cheques, PDC terms, etc."
                    value={paymentDesc}
                    onChange={(e) => setPaymentDesc(e.target.value)}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input 
                    id="payDefault"
                    type="checkbox"
                    checked={paymentIsDefault}
                    onChange={(e) => setPaymentIsDefault(e.target.checked)}
                    className="rounded border-slate-850 text-orange-600 focus:ring-orange-600 bg-slate-900 h-4 w-4"
                  />
                  <Label htmlFor="payDefault" className="text-slate-300 cursor-pointer select-none">Set as primary default selection</Label>
                </div>
              </CardContent>
              <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowAddPaymentModal(false)} className="text-slate-400 hover:text-slate-200">
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-2" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add Terms Condition Modal */}
      {showAddTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-slate-950 border-slate-800 text-white shadow-2xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg">Add Default Terms & Conditions Clause</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddTermsCondition}>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="termTitle" className="text-slate-300">Clause Title</Label>
                  <Input 
                    id="termTitle"
                    placeholder="e.g. Delivery Time, Validity"
                    value={termTitle}
                    onChange={(e) => setTermTitle(e.target.value)}
                    className="bg-slate-900 border-slate-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termContent" className="text-slate-300">Clause Details / Content</Label>
                  <textarea 
                    id="termContent"
                    placeholder="Enter detailed content of this default terms clause"
                    value={termContent}
                    onChange={(e) => setTermContent(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-600"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input 
                    id="termDefault"
                    type="checkbox"
                    checked={termIsDefault}
                    onChange={(e) => setTermIsDefault(e.target.checked)}
                    className="rounded border-slate-850 text-orange-600 focus:ring-orange-600 bg-slate-900 h-4 w-4"
                  />
                  <Label htmlFor="termDefault" className="text-slate-300 cursor-pointer select-none">Include on generated PDF quotations by default</Label>
                </div>
              </CardContent>
              <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowAddTermsModal(false)} className="text-slate-400 hover:text-slate-200">
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-2" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm bg-slate-950 border-slate-800 text-white shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-lg text-red-500 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Confirm Deletion
              </CardTitle>
              <CardDescription className="text-slate-400">
                Are you sure you want to delete "{deleteConfirm.label}"? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setDeleteConfirm(null)} 
                className="text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={() => {
                  if (deleteConfirm.type === "user") {
                    executeDeleteUser(deleteConfirm.id, deleteConfirm.label)
                  } else {
                    executeDeleteTerm(deleteConfirm.type, deleteConfirm.id, deleteConfirm.label)
                  }
                  setDeleteConfirm(null)
                }} 
                className="bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-2"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
