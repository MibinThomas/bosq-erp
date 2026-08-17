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

        // Clean query to enforce strict single-user search
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
          throw new Error("No user found with this email")
        }

        const isValid = verifyPassword(credentials.password, user.password)
        if (!isValid) {
          throw new Error("Incorrect password")
        }

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
