"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useSession } from "next-auth/react"

interface PermissionsContextType {
  profile: any
  loading: boolean
  hasPermission: (module: string, action: string) => boolean
}

const PermissionsContext = createContext<PermissionsContextType>({
  profile: null,
  loading: true,
  hasPermission: () => false,
})

export const usePermissions = () => useContext(PermissionsContext)

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      if (status === "authenticated" && session?.user) {
        const userRole = (session.user as any)?.role
        const isSuperAdmin = userRole === "SUPER_ADMIN"

        try {
          const res = await fetch("/api/settings/access-control/profile")
          if (res.ok) {
            const data = await res.json()
            if (data && data.permissions) {
              setProfile(data)
              setLoading(false)
              return
            }
          }
        } catch (err) {
          console.error("Error loading permissions profile:", err)
        }

        // Fallback for Super Admin if network fetch fails or profile is uninitialized
        if (isSuperAdmin) {
          setProfile({ isSuperAdmin: true, role: "SUPER_ADMIN" })
        }
        setLoading(false)
      } else if (status === "unauthenticated") {
        setLoading(false)
      }
    }

    loadProfile()

    window.addEventListener("visibility-refresh", loadProfile)
    return () => {
      window.removeEventListener("visibility-refresh", loadProfile)
    }
  }, [session, status])

  const hasPermission = (module: string, action: string): boolean => {
    const userRole = (session?.user as any)?.role
    if (userRole === "SUPER_ADMIN") return true
    if (!profile) return false
    if (profile.isSuperAdmin) return true
    return profile.permissions?.[module]?.[action] === true
  }

  return (
    <PermissionsContext.Provider value={{ profile, loading, hasPermission }}>
      {children}
    </PermissionsContext.Provider>
  )
}
