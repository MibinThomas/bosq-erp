"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface BulkAssignModalProps {
  isOpen: boolean
  onClose: () => void
  selectedIds: string[]
  onSuccess: () => void
}

interface User {
  id: string
  name: string | null
  email: string | null
  role: string
}

export function BulkAssignModal({ isOpen, onClose, selectedIds, onSuccess }: BulkAssignModalProps) {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [targetUserId, setTargetUserId] = useState<string>("")
  const [fetchingUsers, setFetchingUsers] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      setTargetUserId("")
    }
  }, [isOpen])

  const fetchUsers = async () => {
    try {
      setFetchingUsers(true)
      const res = await fetch("/api/settings/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Failed to fetch users", error)
      toast.error("Failed to load users")
    } finally {
      setFetchingUsers(false)
    }
  }

  const handleAssign = async () => {
    if (!targetUserId) {
      toast.error("Please select a user to assign")
      return
    }

    try {
      setLoading(true)
      const res = await fetch("/api/clients/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientIds: selectedIds,
          targetUserId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to bulk assign clients")
      }

      toast.success(data.message || `Successfully assigned ${selectedIds.length} clients`)
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "An error occurred while assigning clients")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Assign Clients</DialogTitle>
          <DialogDescription>
            Assign {selectedIds.length} selected client{selectedIds.length === 1 ? "" : "s"} to a user. This will give them access to these clients and their past quotations.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Select Target User</label>
            {fetchingUsers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
              </div>
            ) : (
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email} <span className="text-muted-foreground text-xs ml-2">({u.role})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading || !targetUserId || fetchingUsers}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning...
              </>
            ) : (
              "Confirm Assignment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
