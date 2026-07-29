import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import prisma from "@/lib/prisma"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Only SUPER_ADMIN allowed
    if (session.user.role !== "SUPER_ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { quotations } = body

    if (!quotations || !Array.isArray(quotations)) {
      return new NextResponse("Invalid payload", { status: 400 })
    }

    const results = {
      totalReceived: quotations.length,
      successCount: 0,
      failedCount: 0,
      errors: [] as any[]
    }

    // Process quotations sequentially to handle revisions correctly
    // We should process Revision 0 first, then Revision 1, etc.
    const sortedQuotations = [...quotations].sort((a, b) => {
      return (parseInt(a.revisionNumber) || 0) - (parseInt(b.revisionNumber) || 0)
    })

    for (const q of sortedQuotations) {
      try {
        const qNumber = q.quotationNumber?.toString().trim()
        const revNumber = parseInt(q.revisionNumber) || 0
        const clientId = q.clientId?.toString().trim()
        const preparedByEmail = q.preparedByEmail?.toString().trim()

        if (!qNumber) throw new Error("Quotation Number is required")
        if (!clientId) throw new Error("Client ID is required")
        if (!preparedByEmail) throw new Error("Prepared By Email is required")

        // 1. Find Client
        const client = await prisma.client.findFirst({
          where: {
            OR: [
              { clientId: clientId },
              { companyName: clientId }
            ]
          }
        })
        if (!client) throw new Error(`Client not found: ${clientId}`)

        // 2. Find Prepared By User
        const user = await prisma.user.findFirst({
          where: { email: preparedByEmail }
        })
        if (!user) throw new Error(`User not found: ${preparedByEmail}`)

        // 3. Find Parent Revision (if revNumber > 0)
        let parentId = null
        if (revNumber > 0) {
          const parentQuote = await prisma.quotation.findFirst({
            where: {
              quotationNumber: qNumber,
              revisionNumber: 0
            }
          })
          if (!parentQuote) throw new Error(`Parent quotation ${qNumber} (Revision 0) not found in database. Please upload Revision 0 first.`)
          parentId = parentQuote.id
        }

        // 4. Create Quotation
        // Parse dates safely
        let qDate = new Date()
        if (q.date) {
          const parsed = new Date(q.date)
          if (!isNaN(parsed.getTime())) qDate = parsed
        }

        let vDate = new Date(qDate)
        vDate.setDate(vDate.getDate() + 30) // default 30 days
        if (q.validityDate) {
          const parsed = new Date(q.validityDate)
          if (!isNaN(parsed.getTime())) vDate = parsed
        }

        // Check if exact quote already exists to avoid dupes
        const existing = await prisma.quotation.findFirst({
          where: {
            quotationNumber: qNumber,
            revisionNumber: revNumber
          }
        })
        if (existing) {
          throw new Error(`Quotation ${qNumber} Revision ${revNumber} already exists in database.`)
        }

        const grandTotal = parseFloat(q.grandTotal) || 0

        const newQuote = await prisma.quotation.create({
          data: {
            quotationNumber: qNumber,
            revisionNumber: revNumber,
            clientId: client.id,
            preparedById: user.id,
            parentId: parentId,
            date: qDate,
            validityDate: vDate,
            status: q.status?.toUpperCase() || "DRAFT",
            grandTotal: grandTotal,
            subtotal: grandTotal, // for simplicity on legacy data
            projectName: q.projectName || null,
            notes: q.notes || "Imported historical quotation",
            salesAgentName: q.salesAgentName || null,
            customerSegment: client.clientType || "Project",
            items: {
              create: [
                {
                  itemNo: 1,
                  description: "Legacy Imported Data",
                  quantity: 1,
                  unitPrice: grandTotal,
                  amount: grandTotal,
                  categoryName: "Historical"
                }
              ]
            }
          }
        })

        results.successCount++
      } catch (error: any) {
        results.failedCount++
        results.errors.push({
          row: q.rowIndex || 0,
          quotationNumber: q.quotationNumber,
          error: error.message
        })
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("[QUOTATIONS_BULK_UPLOAD]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
