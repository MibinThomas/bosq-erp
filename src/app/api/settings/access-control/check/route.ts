import prisma from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const path = searchParams.get("path")

    if (!userId || !path) {
      return NextResponse.json({ authorized: false })
    }

    // Resolve path to module
    let module = "DASHBOARD"
    let action = "view"

    if (path.startsWith("/settings/access-control") || path.startsWith("/api/settings/access-control")) {
      module = "ACCESS_CONTROL"
      action = "view"
    } else if (path.startsWith("/settings/users") || path.startsWith("/api/settings/users") || path.startsWith("/api/users")) {
      module = "USER_MANAGEMENT"
      action = "view"
    } else if (path.startsWith("/settings/pricing") || path.startsWith("/api/settings/pricing")) {
      module = "PRICING_MARKUP"
      action = "view"
    } else if (path.startsWith("/settings") || path.startsWith("/api/settings")) {
      module = "SETTINGS"
      action = "view"
    } else if (path.startsWith("/clients") || path.startsWith("/api/clients")) {
      module = "CLIENTS"
      action = "view"
    } else if (path.startsWith("/products") || path.startsWith("/api/products")) {
      module = "PRODUCTS"
      action = "view"
    } else if (path.startsWith("/quotations") || path.startsWith("/api/quotations")) {
      module = "QUOTATIONS"
      action = "view"
    } else if (path.startsWith("/reports") || path.startsWith("/api/reports")) {
      module = "REPORTS"
      action = "view"
    }

    const authorized = await hasPermission(userId, module, action)
    return NextResponse.json({ authorized })
  } catch (error) {
    console.error("Permission check API failed:", error)
    return NextResponse.json({ authorized: false })
  }
}
