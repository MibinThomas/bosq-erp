import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const result = await prisma.product.updateMany({
      data: {
        dimensions: null,
        availableColors: null
      }
    })
    return NextResponse.json({ success: true, count: result.count })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
