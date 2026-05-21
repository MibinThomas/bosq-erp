import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import { format, parseISO, isSameDay } from "date-fns"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    const userIdFilter = url.searchParams.get("userId")
    const clientIdFilter = url.searchParams.get("clientId")
    const clientTypeFilter = url.searchParams.get("clientType")
    const statusFilter = url.searchParams.get("status")

    const userRole = (session.user as any).role || "SALES_EXECUTIVE"
    const currentUserId = (session.user as any).id

    let whereClause: any = {}

    // Role-based filtering
    if (userRole === "SALES_EXECUTIVE") {
      whereClause.preparedById = currentUserId
    } else if (userIdFilter && userIdFilter !== "all") {
      whereClause.preparedById = userIdFilter
    }

    // Date filtering
    let startD = new Date()
    startD.setDate(startD.getDate() - 30) // Default last 30 days
    let endD = new Date()

    if (startDate && startDate !== "null") startD = new Date(startDate)
    if (endDate && endDate !== "null") {
      endD = new Date(endDate)
      endD.setHours(23, 59, 59, 999)
    }

    whereClause.createdAt = {
      gte: startD,
      lte: endD
    }

    if (clientIdFilter && clientIdFilter !== "all") whereClause.clientId = clientIdFilter
    if (statusFilter && statusFilter !== "all") whereClause.status = statusFilter
    
    if (clientTypeFilter && clientTypeFilter !== "all") {
      whereClause.client = { clientType: clientTypeFilter }
    }

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        client: true
      },
      orderBy: { createdAt: "asc" }
    })

    // Prepare Sales Chart Time-Series Data
    // Group by Date (YYYY-MM-DD)
    const timeSeriesMap = new Map<string, { date: string; convertedValue: number; pendingValue: number }>()

    // Generate all dates in range to ensure continuous chart
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, "MMM dd")
      timeSeriesMap.set(dateStr, { date: dateStr, convertedValue: 0, pendingValue: 0 })
    }

    quotations.forEach(q => {
      const dateStr = format(q.createdAt, "MMM dd")
      if (!timeSeriesMap.has(dateStr)) return
      
      const record = timeSeriesMap.get(dateStr)!
      const value = q.subtotal || 0
      
      const isConverted = q.poStatus === "RECEIVED" || q.status === "PO_RECEIVED" || q.status === "APPROVED"
      
      if (isConverted) {
        record.convertedValue += value
      } else {
        record.pendingValue += value
      }
    })

    const salesData = Array.from(timeSeriesMap.values())

    // Prepare Segment Pie Chart Data
    const segmentMap = new Map<string, number>()
    segmentMap.set("Interior", 0)
    segmentMap.set("Dealer", 0)
    segmentMap.set("Direct", 0)
    segmentMap.set("Online", 0)

    quotations.forEach(q => {
      const segment = q.customerSegment || q.client?.clientType || "Direct"
      const val = q.subtotal || 0
      if (segmentMap.has(segment)) {
        segmentMap.set(segment, segmentMap.get(segment)! + val)
      } else {
        segmentMap.set(segment, val)
      }
    })

    const segmentData = Array.from(segmentMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0) // Only return segments with data

    return NextResponse.json({
      salesData,
      segmentData
    })
  } catch (error) {
    console.error("Dashboard charts error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
