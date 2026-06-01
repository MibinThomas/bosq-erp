"use client"

import { Menu, Bell, ChevronDown, CheckCheck, Loader2 } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useNotifications } from "@/hooks/use-notifications"
import { ScrollArea } from "@/components/ui/scroll-area"
export function Header() {
  const { data: session } = useSession()
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications()
  
  const user = session?.user
  const userName = user?.name || "User"
  const userEmail = user?.email || ""
  const userImage = user?.image || ""
  const userRole = (user as any)?.role || "SALES_EXECUTIVE"
  
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "US"

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="md:hidden mr-2">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="relative mr-1 hover:bg-muted h-10 w-10 flex items-center justify-center rounded-full transition-colors outline-none cursor-pointer">
            <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background"></span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="font-semibold text-sm">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
                  className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start p-4 cursor-pointer border-b last:border-0 rounded-none focus:bg-muted/50 ${
                      !notification.isRead ? "bg-muted/30" : ""
                    }`}
                    onClick={() => {
                      if (!notification.isRead) markAsRead(notification.id)
                      if (notification.link) window.location.href = notification.link
                    }}
                  >
                    <div className="flex items-start justify-between w-full mb-1">
                      <p className={`text-sm ${!notification.isRead ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 ml-2 mt-1"></span>
                      )}
                    </div>
                    <p className={`text-xs line-clamp-2 ${!notification.isRead ? "text-muted-foreground" : "text-muted-foreground/70"}`}>
                      {notification.message}
                    </p>
                    <span className="text-[10px] text-muted-foreground/50 mt-2 block">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Direct Clickable Standalone Profile Link (Zero Hydration Conflicts) */}
        <Link 
          href="/profile" 
          className="relative h-8 w-8 rounded-full cursor-pointer hover:ring-2 hover:ring-primary/60 hover:opacity-90 transition-all outline-none flex shrink-0"
          title="View My Profile"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Link>

        {/* Small Dropdown Trigger Chevron */}
        <DropdownMenu>
          <DropdownMenuTrigger className="h-8 w-6 hover:bg-muted flex items-center justify-center rounded-lg cursor-pointer transition-colors outline-none text-muted-foreground hover:text-foreground shrink-0">
            <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                {userEmail && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {userEmail}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-0">
              <Link href="/profile" className="w-full h-full px-1.5 py-1 cursor-pointer flex items-center">
                My Profile
              </Link>
            </DropdownMenuItem>
            {userRole === "ADMIN" && (
              <DropdownMenuItem className="p-0">
                <Link href="/settings" className="w-full h-full px-1.5 py-1 cursor-pointer flex items-center">
                  Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-red-500 cursor-pointer">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
