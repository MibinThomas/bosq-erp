import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper to check if a user role is Super Admin, Admin, or a Managerial role.
 * Safe for use in client components and server endpoints.
 */
export function isManagerOrAdminRole(role?: string | null): boolean {
  if (!role) return false
  const r = role.toUpperCase()
  return (
    r === "SUPER_ADMIN" ||
    r === "ADMIN" ||
    r === "MANAGER" ||
    r === "SALES_MANAGER" ||
    r.includes("MANAGER")
  )
}
