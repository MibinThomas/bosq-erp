"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast, Toaster } from "sonner"
import { 
  Building2, 
  Key, 
  FileText, 
  Trash2, 
  Plus, 
  Loader2, 
  Eye, 
  EyeOff, 
  Tag, 
  AlertTriangle,
  Image as ImageIcon,
  Hash,
  Palette,
  CheckCircle2,
  XCircle,
  Briefcase,
  Sliders,
  Settings2,
  Upload,
  Mail,
  MapPin,
  Receipt,
  Percent,
  RefreshCw,
  Cloud,
  Check,
  Sparkles,
  HelpCircle
} from "lucide-react"
import { MaterialsFinishesManager } from "@/components/settings/materials-finishes-manager"

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

  // 1. Company & Branding State
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
  const [companySeal, setCompanySeal] = useState("")
  const [promotionalImage, setPromotionalImage] = useState("")
  const [bankDetails, setBankDetails] = useState("")
  const [disclaimerTitle, setDisclaimerTitle] = useState("Disclaimers")
  const [disclaimer, setDisclaimer] = useState("")
  const [quotationSequence, setQuotationSequence] = useState<number | "">("")
  const [savingSequence, setSavingSequence] = useState(false)
  const [clientSequence, setClientSequence] = useState<number | "">("")
  const [savingClientSequence, setSavingClientSequence] = useState(false)

  // 2. Terms & Conditions State
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: "payment" | "condition"; label: string } | null>(null)

  // 3. Pricing Markup State
  const [dealerPct, setDealerPct] = useState(15)
  const [interiorPct, setInteriorPct] = useState(30)
  const [directPct, setDirectPct] = useState(50)
  const [onlinePct, setOnlinePct] = useState(75)
  const [savingPricing, setSavingPricing] = useState(false)
  const [recalculateExisting, setRecalculateExisting] = useState(false)

  // Fetch system settings on load
  useEffect(() => {
    fetchSettings()
    fetchTerms()
    fetchPricing()
    fetchSequence()
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
      console.error("Failed to fetch pricing:", err)
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
        body: JSON.stringify({ tenantId, clientId, clientSecret, siteId, driveId })
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
        setCompanySeal(data.company_seal || "")
        setPromotionalImage(data.quotation_promotional_image || "")
        setBankDetails(data.company_bank_details || "")
        setDisclaimerTitle(data.company_disclaimer_title || "Disclaimers")
        setDisclaimer(data.company_disclaimer || "")
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
          quotation_watermark_logo: watermarkLogo,
          company_seal: companySeal,
          quotation_promotional_image: promotionalImage,
          company_bank_details: bankDetails,
          company_disclaimer_title: disclaimerTitle,
          company_disclaimer: disclaimer,
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

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPricing(true)
    try {
      const res = await fetch("/api/settings/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealer: dealerPct,
          interior: interiorPct,
          direct: directPct,
          online: onlinePct,
          recalculate: recalculateExisting
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

  const handleDeleteTerm = async (type: "payment" | "condition", id: string, label: string) => {
    setDeleteConfirm({ id, type, label })
  }

  const executeDeleteTerm = async (type: "payment" | "condition", id: string, label: string) => {
    try {
      const res = await fetch(`/api/settings/terms?id=${id}&type=${type}`, {
        method: "DELETE"
      })
      if (res.ok) {
        toast.success(`Deleted ${label}`)
        fetchTerms()
      } else {
        toast.error("Failed to delete item")
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (pageLoading) {
    return (
      <div className="flex h-[65vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-base font-semibold text-muted-foreground">Loading system settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 font-sans pb-16 max-w-7xl mx-auto px-2 sm:px-4">
      <Toaster position="top-right" richColors />
      
      {/* ── Executive Hero Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card border rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-start sm:items-center space-x-4">
          <div className="p-4 rounded-2xl bg-primary/10 text-primary shrink-0 shadow-2xs">
            <Settings2 className="h-8 w-8 sm:h-9 sm:w-9" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                Settings Console
              </h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-3 py-1 rounded-full">
                System Administration
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage company profiles, quotation PDF branding, channel pricing margins, default terms, and SharePoint integrations.
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-3 flex-wrap font-mono text-xs sm:text-sm">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 px-3.5 py-1.5 font-bold rounded-2xl flex items-center gap-2">
            <Cloud className="h-4 w-4 text-emerald-500" />
            SharePoint Connected
          </Badge>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 px-3.5 py-1.5 font-bold rounded-2xl flex items-center gap-2">
            <Tag className="h-4 w-4 text-blue-500" />
            4 Margin Tiers Active
          </Badge>
        </div>
      </div>

      {/* ── Large, Accessible Segmented Navigation Bar ── */}
      <Tabs defaultValue="company" className="w-full space-y-8" onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2 custom-scrollbar">
          <TabsList className="inline-flex h-auto p-2 gap-2 bg-card border rounded-3xl shadow-2xs min-w-full sm:min-w-0">
            <TabsTrigger 
              value="company" 
              className="flex items-center gap-2.5 py-3 px-5 sm:px-6 rounded-2xl font-extrabold text-xs sm:text-sm text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Building2 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              Company Details
            </TabsTrigger>
            
            <TabsTrigger 
              value="pricing" 
              className="flex items-center gap-2.5 py-3 px-5 sm:px-6 rounded-2xl font-extrabold text-xs sm:text-sm text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Tag className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              Pricing Margins
            </TabsTrigger>

            <TabsTrigger 
              value="terms" 
              className="flex items-center gap-2.5 py-3 px-5 sm:px-6 rounded-2xl font-extrabold text-xs sm:text-sm text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <FileText className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              Default Terms
            </TabsTrigger>

            <TabsTrigger 
              value="materials" 
              className="flex items-center gap-2.5 py-3 px-5 sm:px-6 rounded-2xl font-extrabold text-xs sm:text-sm text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Palette className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              Materials Catalog
            </TabsTrigger>

            <TabsTrigger 
              value="integrations" 
              className="flex items-center gap-2.5 py-3 px-5 sm:px-6 rounded-2xl font-extrabold text-xs sm:text-sm text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Key className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              SharePoint Keys
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab 1: Materials & Finishes Catalog ── */}
        <TabsContent value="materials" className="mt-0">
          <MaterialsFinishesManager userRole={userRole} />
        </TabsContent>

        {/* ── Tab 2: Company Profile & PDF Branding ── */}
        <TabsContent value="company" className="mt-0 space-y-8">
          <form onSubmit={handleSaveSettings}>
            <Card className="bg-card border rounded-3xl shadow-xs overflow-hidden">
              <CardHeader className="border-b p-6 sm:p-8 bg-muted/20">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                    <Building2 className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                      Corporate Information & Tax Registration
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                      Enter corporate details rendered directly on PDF quotation headers and client documents.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-8 p-6 sm:p-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2.5">
                    <Label htmlFor="companyName" className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <Building2 className="h-4 w-4 text-muted-foreground" /> Company Name
                    </Label>
                    <Input 
                      id="companyName" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="text-sm font-semibold h-11 sm:h-12 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="companyEmail" className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground" /> Support / Sales Email
                    </Label>
                    <Input 
                      id="companyEmail" 
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="text-sm font-semibold h-11 sm:h-12 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-2.5 md:col-span-2">
                    <Label htmlFor="companyAddress" className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground" /> Company Office Address
                    </Label>
                    <Input 
                      id="companyAddress" 
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="text-sm font-semibold h-11 sm:h-12 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-2.5 md:col-span-2">
                    <Label htmlFor="companyTrn" className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <Receipt className="h-4 w-4 text-muted-foreground" /> Company TRN (Tax Registration Number)
                    </Label>
                    <Input 
                      id="companyTrn" 
                      value={companyTrn}
                      onChange={(e) => setCompanyTrn(e.target.value)}
                      className="text-sm font-mono font-bold h-11 sm:h-12 rounded-xl max-w-md"
                      required
                    />
                  </div>
                </div>

                {userRole === "SUPER_ADMIN" && (
                  <div className="pt-8 border-t space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2.5">
                        <ImageIcon className="text-primary h-5 w-5" />
                        Quotation PDF Document Branding & Logos
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Customize branding logos and seals rendered on Quotation PDF exports. Recommended formats: PNG, WebP, SVG.
                      </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      
                      {/* Header Logo Upload Card */}
                      <div className="p-5 sm:p-6 rounded-2xl border bg-muted/20 space-y-4 hover:border-border transition-all">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500" /> Quotation Header Logo
                          </Label>
                          {headerLogo && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs text-rose-600 hover:bg-rose-50 font-bold px-2.5 cursor-pointer"
                              onClick={() => setHeaderLogo("")}
                            >
                              Reset Default
                            </Button>
                          )}
                        </div>
                        
                        {headerLogo ? (
                          <div className="h-32 sm:h-36 w-full rounded-2xl bg-background border p-4 flex items-center justify-center overflow-hidden shadow-2xs">
                            <img src={headerLogo} alt="Quotation Header Logo" className="max-h-full max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-32 sm:h-36 w-full rounded-2xl border border-dashed flex flex-col items-center justify-center text-sm text-muted-foreground bg-background/50">
                            <span className="font-bold text-foreground">System Default Header Logo</span>
                            <span className="text-xs opacity-75 mt-1">(BOSQ Ergonomic Living Logo)</span>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            className="text-xs cursor-pointer h-10"
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
                          <p className="text-xs text-muted-foreground italic">
                            💡 Recommended size: <b>280px x 90px</b> (3:1 aspect ratio) transparent PNG/SVG.
                          </p>
                        </div>
                      </div>

                      {/* Footer Logo Upload Card */}
                      <div className="p-5 sm:p-6 rounded-2xl border bg-muted/20 space-y-4 hover:border-border transition-all">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500" /> Quotation Footer Logo
                          </Label>
                          {footerLogo && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs text-rose-600 hover:bg-rose-50 font-bold px-2.5 cursor-pointer"
                              onClick={() => setFooterLogo("")}
                            >
                              Reset Default
                            </Button>
                          )}
                        </div>

                        {footerLogo ? (
                          <div className="h-32 sm:h-36 w-full rounded-2xl bg-background border p-4 flex items-center justify-center overflow-hidden shadow-2xs">
                            <img src={footerLogo} alt="Quotation Footer Logo" className="max-h-full max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-32 sm:h-36 w-full rounded-2xl border border-dashed flex flex-col items-center justify-center text-sm text-muted-foreground bg-background/50">
                            <span className="font-bold text-foreground">System Default Footer Logo</span>
                            <span className="text-xs opacity-75 mt-1">(AYN Musk Furniture Logo)</span>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            className="text-xs cursor-pointer h-10"
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
                          <p className="text-xs text-muted-foreground italic">
                            💡 Recommended size: <b>180px x 45px</b> (4:1 aspect ratio) transparent PNG/SVG.
                          </p>
                        </div>
                      </div>

                      {/* Company Seal Upload Card */}
                      <div className="p-5 sm:p-6 rounded-2xl border bg-muted/20 space-y-4 hover:border-border transition-all">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-blue-500" /> Company Stamp / Seal Image
                          </Label>
                          {companySeal && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs text-rose-600 hover:bg-rose-50 font-bold px-2.5 cursor-pointer"
                              onClick={() => setCompanySeal("")}
                            >
                              Reset Default
                            </Button>
                          )}
                        </div>

                        {companySeal ? (
                          <div className="h-32 sm:h-36 w-full rounded-2xl bg-background border p-4 flex items-center justify-center overflow-hidden shadow-2xs">
                            <img src={companySeal} alt="Company Seal" className="max-h-full max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-32 sm:h-36 w-full rounded-2xl border border-dashed flex flex-col items-center justify-center text-sm text-muted-foreground bg-background/50">
                            <span className="font-bold text-foreground">No Stamp Uploaded</span>
                            <span className="text-xs opacity-75 mt-1">(Stamps bottom-left of signature)</span>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            className="text-xs cursor-pointer h-10"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setCompanySeal(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground italic">
                            💡 Transparent PNG stamp image placed next to signature block on PDF exports.
                          </p>
                        </div>
                      </div>

                      {/* Promotional Banner Upload Card */}
                      <div className="p-5 sm:p-6 rounded-2xl border bg-muted/20 space-y-4 hover:border-border transition-all">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-indigo-500" /> Quotation Promotional Banner
                          </Label>
                          {promotionalImage && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs text-rose-600 hover:bg-rose-50 font-bold px-2.5 cursor-pointer"
                              onClick={() => setPromotionalImage("")}
                            >
                              Remove Image
                            </Button>
                          )}
                        </div>

                        {promotionalImage ? (
                          <div className="h-32 sm:h-36 w-full rounded-2xl bg-background border p-4 flex items-center justify-center overflow-hidden shadow-2xs">
                            <img src={promotionalImage} alt="Promotional Banner" className="max-h-full max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-32 sm:h-36 w-full rounded-2xl border border-dashed flex flex-col items-center justify-center text-sm text-muted-foreground bg-background/50">
                            <span className="font-bold text-foreground">No Promotional Banner Uploaded</span>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp"
                            className="text-xs cursor-pointer h-10"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setPromotionalImage(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground italic">
                            💡 Displays alongside Cost Breakdown section. Recommended: Portrait (500x700).
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Bank Details & Disclaimers */}
                    <div className="grid gap-6 md:grid-cols-2 pt-4">
                      <div className="p-5 sm:p-6 rounded-2xl border bg-muted/20 space-y-3">
                        <Label className="text-sm font-bold text-foreground">Company Bank Account Details</Label>
                        <Textarea
                          rows={4}
                          value={bankDetails}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBankDetails(e.target.value)}
                          placeholder="Bank name, Account Number, IBAN, SWIFT Code, Branch Details..."
                          className="text-sm font-mono bg-background"
                        />
                        <p className="text-xs text-muted-foreground italic">
                          💡 Rendered in the left payment details panel on PDF quotation exports.
                        </p>
                      </div>

                      <div className="p-5 sm:p-6 rounded-2xl border bg-muted/20 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-bold text-foreground">Default Quotation Disclaimers</Label>
                          <Input
                            value={disclaimerTitle}
                            onChange={(e) => setDisclaimerTitle(e.target.value)}
                            placeholder="e.g. Disclaimers, Special Notes"
                            className="text-sm font-semibold h-10 bg-background"
                          />
                        </div>
                        <Textarea
                          rows={3}
                          value={disclaimer}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDisclaimer(e.target.value)}
                          placeholder="Optional disclaimer text included above Terms & Conditions..."
                          className="text-sm bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t flex justify-end">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm h-11 sm:h-12 px-6 rounded-xl cursor-pointer shadow-xs" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Corporate Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Sequence Counters Section */}
          {userRole === "SUPER_ADMIN" && (
            <Card className="bg-card border rounded-3xl shadow-xs overflow-hidden">
              <CardHeader className="border-b p-6 sm:p-8 bg-muted/20">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                    <Hash className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                      System Auto-Sequence Base Trackers
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                      Configure baseline numbers used for auto-incrementing Quotation & Client IDs.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="grid gap-6 md:grid-cols-2">
                  
                  <div className="p-5 sm:p-6 rounded-2xl border bg-muted/20 space-y-4">
                    <Label htmlFor="quotationSequence" className="text-sm font-bold text-foreground">Base Quotation Sequence Number</Label>
                    <div className="flex items-center gap-3">
                      <Input 
                        id="quotationSequence" 
                        type="number"
                        min="1"
                        value={quotationSequence}
                        onChange={(e) => setQuotationSequence(e.target.value ? parseInt(e.target.value) : "")}
                        className="text-base font-mono font-bold bg-background h-11"
                        placeholder="e.g. 3670"
                      />
                      <Button 
                        type="button" 
                        onClick={handleSaveSequence} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm h-11 px-4 rounded-xl cursor-pointer shrink-0"
                        disabled={savingSequence || quotationSequence === ""}
                      >
                        {savingSequence ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                        Update Base
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      Next quotation number will generate as base + 1.
                    </p>
                  </div>

                  <div className="p-5 sm:p-6 rounded-2xl border bg-muted/20 space-y-4">
                    <Label htmlFor="clientSequence" className="text-sm font-bold text-foreground">Base Client ID Sequence Number</Label>
                    <div className="flex items-center gap-3">
                      <Input 
                        id="clientSequence" 
                        type="number"
                        min="1"
                        value={clientSequence}
                        onChange={(e) => setClientSequence(e.target.value ? parseInt(e.target.value) : "")}
                        className="text-base font-mono font-bold bg-background h-11"
                        placeholder="e.g. 1000"
                      />
                      <Button 
                        type="button" 
                        onClick={handleSaveClientSequence} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm h-11 px-4 rounded-xl cursor-pointer shrink-0"
                        disabled={savingClientSequence || clientSequence === ""}
                      >
                        {savingClientSequence ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                        Update Base
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      Next client will generate as C-[base + 1].
                    </p>
                  </div>

                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab 3: Pricing Margins ── */}
        <TabsContent value="pricing" className="mt-0 space-y-8">
          <form onSubmit={handleSavePricing}>
            <Card className="bg-card border rounded-3xl shadow-xs overflow-hidden">
              <CardHeader className="border-b p-6 sm:p-8 bg-muted/20">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Tag className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                      Sales Channel Pricing Margins (%)
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                      Define baseline markup percentages used to auto-calculate channel prices from factory cost.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-8 p-6 sm:p-8">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  
                  {/* Dealer Margin Card */}
                  <div className="p-5 sm:p-6 rounded-2xl border bg-muted/20 space-y-4 hover:border-border transition-all">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-foreground">Dealer Channel</Label>
                      <Badge variant="outline" className="text-xs font-mono bg-background px-2.5 py-0.5">Tier 1</Badge>
                    </div>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={dealerPct}
                        onChange={(e) => setDealerPct(parseFloat(e.target.value))}
                        className="pl-8 text-base font-bold font-mono bg-background h-12 rounded-xl"
                        required
                        min="0"
                        max="99.99"
                        step="0.01"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Standard margin markup for wholesale dealers.</p>
                  </div>

                  {/* Interior Margin Card */}
                  <div className="p-5 sm:p-6 rounded-2xl border bg-muted/20 space-y-4 hover:border-border transition-all">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-foreground">Interior Consultant</Label>
                      <Badge variant="outline" className="text-xs font-mono bg-background px-2.5 py-0.5">Tier 2</Badge>
                    </div>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={interiorPct}
                        onChange={(e) => setInteriorPct(parseFloat(e.target.value))}
                        className="pl-8 text-base font-bold font-mono bg-background h-12 rounded-xl"
                        required
                        min="0"
                        max="99.99"
                        step="0.01"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Markup applied for interior design consultants.</p>
                  </div>

                  {/* Direct Client Margin Card */}
                  <div className="p-5 sm:p-6 rounded-2xl border bg-muted/20 space-y-4 hover:border-border transition-all">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-foreground">Direct Client</Label>
                      <Badge variant="outline" className="text-xs font-mono bg-background px-2.5 py-0.5">Tier 3</Badge>
                    </div>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={directPct}
                        onChange={(e) => setDirectPct(parseFloat(e.target.value))}
                        className="pl-8 text-base font-bold font-mono bg-background h-12 rounded-xl"
                        required
                        min="0"
                        max="99.99"
                        step="0.01"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Standard retail price markup for direct clients.</p>
                  </div>

                  {/* Online Catalog Margin Card */}
                  <div className="p-5 sm:p-6 rounded-2xl border bg-muted/20 space-y-4 hover:border-border transition-all">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-foreground">Online Catalog</Label>
                      <Badge variant="outline" className="text-xs font-mono bg-background px-2.5 py-0.5">Tier 4</Badge>
                    </div>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={onlinePct}
                        onChange={(e) => setOnlinePct(parseFloat(e.target.value))}
                        className="pl-8 text-base font-bold font-mono bg-background h-12 rounded-xl"
                        required
                        min="0"
                        max="99.99"
                        step="0.01"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">MSRP list price markup for web catalog.</p>
                  </div>

                </div>

                <div className="flex items-center space-x-3 pt-4 border-t">
                  <input 
                    id="recalculateExisting"
                    type="checkbox"
                    checked={recalculateExisting}
                    onChange={(e) => setRecalculateExisting(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-5 w-5 cursor-pointer"
                  />
                  <Label htmlFor="recalculateExisting" className="text-sm font-bold cursor-pointer select-none text-foreground flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-primary" /> Recalculate existing product catalog pricing upon saving
                  </Label>
                </div>

                <div className="pt-6 border-t flex justify-end">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm h-11 sm:h-12 px-6 rounded-xl cursor-pointer shadow-xs" disabled={savingPricing}>
                    {savingPricing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Pricing Margins
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* ── Tab 4: Default Quotation Terms & Conditions ── */}
        <TabsContent value="terms" className="mt-0 space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Payment Terms List */}
            <Card className="bg-card border rounded-3xl shadow-xs overflow-hidden">
              <CardHeader className="border-b p-6 sm:p-8 bg-muted/20 flex flex-row items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                    <Briefcase className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold">Payment Term Options</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground">Options available in quotation dropdowns.</CardDescription>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowAddPaymentModal(true)} 
                  variant="outline" 
                  size="sm" 
                  className="h-10 text-xs sm:text-sm font-bold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer flex items-center gap-1.5 px-4 rounded-xl"
                >
                  <Plus className="h-4 w-4" /> Add Option
                </Button>
              </CardHeader>

              <CardContent className="p-6 sm:p-8 space-y-4">
                {paymentTerms.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-10">No custom payment terms created yet.</p>
                ) : (
                  paymentTerms.map((term) => (
                    <div key={term.id} className="p-4 rounded-2xl bg-muted/20 border flex items-start justify-between hover:border-border transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{term.name}</span>
                          {term.isDefault && (
                            <Badge className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-0.5">
                              DEFAULT
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">{term.description || "No description provided."}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                        onClick={() => handleDeleteTerm("payment", term.id, term.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Terms & Conditions Clauses */}
            <Card className="bg-card border rounded-3xl shadow-xs overflow-hidden">
              <CardHeader className="border-b p-6 sm:p-8 bg-muted/20 flex flex-row items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold">Legal Terms Clauses</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground">Clauses included on PDF quotation exports.</CardDescription>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowAddTermsModal(true)} 
                  variant="outline" 
                  size="sm" 
                  className="h-10 text-xs sm:text-sm font-bold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer flex items-center gap-1.5 px-4 rounded-xl"
                >
                  <Plus className="h-4 w-4" /> Add Clause
                </Button>
              </CardHeader>

              <CardContent className="p-6 sm:p-8 space-y-4">
                {termsConditions.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-10">No custom terms clauses created yet.</p>
                ) : (
                  termsConditions.map((cond) => (
                    <div key={cond.id} className="p-4 rounded-2xl bg-muted/20 border flex items-start justify-between hover:border-border transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{cond.title}</span>
                          {cond.isDefault && (
                            <Badge className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-0.5">
                              DEFAULT
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{cond.content}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0 ml-2"
                        onClick={() => handleDeleteTerm("condition", cond.id, cond.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* ── Tab 5: SharePoint Credentials Integration ── */}
        <TabsContent value="integrations" className="mt-0 space-y-8">
          <form onSubmit={handleSaveSettings}>
            <Card className="bg-card border rounded-3xl shadow-xs overflow-hidden">
              <CardHeader className="border-b p-6 sm:p-8 bg-muted/20">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Cloud className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                      Microsoft SharePoint & Graph API Credentials
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                      Configure Azure App Registration credentials for automatic SharePoint document synchronization.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-8 p-6 sm:p-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2.5">
                    <Label htmlFor="tenantId" className="text-sm font-bold text-foreground">Directory (Tenant) ID</Label>
                    <Input 
                      id="tenantId" 
                      type="password"
                      placeholder="e.g. 98d74360-a4e2-4ad2-9247-f406c295d619"
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                      className="text-sm font-mono h-11 sm:h-12 rounded-xl bg-background"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="clientId" className="text-sm font-bold text-foreground">Application (Client) ID</Label>
                    <Input 
                      id="clientId" 
                      type="password"
                      placeholder="e.g. 7118d073-306f-4c1a-a7af-a924ad85671a"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="text-sm font-mono h-11 sm:h-12 rounded-xl bg-background"
                    />
                  </div>

                  <div className="space-y-2.5 md:col-span-2">
                    <Label htmlFor="clientSecret" className="text-sm font-bold text-foreground flex items-center justify-between">
                      <span>Application Client Secret Value</span>
                      <button 
                        type="button" 
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-xs sm:text-sm text-primary hover:underline focus:outline-none flex items-center gap-1 font-bold cursor-pointer"
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showSecret ? "Hide Token" : "Show Token"}
                      </button>
                    </Label>
                    <Input 
                      id="clientSecret" 
                      type={showSecret ? "text" : "password"}
                      placeholder="Enter Client Secret Value token"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      className="text-sm font-mono h-11 sm:h-12 rounded-xl bg-background"
                    />
                  </div>

                  <div className="space-y-2.5 md:col-span-2">
                    <Label htmlFor="siteId" className="text-sm font-bold text-foreground">SharePoint Target Site ID</Label>
                    <Input 
                      id="siteId" 
                      placeholder="site.sharepoint.com,site-uuid-1,site-uuid-2"
                      value={siteId}
                      onChange={(e) => setSiteId(e.target.value)}
                      className="text-sm font-mono h-11 sm:h-12 rounded-xl bg-background"
                    />
                  </div>

                  <div className="space-y-2.5 md:col-span-2">
                    <Label htmlFor="driveId" className="text-sm font-bold text-foreground">SharePoint Target Drive ID</Label>
                    <Input 
                      id="driveId" 
                      placeholder="Documents Library ID"
                      value={driveId}
                      onChange={(e) => setDriveId(e.target.value)}
                      className="text-sm font-mono h-11 sm:h-12 rounded-xl bg-background"
                    />
                  </div>
                </div>

                {testingConnection && (
                  <div className="p-5 rounded-2xl bg-muted/40 border flex items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-sm font-medium text-foreground">Testing connection to SharePoint & resolving document libraries...</span>
                  </div>
                )}

                {testResult && (
                  <div className={`p-5 rounded-2xl border text-sm ${testResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"} space-y-4`}>
                    <div className="flex items-start gap-3">
                      {testResult.success ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className="font-extrabold text-base">
                          {testResult.success ? "SharePoint Connection Successful" : "SharePoint Connection Failed"}
                        </h4>
                        <p className="text-xs sm:text-sm mt-1">{testResult.message || testResult.error}</p>
                      </div>
                    </div>

                    {testResult.success && testResult.drives && (
                      <div className="space-y-3 pt-3 border-t border-emerald-500/20">
                        <div className="text-xs font-bold uppercase tracking-wider">Available Site Document Libraries:</div>
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {testResult.drives.map((d: any) => {
                            const isResolved = d.id === testResult.resolvedDriveId;
                            return (
                              <div 
                                key={d.id} 
                                className={`flex items-center justify-between p-3 rounded-xl ${isResolved ? "bg-emerald-600 text-white font-bold" : "bg-background/80 border text-muted-foreground text-xs"}`}
                              >
                                <span className="font-semibold text-sm">{d.name}</span>
                                <span className="font-mono text-xs opacity-80">{d.id}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-6 border-t flex justify-end gap-3">
                  <Button 
                    type="button" 
                    onClick={handleTestConnection}
                    disabled={testingConnection || loading}
                    variant="outline"
                    className="h-11 sm:h-12 px-5 text-sm font-bold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer flex items-center gap-2 rounded-xl"
                  >
                    {testingConnection && <Loader2 className="h-4 w-4 animate-spin" />}
                    Test Connection
                  </Button>
                  
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm h-11 sm:h-12 px-6 rounded-xl cursor-pointer shadow-xs" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Integration Keys
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>

      {/* ── Add Payment Term Modal ── */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg bg-card border text-card-foreground shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b p-6 bg-muted/20">
              <CardTitle className="text-lg font-bold">Add Payment Term Option</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddPaymentTerm}>
              <CardContent className="space-y-5 p-6">
                <div className="space-y-2">
                  <Label htmlFor="payName" className="text-sm font-bold">Payment Term Label</Label>
                  <Input 
                    id="payName"
                    placeholder="e.g. 50% Advance, 50% on Delivery"
                    value={paymentName}
                    onChange={(e) => setPaymentName(e.target.value)}
                    className="text-sm font-medium h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payDesc" className="text-sm font-bold">Detailed Description</Label>
                  <Input 
                    id="payDesc"
                    placeholder="Details about PDC terms, advance terms, etc."
                    value={paymentDesc}
                    onChange={(e) => setPaymentDesc(e.target.value)}
                    className="text-sm font-medium h-11 rounded-xl"
                  />
                </div>
                <div className="flex items-center space-x-2.5 pt-2">
                  <input 
                    id="payDefault"
                    type="checkbox"
                    checked={paymentIsDefault}
                    onChange={(e) => setPaymentIsDefault(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-5 w-5 cursor-pointer"
                  />
                  <Label htmlFor="payDefault" className="text-sm font-bold cursor-pointer select-none">Set as primary default selection</Label>
                </div>
              </CardContent>
              <div className="p-5 border-t bg-muted/20 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowAddPaymentModal(false)} className="text-sm font-bold h-10 px-4 cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-extrabold text-sm h-10 px-5 rounded-xl cursor-pointer" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Save Option
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Add Terms Condition Clause Modal ── */}
      {showAddTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg bg-card border text-card-foreground shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b p-6 bg-muted/20">
              <CardTitle className="text-lg font-bold">Add Terms Clause</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddTermsCondition}>
              <CardContent className="space-y-5 p-6">
                <div className="space-y-2">
                  <Label htmlFor="termTitle" className="text-sm font-bold">Clause Title</Label>
                  <Input 
                    id="termTitle"
                    placeholder="e.g. Delivery Schedule, Warranty"
                    value={termTitle}
                    onChange={(e) => setTermTitle(e.target.value)}
                    className="text-sm font-medium h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termContent" className="text-sm font-bold">Clause Details / Content</Label>
                  <textarea 
                    id="termContent"
                    placeholder="Detailed content of this terms clause..."
                    value={termContent}
                    onChange={(e) => setTermContent(e.target.value)}
                    rows={4}
                    className="w-full bg-background border border-border rounded-xl p-3.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2.5 pt-2">
                  <input 
                    id="termDefault"
                    type="checkbox"
                    checked={termIsDefault}
                    onChange={(e) => setTermIsDefault(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-5 w-5 cursor-pointer"
                  />
                  <Label htmlFor="termDefault" className="text-sm font-bold cursor-pointer select-none">Include on generated PDF quotations by default</Label>
                </div>
              </CardContent>
              <div className="p-5 border-t bg-muted/20 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowAddTermsModal(false)} className="text-sm font-bold h-10 px-4 cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-extrabold text-sm h-10 px-5 rounded-xl cursor-pointer" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Save Clause
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-card border text-card-foreground shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b p-6 bg-muted/20">
              <CardTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Confirm Deletion
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                Are you sure you want to delete "{deleteConfirm.label}"? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <div className="p-5 bg-muted/20 flex justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setDeleteConfirm(null)} 
                className="text-sm font-bold h-10 px-4 cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm h-10 px-5 rounded-xl cursor-pointer" 
                onClick={() => {
                  executeDeleteTerm(deleteConfirm.type, deleteConfirm.id, deleteConfirm.label)
                  setDeleteConfirm(null)
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
