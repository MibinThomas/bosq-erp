"use client"

import { useState, useEffect } from "react"
import { X, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Client {
  id: string
  clientId: string
  companyName: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  trn: string | null
  clientType: string | null
  notes: string | null
}

interface EditClientModalProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditClientModal({ client, isOpen, onClose, onSuccess }: EditClientModalProps) {
  const [companyName, setCompanyName] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [trn, setTrn] = useState("")
  const [clientType, setClientType] = useState("Project")
  const [notes, setNotes] = useState("")
  
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (client) {
      setCompanyName(client.companyName || "")
      setContactPerson(client.contactPerson || "")
      setPhone(client.phone || "")
      setEmail(client.email || "")
      setAddress(client.address || "")
      setTrn(client.trn || "")
      setClientType(client.clientType || "Project")
      setNotes(client.notes || "")
    }
  }, [client, isOpen])

  if (!isOpen || !client) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName) {
      toast.error("Company name is required.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactPerson,
          phone,
          email,
          address,
          trn,
          clientType,
          notes,
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update client")
      }

      toast.success("Client updated successfully!")
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to update client. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-card rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Edit Client
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Update details for {client.clientId}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Company Name <span className="text-destructive">*</span></label>
              <Input 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)} 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Contact Person</label>
                <Input 
                  value={contactPerson} 
                  onChange={(e) => setContactPerson(e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Client Type</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm"
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value)}
                  <option value="Dealer">Dealer</option>
                  <option value="Interior">Interior</option>
                  <option value="Project">Project</option>
                  <option value="Special">Special</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Phone Number</label>
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Email Address</label>
                <Input 
                  type="email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Address / Location</label>
              <Input 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">TRN (Tax Registration Number)</label>
              <Input 
                value={trn} 
                onChange={(e) => setTrn(e.target.value)} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Internal Notes</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none min-h-[80px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

          </div>

          <div className="pt-6 border-t mt-6 flex justify-end gap-3 sticky bottom-0 bg-card">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </form>

      </div>
    </div>
  )
}
