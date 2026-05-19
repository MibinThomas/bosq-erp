import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

// Configure matchers to secure all primary dashboard layout pages
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
