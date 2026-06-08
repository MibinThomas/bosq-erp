import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = (session.user as any).role || "SALES_EXECUTIVE"
    const currentUserId = (session.user as any).id

    let whereClause: any = {}

    // Sales reps can only see their own quotations
    if (userRole === "SALES_EXECUTIVE") {
      whereClause.preparedById = currentUserId
    }

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        client: true
      }
    })

    const totalCreated = quotations.length
    const totalRevisions = quotations.filter(q => q.parentId !== null || q.revisionNumber > 0).length
    const clientConfirmed = quotations.filter(q => ["CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED"].includes(q.status)).length

    // Lost/rejected revisions: status is REJECTED or CANCELLED, OR it has been superseded by a confirmed quote in its series
    // To find superseded: we can group quotations by their root series ID (which is parentId || id)
    const seriesMap = new Map<string, any[]>()
    quotations.forEach(q => {
      const rootId = q.parentId || q.id
      if (!seriesMap.has(rootId)) {
        seriesMap.set(rootId, [])
      }
      seriesMap.get(rootId)!.push(q)
    })

    let lostOrRejected = 0
    quotations.forEach(q => {
      if (q.status === "REJECTED" || q.status === "CANCELLED") {
        lostOrRejected++
      } else {
        const rootId = q.parentId || q.id
        const seriesQuotes = seriesMap.get(rootId) || []
        const hasConfirmedInSeries = seriesQuotes.some(sq => 
          ["CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED"].includes(sq.status)
        )
        const isThisQuoteConfirmed = ["CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED"].includes(q.status)
        // If the series has a confirmed quote, but this specific one is not confirmed, it is "Not Selected" / "Superseded" / "Lost"
        if (hasConfirmedInSeries && !isThisQuoteConfirmed) {
          lostOrRejected++
        }
      }
    })

    // Prepare time series sales details for chart
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const monthlySeriesMap = new Map<string, { month: string; confirmed: number; total: number }>()

    // Initialize last 6 months
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`
      monthlySeriesMap.set(label, { month: label, confirmed: 0, total: 0 })
    }

    quotations.forEach(q => {
      const d = new Date(q.createdAt)
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`
      if (monthlySeriesMap.has(label)) {
        const data = monthlySeriesMap.get(label)!
        data.total += q.grandTotal
        if (["CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED"].includes(q.status)) {
          data.confirmed += q.grandTotal
        }
      }
    })

    const chartData = Array.from(monthlySeriesMap.values())

    return NextResponse.json({
      totalCreated,
      totalRevisions,
      clientConfirmed,
      lostOrRejected,
      chartData
    })
  } catch (error) {
    console.error("Reports API error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
