"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Plus, Trash2, Save, Send, CheckCircle, FileText, ArrowLeft, Loader2, Download, Search, Upload, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

// Helper to format currency
const formatCurr = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function BoqBuilderPage() {
  const { id } = useParams()
  const router = useRouter()
  const isNew = id === "new"
  
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isIDC = userRole === "SALES_EXECUTIVE" || userRole === "SALES_MANAGER" || userRole === "ADMIN"
  const isEstimator = userRole === "ESTIMATOR"

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const [exporting, setExporting] = useState(false)

  // BOQ Header State
  const [boqNo, setBoqNo] = useState("")
  const [clientId, setClientId] = useState("")
  const [projectName, setProjectName] = useState("")
  const [customerSegment, setCustomerSegment] = useState("Direct")
  const [status, setStatus] = useState("DRAFT")
  const [notes, setNotes] = useState("")

  const isSentToEstimator = status === "SENT_TO_ESTIMATOR" || status === "PENDING_COSTING"
  const isCostingCompleted = status === "COSTING_COMPLETED"
  
  let canEditPricing = true
  if (isCostingCompleted) {
    canEditPricing = userRole === "ADMIN" // Locked for both IDC and Estimator
  } else if (isSentToEstimator) {
    canEditPricing = isEstimator || userRole === "ADMIN"
  } else {
    canEditPricing = isIDC || userRole === "ADMIN" || userRole === "SALES_MANAGER"
  }
  const [termsConditions, setTermsConditions] = useState("Design Approval & Client Responsibility\n\nAll final design approvals—including but not limited to dimensions, materials, colors, layouts, and product specifications—are the sole responsibility of the client. BOSQ provides detailed quotations and design documentation for client review and confirmation prior to production.")

  // Clients list for dropdown
  const [clients, setClients] = useState<any[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)

  // Products list
  const [products, setProducts] = useState<any[]>([])
  const [productSearch, setProductSearch] = useState<{ [key: number]: string }>({})
  const [productDropdownOpen, setProductDropdownOpen] = useState<{ [key: number]: boolean }>({})

  // Items State
  const [items, setItems] = useState<any[]>([])
  
  // Convert Modal State
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [paymentTerms, setPaymentTerms] = useState("50% Advance, 50% on Delivery")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [validityDate, setValidityDate] = useState("")

  const [estimators, setEstimators] = useState<any[]>([])
  const [estimatorModalOpen, setEstimatorModalOpen] = useState(false)
  const [selectedEstimator, setSelectedEstimator] = useState("")
  const [sendingToEstimator, setSendingToEstimator] = useState(false)

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch("/api/clients")
        const data = await res.json()
        setClients(data)
      } catch (err) {
        console.error("Failed to load clients", err)
      }
    }
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products")
        const data = await res.json()
        setProducts(data)
      } catch (err) {
        console.error("Failed to load products", err)
      }
    }
    async function fetchEstimators() {
      try {
        const res = await fetch("/api/estimators")
        if (res.ok) setEstimators(await res.json())
      } catch (e) {}
    }

    fetchClients()
    fetchProducts()
    fetchEstimators()
  }, [])

  useEffect(() => {
    if (isNew) return
    async function fetchBoq() {
      try {
        const res = await fetch(`/api/boq/${id}`)
        if (!res.ok) throw new Error("Failed to fetch BOQ")
        const data = await res.json()
        
        setBoqNo(data.boqNumber)
        setClientId(data.clientId)
        setProjectName(data.projectName || "")
        setCustomerSegment(data.customerSegment)
        setStatus(data.status)
        setNotes(data.notes || "")
        if (data.termsConditions) setTermsConditions(data.termsConditions)
        
        if (data.items && data.items.length > 0) {
          setItems(data.items.map((i: any) => ({ 
            ...i, 
            id: i.id || crypto.randomUUID(),
            type: i.productId ? "standard" : "custom"
          })))
        }
      } catch (err) {
        console.error("Error loading BOQ", err)
        toast.error("Failed to load BOQ")
      } finally {
        setLoading(false)
      }
    }
    fetchBoq()
  }, [id, isNew])

  const addItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      type: "custom",
      productId: "",
      customImageUrl: "",
      description: "",
      specifications: "",
      quantity: 1,
      unit: "Nos",
      materialCost: 0,
      laborCost: 0,
      installationCost: 0,
      transportCost: 0,
      overheadCost: 0,
      unitCost: 0,
      totalCost: 0,
      marginPercentage: 0,
      unitSellingPrice: 0,
      totalSellingPrice: 0
    }])
  }

  const removeItem = (idx: number) => {
    const newItems = [...items]
    newItems.splice(idx, 1)
    setItems(newItems)
  }

  const updateItem = (idx: number, field: string, val: any) => {
    const newItems = [...items]
    const item = { ...newItems[idx], [field]: val }
    
    // Auto-fill product details if changing productId
    if (field === "productId" && val) {
      const selectedProduct = products.find(p => p.id === val)
      if (selectedProduct) {
        item.description = selectedProduct.productName
        item.specifications = `${selectedProduct.productCode} - ${selectedProduct.specifications || ""}`
        item.materialCost = selectedProduct.costPrice || 0
        item.customImageUrl = selectedProduct.imageUrl || ""
        // Force recalculation of numeric fields below
      }
    }

    if (field === "type") {
      if (val === "custom") {
        item.productId = ""
      }
    }
    
    // Auto calculate if numeric fields change
    const numericFields = ["materialCost", "laborCost", "installationCost", "transportCost", "overheadCost", "quantity", "marginPercentage", "unitSellingPrice", "productId"]
    if (numericFields.includes(field)) {
      const q = parseFloat(item.quantity) || 0
      
      if (field !== "unitSellingPrice") {
        const mat = parseFloat(item.materialCost) || 0
        const lab = parseFloat(item.laborCost) || 0
        const inst = parseFloat(item.installationCost) || 0
        const trans = parseFloat(item.transportCost) || 0
        const ovh = parseFloat(item.overheadCost) || 0
        
        item.unitCost = mat + lab + inst + trans + ovh
        item.totalCost = item.unitCost * q
        
        const margin = parseFloat(item.marginPercentage) || 0
        item.unitSellingPrice = item.unitCost * (1 + (margin / 100))
        item.totalSellingPrice = item.unitSellingPrice * q
      } else {
        // If they manually edit unit selling price, reverse calculate margin %
        const unitSell = parseFloat(item.unitSellingPrice) || 0
        item.totalSellingPrice = unitSell * q
        if (item.unitCost > 0) {
          item.marginPercentage = ((unitSell / item.unitCost) - 1) * 100
        }
      }
    }
    
    newItems[idx] = item
    setItems(newItems)
  }

  const handleImageUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Create a temporary loading state for the image URL if needed
    toast.info("Uploading image...")
    const formData = new FormData()
    formData.append("file", file)
    
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) {
        updateItem(idx, "customImageUrl", data.url)
        toast.success("Image uploaded successfully")
      } else {
        throw new Error(data.error || "Upload failed")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to upload image")
    }
  }

  // Totals Calculation for UI Display
  const grossTotalCost = items.reduce((sum, item) => sum + (parseFloat(item.totalCost) || 0), 0)
  const grossSellingPrice = items.reduce((sum, item) => sum + (parseFloat(item.totalSellingPrice) || 0), 0)
  const grossMargin = grossSellingPrice - grossTotalCost

  const handleSave = async (newStatus?: string) => {
    if (!clientId) return toast.error("Please select a client")
    if (items.length === 0) return toast.error("Please add at least one item")

    const finalStatus = newStatus || status

    setSaving(true)
    try {
      const payload = {
        clientId,
        projectName,
        customerSegment,
        status: finalStatus,
        notes,
        termsConditions,
        items
      }

      if (isNew) {
        const res = await fetch("/api/boq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || "Failed to create BOQ")
        }
        const created = await res.json()
        toast.success("BOQ created successfully")
        router.push(`/boq/${created.id}`)
      } else {
        const res = await fetch(`/api/boq/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || "Failed to update BOQ")
        }
        toast.success("BOQ updated successfully")
        if (newStatus) setStatus(newStatus)
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while saving")
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSendToEstimator = async () => {
    if (!clientId) return toast.error("Client is required")
    if (items.length === 0) return toast.error("At least one item is required")
    if (!selectedEstimator) return toast.error("Please select an estimator")
    
    setSendingToEstimator(true)
    try {
      // Auto-save the BOQ first
      const payload = { clientId, projectName, customerSegment, status, notes, termsConditions, items }
      const saveRes = await fetch(`/api/boq/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!saveRes.ok) throw new Error("Failed to save BOQ before sending")

      const res = await fetch(`/api/boq/${id}/send-to-estimator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimatorId: selectedEstimator })
      })
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Failed to send to estimator")
      }
      
      toast.success("BOQ Sent to Estimator & uploaded to SharePoint")
      setStatus("SENT_TO_ESTIMATOR")
      setEstimatorModalOpen(false)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to send to estimator")
    } finally {
      setSendingToEstimator(false)
    }
  }

  const handleCompleteCosting = async () => {
    // First save the BOQ
    setSaving(true)
    const payload = { clientId, projectName, customerSegment, status, notes, termsConditions, items }
    try {
      const saveRes = await fetch(`/api/boq/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!saveRes.ok) throw new Error("Failed to save before marking completed")

      const res = await fetch(`/api/boq/${id}/complete-costing`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to complete costing")
      
      toast.success("Costing completed! IDC has been notified.")
      setStatus("COSTING_COMPLETED")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const handleConvert = async () => {
    if (!paymentTerms || !validityDate) return toast.error("Payment Terms and Validity Date are required")
    
    const selectedClient = clients.find(c => c.id === clientId)
    if (selectedClient && selectedClient.status && selectedClient.status !== "Approved") {
      const errorMsg = selectedClient.status === "Pending Approval"
        ? "This client is pending approval. Please contact Admin/Manager before creating quotation."
        : "This client has been rejected. Please contact Admin/Manager before creating quotation."
      toast.error(errorMsg)
      return
    }
    
    setConverting(true)
    try {
      const res = await fetch(`/api/boq/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentTerms, deliveryDate, validityDate })
      })
      
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to convert")
      }
      
      const { quotation } = await res.json()
      toast.success("Successfully converted to Quotation!")
      router.push(`/quotations`)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to convert to quotation")
    } finally {
      setConverting(false)
      setConvertModalOpen(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/boq/${id}/export`, { method: "POST" })
      if (!res.ok) throw new Error("Export failed")
      const data = await res.json()
      toast.success("Excel exported successfully to SharePoint")
      if (data.sharepointUrl) window.open(data.sharepointUrl, "_blank")
    } catch (err) {
      console.error(err)
      toast.error("Failed to export Excel")
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  const canEditCosting = isEstimator || userRole === "ADMIN" || userRole === "SALES_MANAGER"


  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/boq">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              {isNew ? "New BOQ Draft" : boqNo}
              {!isNew && (
                <Badge variant={status === "DRAFT" ? "outline" : "default"} className={
                  status === "PENDING_COSTING" ? "bg-amber-500" : 
                  status === "COSTING_COMPLETED" ? "bg-blue-600" : 
                  status === "CONVERTED" ? "bg-green-600" : ""
                }>
                  {status}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">Build items and prepare costing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export to Excel
            </Button>
          )}

          <Button variant="outline" onClick={() => handleSave()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>

          {/* Workflow Buttons */}
          {status === "DRAFT" && isIDC && !isNew && (
            <Button onClick={() => setEstimatorModalOpen(true)} className="bg-amber-600 hover:bg-amber-700">
              <Send className="mr-2 h-4 w-4" /> Send to Estimator
            </Button>
          )}
          {isSentToEstimator && isEstimator && !isNew && (
            <Button onClick={handleCompleteCosting} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} 
              Mark Costing Completed
            </Button>
          )}
          {status === "COSTING_COMPLETED" && isIDC && !isNew && (
            <Button onClick={() => setConvertModalOpen(true)} className="bg-green-600 hover:bg-green-700">
              <FileText className="mr-2 h-4 w-4" /> Create Quotation
            </Button>
          )}
        </div>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-card p-6 rounded-xl border shadow-sm">
        <div className="space-y-2 relative">
          <label className="text-sm font-medium">Client <span className="text-red-500">*</span></label>
          <div className="relative">
            <div 
              className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer ${!clientId && 'text-muted-foreground'} ${(!isNew && !isIDC) && 'opacity-50 cursor-not-allowed'}`}
              onClick={() => {
                if (isNew || isIDC) setClientDropdownOpen(!clientDropdownOpen)
              }}
            >
              {clientId ? clients.find(c => c.id === clientId)?.companyName : "Select a client..."}
            </div>
            
            {clientDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                  {clients.filter(c => {
                    if (c.status && c.status !== "Approved") return false;
                    if (!clientSearch) return true;
                    const s = clientSearch.toLowerCase();
                    return (
                      c.companyName?.toLowerCase().includes(s) ||
                      c.contactPerson?.toLowerCase().includes(s) ||
                      c.email?.toLowerCase().includes(s) ||
                      c.phone?.toLowerCase().includes(s)
                    );
                  }).length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">No clients found.</div>
                  ) : (
                    clients.filter(c => {
                      if (c.status && c.status !== "Approved") return false;
                      if (!clientSearch) return true;
                      const s = clientSearch.toLowerCase();
                      return (
                        c.companyName?.toLowerCase().includes(s) ||
                        c.contactPerson?.toLowerCase().includes(s) ||
                        c.email?.toLowerCase().includes(s) ||
                        c.phone?.toLowerCase().includes(s)
                      );
                    }).map(c => (
                      <div
                        key={c.id}
                        className="relative flex flex-col cursor-pointer select-none rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground border-b last:border-0"
                        onClick={() => {
                          setClientId(c.id)
                          setClientDropdownOpen(false)
                          setClientSearch("")
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{c.companyName}</span>
                          <span className="font-mono text-xs text-muted-foreground">{c.clientId}</span>
                        </div>
                        {(c.contactPerson || c.email || c.phone) && (
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1">
                            {c.contactPerson && <span>{c.contactPerson}</span>}
                            {c.email && <span>&bull; {c.email}</span>}
                            {c.phone && <span>&bull; {c.phone}</span>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Project Name</label>
          <Input placeholder="E.g. Main Office Furnishing" value={projectName} onChange={(e) => setProjectName(e.target.value)} disabled={!isIDC && !isNew} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Pricing Segment</label>
          <Select value={customerSegment} onValueChange={(val) => val && setCustomerSegment(val)} disabled={!isIDC && !isNew}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Direct">Direct</SelectItem>
              <SelectItem value="Dealer">Dealer</SelectItem>
              <SelectItem value="Interior">Interior Designer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Spreadsheet / Items Grid */}
      <div className="bg-card rounded-xl border shadow-sm flex flex-col">
        <div className="">
          <Table className="whitespace-nowrap">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-32">Item Type</TableHead>
                <TableHead className="w-16">Image</TableHead>
                <TableHead className="min-w-[200px]">Description & Specs</TableHead>
                <TableHead className="w-24">Qty</TableHead>
                
                {/* Costing Section */}
                <TableHead className="w-24 bg-amber-500/10 border-l border-amber-500/20 text-amber-900 dark:text-amber-400">Material Cost</TableHead>
                <TableHead className="w-24 bg-amber-500/10 text-amber-900 dark:text-amber-400">Labor Cost</TableHead>
                <TableHead className="w-24 bg-amber-500/10 text-amber-900 dark:text-amber-400">Inst/Trans/Ovh</TableHead>
                <TableHead className="w-24 bg-amber-500/20 text-amber-900 dark:text-amber-400 font-bold border-r border-amber-500/20">Unit Cost</TableHead>

                {/* Pricing Section */}
                {canEditPricing && (
                  <>
                    <TableHead className="w-24 bg-blue-500/10 text-blue-900 dark:text-blue-400">Margin %</TableHead>
                    <TableHead className="w-28 bg-blue-500/20 text-blue-900 dark:text-blue-400 font-bold">Unit Selling</TableHead>
                    <TableHead className="w-28 bg-green-500/20 text-green-900 dark:text-green-400 font-bold border-l border-green-500/20">Total Selling</TableHead>
                  </>
                )}
                
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.id} className="group hover:bg-muted/30">
                  <TableCell className="text-center font-medium text-muted-foreground py-4">{idx + 1}</TableCell>
                  
                  <TableCell className="p-3 align-top">
                    <Select value={item.type || "custom"} onValueChange={(v) => updateItem(idx, "type", v)} disabled={!canEditPricing}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Product</SelectItem>
                        <SelectItem value="custom">Custom Item</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell className="p-3 align-top text-center relative group/image">
                    {item.customImageUrl ? (
                      <div className="relative">
                        <img src={item.customImageUrl} alt="Preview" className="w-16 h-16 object-cover rounded mx-auto border bg-background shadow-sm" />
                        {canEditPricing && (
                          <button 
                            onClick={() => updateItem(idx, "customImageUrl", "")}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover/image:opacity-100 transition-opacity"
                            title="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex flex-col items-center justify-center mx-auto text-[10px] text-muted-foreground border relative overflow-hidden">
                        {canEditPricing && item.type === "custom" ? (
                          <>
                            <Upload className="h-4 w-4 mb-1" />
                            <span>Upload</span>
                            <input 
                              type="file" 
                              accept="image/*"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => handleImageUpload(idx, e)}
                            />
                          </>
                        ) : (
                          <span>No Img</span>
                        )}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="p-3 space-y-3 align-top min-w-[250px]">
                    {item.type === "standard" ? (
                      <div className="relative">
                        <Popover open={!!productDropdownOpen[idx]} onOpenChange={(open) => setProductDropdownOpen({ ...productDropdownOpen, [idx]: open })}>
                          <PopoverTrigger className="w-full text-left outline-none" disabled={!canEditPricing}>
                            <div className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-accent/50 ${!item.productId && 'text-muted-foreground'} ${!canEditPricing && 'opacity-50 cursor-not-allowed'}`}>
                              <span className="truncate">
                                {item.productId 
                                  ? products.find(p => p.id === item.productId)?.productName 
                                  : "Select a Product..."}
                              </span>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-[450px] p-0 shadow-xl border-border" align="start" sideOffset={4}>
                            <div className="flex items-center border-b px-3 bg-muted/30">
                              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                              <input
                                className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                placeholder="Search by name, SKU, or specs..."
                                value={productSearch[idx] || ""}
                                onChange={(e) => setProductSearch({ ...productSearch, [idx]: e.target.value })}
                                autoFocus
                              />
                            </div>
                            <div className="max-h-[350px] overflow-y-auto p-1 bg-popover">
                              {products.filter(p => `${p.productCode} ${p.productName} ${p.specifications}`.toLowerCase().includes((productSearch[idx] || "").toLowerCase())).length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">No products found.</div>
                              ) : (
                                products.filter(p => `${p.productCode} ${p.productName} ${p.specifications}`.toLowerCase().includes((productSearch[idx] || "").toLowerCase())).map(p => (
                                  <div
                                    key={p.id}
                                    className="relative flex cursor-pointer select-none gap-3 items-center rounded-md p-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground border-b last:border-0"
                                    onClick={() => {
                                      updateItem(idx, "productId", p.id)
                                      setProductDropdownOpen({ ...productDropdownOpen, [idx]: false })
                                      setProductSearch({ ...productSearch, [idx]: "" })
                                    }}
                                  >
                                    {p.imageUrl ? (
                                      <img src={p.imageUrl} alt={p.productName} className="w-12 h-12 rounded object-cover border shrink-0 bg-background" />
                                    ) : (
                                      <div className="w-12 h-12 rounded bg-muted border flex items-center justify-center shrink-0">
                                        <span className="text-[10px] text-muted-foreground">No Img</span>
                                      </div>
                                    )}
                                    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                                      <div className="font-semibold text-foreground truncate">{p.productName}</div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 truncate">
                                        <span className="font-mono font-bold text-primary">{p.productCode}</span>
                                        {p.specifications && <span className="truncate">&bull; {p.specifications}</span>}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="text-xs font-semibold text-amber-600 dark:text-amber-500">Cost: {formatCurr(p.costPrice || 0)}</div>
                                      <div className="text-[10px] text-muted-foreground">Price: {formatCurr(p.unitPrice || 0)}</div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        {item.description && (
                          <div className="mt-2 text-sm font-semibold text-foreground bg-muted/20 p-2 rounded-md border border-muted/50">
                            {item.description}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Textarea 
                        placeholder="Item Description" 
                        className="min-h-[50px] text-sm resize-y font-semibold" 
                        value={item.description} 
                        onChange={(e) => updateItem(idx, "description", e.target.value)} 
                        disabled={!canEditPricing} 
                      />
                    )}
                    
                    <Textarea 
                      placeholder="Specifications & Dimensions (Optional)" 
                      className="min-h-[60px] text-xs resize-y" 
                      value={item.specifications} 
                      onChange={(e) => updateItem(idx, "specifications", e.target.value)} 
                      disabled={!canEditPricing} 
                    />
                    
                    {item.type === "custom" && !item.customImageUrl && (
                      <div className="flex items-center gap-2">
                        <Input 
                          placeholder="Or paste an Image URL here" 
                          className="h-8 text-xs" 
                          value={item.customImageUrl || ""} 
                          onChange={(e) => updateItem(idx, "customImageUrl", e.target.value)} 
                          disabled={!canEditPricing} 
                        />
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell className="p-3 align-top">
                    <Input type="number" min="1" className="h-9 font-medium" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} disabled={!canEditPricing} />
                  </TableCell>

                  {/* Costing Section */}
                  <TableCell className="p-3 align-top bg-amber-500/5 border-l border-amber-500/10">
                    <Input type="number" className="h-9" value={item.materialCost} onChange={(e) => updateItem(idx, "materialCost", e.target.value)} disabled={!canEditCosting} />
                  </TableCell>
                  <TableCell className="p-3 align-top bg-amber-500/5">
                    <Input type="number" className="h-9" value={item.laborCost} onChange={(e) => updateItem(idx, "laborCost", e.target.value)} disabled={!canEditCosting} />
                  </TableCell>
                  <TableCell className="p-3 align-top bg-amber-500/5 space-y-2">
                    <div className="flex gap-1 flex-col">
                      <Input type="number" placeholder="Inst" className="h-8 text-xs px-2" title="Installation" value={item.installationCost} onChange={(e) => updateItem(idx, "installationCost", e.target.value)} disabled={!canEditCosting} />
                      <Input type="number" placeholder="Trn" className="h-8 text-xs px-2" title="Transport" value={item.transportCost} onChange={(e) => updateItem(idx, "transportCost", e.target.value)} disabled={!canEditCosting} />
                    </div>
                  </TableCell>
                  <TableCell className="p-3 align-top bg-amber-500/10 border-r border-amber-500/10">
                    <div className="flex h-9 w-full items-center justify-end rounded-md border border-transparent px-3 py-2 text-sm font-mono font-semibold bg-background/50">
                      {formatCurr(item.unitCost)}
                    </div>
                  </TableCell>

                  {/* Pricing Section */}
                  {canEditPricing && (
                    <>
                      <TableCell className="p-3 align-top bg-blue-500/5">
                        <Input type="number" className="h-9" value={item.marginPercentage} onChange={(e) => updateItem(idx, "marginPercentage", e.target.value)} />
                      </TableCell>
                      <TableCell className="p-3 align-top bg-blue-500/10">
                        <Input type="number" className="h-9 font-mono font-semibold text-blue-700 dark:text-blue-400" value={item.unitSellingPrice} onChange={(e) => updateItem(idx, "unitSellingPrice", e.target.value)} />
                      </TableCell>
                      <TableCell className="p-3 align-top bg-green-500/10 border-l border-green-500/10">
                        <div className="flex h-9 w-full items-center justify-end rounded-md border border-transparent px-3 py-2 text-sm font-mono font-bold text-green-700 dark:text-green-400 bg-background/50">
                          {formatCurr(item.totalSellingPrice)}
                        </div>
                      </TableCell>
                    </>
                  )}

                  <TableCell className="p-3 align-top text-center">
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 mt-1" onClick={() => removeItem(idx)} disabled={!canEditPricing}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="p-4 border-t bg-muted/20">
          <Button variant="outline" size="sm" onClick={addItem} disabled={!canEditPricing}>
            <Plus className="mr-2 h-4 w-4" /> Add Item Row
          </Button>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Notes</h3>
            <Textarea 
              placeholder="Add internal notes or conditions here..." 
              className="min-h-[120px]" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          
          {canEditPricing && (
            <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Terms & Conditions</h3>
              <Textarea 
                placeholder="Standard terms and conditions..." 
                className="min-h-[160px] text-xs" 
                value={termsConditions} 
                onChange={(e) => setTermsConditions(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4 h-fit">
          <h3 className="font-semibold text-lg border-b pb-2 text-right">Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-muted-foreground">Total Estimated Cost (Gross)</span>
              <span className="font-mono">AED {formatCurr(grossTotalCost)}</span>
            </div>
            {canEditPricing && (
              <>
                <div className="flex justify-between items-center text-sm font-medium text-blue-600">
                  <span>Total Margin Generated</span>
                  <span className="font-mono">AED {formatCurr(grossMargin)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium text-muted-foreground mt-2">
                  <span>Subtotal</span>
                  <span className="font-mono">AED {formatCurr(grossSellingPrice)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                  <span>VAT (5%)</span>
                  <span className="font-mono">AED {formatCurr(grossSellingPrice * 0.05)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center text-lg font-bold text-green-600">
                  <span>Final Total</span>
                  <span className="font-mono">AED {formatCurr(grossSellingPrice * 1.05)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Convert to Quotation Modal */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convert BOQ to Quotation</DialogTitle>
            <DialogDescription>
              This will lock the BOQ and generate a new Quotation PDF, pushing the Excel export to SharePoint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Validity Date <span className="text-red-500">*</span></label>
              <Input type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Date (Optional)</label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Terms <span className="text-red-500">*</span></label>
              <Select value={paymentTerms} onValueChange={(val) => val && setPaymentTerms(val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="100% Advance">100% Advance</SelectItem>
                  <SelectItem value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</SelectItem>
                  <SelectItem value="30 Days Post Delivery">30 Days Post Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConvert} disabled={converting} className="bg-green-600 hover:bg-green-700">
              {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to Estimator Modal */}
      <Dialog open={estimatorModalOpen} onOpenChange={setEstimatorModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send BOQ to Estimator</DialogTitle>
            <DialogDescription>
              This will lock the BOQ pricing fields, generate the Excel export based on the strict layout, and upload it to the client's SharePoint folder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign Estimator <span className="text-red-500">*</span></label>
              <Select value={selectedEstimator} onValueChange={(val) => val && setSelectedEstimator(val)}>
                <SelectTrigger><SelectValue placeholder="Select an estimator..." /></SelectTrigger>
                <SelectContent>
                  {estimators.map(est => (
                    <SelectItem key={est.id} value={est.id}>{est.name} ({est.email})</SelectItem>
                  ))}
                  {estimators.length === 0 && (
                    <SelectItem value="none" disabled>No estimators found in the system.</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEstimatorModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSendToEstimator} disabled={sendingToEstimator || !selectedEstimator} className="bg-amber-600 hover:bg-amber-700">
              {sendingToEstimator && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
