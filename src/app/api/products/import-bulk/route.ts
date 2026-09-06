import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { importBosqBulkData } from "@/lib/import-bosq-bulk"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const result = await importBosqBulkData("public/uploads/bosq_bulk_update.xlsx")
    if (!result.success) {
      return NextResponse.json({ error: result.errors.join(", ") || "Failed to import bulk products" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.masterCount} Master Products and ${result.variantCount} Variants!`,
      masterCount: result.masterCount,
      variantCount: result.variantCount,
    })
  } catch (error: any) {
    console.error("Bulk import API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
