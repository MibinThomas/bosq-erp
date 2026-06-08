import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbSessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!dbSessionUser || dbSessionUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 })
    }

    // Find all clients with a salespersonId
    const clients = await prisma.client.findMany({
      where: { salespersonId: { not: null } }
    })

    let migratedCount = 0

    for (const client of clients) {
      if (!client.salespersonId) continue

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: client.salespersonId }
      })

      if (!user) continue // skip if user was deleted or invalid

      // Create primary assignment if it doesn't exist
      const existingAssignment = await prisma.clientAssignment.findUnique({
        where: {
          clientId_userId: {
            clientId: client.id,
            userId: client.salespersonId
          }
        }
      })

      if (!existingAssignment) {
        await prisma.clientAssignment.create({
          data: {
            clientId: client.id,
            userId: client.salespersonId,
            isPrimary: true,
            allowAllQuotations: true,
            allowQuotationEdit: true,
            allowRevisionApproval: true,
            allowBoqAccess: true,
            allowPricingVisibility: true,
          }
        })
        migratedCount++
      }
    }

    return NextResponse.json({
      message: `Migration complete. Created ${migratedCount} primary assignments.`,
    })
  } catch (error: any) {
    console.error("Migration error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
