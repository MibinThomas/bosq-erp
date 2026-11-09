import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import { authOptions } from "@/lib/authOptions"
import { PosterSchema, canManagePosters, suggestPosters } from "@/lib/posters"

export const dynamic = "force-dynamic"

// GET: ?forProducts=id1,id2 → posters suggested for those products
//      ?q=…&includeInactive=1 → the library (inactive only for managers)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const forProducts = url.searchParams.get("forProducts")
  if (forProducts !== null) {
    const ids = forProducts.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200)
    return NextResponse.json(await suggestPosters(ids))
  }

  const q = url.searchParams.get("q")?.trim()
  const includeInactive = url.searchParams.get("includeInactive") === "1" && (await canManagePosters(user))
  const posters = await prisma.poster.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
          { tags: { has: q.toLowerCase() } },
        ],
      } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 200,
  })
  if (!includeInactive) return NextResponse.json(posters)

  // Library management view: include linked product names for display
  const productIds = Array.from(new Set(posters.flatMap((p) => p.productIds)))
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, productName: true, productCode: true },
      })
    : []
  return NextResponse.json(posters.map((p) => ({
    ...p,
    products: p.productIds
      .map((id) => products.find((x) => x.id === id))
      .filter(Boolean)
      .map((x) => ({ id: x!.id, name: `${x!.productName} (${x!.productCode})` })),
  })))
}

// POST: add a poster to the library
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await canManagePosters(user))) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to manage posters." }, { status: 403 })
  }
  const parsed = PosterSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid poster" }, { status: 400 })
  }
  const poster = await prisma.poster.create({ data: { ...parsed.data, uploadedById: user.id } })
  return NextResponse.json(poster, { status: 201 })
}
