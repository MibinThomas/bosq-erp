import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "PRICING_PERCENTAGES" }
    })
    
    if (setting) {
      return NextResponse.json(JSON.parse(setting.value))
    } else {
      // Default values
      return NextResponse.json({
        dealer: 15,
        interior: 30,
        direct: 50,
        online: 75
      })
    }
  } catch (error) {
    console.error("Failed to fetch pricing percentages:", error)
    return NextResponse.json({ error: "Failed to fetch pricing percentages" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || (role !== "ADMIN" && role !== "SALES_MANAGER" && role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const body = await request.json()
    const { dealer, interior, direct, online } = body

    const dealerVal = Math.min(Number(dealer), 99.99)
    const interiorVal = Math.min(Number(interior), 99.99)
    const directVal = Math.min(Number(direct), 99.99)
    const onlineVal = Math.min(Number(online), 99.99)

    const valueStr = JSON.stringify({
      dealer: dealerVal,
      interior: interiorVal,
      direct: directVal,
      online: onlineVal
    })

    const setting = await prisma.systemSetting.upsert({
      where: { key: "PRICING_PERCENTAGES" },
      update: { value: valueStr },
      create: { key: "PRICING_PERCENTAGES", value: valueStr }
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "UPDATED_SETTINGS",
        entityType: "SYSTEM",
        entityId: setting.id,
        details: "Updated global pricing markup percentages",
      },
    })

    return NextResponse.json(JSON.parse(setting.value))
  } catch (error) {
    console.error("Failed to update pricing percentages:", error)
    return NextResponse.json({ error: "Failed to update pricing percentages" }, { status: 500 })
  }
}
