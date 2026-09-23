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

/**
 * Safely formats and normalizes an image URL or base64 data string.
 * Supports absolute URLs, base64 data strings, blob URLs, and relative path URLs.
 */
export function formatImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed
  }
  return `/${trimmed}`
}

/**
 * Safely strips HTML markup and decodes common HTML entities into clean plain text bullet points.
 * Useful for textareas and text fields where raw HTML tags should not be shown.
 */
export function cleanHtmlText(htmlStr?: string | null): string {
  if (!htmlStr || typeof htmlStr !== "string") return ""
  if (!/<[a-z][\s\S]*>/i.test(htmlStr) && !/&[a-z0-9]+;/i.test(htmlStr)) {
    return htmlStr.trim()
  }

  let text = htmlStr
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&bull;/gi, "•")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim()

  return text
}


