import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { migrateClientFolderToClientsDir } from "@/lib/sharepoint"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { hasPermission } from "@/lib/rbac"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canManage = await hasPermission(userId, "SETTINGS", "manage")
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage settings" }, { status: 403 })
    }

    const clients = await prisma.client.findMany({
      where: { deletedAt: null }
    })

    const results = []

    for (const client of clients) {
      if (client.companyName) {
        const result = await migrateClientFolderToClientsDir(client.companyName)
        results.push({
          companyName: client.companyName,
          result
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      details: results
    })
  } catch (error) {
    console.error("Migration failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
