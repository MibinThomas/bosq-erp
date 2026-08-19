"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Save, Building2, User, Mail, Phone, MapPin, FileText, Hash, UploadCloud, X, FileIcon } from "lucide-react"
import { useSession } from "next-auth/react"
import { usePermissions } from "@/components/providers/PermissionsProvider"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

function ClientFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("editId")
  
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const { hasPermission, loading: loadingPerms } = usePermissions()
  const canCreate = hasPermission("CLIENTS", "create")
  const canEdit = hasPermission("CLIENTS", "edit")

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!editId)
  const [formData, setFormData] = useState({
    clientId: "",
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    clientType: "Project",
    trn: "",
    address: "",
    notes: "",
  })
  
  const [documents, setDocuments] = useState<{ file: File; title: string; documentType: string }[]>([])
  const [docUploadProgress, setDocUploadProgress] = useState<{ current: number; total: number } | null>(null)



  useEffect(() => {
    if (editId) {
      const fetchClient = async () => {
        try {
          const res = await fetch(`/api/clients/${editId}`)
          if (res.ok) {
            const data = await res.json()
            setFormData({
              clientId: data.clientId || "",
              companyName: data.companyName || "",
              contactPerson: data.contactPerson || "",
              email: data.email || "",
              phone: data.phone || "",
              clientType: data.clientType || "Project",
              trn: data.trn || "",
              address: data.address || "",
              notes: data.notes || "",
            })
          }
        } catch (error) {
          console.error("Failed to load client details for editing:", error)
          toast.error("Failed to load client details.")
        } finally {
          setLoading(false)
        }
      }
      fetchClient()
    }
  }, [editId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string | null) => {
    setFormData((prev) => ({ ...prev, clientType: value || "Project" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.companyName.trim()) {
      toast.error("Company name is required")
      return
    }

    setSaving(true)
    try {
      const url = editId ? `/api/clients/${editId}` : "/api/clients"
      const method = editId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Failed to ${editId ? "update" : "create"} client`)
      }

      const savedClient = await res.json()
      
      // Upload documents if any
      if (documents.length > 0) {
        setDocUploadProgress({ current: 0, total: documents.length })
        for (let i = 0; i < documents.length; i++) {
          const doc = documents[i]
          const formData = new FormData()
          formData.append("file", doc.file)
          formData.append("title", doc.title)
          formData.append("documentType", doc.documentType)
          
          try {
            const docRes = await fetch(`/api/clients/${savedClient.id}/documents`, {
              method: "POST",
              body: formData
            })
            if (!docRes.ok) throw new Error("Document upload failed")
          } catch (err) {
            console.error("Failed to upload document", doc.title, err)
            toast.error(`Failed to upload ${doc.title}`)
          }
          setDocUploadProgress({ current: i + 1, total: documents.length })
        }
      }

      toast.success(`Client ${savedClient.companyName} ${editId ? "updated" : "created"} successfully!`)
      router.push(`/clients/${savedClient.id}`)
    } catch (error: any) {
      console.error(`Error ${editId ? "updating" : "creating"} client:`, error)
      toast.error(error.message || `Failed to ${editId ? "update" : "create"} client. Please try again.`)
    } finally {
      setSaving(false)
      setDocUploadProgress(null)
    }
  }

  const handleAddDocument = (e: React.ChangeEvent<HTMLInputElement>, documentType: string, defaultTitle: string) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const title = documentType === "CUSTOM" ? prompt("Enter custom document name:") || file.name : defaultTitle
      setDocuments(prev => [...prev, { file, title, documentType }])
    }
    // reset input
    e.target.value = ""
  }

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  if (loadingPerms || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">
          {loadingPerms ? "Verifying authorization..." : "Loading client details..."}
        </p>
      </div>
    )
  }

  const hasAccess = editId ? canEdit : canCreate
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3 text-center">
        <p className="text-lg font-bold text-destructive">Access Denied</p>
        <p className="text-sm text-muted-foreground">You do not have permission to access this page.</p>
        <Link href="/clients">
          <Button variant="outline" className="mt-4">Back to Clients</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center space-x-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{editId ? "Edit Client Profile" : "Add New Client"}</h1>
          <p className="text-muted-foreground">
            {editId ? "Update the client profile and contact details." : "Create a new client profile and auto-generate their SharePoint folder."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border rounded-2xl p-6 bg-card text-card-foreground shadow-sm space-y-6">
          <h2 className="text-lg font-semibold border-b pb-2">Company Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client ID Field (Editable by Super Admin) */}
            {editId && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-primary" />
                    Client ID <span className="text-red-500">*</span>
                  </span>
                  {userRole !== "SUPER_ADMIN" && (
                    <span className="text-[11px] text-muted-foreground font-normal">
                      🔒 Super Admin Permission Required to Edit
                    </span>
                  )}
                </label>
                <Input
                  name="clientId"
                  placeholder="e.g. C-1002"
                  value={formData.clientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                  disabled={userRole !== "SUPER_ADMIN"}
                  className={userRole !== "SUPER_ADMIN" ? "bg-muted/50 font-mono" : "font-mono font-bold text-primary"}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  {userRole === "SUPER_ADMIN"
                    ? "As Super Admin, you can edit the Client ID. Uniqueness validation will be enforced on save."
                    : "Client ID is read-only. Only Super Admin users can modify Client IDs."}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Company Name <span className="text-red-500">*</span>
              </label>
              <Input
                name="companyName"
                placeholder="e.g. Acme Corporation"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-primary" />
                Contact Person
              </label>
              <Input
                name="contactPerson"
                placeholder="e.g. John Smith"
                value={formData.contactPerson}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-primary" />
                Email Address
              </label>
              <Input
                type="email"
                name="email"
                placeholder="e.g. contact@acme.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-primary" />
                Phone Number
              </label>
              <Input
                name="phone"
                placeholder="e.g. +971 50 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                Client Type <span className="text-red-500">*</span>
              </label>
              <Select value={formData.clientType} onValueChange={handleSelectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dealer">Dealer</SelectItem>
                  <SelectItem value="Interior">Interior</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                  <SelectItem value="Special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-primary" />
                TRN (Tax Registration Number)
              </label>
              <Input
                name="trn"
                placeholder="e.g. 100012345678901"
                value={formData.trn}
                onChange={(e) => setFormData(prev => ({ ...prev, trn: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Address
            </label>
            <Textarea
              name="address"
              placeholder="e.g. Office 402, Building A, Downtown Dubai, UAE"
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Internal Notes
            </label>
            <Textarea
              name="notes"
              placeholder="Add any specific requirements or details..."
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="border rounded-2xl p-6 bg-card text-card-foreground shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h2 className="text-lg font-semibold">Company Documents</h2>
              <p className="text-sm text-muted-foreground">Optional: Upload legal and business documents. Files will be synced to SharePoint.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: "VAT_CERTIFICATE", label: "VAT Certificate" },
              { type: "TRADE_LICENSE", label: "Trade License" },
              { type: "COMPANY_PROFILE", label: "Company Profile" },
              { type: "AGREEMENT", label: "Signed Agreement" },
            ].map(docTemplate => {
              const existing = documents.find(d => d.documentType === docTemplate.type)
              return (
                <div key={docTemplate.type} className="border rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{docTemplate.label}</h3>
                      <p className="text-[10px] text-muted-foreground uppercase">{docTemplate.type.replace(/_/g, ' ')}</p>
                    </div>
                    {existing && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] h-5">Selected</Badge>
                    )}
                  </div>
                  
                  {existing ? (
                    <div className="flex items-center justify-between bg-background border rounded-lg p-2 mt-auto">
                      <div className="flex items-center gap-2 truncate">
                        <FileIcon className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs truncate" title={existing.file.name}>{existing.file.name}</span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive shrink-0" onClick={() => removeDocument(documents.indexOf(existing))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-auto">
                      <Input 
                        type="file" 
                        id={`upload-${docTemplate.type}`} 
                        className="hidden" 
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        onChange={(e) => handleAddDocument(e, docTemplate.type, docTemplate.label)}
                      />
                      <label htmlFor={`upload-${docTemplate.type}`}>
                        <div className="flex items-center justify-center gap-2 border border-dashed border-primary/30 rounded-lg p-2 text-xs font-medium text-primary hover:bg-primary/5 cursor-pointer transition-colors">
                          <UploadCloud className="h-4 w-4" />
                          Upload File
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )
            })}
            
            {/* Custom Documents List */}
            {documents.filter(d => d.documentType === "CUSTOM").map((doc, idx) => (
              <div key={`custom-${idx}`} className="border rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden bg-muted/20">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm truncate" title={doc.title}>{doc.title}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase">CUSTOM</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] h-5">Selected</Badge>
                </div>
                <div className="flex items-center justify-between bg-background border rounded-lg p-2 mt-auto">
                  <div className="flex items-center gap-2 truncate">
                    <FileIcon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs truncate" title={doc.file.name}>{doc.file.name}</span>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive shrink-0" onClick={() => removeDocument(documents.indexOf(doc))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            
            {/* Add Custom Document Button */}
            <div className="border border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-transparent min-h-[120px]">
              <Input 
                type="file" 
                id="upload-CUSTOM" 
                className="hidden" 
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(e) => handleAddDocument(e, "CUSTOM", "Custom Document")}
              />
              <label htmlFor="upload-CUSTOM" className="flex flex-col items-center cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mb-1">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold">Add Custom Document</span>
                <span className="text-[10px]">PDF, DOC, XLS, IMG</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4">
          <Link href="/clients">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {docUploadProgress 
                  ? `Uploading (${docUploadProgress.current}/${docUploadProgress.total})...` 
                  : editId ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {editId ? "Update Client" : "Save Client"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewClientPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ClientFormContent />
    </Suspense>
  )
}
