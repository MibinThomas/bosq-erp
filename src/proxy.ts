import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    const role = token?.role as string

    // Restrict /settings to ADMIN
    if (path.startsWith("/settings") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Restrict /reports to ADMIN or SALES_MANAGER
    if (path.startsWith("/reports") && role !== "ADMIN" && role !== "SALES_MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
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
