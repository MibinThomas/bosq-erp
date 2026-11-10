import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"
import { resolveRoutePermission } from "@/lib/route-permissions"
import { NextResponse } from "next/server"

// Answers "may the signed-in user open this path?" for the signed-in user only.
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    const { searchParams } = new URL(request.url)
    const path = searchParams.get("path")
    const method = searchParams.get("method") || "GET"

    if (!userId || !path) {
      return NextResponse.json({ authorized: false })
    }

    const required = resolveRoutePermission(path, method)
    if (required.allow) return NextResponse.json({ authorized: true })

    const authorized = await hasPermission(userId, required.module, required.action)
    return NextResponse.json({ authorized })
  } catch (error) {
    console.error("Permission check API failed:", error)
    return NextResponse.json({ authorized: false })
  }
}
