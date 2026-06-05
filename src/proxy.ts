import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    const role = token?.role as string

    // Super Admin bypasses all access control checks
    if (role === "SUPER_ADMIN") {
      return NextResponse.next()
    }

    // 1. Settings Routes Protection
    if (path.startsWith("/settings") || path.startsWith("/api/settings")) {
      if (path.startsWith("/settings/users") || path.startsWith("/api/settings/users")) {
        if (role !== "ADMIN") {
          return new NextResponse("Forbidden: Administrator access required", { status: 403 })
        }
      } else {
        if (role !== "ADMIN" && role !== "SALES_MANAGER") {
          return new NextResponse("Forbidden: Manager access required", { status: 403 })
        }
      }
    }

    // 2. Report Protection
    if (path.startsWith("/reports") && role !== "ADMIN" && role !== "SALES_MANAGER") {
      return new NextResponse("Forbidden: Manager access required", { status: 403 })
    }

    // 3. Estimator Role Protection
    if (role === "ESTIMATOR") {
      if (path.startsWith("/clients") || path.startsWith("/reports")) {
        return new NextResponse("Forbidden: Estimators cannot access this section", { status: 403 })
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
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
  ],
}
