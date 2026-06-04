"use client"

import { useState } from "react"
import { X, Loader2, Sparkles, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Client {
  id: string
  companyName: string
  contactPerson: string | null
  trn: string | null
  clientType: string | null
  status: string
}

interface QuickAddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newClient: Client) => void
  userRole?: string
}

export function QuickAddClientModal({ isOpen, onClose, onSuccess, userRole }: QuickAddClientModalProps) {
  const [companyName, setCompanyName] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [trn, setTrn] = useState("")
  const [clientType, setClientType] = useState<string>("Direct")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim()) {
      toast.error("Company name is required.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          trn: trn.trim() || undefined,
          clientType,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create client")
      }

      const created = await res.json()
      toast.success(
        created.status === "Approved"
          ? "New client created and approved successfully!"
          : "New client created pending manager approval!"
      )
      onSuccess(created)
      
      // Reset form
      setCompanyName("")
      setContactPerson("")
      setPhone("")
      setEmail("")
      setAddress("")
      setTrn("")
      setClientType("Direct")
      setNotes("")
      onClose()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to create client.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Quick Add Client
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Add a new client directly to the database to use in your quotation.
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
                placeholder="E.g., TechFlow LLC"
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Contact Person</label>
                <Input 
                  value={contactPerson} 
                  onChange={(e) => setContactPerson(e.target.value)} 
                  placeholder="E.g., John Doe" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Client Segment <span className="text-destructive">*</span></label>
                <Select onValueChange={setClientType} value={clientType}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direct">Direct</SelectItem>
                    <SelectItem value="Interior">Interior Designer</SelectItem>
                    <SelectItem value="Dealer">Dealer</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Phone Number</label>
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="E.g., +971 50 123 4567" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Email Address</label>
                <Input 
                  type="email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="E.g., info@techflow.ae" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold">TRN Number</label>
                <Input 
                  value={trn} 
                  onChange={(e) => setTrn(e.target.value)} 
                  placeholder="E.g., 100012345678902" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Address</label>
              <Textarea 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                placeholder="E.g., Office 402, Building A, Al Quoz, Dubai"
                className="min-h-[60px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Notes</label>
              <Textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="E.g., Special procurement instructions"
                className="min-h-[60px]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Client
                </>
              )}
            </Button>
          </div>
        </form>

      </div>
    </div>
  )
}
