import { useState, useEffect, useCallback, useRef } from "react"

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  link: string | null
  createdAt: string
}

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1) // Slide up to A6

    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)

    osc.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch (e) {
    console.error("Failed to play notification sound", e)
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Track previous unread IDs to detect NEW unread notifications
  const prevUnreadIdsRef = useRef<Set<string>>(new Set())

  const fetchNotifications = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true)
      const res = await fetch("/api/notifications")
      if (!res.ok) throw new Error("Failed to fetch notifications")
      
      const data: Notification[] = await res.json()
      setNotifications(data)
      
      const unread = data.filter((n) => !n.isRead)
      setUnreadCount(unread.length)

      // Check if there are NEW unread notifications that we didn't know about
      const currentUnreadIds = new Set(unread.map(n => n.id))
      const prevUnreadIds = prevUnreadIdsRef.current
      
      let hasNew = false
      for (const id of currentUnreadIds) {
        if (!prevUnreadIds.has(id)) {
          hasNew = true
          break
        }
      }

      if (hasNew && isPolling) {
        playNotificationSound()
      }

      prevUnreadIdsRef.current = currentUnreadIds
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      if (!isPolling) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchNotifications()

    // Poll every 15 seconds
    const interval = setInterval(() => {
      fetchNotifications(true)
    }, 15000)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) => 
      prev.map((n) => n.id === id ? { ...n, isRead: true } : n)
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
    
    // Remove from prevUnreadIds
    const newUnreadIds = new Set(prevUnreadIdsRef.current)
    newUnreadIds.delete(id)
    prevUnreadIdsRef.current = newUnreadIds

    try {
      await fetch(`/api/notifications/${id}`, { method: "PUT" })
    } catch (error) {
      console.error("Failed to mark as read:", error)
      // Revert optimism if needed (omitted for brevity)
    }
  }

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    prevUnreadIdsRef.current.clear()

    try {
      await fetch(`/api/notifications`, { method: "PUT" })
    } catch (error) {
      console.error("Failed to mark all as read:", error)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: () => fetchNotifications()
  }
}
