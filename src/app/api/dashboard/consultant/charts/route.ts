import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getPermissionsProfile } from "@/lib/rbac"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const profile = await getPermissionsProfile(userId)
    if (!profile) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const ownershipRule = profile.permissions.DASHBOARD?.ownership || "NONE"
    if (ownershipRule === "NONE") return NextResponse.json({ error: "No dashboard access" }, { status: 403 })

    let qWhere: any = {}

    // Enforce Ownership Rules
    if (ownershipRule === "OWN") {
      qWhere.preparedById = userId
    } else if (ownershipRule === "ASSIGNED") {
      qWhere.OR = [ { preparedById: userId }, { salesAgentId: userId } ]
    } else if (ownershipRule === "DEPARTMENT") {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user?.department) qWhere.preparedBy = { department: user.department }
      else qWhere.preparedById = userId
    }

    const quotations = await prisma.quotation.findMany({
      where: qWhere,
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      }
    })

    // 1. Monthly Value
    const monthlyValueMap = new Map<string, number>()
    quotations.forEach(q => {
      const d = new Date(q.createdAt)
      const month = d.toLocaleString("default", { month: "short", year: "2-digit" })
      monthlyValueMap.set(month, (monthlyValueMap.get(month) || 0) + (q.subtotal || 0))
    })
    const monthlyValue = Array.from(monthlyValueMap, ([name, value]) => ({ name, value }))

    // 2. Status Breakdown
    const statusMap = new Map<string, number>()
    quotations.forEach(q => {
      statusMap.set(q.status, (statusMap.get(q.status) || 0) + 1)
    })
    const statusBreakdown = Array.from(statusMap, ([name, value]) => ({ name, value }))

    // 3. Client Segment Breakdown
    const segmentMap = new Map<string, number>()
    quotations.forEach(q => {
      const segment = q.customerSegment || "Unknown"
      segmentMap.set(segment, (segmentMap.get(segment) || 0) + 1)
    })
    const segmentBreakdown = Array.from(segmentMap, ([name, value]) => ({ name, value }))

    // 4. Product Category
    const categoryMap = new Map<string, number>()
    quotations.forEach(q => {
      q.items.forEach(item => {
        const cat = item.product?.category?.name || "Custom/Uncategorized"
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + item.quantity)
      })
    })
    const categoryBreakdown = Array.from(categoryMap, ([name, value]) => ({ name, value }))

    return NextResponse.json({
      monthlyValue,
      statusBreakdown,
      segmentBreakdown,
      categoryBreakdown
    })
  } catch (error) {
    console.error("Consultant Charts API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
