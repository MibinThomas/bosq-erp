import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    const role = token?.role as string
    const userId = token?.id as string

    // Super Admin bypasses all access control checks
    if (role === "SUPER_ADMIN") {
      return NextResponse.next()
    }

    // Bypass check route to prevent infinite loop
    if (path.startsWith("/api/settings/access-control/check")) {
      return NextResponse.next()
    }

    try {
      const host = req.headers.get("host") || "localhost:3000"
      const protocol = req.nextUrl.protocol || "http:"
      const checkUrl = `${protocol}//${host}/api/settings/access-control/check?userId=${userId}&path=${encodeURIComponent(path)}`
      
      const checkRes = await fetch(checkUrl)
      if (checkRes.ok) {
        const { authorized } = await checkRes.json()
        if (!authorized) {
          if (path.startsWith("/api/")) {
            return new NextResponse(
              JSON.stringify({ error: "Forbidden: You do not have permission to access this resource." }),
              { status: 403, headers: { "Content-Type": "application/json" } }
            )
          }
          return NextResponse.redirect(new URL("/403", req.url))
        }
      }
    } catch (err) {
      console.error("Middleware permission check failed:", err)
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
