import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status") || "ALL"
    const searchQuery = (searchParams.get("search") || "").trim().toLowerCase()

    const userRole = (session.user as any).role || ""
    const userId = (session.user as any).id || ""

    const canViewCosting = await hasPermission(userId, "COSTING_REQUESTS", "view")
    if (!canViewCosting && userRole !== "SUPER_ADMIN" && !["ADMIN", "SALES_MANAGER", "MANAGER", "ESTIMATOR"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden: Access denied to Costing Requests module" }, { status: 403 })
    }

    // Build Prisma query condition
    const whereCondition: any = {
      costingStatus: {
        not: "NOT_REQUIRED"
      }
    }

    if (statusFilter !== "ALL") {
      whereCondition.costingStatus = statusFilter
    }

    if (searchQuery) {
      whereCondition.OR = [
        { description: { contains: searchQuery, mode: "insensitive" } },
        { categoryName: { contains: searchQuery, mode: "insensitive" } },
        { quotation: { quotationNumber: { contains: searchQuery, mode: "insensitive" } } },
        { quotation: { client: { companyName: { contains: searchQuery, mode: "insensitive" } } } },
        { quotation: { projectName: { contains: searchQuery, mode: "insensitive" } } },
      ]
    }

    const costingItems = await prisma.quotationItem.findMany({
      where: whereCondition,
      include: {
        quotation: {
          include: {
            client: {
              select: { id: true, companyName: true, contactPerson: true, email: true, phone: true }
            },
            preparedBy: {
              select: { id: true, name: true, email: true, role: true }
            },
            assignedEstimator: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        product: {
          select: { id: true, productName: true, imageUrl: true }
        },
        estimator: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { costingRequestedAt: "desc" },
        { updatedAt: "desc" }
      ]
    })

    // Fetch aggregate KPI metrics across all costing items
    const allCostingItems = await prisma.quotationItem.findMany({
      where: { costingStatus: { not: "NOT_REQUIRED" } },
      select: { costingStatus: true, marginPercentage: true }
    })

    const pendingCount = allCostingItems.filter(i => i.costingStatus === "PENDING_COSTING").length
    const inProgressCount = allCostingItems.filter(i => i.costingStatus === "COSTING_IN_PROGRESS").length
    const completedCount = allCostingItems.filter(i => i.costingStatus === "COSTING_COMPLETED").length
    const revisionRequestedCount = allCostingItems.filter(i => i.costingStatus === "REVISION_REQUESTED").length

    const completedWithMargin = allCostingItems.filter(i => i.costingStatus === "COSTING_COMPLETED" && (i.marginPercentage || 0) > 0)
    const avgMarginPercentage = completedWithMargin.length > 0
      ? completedWithMargin.reduce((acc, i) => acc + (i.marginPercentage || 0), 0) / completedWithMargin.length
      : 0

    // Sanitize response if user is IDC (privacy requirement)
    const isIDC = userRole === "INTERIOR_DESIGN_CONSULTANT"
    const sanitizedItems = costingItems.map(item => {
      if (isIDC) {
        return {
          ...item,
          materialCost: 0,
          laborCost: 0,
          overheadCost: 0,
          transportCost: 0,
          installationCost: 0,
          unitCost: 0,
          marginPercentage: 0
        }
      }
      return item
    })

    return NextResponse.json({
      items: sanitizedItems,
      kpis: {
        pendingCount,
        inProgressCount,
        completedCount,
        revisionRequestedCount,
        avgMarginPercentage: Math.round(avgMarginPercentage * 10) / 10
      }
    })
  } catch (error: any) {
    console.error("GET /api/costing error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch costing requests" }, { status: 500 })
  }
}
