"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  BarChart3, 
  Settings,
  LogOut,
  User as UserIcon,
  Calculator,
  Shield
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Products", href: "/products", icon: Package },
  { name: "BOQs", href: "/boq", icon: Calculator },
  { name: "Quotations", href: "/quotations", icon: FileText },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "My Profile", href: "/profile", icon: UserIcon },
  { name: "Access Control", href: "/settings/access-control", icon: Shield },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar({ className, onNavClick }: { className?: string, onNavClick?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (session?.user) {
      fetch("/api/settings/access-control/profile")
        .then(res => {
          if (res.ok) return res.json()
          throw new Error("Failed to load profile")
        })
        .then(data => {
          if (data && data.permissions) {
            setProfile(data)
          }
        })
        .catch(err => console.error("Error loading permissions profile:", err))
    }
  }, [session])

  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const userName = session?.user?.name || "IDC Consultant"
  const userEmail = session?.user?.email || "consultant@bosq.ae"

  // Filter items dynamically based on roles/profile permissions
  const filteredItems = navItems.filter((item) => {
    if (!profile) {
      // Fallback while loading
      if (userRole === "SUPER_ADMIN") return true
      if (item.name === "Settings" && userRole !== "ADMIN") {
        return false
      }
      if (item.name === "Reports" && userRole !== "ADMIN" && userRole !== "SALES_MANAGER") {
        return false
      }
      return true
    }

    if (profile.isSuperAdmin) return true

    // Map nav item name to system module name
    const permMap: Record<string, string> = {
      "Dashboard": "DASHBOARD",
      "Clients": "CLIENTS",
      "Products": "PRODUCTS",
      "BOQs": "BOQS",
      "Quotations": "QUOTATIONS",
      "Reports": "REPORTS",
      "Access Control": "ACCESS_CONTROL",
      "Settings": "SETTINGS",
    }

    const moduleName = permMap[item.name]
    if (moduleName) {
      return profile.permissions[moduleName]?.view === true
    }

    return true
  })

  // Dynamic role mapping display matching company nomenclature
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Administrator"
      case "ADMIN":
        return "Administrator"
      case "MANAGER":
      case "SALES_MANAGER":
        return "Manager"
      case "SALES_EXECUTIVE":
        return "Interior Design Consultant"
      case "DESIGN_CONSULTANT":
        return "Design Consultant"
      case "ESTIMATOR":
        return "Cost Estimator"
      case "ACCOUNTS":
        return "Finance & Accounts"
      case "PROCUREMENT":
        return "Procurement"
      case "PRODUCTION":
        return "Production"
      case "VIEWER":
        return "Viewer"
      default:
        return role ? role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "User"
    }
  }

  return (
    <aside className={cn("flex w-64 flex-col border-r bg-background", className)}>
      <div className="px-6 py-5">
        <Link href="/dashboard" className="flex items-center" onClick={onNavClick}>
          <div className="relative h-16 w-full">
            <Image
              src="/assets/logo/logo.png"
              alt="BOSQ Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>
      </div>
      
      <div className="flex-1 px-4 py-2 space-y-1">
        {filteredItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link key={item.name} href={item.href} onClick={onNavClick}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start mb-1",
                  isActive ? "bg-secondary/50 font-medium" : "text-muted-foreground font-normal"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          )
        })}
      </div>

      {/* User Session Profile Badge */}
      {session?.user && (
        <div className="mx-4 my-2 p-3 bg-secondary/35 rounded-lg border border-secondary/45 flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {session.user.image ? (
              <img src={session.user.image} alt={userName} className="h-full w-full object-cover" />
            ) : (
              userName.split(" ").map(n => n[0]).join("").toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground font-medium truncate mt-0.5" title={getRoleLabel(userRole)}>
              {getRoleLabel(userRole)}
            </p>
          </div>
        </div>
      )}

      <div className="p-4 border-t">
        <Button 
          variant="ghost" 
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
