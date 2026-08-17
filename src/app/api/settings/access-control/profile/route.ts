import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/prisma"
import { getPermissionsProfile } from "@/lib/rbac"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const profile = await getPermissionsProfile(user.id)
    return NextResponse.json(profile)
  } catch (error) {
    console.error("GET /api/settings/access-control/profile failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
