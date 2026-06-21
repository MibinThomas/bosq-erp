import prisma from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const path = searchParams.get("path")
    const method = searchParams.get("method") || "GET"

    if (!userId || !path) {
      return NextResponse.json({ authorized: false })
    }

    // Resolve path and HTTP method to module and action
    let module = "DASHBOARD"
    let action = "view"

    const isApi = path.startsWith("/api/")

    // 1. ACCESS CONTROL
    if (path.startsWith("/settings/access-control") || path.startsWith("/api/settings/access-control")) {
      module = "ACCESS_CONTROL"
      if (isApi) {
        if (method === "GET") action = "view"
        else if (method === "POST") action = "create"
        else if (method === "PUT" || method === "PATCH") action = "edit"
        else if (method === "DELETE") action = "delete"
      } else {
        action = "view"
      }
    } 
    // 2. USER MANAGEMENT
    else if (path.startsWith("/settings/users") || path.startsWith("/api/settings/users") || path.startsWith("/api/users")) {
      module = "USER_MANAGEMENT"
      if (isApi) {
        if (method === "GET") action = "view"
        else if (method === "POST") action = "create"
        else if (method === "PUT" || method === "PATCH") action = "edit"
        else if (method === "DELETE") action = "delete"
      } else {
        action = "view"
      }
    } 
    // 3. PRICING MARKUP
    else if (path.startsWith("/settings/pricing") || path.startsWith("/api/settings/pricing")) {
      module = "PRICING_MARKUP"
      if (isApi) {
        if (method === "GET") action = "view"
        else if (method === "POST" || method === "PUT" || method === "PATCH") action = "edit"
      } else {
        action = "view"
      }
    } 
    // 4. SETTINGS
    else if (path.startsWith("/settings") || path.startsWith("/api/settings")) {
      module = "SETTINGS"
      if (isApi) {
        if (method === "GET") action = "view"
        else if (method === "POST" || method === "PUT" || method === "PATCH") action = "edit"
        else if (method === "DELETE") action = "delete"
      } else {
        action = "view"
      }
    } 
    // 5. CLIENTS
    else if (path.startsWith("/clients") || path.startsWith("/api/clients")) {
      module = "CLIENTS"
      
      // Let request-access bypass client permissions because the user is requesting it
      if (path.includes("/request-access")) {
        return NextResponse.json({ authorized: true })
      }

      if (isApi) {
        if (path.includes("/approve") || path.includes("/pending")) {
          action = "approve"
        } else if (path.includes("/bulk-delete") || method === "DELETE") {
          action = "delete"
        } else if (path.includes("/bulk-assign")) {
          action = "manage"
        } else if (path.includes("/bulk") || method === "POST") {
          action = "create"
        } else if (method === "PUT" || method === "PATCH") {
          action = "edit"
        } else {
          action = "view"
        }
      } else {
        action = "view"
      }
    } 
    // 6. PRODUCTS
    else if (path.startsWith("/products") || path.startsWith("/api/products")) {
      module = "PRODUCTS"
      if (isApi) {
        if (method === "POST" || path.includes("/bulk")) action = "create"
        else if (method === "PUT" || method === "PATCH") action = "edit"
        else if (method === "DELETE" || path.includes("/bulk-delete")) action = "delete"
        else action = "view"
      } else {
        action = "view"
      }
    } 
    // 7. QUOTATIONS
    else if (path.startsWith("/quotations") || path.startsWith("/api/quotations")) {
      module = "QUOTATIONS"
      if (isApi) {
        if (path.includes("/approve")) action = "approve"
        else if (method === "POST") action = "create"
        else if (method === "PUT" || method === "PATCH") action = "edit"
        else if (method === "DELETE") action = "delete"
        else action = "view"
      } else {
        action = "view"
      }
    } 
    // 8. BOQS
    else if (path.startsWith("/boq") || path.startsWith("/api/boq")) {
      module = "BOQS"
      if (isApi) {
        if (method === "POST") action = "create"
        else if (method === "PUT" || method === "PATCH") action = "edit"
        else if (method === "DELETE") action = "delete"
        else action = "view"
      } else {
        action = "view"
      }
    } 
    // 9. REPORTS
    else if (path.startsWith("/reports") || path.startsWith("/api/reports")) {
      module = "REPORTS"
      action = "view"
    } 
    // 10. DASHBOARD
    else if (path.startsWith("/dashboard") || path.startsWith("/api/dashboard")) {
      module = "DASHBOARD"
      action = "view"
    }

    const authorized = await hasPermission(userId, module, action)
    return NextResponse.json({ authorized })
  } catch (error) {
    console.error("Permission check API failed:", error)
    return NextResponse.json({ authorized: false })
  }
}
