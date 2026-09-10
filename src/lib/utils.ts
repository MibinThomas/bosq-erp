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

/**
 * Safe clipboard copy function with fallback for unfocused documents or insecure contexts
 */
export async function safeCopyToClipboard(text: string): Promise<boolean> {
  if (!text) return false
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (err) {
    console.warn("Clipboard writeText failed, attempting execCommand fallback:", err)
  }
  try {
    if (typeof document !== "undefined") {
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      textArea.style.top = "-999999px"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand("copy")
      document.body.removeChild(textArea)
      return successful
    }
  } catch (err) {
    console.error("Clipboard copy fallback failed:", err)
  }
  return false
}

