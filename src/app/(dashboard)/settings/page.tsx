"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
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
  Tag,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Image as ImageIcon,
  Hash
} from "lucide-react"

// Types matching system models
interface SystemUser {
  id: string
  name: string
  email: string
  role: string
  phone?: string
  department?: string
  designation?: string
  image?: string
  isActive?: boolean
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
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
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
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [headerLogo, setHeaderLogo] = useState("")
  const [footerLogo, setFooterLogo] = useState("")
  const [watermarkLogo, setWatermarkLogo] = useState("")
  const [quotationSequence, setQuotationSequence] = useState<number | "">("")
  const [savingSequence, setSavingSequence] = useState(false)
  const [clientSequence, setClientSequence] = useState<number | "">("")
  const [savingClientSequence, setSavingClientSequence] = useState(false)

  // 2. Users Tab State
  const [users, setUsers] = useState<SystemUser[]>([])
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserPhone, setNewUserPhone] = useState("")
  const [newUserDepartment, setNewUserDepartment] = useState("")
  const [newUserRole, setNewUserRole] = useState("")
  
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editUserData, setEditUserData] = useState<{id: string, name: string, email: string, role: string, phone?: string, department?: string, password?: string, designation?: string, isActive?: boolean, image?: string} | null>(null)

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
  const [recalculateExisting, setRecalculateExisting] = useState(false)
  const [dbRoles, setDbRoles] = useState<any[]>([])

  // 5. Client Access Requests State
  const [accessRequests, setAccessRequests] = useState<any[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [activeRequest, setActiveRequest] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [assignmentType, setAssignmentType] = useState("secondary")
  const [submittingAction, setSubmittingAction] = useState(false)

  // Fetch all system settings on load
  useEffect(() => {
    fetchSettings()
    fetchUsers()
    fetchTerms()
    fetchPricing()
    fetchDbRoles()
    fetchAccessRequests()
    fetchSequence()
  }, [])

  const fetchAccessRequests = async () => {
    try {
      setLoadingRequests(true)
      const res = await fetch("/api/clients/access-requests")
      if (res.ok) {
        const data = await res.json()
        setAccessRequests(data)
      }
    } catch (err) {
      console.error("Failed to fetch access requests:", err)
    } finally {
      setLoadingRequests(false)
    }
  }

  const handleApproveRequest = async (requestId: string, type: string) => {
    setSubmittingAction(true)
    try {
      const res = await fetch("/api/clients/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "Approve", assignmentType: type })
      })

      if (res.ok) {
        toast.success("Access request approved successfully!")
        setShowApproveModal(false)
        setActiveRequest(null)
        fetchAccessRequests()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to approve request.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred.")
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleRejectRequest = async (requestId: string, reason: string) => {
    setSubmittingAction(true)
    try {
      const res = await fetch("/api/clients/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "Reject", rejectionReason: reason })
      })

      if (res.ok) {
        toast.success("Access request rejected successfully.")
        setShowRejectModal(false)
        setActiveRequest(null)
        setRejectionReason("")
        fetchAccessRequests()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to reject request.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred.")
    } finally {
      setSubmittingAction(false)
    }
  }

  const fetchDbRoles = async () => {
    try {
      const res = await fetch("/api/settings/access-control")
      if (res.ok) {
        const data = await res.json()
        setDbRoles(data.roles || [])
      }
    } catch (err) {
      console.error("Failed to fetch roles:", err)
    }
  }

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

  const handleTestConnection = async () => {
    if (!tenantId || !clientId || !clientSecret || !siteId) {
      toast.error("Please fill in Tenant ID, Client ID, Client Secret, and Site ID before testing.")
      return
    }
    setTestingConnection(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/settings/test-sharepoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          clientId,
          clientSecret,
          siteId,
          driveId
        })
      })
      const data = await res.json()
      setTestResult(data)
      if (data.success) {
        toast.success("SharePoint connection test succeeded!")
      } else {
        toast.error("SharePoint connection test failed.")
      }
    } catch (err: any) {
      console.error(err)
      setTestResult({
        success: false,
        error: err.message || "Failed to contact diagnostic API endpoint."
      })
      toast.error("SharePoint connection test failed.")
    } finally {
      setTestingConnection(false)
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
        setHeaderLogo(data.quotation_header_logo || "")
        setFooterLogo(data.quotation_footer_logo || "")
        setWatermarkLogo(data.quotation_watermark_logo || "")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to load company settings")
    } finally {
      setPageLoading(false)
    }
  }

  const fetchSequence = async () => {
    try {
      const res = await fetch("/api/settings/sequence?type=QUOTATION_BASE")
      if (res.ok) {
        const data = await res.json()
        setQuotationSequence(data.lastValue ?? "")
      }
      const resClient = await fetch("/api/settings/sequence?type=CLIENT_BASE")
      if (resClient.ok) {
        const dataClient = await resClient.json()
        setClientSequence(dataClient.lastValue ?? "")
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveSequence = async () => {
    if (typeof quotationSequence !== "number" || quotationSequence < 0) {
      toast.error("Please enter a valid positive number.")
      return
    }
    setSavingSequence(true)
    try {
      const res = await fetch("/api/settings/sequence", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastValue: quotationSequence, type: "QUOTATION_BASE" })
      })
      if (res.ok) {
        toast.success("Quotation sequence base updated!")
      } else {
        toast.error("Failed to update sequence.")
      }
    } catch (err) {
      toast.error("Failed to update sequence.")
    } finally {
      setSavingSequence(false)
    }
  }

  const handleSaveClientSequence = async () => {
    if (typeof clientSequence !== "number" || clientSequence < 0) {
      toast.error("Please enter a valid positive number.")
      return
    }
    setSavingClientSequence(true)
    try {
      const res = await fetch("/api/settings/sequence", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastValue: clientSequence, type: "CLIENT_BASE" })
      })
      if (res.ok) {
        toast.success("Client sequence base updated!")
      } else {
        toast.error("Failed to update client sequence.")
      }
    } catch (err) {
      toast.error("Failed to update client sequence.")
    } finally {
      setSavingClientSequence(false)
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
          sharepoint_drive_id: driveId,
          quotation_header_logo: headerLogo,
          quotation_footer_logo: footerLogo,
          quotation_watermark_logo: watermarkLogo
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
    if (!newUserRole) {
      toast.error("Please select a system role")
      return
    }
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserPhone) {
      toast.error("Name, email, password, and contact number are required")
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
          designation: editUserData.designation,
          isActive: editUserData.isActive,
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
        body: JSON.stringify({ 
          dealer: dealerPct, 
          interior: interiorPct, 
          direct: directPct, 
          online: onlinePct,
          recalculateExisting
        })
      })
      if (res.ok) {
        const data = await res.json()
        if (recalculateExisting && data.recalculatedCount !== undefined) {
          toast.success(`Pricing markup percentages saved & recalculated for ${data.recalculatedCount} products!`)
        } else {
          toast.success("Pricing markup percentages saved!")
        }
        setRecalculateExisting(false)
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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 h-auto gap-2 bg-slate-900/60 p-2 border border-slate-800 rounded-xl max-w-5xl">
          <TabsTrigger value="company" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
            <Building className="h-4 w-4" />
            Company Details
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
            <Tag className="h-4 w-4" />
            Pricing Margins
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
          <TabsTrigger value="client-requests" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
            <UserCheck className="h-4 w-4" />
            Client Requests
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

                {userRole === "SUPER_ADMIN" && (
                  <div className="pt-6 border-t border-slate-800 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                      <ImageIcon className="text-orange-500 h-5 w-5" />
                      Quotation Document Branding
                    </h3>
                    <p className="text-xs text-slate-400">
                      Customize the branding assets loaded in the Quotation PDF headers and footers. Supported formats: PNG, JPG, WebP, SVG.
                    </p>
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Header Logo Upload */}
                      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-semibold text-slate-200">Quotation Header Logo</Label>
                          {headerLogo && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs text-red-500 hover:text-red-400 hover:bg-red-950/20 px-2"
                              onClick={() => setHeaderLogo("")}
                            >
                              Reset to Default
                            </Button>
                          )}
                        </div>
                        
                        {headerLogo ? (
                          <div className="h-24 w-full rounded-lg bg-slate-950 border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                            <img src={headerLogo} alt="Quotation Header Logo" className="max-h-full max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-24 w-full rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center text-xs text-slate-500 bg-slate-950/20">
                            <span>Using System Default Logo</span>
                            <span className="text-[10px] text-slate-600 mt-0.5">(BOSQ Logo)</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            className="bg-slate-950 border-slate-800 text-xs text-slate-400 file:bg-slate-800 file:text-slate-200 file:border-0 file:rounded file:px-2.5 file:py-1 file:mr-3 file:cursor-pointer cursor-pointer hover:border-slate-700"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setHeaderLogo(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 italic mt-1">
                          💡 Recommended dimension: <b>280px x 90px</b> (or 3:1 aspect ratio) with a transparent background.
                        </p>
                      </div>

                      {/* Footer Logo Upload */}
                      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-semibold text-slate-200">Quotation Footer Logo</Label>
                          {footerLogo && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs text-red-500 hover:text-red-400 hover:bg-red-950/20 px-2"
                              onClick={() => setFooterLogo("")}
                            >
                              Reset to Default
                            </Button>
                          )}
                        </div>

                        {footerLogo ? (
                          <div className="h-24 w-full rounded-lg bg-slate-950 border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                            <img src={footerLogo} alt="Quotation Footer Logo" className="max-h-full max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-24 w-full rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center text-xs text-slate-500 bg-slate-950/20">
                            <span>Using System Default Footer Logo</span>
                            <span className="text-[10px] text-slate-600 mt-0.5">(AYN Musk Logo)</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            className="bg-slate-950 border-slate-800 text-xs text-slate-400 file:bg-slate-800 file:text-slate-200 file:border-0 file:rounded file:px-2.5 file:py-1 file:mr-3 file:cursor-pointer cursor-pointer hover:border-slate-700"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setFooterLogo(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 italic mt-1">
                          💡 Recommended dimension: <b>180px x 45px</b> (or 4:1 aspect ratio) with a transparent background.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Watermark Logo Upload */}
                      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-semibold text-slate-200">Quotation Watermark</Label>
                          {watermarkLogo && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs text-red-500 hover:text-red-400 hover:bg-red-950/20 px-2"
                              onClick={() => setWatermarkLogo("")}
                            >
                              Reset to Default
                            </Button>
                          )}
                        </div>

                        {watermarkLogo ? (
                          <div className="h-24 w-full rounded-lg bg-slate-950 border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                            <img src={watermarkLogo} alt="Quotation Watermark" className="max-h-full max-w-full object-contain opacity-50" />
                          </div>
                        ) : (
                          <div className="h-24 w-full rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center text-xs text-slate-500 bg-slate-950/20">
                            <span>Using System Default Watermark</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            className="bg-slate-950 border-slate-800 text-xs text-slate-400 file:bg-slate-800 file:text-slate-200 file:border-0 file:rounded file:px-2.5 file:py-1 file:mr-3 file:cursor-pointer cursor-pointer hover:border-slate-700"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setWatermarkLogo(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 italic mt-1">
                          💡 Recommended dimension: <b>Square (e.g. 800x800)</b> with a transparent background.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center gap-2" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Company Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {userRole === "SUPER_ADMIN" && (
            <Card className="bg-slate-950 border-slate-800 text-white shadow-2xl mt-6">
              <CardHeader className="border-b border-slate-800/80 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Hash className="text-orange-500 h-5 w-5" />
                  System Sequence Counters
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Manage the sequence trackers used for automatically generating IDs across the system.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-col gap-6">
                  {/* Quotation Sequence */}
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="space-y-2 flex-1 max-w-sm">
                      <Label htmlFor="quotationSequence" className="text-slate-300">Base Quotation Sequence Number</Label>
                      <Input 
                        id="quotationSequence" 
                        type="number"
                        min="1"
                        value={quotationSequence}
                        onChange={(e) => setQuotationSequence(e.target.value ? parseInt(e.target.value) : "")}
                        className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600 font-mono"
                        placeholder="e.g. 3670"
                      />
                      <p className="text-[10px] text-slate-500">
                        The next quotation will use this number + 1 (e.g. if set to 3671, next is 3672).
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleSaveSequence} 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold w-36"
                      disabled={savingSequence || quotationSequence === ""}
                    >
                      {savingSequence ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Update
                    </Button>
                  </div>
                  
                  {/* Client Sequence */}
                  <div className="flex flex-col md:flex-row gap-4 items-end pt-4 border-t border-slate-800">
                    <div className="space-y-2 flex-1 max-w-sm">
                      <Label htmlFor="clientSequence" className="text-slate-300">Base Client ID Sequence Number</Label>
                      <Input 
                        id="clientSequence" 
                        type="number"
                        min="1"
                        value={clientSequence}
                        onChange={(e) => setClientSequence(e.target.value ? parseInt(e.target.value) : "")}
                        className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600 font-mono"
                        placeholder="e.g. 1000"
                      />
                      <p className="text-[10px] text-slate-500">
                        The next client will use this number + 1 (e.g. if set to 1000, next is C-1001).
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleSaveClientSequence} 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold w-36"
                      disabled={savingClientSequence || clientSequence === ""}
                    >
                      {savingClientSequence ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Pricing Margins */}
        <TabsContent value="pricing" className="mt-6">
          <form onSubmit={handleSavePricing}>
            <Card className="bg-slate-950 border-slate-800 text-white shadow-2xl">
              <CardHeader className="border-b border-slate-800/80 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Tag className="text-orange-500 h-5 w-5" />
                  Pricing Margins
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Set the default margin percentages used to auto-calculate price tiers based on product Cost Price.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Dealer Margin (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={dealerPct}
                        onChange={(e) => setDealerPct(parseFloat(e.target.value))}
                        className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600 pl-8"
                        required
                        min="0"
                        max="99.99"
                        step="0.01"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Interior Margin (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={interiorPct}
                        onChange={(e) => setInteriorPct(parseFloat(e.target.value))}
                        className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600 pl-8"
                        required
                        min="0"
                        max="99.99"
                        step="0.01"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Direct Margin (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={directPct}
                        onChange={(e) => setDirectPct(parseFloat(e.target.value))}
                        className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600 pl-8"
                        required
                        min="0"
                        max="99.99"
                        step="0.01"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Online Margin (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={onlinePct}
                        onChange={(e) => setOnlinePct(parseFloat(e.target.value))}
                        className="bg-slate-900 border-slate-800 focus-visible:ring-orange-600 pl-8"
                        required
                        min="0"
                        max="99.99"
                        step="0.01"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 pb-2 mt-4">
                  <input 
                    id="recalculateExisting"
                    type="checkbox"
                    checked={recalculateExisting}
                    onChange={(e) => setRecalculateExisting(e.target.checked)}
                    className="rounded border-slate-800 text-orange-600 focus:ring-orange-600 bg-slate-900 h-4 w-4 cursor-pointer"
                  />
                  <Label htmlFor="recalculateExisting" className="text-slate-300 cursor-pointer select-none">
                    Recalculate Existing Product Prices
                  </Label>
                </div>
                <div className="pt-4 border-t border-slate-800 flex justify-end mt-4">
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center gap-2" disabled={savingPricing}>
                    {savingPricing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Pricing Margins
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
                      <tr key={usr.id} className={`border-b border-slate-800 transition-colors ${usr.isActive === false ? "bg-slate-950/20 opacity-70" : "bg-slate-950/40 hover:bg-slate-900/60"}`}>
                        <td className="px-6 py-4 font-semibold text-slate-100 flex items-center gap-3">
                          {usr.image ? (
                            <img src={usr.image} alt={usr.name} className="h-8 w-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                              {usr.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span>{usr.name}</span>
                            {usr.designation && <span className="text-[10px] text-slate-400 font-normal">{usr.designation}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span>{usr.email}</span>
                            {usr.isActive === false && <span className="text-[10px] text-red-400">Inactive</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            usr.role === "SUPER_ADMIN" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                            usr.role === "ADMIN" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            (usr.role === "SALES_MANAGER" || usr.role === "MANAGER") ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                            "bg-slate-500/15 text-slate-300 border border-slate-500/10"
                          }`}>
                            {usr.role === "SUPER_ADMIN" ? "Super Admin" :
                             usr.role === "ADMIN" ? "Administrator" :
                             (usr.role === "SALES_MANAGER" || usr.role === "MANAGER") ? "Manager" :
                             usr.role === "SALES_EXECUTIVE" ? "Interior Design Consultant (IDC)" :
                             usr.role === "INTERIOR_DESIGN_CONSULTANT" ? "Interior Design Consultant" :
                             usr.role === "ESTIMATOR" ? "Cost Estimator" :
                             usr.role === "ACCOUNTS" ? "Finance & Accounts" :
                             usr.role === "PROCUREMENT" ? "Procurement" :
                             usr.role === "PRODUCTION" ? "Production" :
                             usr.role === "VIEWER" ? "Viewer" :
                             usr.role ? usr.role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "User"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {new Date(usr.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {(userRole === "SUPER_ADMIN" || (usr.role !== "SUPER_ADMIN" && usr.role !== "ADMIN" && usr.role !== "SALES_MANAGER" && usr.role !== "MANAGER")) && (
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
                          )}
                          {(userRole === "SUPER_ADMIN" || (usr.role !== "SUPER_ADMIN" && usr.role !== "ADMIN" && usr.role !== "SALES_MANAGER" && usr.role !== "MANAGER")) && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-400 hover:bg-red-950/30"
                              onClick={() => handleDeleteUser(usr.id, usr.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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

                {testingConnection && (
                  <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                    <span className="text-sm text-slate-300">Testing connection to SharePoint & resolving document libraries...</span>
                  </div>
                )}

                {testResult && (
                  <div className={`p-4 rounded-lg border text-sm ${testResult.success ? "bg-emerald-950/20 border-emerald-800/60 text-emerald-300" : "bg-red-950/20 border-red-800/60 text-red-300"} space-y-3`}>
                    <div className="flex items-start gap-2.5">
                      {testResult.success ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className="font-semibold text-slate-100">
                          {testResult.success ? "Connection Test Succeeded" : "Connection Test Failed"}
                        </h4>
                        <p className="text-xs text-slate-300 mt-1">{testResult.message || testResult.error}</p>
                      </div>
                    </div>

                    {!testResult.success && testResult.isSecretId && (
                      <div className="p-3 rounded bg-red-950/40 border border-red-900/60 flex items-start gap-2 text-xs text-red-200">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <strong>Azure Client Secret mismatch detected:</strong> The Client Secret you entered matches a 36-character UUID format (Secret ID). In the Azure Portal, you must copy the <strong>Value</strong> of the client secret (which is a longer random string) rather than the Secret ID. Please generate a new secret in Azure App Registrations and copy its <strong>Value</strong>.
                        </div>
                      </div>
                    )}

                    {testResult.success && testResult.drives && (
                      <div className="space-y-2 pt-2 border-t border-slate-800/60">
                        <div className="text-xs font-semibold text-slate-400">Available Site Document Libraries:</div>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar text-xs">
                          {testResult.drives.map((d: any) => {
                            const isResolved = d.id === testResult.resolvedDriveId;
                            return (
                              <div 
                                key={d.id} 
                                className={`flex items-center justify-between p-2 rounded ${isResolved ? "bg-emerald-950/50 border border-emerald-800/40 font-medium text-emerald-200" : "bg-slate-900/40 border border-slate-800/20 text-slate-400"}`}
                              >
                                <span>{d.name}</span>
                                <span className="font-mono text-[10px] opacity-75">{d.id}</span>
                              </div>
                            )
                          })}
                        </div>
                        {testResult.resolutionLog && (
                          <div className="text-[11px] text-slate-400 italic mt-1.5">
                            <strong>Library Resolution:</strong> {testResult.resolutionLog}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <Button 
                    type="button" 
                    onClick={handleTestConnection}
                    disabled={testingConnection || loading}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-2"
                  >
                    {testingConnection && <Loader2 className="h-4 w-4 animate-spin" />}
                    Test Connection
                  </Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center gap-2" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Integration Credentials
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* Tab 5: Client Access Requests */}
        <TabsContent value="client-requests" className="mt-6">
          <Card className="bg-slate-950 border-slate-800 text-white shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <UserCheck className="text-orange-500 h-5 w-5" />
                Client Access Requests
              </CardTitle>
              <CardDescription className="text-slate-400">
                Review and approve client access requests submitted by consultants.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingRequests ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                </div>
              ) : accessRequests.length === 0 ? (
                <div className="text-sm text-slate-400 italic text-center p-8 border border-dashed border-slate-800 rounded-xl">
                  No access requests submitted.
                </div>
              ) : (
                <div className="relative overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs uppercase bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th scope="col" className="px-6 py-4">Client Name</th>
                        <th scope="col" className="px-6 py-4">Requested By</th>
                        <th scope="col" className="px-6 py-4">User Role</th>
                        <th scope="col" className="px-6 py-4">Current Owner</th>
                        <th scope="col" className="px-6 py-4">Notes</th>
                        <th scope="col" className="px-6 py-4">Request Date</th>
                        <th scope="col" className="px-6 py-4">Status</th>
                        <th scope="col" className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessRequests.map((req) => (
                        <tr key={req.id} className="border-b border-slate-800 bg-slate-950/40 hover:bg-slate-900/60 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-100">
                            <div className="flex flex-col">
                              <span>{req.client?.companyName}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-normal">{req.client?.clientId}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-200">
                            <div className="flex flex-col">
                              <span>{req.userName || req.user?.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">{req.user?.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300">
                              {req.user?.role?.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-200">
                            {req.client?.assignments?.find((a: any) => a.isPrimary)?.user?.name || "Unassigned"}
                          </td>
                          <td className="px-6 py-4 text-slate-400 max-w-[200px] truncate animate-none" title={req.notes || ""}>
                            <span className="italic text-xs">{req.notes || "No note"}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {new Date(req.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              req.status === "Approved" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                              req.status === "Rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {req.status === "Requested" && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-500 text-white font-semibold"
                                  onClick={() => {
                                    setActiveRequest(req)
                                    setAssignmentType("secondary")
                                    setShowApproveModal(true)
                                  }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-900 text-red-500 hover:bg-red-950 font-semibold"
                                  onClick={() => {
                                    setActiveRequest(req)
                                    setRejectionReason("")
                                    setShowRejectModal(true)
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
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
                    required
                  >
                    <option value="" disabled>-- Select System Role --</option>
                    {dbRoles.length > 0 ? (
                      dbRoles.map((r: any) => {
                        const isProtected = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(r.name)
                        if (isProtected && userRole !== "SUPER_ADMIN") return null
                        
                        let label = r.name.replace(/_/g, " ")
                        if (r.name === "SALES_EXECUTIVE") label = "Interior Design Consultant (IDC)"
                        else if (r.name === "INTERIOR_DESIGN_CONSULTANT") label = "Interior Design Consultant"
                        else if (r.name === "ESTIMATOR") label = "Cost Estimator"
                        else if (r.name === "ACCOUNTS") label = "Finance & Accounts"
                        else if (r.name === "SUPER_ADMIN") label = "Super Administrator"
                        else if (r.name === "ADMIN") label = "Administrator"
                        else if (r.name === "MANAGER" || r.name === "SALES_MANAGER") label = "Manager"
                        else label = label.replace(/\b\w/g, (c: string) => c.toUpperCase())

                        return (
                          <option key={r.id} value={r.name}>
                            {label}
                          </option>
                        )
                      })
                    ) : (
                      <>
                        <option value="SALES_EXECUTIVE">Interior Design Consultant (IDC)</option>
                        <option value="INTERIOR_DESIGN_CONSULTANT">Interior Design Consultant</option>
                        <option value="ESTIMATOR">Cost Estimator</option>
                        {userRole === "SUPER_ADMIN" && (
                          <>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Administrator</option>
                            <option value="SUPER_ADMIN">Super Administrator</option>
                          </>
                        )}
                      </>
                    )}
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
                    disabled={userRole !== "SUPER_ADMIN"}
                    placeholder={userRole !== "SUPER_ADMIN" ? "Only Super Admin can reset password" : "Leave blank to keep current password"}
                    value={editUserData.password || ""}
                    onChange={(e) => setEditUserData({...editUserData, password: e.target.value})}
                    className="bg-slate-900 border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <Label htmlFor="editDesignation" className="text-slate-300">Designation (Optional)</Label>
                  <Input 
                    id="editDesignation"
                    type="text"
                    placeholder="e.g. Senior Architect"
                    value={editUserData.designation || ""}
                    onChange={(e) => setEditUserData({...editUserData, designation: e.target.value})}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2 pb-2">
                  <input 
                    id="editIsActive"
                    type="checkbox"
                    disabled={userRole !== "SUPER_ADMIN"}
                    checked={editUserData.isActive !== false}
                    onChange={(e) => setEditUserData({...editUserData, isActive: e.target.checked})}
                    className="rounded border-slate-850 text-orange-600 focus:ring-orange-600 bg-slate-900 h-4 w-4 disabled:opacity-50"
                  />
                  <Label htmlFor="editIsActive" className="text-slate-300 cursor-pointer select-none">Account is Active</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editRole" className="text-slate-300">System Role</Label>
                  <select 
                    id="editRole"
                    value={editUserData.role}
                    disabled={userRole !== "SUPER_ADMIN" && (editUserData.role === "SUPER_ADMIN" || editUserData.role === "ADMIN" || editUserData.role === "SALES_MANAGER" || editUserData.role === "MANAGER")}
                    onChange={(e) => setEditUserData({...editUserData, role: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {dbRoles.length > 0 ? (
                      dbRoles.map((r: any) => {
                        const isProtected = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(r.name)
                        // Allow if current user is Super Admin OR the target user already has this role (to avoid locking them out of options)
                        if (isProtected && userRole !== "SUPER_ADMIN" && editUserData.role !== r.name) return null
                        
                        let label = r.name.replace(/_/g, " ")
                        if (r.name === "SALES_EXECUTIVE") label = "Interior Design Consultant (IDC)"
                        else if (r.name === "INTERIOR_DESIGN_CONSULTANT") label = "Interior Design Consultant"
                        else if (r.name === "ESTIMATOR") label = "Cost Estimator"
                        else if (r.name === "ACCOUNTS") label = "Finance & Accounts"
                        else if (r.name === "SUPER_ADMIN") label = "Super Administrator"
                        else if (r.name === "ADMIN") label = "Administrator"
                        else if (r.name === "MANAGER" || r.name === "SALES_MANAGER") label = "Manager"
                        else label = label.replace(/\b\w/g, (c: string) => c.toUpperCase())

                        return (
                          <option key={r.id} value={r.name}>
                            {label}
                          </option>
                        )
                      })
                    ) : (
                      <>
                        <option value="SALES_EXECUTIVE">Interior Design Consultant (IDC)</option>
                        <option value="INTERIOR_DESIGN_CONSULTANT">Interior Design Consultant</option>
                        <option value="ESTIMATOR">Cost Estimator</option>
                        {(userRole === "SUPER_ADMIN" || editUserData.role === "SALES_MANAGER" || editUserData.role === "MANAGER") && (
                          <option value="MANAGER">Manager</option>
                        )}
                        {(userRole === "SUPER_ADMIN" || editUserData.role === "ADMIN") && (
                          <option value="ADMIN">Administrator</option>
                        )}
                        {(userRole === "SUPER_ADMIN" || editUserData.role === "SUPER_ADMIN") && (
                          <option value="SUPER_ADMIN">Super Administrator</option>
                        )}
                      </>
                    )}
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
                className="bg-red-600 hover:bg-red-500 text-white" 
                onClick={() => {
                  if (deleteConfirm.type === "user") {
                    executeDeleteUser(deleteConfirm.id, deleteConfirm.label)
                  } else {
                    executeDeleteTerm(deleteConfirm.type, deleteConfirm.id, deleteConfirm.label)
                  }
                  setDeleteConfirm(null)
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Approve Request Modal */}
      {showApproveModal && activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-slate-950 border-slate-800 text-white shadow-2xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="text-green-500 h-5 w-5" />
                Approve Client Access Request
              </CardTitle>
              <CardDescription className="text-slate-400">
                Grant access to client "{activeRequest.client?.companyName}" for consultant "{activeRequest.userName || activeRequest.user?.name}".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-slate-300">Assignment Type</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-800 rounded-lg bg-slate-900/40 hover:bg-slate-900 transition-colors">
                    <input 
                      type="radio" 
                      name="assignmentType" 
                      value="secondary"
                      checked={assignmentType === "secondary"}
                      onChange={() => setAssignmentType("secondary")}
                      className="accent-orange-500 h-4 w-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-100">Add as Secondary consultant (Recommended)</span>
                      <span className="text-xs text-slate-400 mt-0.5">Allows access without changing primary client ownership.</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-800 rounded-lg bg-slate-900/40 hover:bg-slate-900 transition-colors">
                    <input 
                      type="radio" 
                      name="assignmentType" 
                      value="primary"
                      checked={assignmentType === "primary"}
                      onChange={() => setAssignmentType("primary")}
                      className="accent-orange-500 h-4 w-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-100">Make Primary Assigned Consultant</span>
                      <span className="text-xs text-slate-400 mt-0.5">Replaces current salesperson ownership for this client.</span>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => { setShowApproveModal(false); setActiveRequest(null); }} className="text-slate-400 hover:text-slate-200" disabled={submittingAction}>
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={() => handleApproveRequest(activeRequest.id, assignmentType)}
                className="bg-green-600 hover:bg-green-500 text-white font-semibold flex items-center gap-2"
                disabled={submittingAction}
              >
                {submittingAction && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Approval
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Reject Request Modal */}
      {showRejectModal && activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-slate-950 border-slate-800 text-white shadow-2xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg text-red-500 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Reject Client Access Request
              </CardTitle>
              <CardDescription className="text-slate-400">
                Reject access to client "{activeRequest.client?.companyName}" for consultant "{activeRequest.userName || activeRequest.user?.name}".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="rejectionReason" className="text-slate-300">Rejection Reason (Optional)</Label>
                <textarea 
                  id="rejectionReason"
                  placeholder="e.g. This client is already managed by another division."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-600"
                />
              </div>
            </CardContent>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => { setShowRejectModal(false); setActiveRequest(null); setRejectionReason(""); }} className="text-slate-400 hover:text-slate-200" disabled={submittingAction}>
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={() => handleRejectRequest(activeRequest.id, rejectionReason)}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-2"
                disabled={submittingAction}
              >
                {submittingAction && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Rejection
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
