import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"
import { parseCostingWorkbook } from "@/lib/costing-import"

// Reads an updated costing workbook (exported from the Costing Workspace) and returns a preview of
// matched rows with their new values, plus invalid, duplicate and unmatched rows. Nothing is saved here —
// the workspace applies the values on confirmation and the estimator saves as usual.
const MAX_FILE_BYTES = 10 * 1024 * 1024

async function canUseCosting(email: string) {
  const dbUser = await prisma.user.findUnique({
    where: { email },
    include: { permissionOverrides: { where: { module: { in: ["QUOTATIONS", "COSTING_REQUESTS"] } } } },
  })
  if (!dbUser) return false
  const role = (dbUser.role || "").toUpperCase()
  if (["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER", "ESTIMATOR", "COST_ESTIMATOR"].includes(role)) return true
  if (await hasPermission(dbUser.id, "QUOTATIONS", "canViewCostingBreakdown")) return true
  if (await hasPermission(dbUser.id, "COSTING_REQUESTS", "edit")) return true
  return dbUser.permissionOverrides.some((o) => (o.action === "costPriceVisible" || o.action === "canViewCostingBreakdown") && o.value === true)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!(await canUseCosting(session.user.email))) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to import costing." }, { status: 403 })
    }

    const quotation = await prisma.quotation.findFirst({
      where: { OR: [{ id }, { quotationNumber: id }] },
      include: { items: { include: { product: { select: { productCode: true } } }, orderBy: { itemNo: "asc" } } },
    })
    if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 })

    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 })
    if (!/\.xlsx$/i.test(file.name)) return NextResponse.json({ error: "Please upload the costing file as .xlsx (Excel)." }, { status: 400 })
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "The file is larger than 10 MB." }, { status: 400 })

    const workbook = new ExcelJS.Workbook()
    try {
      await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as any)
    } catch {
      return NextResponse.json({ error: "The file could not be read as an Excel workbook." }, { status: 400 })
    }

    const preview = parseCostingWorkbook(workbook, {
      id: quotation.id,
      quotationNumber: quotation.quotationNumber,
      items: quotation.items.map((i) => ({
        id: i.id,
        itemNo: i.itemNo,
        description: i.description,
        quantity: i.quantity,
        productCode: i.product?.productCode || null,
      })),
    })
    if ("error" in preview) return NextResponse.json({ error: preview.error }, { status: 400 })
    return NextResponse.json(preview)
  } catch (error: any) {
    console.error("Costing import error:", error)
    return NextResponse.json({ error: error?.message || "Failed to read the costing file" }, { status: 500 })
  }
}
