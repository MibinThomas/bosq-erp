import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const estimators = await prisma.user.findMany({
      where: { role: "ESTIMATOR" },
      select: { id: true, name: true, email: true }
    })
    return NextResponse.json(estimators)
  } catch (error) {
    console.error("Failed to fetch estimators", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
