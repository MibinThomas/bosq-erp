import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"
import { PENDING_APPROVAL_STATUSES } from "@/lib/approval-policy"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const userRole = ((session.user as any).role || "").toUpperCase()
    const isManagerOrAdmin = ["ADMIN", "SUPER_ADMIN", "SALES_MANAGER", "MANAGER"].includes(userRole)

    const canViewApprovals = await hasPermission(userId, "APPROVALS", "view")
    if (!canViewApprovals && !isManagerOrAdmin) {
      const canApprove = await hasPermission(userId, "QUOTATIONS", "approve")
      if (!canApprove) {
        return NextResponse.json({ error: "Forbidden: Management approval rights required" }, { status: 403 })
      }
    }

    // 1. Fetch pending Client Access Requests (created with status "Requested")
    const clientAccessRequests = await prisma.clientAccessRequest.findMany({
      where: { status: { in: ["Requested", "PENDING"] } },
      include: {
        client: true,
        user: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    // 2. Fetch Quotations whose discount is awaiting approval
    const pendingQuotations = await prisma.quotation.findMany({
      where: {
        approvalStatus: { in: PENDING_APPROVAL_STATUSES },
        status: { notIn: ["REVISED", "CANCELLED", "LOST"] },
        deletedAt: null
      },
      include: {
        client: true,
        preparedBy: selectUserFields()
      },
      orderBy: { updatedAt: "desc" },
      take: 20
    })

    // 3. Fetch BOQs awaiting cost review or management sign-off
    const pendingBoqs = await prisma.boq.findMany({
      where: {
        status: { in: ["SENT_TO_ESTIMATOR", "COSTING_COMPLETED", "NEEDS_REVISION"] },
        deletedAt: null
      },
      include: {
        client: true,
        preparedBy: selectUserFields(),
        estimator: selectUserFields()
      },
      orderBy: { updatedAt: "desc" },
      take: 20
    })

    return NextResponse.json({
      clientAccessRequests,
      pendingQuotations,
      pendingBoqs
    })
  } catch (error: any) {
    console.error("Failed to fetch executive approvals data:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

function selectUserFields() {
  return {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true
    }
  }
}
