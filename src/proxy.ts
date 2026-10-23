import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { hasPermission } from "@/lib/rbac"
import { resolveRoutePermission } from "@/lib/route-permissions"

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    const role = token?.role as string
    const userId = token?.id as string

    // Check if session has been terminated due to a new login elsewhere
    if (token?.error === "SESSION_TERMINATED") {
      if (path.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({ error: "Session terminated because your account was logged into from another device." }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      }
      return NextResponse.redirect(new URL("/login?reason=session_terminated", req.url))
    }

    // Super Admin bypasses all access control checks
    if (role === "SUPER_ADMIN") {
      return NextResponse.next()
    }

    const deny = (status: number, message: string) =>
      path.startsWith("/api/")
        ? new NextResponse(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" } })
        : NextResponse.redirect(new URL("/403", req.url))

    const required = resolveRoutePermission(path, req.method)
    if (!required.allow) {
      // Checked in-process (proxy runs on Node.js). Any failure denies access.
      try {
        const authorized = await hasPermission(userId, required.module, required.action)
        if (!authorized) return deny(403, "Forbidden: You do not have permission to access this resource.")
      } catch (err) {
        console.error("Proxy permission check failed:", err)
        return deny(503, "Permission check unavailable. Please try again.")
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token && token.error !== "SESSION_TERMINATED",
    },
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/products/:path*",
    "/quotations/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/boq/:path*",
    "/api/clients/:path*",
    "/api/products/:path*",
    "/api/quotations/:path*",
    "/api/reports/:path*",
    "/api/settings/:path*",
    "/api/boq/:path*",
  ],
}
