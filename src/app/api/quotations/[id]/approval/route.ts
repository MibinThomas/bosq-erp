import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { canAccessQuotation } from "@/lib/data-scope"
import { getQuotationApprovalView } from "@/lib/approval-engine"

export const dynamic = "force-dynamic"

// Approval panel for one quotation: whether the module is on, the open request, whether the
// current user may decide it, and the decision history.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    const role = (session.user as any).role as string | undefined

    const view = await getQuotationApprovalView(id, { id: userId, role, name: session.user.name })
    if (!view) return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
    // Approvers may always see the panel; others only for quotations they can access
    if (!view.canDecide && !(await canAccessQuotation({ id: userId, role: role || "" }, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json(view)
  } catch (error) {
    console.error("Failed to load quotation approval:", error)
    return NextResponse.json({ error: "Failed to load approval" }, { status: 500 })
  }
}
