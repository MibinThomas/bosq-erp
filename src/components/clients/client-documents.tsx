"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { FileText, Download, Trash2, UploadCloud, FileIcon, Loader2, Plus, Calendar, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ClientDocument {
  id: string
  title: string
  documentType: string
  sharepointUrl: string
  fileExtension: string
  fileSize: number
  uploadedByName: string
  createdAt: string
}

interface ClientDocumentsProps {
  clientId: string
}

export function ClientDocuments({ clientId }: ClientDocumentsProps) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role

  const canUpload = userRole === "SUPER_ADMIN" || userRole === "ADMIN"

  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // Upload Dialog State
  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [docType, setDocType] = useState("VAT_CERTIFICATE")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [clientId])

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/documents`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
      }
    } catch (error) {
      console.error("Failed to fetch documents", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      if (!title) {
        setTitle(selectedFile.name.split('.').slice(0, -1).join('.'))
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !title || !docType) {
      toast.error("Please fill all required fields")
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("title", title)
    formData.append("documentType", docType)

    try {
      const res = await fetch(`/api/clients/${clientId}/documents`, {
        method: "POST",
        body: formData
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to upload document")
      }

      toast.success("Document uploaded successfully")
      setUploadOpen(false)
      setFile(null)
      setTitle("")
      setDocType("VAT_CERTIFICATE")
      fetchDocuments() // Refresh list
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId: string, docTitle: string) => {
    if (!confirm(`Are you sure you want to delete ${docTitle}?`)) return

    try {
      const res = await fetch(`/api/clients/${clientId}/documents/${docId}`, {
        method: "DELETE"
      })
      
      if (!res.ok) {
        throw new Error("Failed to delete document")
      }

      toast.success("Document deleted")
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Company Documents</h2>
          <p className="text-sm text-muted-foreground">Manage legal and business documents for this client.</p>
        </div>
        {canUpload && (
          <>
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Company Document</DialogTitle>
                <DialogDescription>
                  Upload a new document to the client's SharePoint folder.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Document Type</label>
                  <Select value={docType} onValueChange={(val) => setDocType(val || "VAT_CERTIFICATE")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VAT_CERTIFICATE">VAT Certificate</SelectItem>
                      <SelectItem value="TRADE_LICENSE">Trade License</SelectItem>
                      <SelectItem value="COMPANY_PROFILE">Company Profile</SelectItem>
                      <SelectItem value="AGREEMENT">Signed Agreement</SelectItem>
                      <SelectItem value="CUSTOM">Custom / Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Document Title</label>
                  <Input 
                    placeholder="e.g. VAT Certificate 2024"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">File</label>
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                    {file ? (
                      <div className="text-sm font-medium text-primary">{file.name}</div>
                    ) : (
                      <>
                        <div className="text-sm font-medium">Click to select file</div>
                        <div className="text-xs text-muted-foreground mt-1">PDF, DOC, XLS, or Images</div>
                      </>
                    )}
                    <Input 
                      ref={fileInputRef}
                      type="file" 
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
                <Button onClick={handleUpload} disabled={!file || !title || uploading}>
                  {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Upload
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-2xl border-dashed bg-muted/10">
          <FileText className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No documents found</h3>
          <p className="text-sm text-muted-foreground mb-6">There are no documents uploaded for this client yet.</p>
          {canUpload && (
            <Button variant="outline" onClick={() => setUploadOpen(true)}>
              <UploadCloud className="h-4 w-4 mr-2" />
              Upload First Document
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="border rounded-2xl p-5 bg-card flex flex-col shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate" title={doc.title}>{doc.title}</h4>
                  <p className="text-xs text-muted-foreground uppercase">{doc.documentType.replace(/_/g, " ")}</p>
                </div>
              </div>

              <div className="space-y-2 mt-auto mb-4 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <span className="truncate">{doc.uploadedByName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <span className="font-mono">{formatFileSize(doc.fileSize)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t">
                {doc.sharepointUrl ? (
                  <Button variant="outline" className="flex-1 h-8 text-xs" onClick={() => window.open(doc.sharepointUrl, "_blank", "noopener,noreferrer")}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    View / Download
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="flex-1 h-8 text-xs">
                    Processing...
                  </Button>
                )}
                {canUpload && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(doc.id, doc.title)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
