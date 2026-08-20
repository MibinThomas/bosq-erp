import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export const dynamic = "force-dynamic"
export const revalidate = 0

// GET: Fetch soft-deleted Quotations, BOQs, and Clients for Super Admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as any).role || ""
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admin users can access the Recycle Bin and data recovery endpoints." },
        { status: 403 }
      )
    }

    const [deletedQuotations, deletedBoqs, deletedClients] = await Promise.all([
      prisma.quotation.findMany({
        where: { deletedAt: { not: null } },
        include: {
          client: {
            select: { id: true, companyName: true, clientId: true }
          },
          preparedBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { deletedAt: "desc" }
      }),
      prisma.boq.findMany({
        where: { deletedAt: { not: null } },
        include: {
          client: {
            select: { id: true, companyName: true, clientId: true }
          },
          preparedBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { deletedAt: "desc" }
      }),
      prisma.client.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" }
      })
    ])

    return NextResponse.json({
      quotations: deletedQuotations,
      boqs: deletedBoqs,
      clients: deletedClients
    })
  } catch (error: any) {
    console.error("Error fetching recycle bin items:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

// POST: Restore selected soft-deleted records (Quotations, BOQs, Clients)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as any).role || ""
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admin users can restore deleted records." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { type, ids } = body as { type: "QUOTATION" | "BOQ" | "CLIENT"; ids: string[] }

    if (!type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid payload. 'type' and non-empty 'ids' array are required." }, { status: 400 })
    }

    const userId = (session.user as any).id || "SYSTEM"
    const userEmail = session.user.email

    if (type === "QUOTATION") {
      // 1. Fetch target quotations to know their client IDs
      const targetQuotes = await prisma.quotation.findMany({
        where: { id: { in: ids } },
        select: { id: true, clientId: true, quotationNumber: true }
      })

      const clientIds = Array.from(new Set(targetQuotes.map(q => q.clientId))).filter(Boolean) as string[]

      // 2. Restore target quotations
      const { count } = await prisma.quotation.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: null }
      })

      // 3. Ensure associated soft-deleted clients are also restored
      if (clientIds.length > 0) {
        await prisma.client.updateMany({
          where: { id: { in: clientIds }, deletedAt: { not: null } },
          data: { deletedAt: null }
        })
      }

      // 4. Log activity
      await prisma.activityLog.create({
        data: {
          userId,
          action: "RESTORED_QUOTATIONS",
          entityType: "QUOTATION",
          entityId: ids.length === 1 ? ids[0] : "BULK",
          details: `Super Admin (${userEmail}) restored ${count} quotation record(s).`
        }
      })

      return NextResponse.json({ success: true, count, message: `Successfully restored ${count} quotation(s).` })
    } else if (type === "BOQ") {
      // 1. Fetch target BOQs to know their client IDs
      const targetBoqs = await prisma.boq.findMany({
        where: { id: { in: ids } },
        select: { id: true, clientId: true, boqNumber: true }
      })

      const clientIds = Array.from(new Set(targetBoqs.map(b => b.clientId))).filter(Boolean) as string[]

      // 2. Restore target BOQs
      const { count } = await prisma.boq.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: null }
      })

      // 3. Ensure associated soft-deleted clients are also restored
      if (clientIds.length > 0) {
        await prisma.client.updateMany({
          where: { id: { in: clientIds }, deletedAt: { not: null } },
          data: { deletedAt: null }
        })
      }

      // 4. Log activity
      await prisma.activityLog.create({
        data: {
          userId,
          action: "RESTORED_BOQS",
          entityType: "BOQ",
          entityId: ids.length === 1 ? ids[0] : "BULK",
          details: `Super Admin (${userEmail}) restored ${count} BOQ record(s).`
        }
      })

      return NextResponse.json({ success: true, count, message: `Successfully restored ${count} BOQ(s).` })
    } else if (type === "CLIENT") {
      // 1. Restore target clients
      const { count } = await prisma.client.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: null }
      })

      // 2. Optionally restore associated soft-deleted quotations and BOQs for these clients
      await prisma.quotation.updateMany({
        where: { clientId: { in: ids }, deletedAt: { not: null } },
        data: { deletedAt: null }
      })
      await prisma.boq.updateMany({
        where: { clientId: { in: ids }, deletedAt: { not: null } },
        data: { deletedAt: null }
      })

      // 3. Log activity
      await prisma.activityLog.create({
        data: {
          userId,
          action: "RESTORED_CLIENTS",
          entityType: "CLIENT",
          entityId: ids.length === 1 ? ids[0] : "BULK",
          details: `Super Admin (${userEmail}) restored ${count} client(s) and their associated records.`
        }
      })

      return NextResponse.json({ success: true, count, message: `Successfully restored ${count} client(s) and associated records.` })
    } else {
      return NextResponse.json({ error: "Unsupported entity type for restoration." }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Error restoring records:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}
