import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import { verifyPassword } from "@/lib/auth"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "BOSQ Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "name@bosq.ae" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password")
        }

        const cleanEmail = credentials.email.trim().toLowerCase()
        const cleanPassword = credentials.password.trim()

        let user: any = null
        try {
          user = await prisma.user.findUnique({
            where: { email: cleanEmail }
          })
        } catch (dbErr: any) {
          console.error("[NextAuth] DB lookup error during authorize:", dbErr)
          throw new Error("Unable to connect to authentication server. Please try again.")
        }

        if (!user || !user.password) {
          console.warn(`[NextAuth] Auth failed: No user found with email "${cleanEmail}"`)
          throw new Error("No user found with this email")
        }

        if (user.isActive === false) {
          console.warn(`[NextAuth] Auth failed: User "${cleanEmail}" account is inactive`)
          throw new Error("Your account has been deactivated. Please contact your system administrator.")
        }

        const isValid = verifyPassword(cleanPassword, user.password)
        if (!isValid) {
          console.warn(`[NextAuth] Auth failed: Password mismatch for user "${cleanEmail}"`)
          throw new Error("Incorrect password")
        }

        console.log(`[NextAuth] User authenticated successfully: ${user.email} (${user.role})`)

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.picture = user.image
      }
      
      // Dynamically query database to ensure role/details updates are synced instantly
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, name: true, image: true }
          })
          if (dbUser) {
            token.role = dbUser.role
            token.name = dbUser.name
            token.picture = dbUser.image
          }
        } catch (e) {
          console.error("Error fetching user in NextAuth jwt callback:", e)
        }
      }

      if (trigger === "update" && session) {
        if (session.name) token.name = session.name
        if (session.image) token.picture = session.image
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        session.user.name = token.name;
        session.user.image = token.picture as string | null | undefined;
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}
