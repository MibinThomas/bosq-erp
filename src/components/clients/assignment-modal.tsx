"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Plus, Trash2, UserPlus, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface User {
  id: string
  name: string
  role: string
}

interface Quotation {
  id: string
  quotationNumber: string
}

interface AssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  quotations?: Quotation[]
  onSuccess: () => void
}

export function AssignmentModal({ open, onOpenChange, clientId, clientName, quotations = [], onSuccess }: AssignmentModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [primaryUserId, setPrimaryUserId] = useState<string>("")
  const [secondaries, setSecondaries] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, clientId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, assignmentsRes] = await Promise.all([
        fetch("/api/settings/users"),
        fetch(`/api/clients/${clientId}/assignments`)
      ])

      const usersData = await usersRes.json()
      setUsers(Array.isArray(usersData) ? usersData : [])

      const assignmentsData = await assignmentsRes.json()
      const primary = assignmentsData.assignments?.find((a: any) => a.isPrimary)
      if (primary) {
        setPrimaryUserId(primary.userId)
      }

      const secondaryData = assignmentsData.assignments?.filter((a: any) => !a.isPrimary).map((a: any) => {
        const userQuotationIds = assignmentsData.quotationAssignments
          ?.filter((qa: any) => qa.userId === a.userId)
          .map((qa: any) => qa.quotationId) || []

        return {
          userId: a.userId,
          allowAllQuotations: a.allowAllQuotations,
          allowQuotationEdit: a.allowQuotationEdit,
          allowRevisionApproval: a.allowRevisionApproval,
          allowBoqAccess: a.allowBoqAccess,
          allowPricingVisibility: a.allowPricingVisibility,
          quotationIds: userQuotationIds
        }
      })
      setSecondaries(secondaryData || [])
    } catch (err) {
      console.error("Failed to fetch assignment data", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSecondary = () => {
    setSecondaries([
      ...secondaries,
      {
        userId: "",
        allowAllQuotations: true,
        allowQuotationEdit: false,
        allowRevisionApproval: false,
        allowBoqAccess: false,
        allowPricingVisibility: false,
        quotationIds: []
      }
    ])
  }

  const handleRemoveSecondary = (index: number) => {
    const updated = [...secondaries]
    updated.splice(index, 1)
    setSecondaries(updated)
  }

  const handleSecondaryChange = (index: number, field: string, value: any) => {
    const updated = [...secondaries]
    updated[index][field] = value
    setSecondaries(updated)
  }

  const handleSave = async () => {
    if (!primaryUserId) {
      alert("Please select a Primary Assigned Consultant")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryUserId, secondaries })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save assignments")
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Team to {clientName}</DialogTitle>
          <DialogDescription>Configure which consultants manage and view this client.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Primary Assignment */}
            <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
              <Label className="text-base font-bold flex items-center gap-2">
                <span className="text-primary">👤</span> Primary Assigned Consultant
              </Label>
              <p className="text-xs text-muted-foreground mb-2">The primary owner has full access to this client and all related documents.</p>
              <Select value={primaryUserId} onValueChange={(val) => setPrimaryUserId(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select primary consultant" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, " ")})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Secondary Assignments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-bold flex items-center gap-2">
                  <span className="text-muted-foreground">👥</span> Additional Team Members
                </Label>
                <Button variant="outline" size="sm" onClick={handleAddSecondary} className="h-8 text-xs">
                  <UserPlus className="h-3 w-3 mr-2" /> Add Member
                </Button>
              </div>

              {secondaries.length === 0 ? (
                <div className="text-sm text-muted-foreground italic text-center p-4 border border-dashed rounded-lg">
                  No additional members assigned.
                </div>
              ) : (
                <div className="space-y-4">
                  {secondaries.map((sec, index) => (
                    <div key={index} className="p-4 border rounded-xl space-y-4 relative bg-card shadow-sm">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                        onClick={() => handleRemoveSecondary(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="pr-10">
                        <Label className="text-xs font-semibold mb-1 block">Select User</Label>
                        <Select value={sec.userId} onValueChange={(val) => handleSecondaryChange(index, "userId", val || "")}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select secondary user" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.filter(u => u.id !== primaryUserId).map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, " ")})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`all-q-${index}`}
                            checked={sec.allowAllQuotations}
                            onCheckedChange={(c) => handleSecondaryChange(index, "allowAllQuotations", c === true)}
                          />
                          <Label htmlFor={`all-q-${index}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Allow all quotation access
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-q-${index}`}
                            checked={sec.allowQuotationEdit}
                            onCheckedChange={(c) => handleSecondaryChange(index, "allowQuotationEdit", c === true)}
                          />
                          <Label htmlFor={`edit-q-${index}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Allow quotation editing
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`app-q-${index}`}
                            checked={sec.allowRevisionApproval}
                            onCheckedChange={(c) => handleSecondaryChange(index, "allowRevisionApproval", c === true)}
                          />
                          <Label htmlFor={`app-q-${index}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Allow revision approval
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`boq-${index}`}
                            checked={sec.allowBoqAccess}
                            onCheckedChange={(c) => handleSecondaryChange(index, "allowBoqAccess", c === true)}
                          />
                          <Label htmlFor={`boq-${index}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Allow BOQ access
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`price-${index}`}
                            checked={sec.allowPricingVisibility}
                            onCheckedChange={(c) => handleSecondaryChange(index, "allowPricingVisibility", c === true)}
                          />
                          <Label htmlFor={`price-${index}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Allow pricing visibility
                          </Label>
                        </div>
                      </div>

                      {/* Specific Quotations Selector */}
                      {!sec.allowAllQuotations && (
                        <div className="pt-2 border-t">
                          <Label className="text-xs font-semibold mb-2 block text-orange-600 dark:text-orange-400">
                            Select Specific Quotations
                          </Label>
                          {quotations.length === 0 ? (
                            <p className="text-xs text-muted-foreground">This client has no quotations yet.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {quotations.map(q => {
                                const isSelected = sec.quotationIds.includes(q.id)
                                return (
                                  <Badge 
                                    key={q.id} 
                                    variant={isSelected ? "default" : "outline"}
                                    className="cursor-pointer font-mono text-xs py-1 px-2"
                                    onClick={() => {
                                      const ids = sec.quotationIds || []
                                      if (isSelected) {
                                        handleSecondaryChange(index, "quotationIds", ids.filter((id: string) => id !== q.id))
                                      } else {
                                        handleSecondaryChange(index, "quotationIds", [...ids, q.id])
                                      }
                                    }}
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    {q.quotationNumber}
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
