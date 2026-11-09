import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Every signed-in user needs the staff directory (preparer / filters / assignment pickers);
    // personal phone numbers are only for users who manage users.
    const userId = (session.user as any).id as string | undefined
    const canSeeContactDetails = !!userId && (
      (session.user as any).role === "SUPER_ADMIN" || (await hasPermission(userId, "USER_MANAGEMENT", "view"))
    )

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: canSeeContactDetails,
        department: true,
        designation: true,
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("GET /api/users failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
