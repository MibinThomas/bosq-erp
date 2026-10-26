// Maps a page/API path and HTTP method to the RBAC module + action that guards it.
// Used by src/proxy.ts (in-process, no HTTP round trip) and /api/settings/access-control/check.

export type RoutePermission = { allow: true } | { allow?: false; module: string; action: string }

const crudAction = (method: string) => {
  if (method === "POST") return "create"
  if (method === "PUT" || method === "PATCH") return "edit"
  if (method === "DELETE") return "delete"
  return "view"
}

export function resolveRoutePermission(path: string, method = "GET"): RoutePermission {
  const isApi = path.startsWith("/api/")
  const starts = (...prefixes: string[]) => prefixes.some((p) => path.startsWith(p))

  if (path === "/api/users/sales-agents") return { allow: true }

  // Read-only settings every signed-in user needs (each route checks the session itself and
  // returns only safe data): own permission profile, company details (secrets removed),
  // payment terms / T&Cs for quotations and BOQs.
  if (
    path === "/api/settings/access-control/profile" ||
    path === "/api/settings/access-control/check" ||
    (method === "GET" && (path === "/api/settings/system" || path === "/api/settings/terms"))
  ) {
    return { allow: true }
  }

  // 1. ACCESS CONTROL
  if (starts("/settings/access-control", "/api/settings/access-control")) {
    return { module: "ACCESS_CONTROL", action: isApi ? crudAction(method) : "view" }
  }
  // 2. USER MANAGEMENT
  if (starts("/settings/users", "/api/settings/users", "/api/users")) {
    return { module: "USER_MANAGEMENT", action: isApi ? crudAction(method) : "view" }
  }
  // 3. PRICING MARKUP
  if (starts("/settings/pricing", "/api/settings/pricing")) {
    const action = isApi && (method === "POST" || method === "PUT" || method === "PATCH") ? "edit" : "view"
    return { module: "PRICING_MARKUP", action }
  }
  // 4. SETTINGS
  if (starts("/settings", "/api/settings")) {
    let action = "view"
    if (isApi && (method === "POST" || method === "PUT" || method === "PATCH")) action = "edit"
    else if (isApi && method === "DELETE") action = "delete"
    return { module: "SETTINGS", action }
  }
  // 5. CLIENTS
  if (starts("/clients", "/api/clients")) {
    // The user is asking for access, so client permissions don't apply
    if (path.includes("/request-access")) return { allow: true }
    if (!isApi) return { module: "CLIENTS", action: "view" }
    let action = "view"
    if (path.includes("/approve") || path.includes("/pending")) action = "approve"
    else if (path.includes("/bulk-delete") || method === "DELETE") action = "delete"
    else if (path.includes("/bulk-assign")) action = "manage"
    else if (path.includes("/bulk") || method === "POST") action = "create"
    else if (method === "PUT" || method === "PATCH") action = "edit"
    return { module: "CLIENTS", action }
  }
  // 6. PRODUCTS
  if (starts("/products", "/api/products")) {
    let action = "view"
    if (isApi) {
      if (path.startsWith("/api/products/categories")) action = method === "GET" ? "view" : "manage"
      else if (path.startsWith("/api/products/bulk-delete")) action = "delete"
      else if (path.startsWith("/api/products/bulk")) action = "uploadFiles"
      else action = crudAction(method)
    } else if (path === "/products/new" || path.startsWith("/products/new/")) action = "create"
    else if (path === "/products/bulk-upload" || path.startsWith("/products/bulk-upload/")) action = "uploadFiles"
    else if (path === "/products/categories" || path.startsWith("/products/categories/")) action = "manage"
    return { module: "PRODUCTS", action }
  }
  // 7. QUOTATIONS
  if (starts("/quotations", "/api/quotations")) {
    if (!isApi) return { module: "QUOTATIONS", action: "view" }
    return { module: "QUOTATIONS", action: path.includes("/approve") ? "approve" : crudAction(method) }
  }
  // 8. BOQS
  if (starts("/boq", "/api/boq")) {
    return { module: "BOQS", action: isApi ? crudAction(method) : "view" }
  }
  // 9. REPORTS
  if (starts("/reports", "/api/reports")) return { module: "REPORTS", action: "view" }

  // 10. DASHBOARD (and anything else routed through the proxy)
  return { module: "DASHBOARD", action: "view" }
}
