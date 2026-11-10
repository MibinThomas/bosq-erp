import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { decideQuotationRequest } from "@/lib/approval-engine"

// Approve or reject a quotation's open approval request.
// Who may decide comes from the configured approval levels (Settings → Approvals), not from RBAC.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!session?.user || !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const action = body?.action
    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 })
    }

    const result = await decideQuotationRequest({
      quotationId: id,
      user: { id: userId, role: (session.user as any).role, name: session.user.name || session.user.email },
      action,
      comment: body?.comment ?? body?.rejectionReason,
    })
    if (!result.ok) {
      return NextResponse.json({ message: result.message, error: result.message }, { status: result.status })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in quotation approval API:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
