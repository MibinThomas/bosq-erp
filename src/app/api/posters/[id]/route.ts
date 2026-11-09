import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import { authOptions } from "@/lib/authOptions"
import { PosterSchema, canManagePosters } from "@/lib/posters"

export const dynamic = "force-dynamic"

async function requireManager() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (!(await canManagePosters(user))) {
    return { error: NextResponse.json({ error: "Forbidden: You do not have permission to manage posters." }, { status: 403 }) }
  }
  return { user }
}

// PUT: update a poster (partial updates allowed)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireManager()
  if (auth.error) return auth.error
  const { id } = await params
  const parsed = PosterSchema.partial().safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid poster" }, { status: 400 })
  }
  const exists = await prisma.poster.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: "Poster not found" }, { status: 404 })
  const poster = await prisma.poster.update({ where: { id }, data: parsed.data })
  return NextResponse.json(poster)
}

// DELETE: remove a poster; quotations that listed it simply stop printing it
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireManager()
  if (auth.error) return auth.error
  const { id } = await params
  const result = await prisma.poster.deleteMany({ where: { id } })
  if (result.count === 0) return NextResponse.json({ error: "Poster not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}
