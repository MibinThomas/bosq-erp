import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { migrateQuotationToGroupFolder, sanitizeClientName, getBaseQuotationFolder } from "@/lib/sharepoint"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbSessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!dbSessionUser || dbSessionUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 })
    }

    // Fetch all quotations that have a sharepointUrl
    const quotations = await prisma.quotation.findMany({
      where: { sharepointUrl: { not: null } },
      include: { client: true }
    })

    const results = []
    let movedCount = 0

    for (const q of quotations) {
      if (!q.client) continue

      const sanitizedClientName = sanitizeClientName(q.client.companyName)
      const fileNameWithExtension = `${q.quotationNumber}_${sanitizedClientName}.pdf`
      const groupFolder = getBaseQuotationFolder(q.quotationNumber)

      if (!groupFolder) continue

      // Attempt to move it
      const res = await migrateQuotationToGroupFolder(q.client.companyName, fileNameWithExtension, groupFolder)

      if (res.success && res.newUrl) {
        // Update database with new URL
        await prisma.quotation.update({
          where: { id: q.id },
          data: { sharepointUrl: res.newUrl }
        })
        movedCount++
        results.push({ quote: q.quotationNumber, status: "Moved", newUrl: res.newUrl })
      } else {
        results.push({ quote: q.quotationNumber, status: "Skipped", reason: res.reason || (res.error as any)?.message || String(res.error) || "Unknown error" })
      }
    }

    return NextResponse.json({
      message: `Migration complete. Moved ${movedCount} files.`,
      results
    })
  } catch (error: any) {
    console.error("Migration error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
