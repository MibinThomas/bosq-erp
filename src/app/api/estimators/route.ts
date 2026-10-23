import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const estimators = await prisma.user.findMany({
      where: { role: "ESTIMATOR", isActive: true, deletedAt: null },
      select: { id: true, name: true, email: true }
    })
    return NextResponse.json(estimators)
  } catch (error) {
    console.error("Failed to fetch estimators", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
