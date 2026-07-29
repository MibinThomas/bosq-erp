import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let tracker = await prisma.sequenceTracker.findUnique({
      where: { type: "QUOTATION_BASE" }
    })

    if (!tracker) {
      // Calculate from existing quotations if tracker doesn't exist
      const allQuotes = await prisma.quotation.findMany({ select: { quotationNumber: true } })
      let maxNumber = 3670
      for (const q of allQuotes) {
        const match = q.quotationNumber.match(/^[IDP](\d+)/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      }
      
      tracker = await prisma.sequenceTracker.create({
        data: {
          type: "QUOTATION_BASE",
          lastValue: maxNumber,
          description: "Base quotation number sequence"
        }
      })
    }

    return NextResponse.json(tracker)
  } catch (error) {
    console.error("Failed to fetch sequence tracker:", error)
    return NextResponse.json({ error: "Failed to load sequence" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { lastValue } = await request.json()
    if (typeof lastValue !== "number" || lastValue < 0) {
      return NextResponse.json({ error: "Invalid sequence number" }, { status: 400 })
    }

    const tracker = await prisma.sequenceTracker.upsert({
      where: { type: "QUOTATION_BASE" },
      update: { lastValue },
      create: { type: "QUOTATION_BASE", lastValue, description: "Base quotation number sequence" }
    })

    return NextResponse.json(tracker)
  } catch (error) {
    console.error("Failed to update sequence tracker:", error)
    return NextResponse.json({ error: "Failed to update sequence" }, { status: 500 })
  }
}
