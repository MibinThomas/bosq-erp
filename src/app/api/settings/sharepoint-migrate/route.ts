import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { migrateClientFolderToClientsDir } from "@/lib/sharepoint"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    // Ensure only super admin can trigger this
    if ((session?.user as any)?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
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
