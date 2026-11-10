import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import { authOptions } from "@/lib/authOptions"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 25

// GET: approval requests and decisions (audit trail), newest first, plus settings changes
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Only Super Admin can view approval logs." }, { status: 403 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get("status")
  const q = url.searchParams.get("q")?.trim()
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1)

  const where: any = {}
  if (status && ["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status)) where.status = status
  if (q) where.documentNumber = { contains: q, mode: "insensitive" }

  const [total, requests, settingsChanges] = await Promise.all([
    prisma.approvalRequest.count({ where }),
    prisma.approvalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    page === 1
      ? prisma.activityLog.findMany({
          where: { entityType: "APPROVAL_SETTINGS" },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { user: { select: { name: true, email: true } } },
        })
      : Promise.resolve([]),
  ])

  const requesterIds = Array.from(new Set(requests.map((r) => r.requestedById).filter(Boolean))) as string[]
  const requesters = requesterIds.length
    ? await prisma.user.findMany({ where: { id: { in: requesterIds } }, select: { id: true, name: true, email: true } })
    : []

  return NextResponse.json({
    total,
    page,
    pageSize: PAGE_SIZE,
    requests: requests.map((r) => {
      const requester = requesters.find((u) => u.id === r.requestedById)
      return { ...r, requestedByName: requester?.name || requester?.email || null }
    }),
    settingsChanges,
  })
}
