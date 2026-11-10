import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"
import { canApproveLevel } from "@/lib/approval-policy"
import { getActiveWorkflow } from "@/lib/approval-engine"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const userRole = ((session.user as any).role || "").toUpperCase()
    const isManagerOrAdmin = ["ADMIN", "SUPER_ADMIN", "SALES_MANAGER", "MANAGER"].includes(userRole)

    const workflow = await getActiveWorkflow("QUOTATION")
    const approver = { id: userId, role: userRole }
    const isConfiguredApprover = !!workflow && canApproveLevel(approver, workflow.levels, 1)

    const canViewApprovals = await hasPermission(userId, "APPROVALS", "view")
    if (!canViewApprovals && !isManagerOrAdmin && !isConfiguredApprover) {
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

    // 2. Quotations with an open approval request (only while the Approval Module is on)
    let pendingQuotations: any[] = []
    if (workflow) {
      const requests = await prisma.approvalRequest.findMany({
        where: { module: "QUOTATION", status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 50,
      })
      const quotations = await prisma.quotation.findMany({
        where: {
          id: { in: requests.map((r) => r.documentId) },
          status: { notIn: ["REVISED", "CANCELLED", "LOST"] },
          deletedAt: null,
        },
        include: { client: true, preparedBy: selectUserFields() },
      })
      pendingQuotations = requests
        .map((r) => {
          const q = quotations.find((x) => x.id === r.documentId)
          if (!q) return null
          return {
            ...q,
            approvalRequest: {
              id: r.id,
              levelName: r.levelName,
              levelRank: r.levelRank,
              reason: r.reason,
              metrics: r.metrics,
              createdAt: r.createdAt,
            },
            canDecide: canApproveLevel(approver, workflow.levels, r.levelRank),
          }
        })
        .filter(Boolean)
    }

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
      approvalModuleEnabled: !!workflow,
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
