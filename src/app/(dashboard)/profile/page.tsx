"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Camera, Trash2, CheckCircle2 } from "lucide-react"

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string | null
  department: string | null
  designation: string | null
  role: string
  image: string | null
  signature: string | null
  isActive: boolean
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const userId = (session?.user as any)?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (userId) {
      fetch(`/api/users/${userId}`)
        .then(res => res.json())
        .then(data => {
          setProfile(data)
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          toast.error("Failed to load profile")
          setLoading(false)
        })
    }
  }, [userId])

  const handleUpload = async (file: File, field: "image" | "signature") => {
    const formData = new FormData()
    formData.append("file", file)

    const toastId = toast.loading("Uploading image...")
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      })
      if (!res.ok) throw new Error("Upload failed")
      const { url } = await res.json()
      
      setProfile(prev => prev ? { ...prev, [field]: url } : null)
      toast.success("Image uploaded successfully", { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error("Failed to upload image", { id: toastId })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          department: profile.department,
          designation: profile.designation,
          image: profile.image,
          signature: profile.signature
        })
      })

      if (!res.ok) throw new Error("Failed to update profile")
      
      const updatedUser = await res.json()
      
      // Update local session to reflect new name/image immediately if supported
      await updateSession({
        name: updatedUser.name,
        image: updatedUser.image,
      })

      toast.success("Profile updated successfully!")
    } catch (error) {
      console.error(error)
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (!profile) return null

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Manage your personal information and preferences.</p>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>Update your photo and personal details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            {/* Profile Avatar Upload */}
            <div className="flex items-center gap-6">
              <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-muted-foreground/20 bg-muted flex items-center justify-center shrink-0 group">
                {profile.image ? (
                  <img src={profile.image} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground">
                    {profile.name?.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                  <Label htmlFor="avatar-upload" className="cursor-pointer p-2">
                    <Camera className="h-6 w-6 text-white" />
                  </Label>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">Profile Picture</h3>
                <p className="text-sm text-muted-foreground">JPG, PNG or WEBP. Max 2MB.</p>
                <div className="flex gap-2 pt-2">
                  <Input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "image")}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("avatar-upload")?.click()}>
                    Upload New
                  </Button>
                  {profile.image && (
                    <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => setProfile({ ...profile, image: null })}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  value={profile.name || ""} 
                  onChange={e => setProfile({...profile, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-xs text-muted-foreground ml-2">(Cannot be changed)</span></Label>
                <Input value={profile.email || ""} disabled className="bg-muted" />
              </div>
              
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input 
                  value={profile.phone || ""} 
                  onChange={e => setProfile({...profile, phone: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Role <span className="text-xs text-muted-foreground ml-2">(Cannot be changed)</span></Label>
                <Input value={profile.role || ""} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label>Designation</Label>
                <Input 
                  value={profile.designation || ""} 
                  onChange={e => setProfile({...profile, designation: e.target.value})} 
                  placeholder="e.g. Senior Architect"
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input 
                  value={profile.department || ""} 
                  onChange={e => setProfile({...profile, department: e.target.value})} 
                  placeholder="e.g. Interior Design"
                />
              </div>
            </div>

            {/* Signature Upload */}
            <div className="space-y-3 pt-4 border-t">
              <Label>Digital Signature</Label>
              <p className="text-sm text-muted-foreground">Used for automatically signing Quotations.</p>
              
              <div className="flex flex-col gap-4 max-w-sm">
                {profile.signature ? (
                  <div className="relative border rounded-lg p-4 bg-white flex justify-center items-center">
                    <img src={profile.signature} alt="Signature" className="max-h-24 object-contain mix-blend-multiply" />
                    <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setProfile({...profile, signature: null})}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                    <p className="text-sm mb-4">No signature uploaded</p>
                    <Input 
                      id="signature-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "signature")}
                    />
                    <Button type="button" variant="secondary" onClick={() => document.getElementById("signature-upload")?.click()}>
                      Upload Signature
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
            
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
