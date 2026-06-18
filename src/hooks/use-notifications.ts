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
    const audio = new Audio("/assets/notification/mixkit-positive-notification-951.wav")
    audio.volume = 0.3
    audio.play().catch(err => console.error("Playback failed:", err))
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
