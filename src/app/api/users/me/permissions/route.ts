import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getPermissionsProfile } from "@/lib/rbac"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    if (!userId) {
      return NextResponse.json({ error: "User ID not found in session" }, { status: 400 })
    }

    const profile = await getPermissionsProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: "Permissions profile not found" }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Failed to fetch permissions profile:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
