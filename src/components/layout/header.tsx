"use client"

import { Menu, Bell } from "lucide-react"
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

export function Header() {
  const { data: session } = useSession()
  
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive"></span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-8 w-8 rounded-full cursor-pointer hover:ring-2 hover:ring-primary/60 transition-all outline-none flex shrink-0">
            <Link href="/profile" className="w-full h-full flex shrink-0 rounded-full overflow-hidden">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userImage} alt={userName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Link>
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
