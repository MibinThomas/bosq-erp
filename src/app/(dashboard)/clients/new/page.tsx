"use client"

import { useState } from "react"
import { useRouter } from "next/navigation" // Wait! In Next.js, let's import from "next/navigation"!
import Link from "next/link"
import { ArrowLeft, Loader2, Save, Building2, User, Mail, Phone, MapPin, FileText, Hash } from "lucide-react"

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
import { toast } from "sonner"

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    clientType: "Direct",
    trn: "",
    address: "",
    notes: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string | null) => {
    setFormData((prev) => ({ ...prev, clientType: value || "Direct" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.companyName.trim()) {
      toast.error("Company name is required")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to create client")
      }

      const newClient = await res.json()
      toast.success(`Client ${newClient.companyName} created successfully!`)
      router.push("/clients")
    } catch (error: any) {
      console.error("Error creating client:", error)
      toast.error(error.message || "Failed to create client. Please try again.")
    } finally {
      setSaving(false)
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Add New Client</h1>
          <p className="text-muted-foreground">
            Create a new client profile and auto-generate their SharePoint folder.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border rounded-2xl p-6 bg-card text-card-foreground shadow-sm space-y-6">
          <h2 className="text-lg font-semibold border-b pb-2">Company Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <SelectItem value="Direct">Direct</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
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
                Creating Client...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Client
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
