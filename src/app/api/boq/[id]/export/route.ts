import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { uploadBoqExcel } from "@/lib/sharepoint"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"
import { buildBoqExcelWorkbook } from "@/lib/boq-excel-builder"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { permissionOverrides: { where: { module: "BOQS" } } }
    })

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role-based access control for Admin/Manager BOQ Export
    const userRole = (dbUser.role || "").toUpperCase()
    const isAuthorizedRole = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER", "ESTIMATOR", "COST_ESTIMATOR"].includes(userRole)
    const canExportPermission = await hasPermission(dbUser.id, "BOQS", "export")
    const canExportExcelOverride = dbUser.permissionOverrides.find(o => o.action === "canExportBoqExcel")?.value
    const canExportBoqExcelPerm = await hasPermission(dbUser.id, "BOQS", "canExportBoqExcel")

    const isAuthorized = isAuthorizedRole || canExportPermission || canExportExcelOverride === true || canExportBoqExcelPerm

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to export detailed BOQ costing breakdowns." },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { quotationNumber, quotationGroupFolder, isDownloadFormat } = body

    const boq = await prisma.boq.findUnique({
      where: { id },
      include: {
        client: true,
        preparedBy: true,
        estimator: true,
        items: {
          include: {
            product: true
          },
          orderBy: { itemNo: "asc" }
        }
      }
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    // Build rich Excel workbook using buildBoqExcelWorkbook
    const workbook = await buildBoqExcelWorkbook(boq as any, true)
    const buffer = await workbook.xlsx.writeBuffer()
    const excelBuffer = Buffer.from(buffer as any)

    const sanitizedClientName = (boq.client?.companyName || "Client").replace(/[\/\\:\*\?"<>\|]/g, "").trim()
    const cleanQuotationNum = (quotationNumber || boq.boqNumber || "BOQ").replace(/[\/\\:\*\?"<>\|]/g, "").trim()
    const filename = `${cleanQuotationNum}_${sanitizedClientName}.xlsx`

    if (isDownloadFormat) {
      return new Response(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      })
    }

    // Upload to SharePoint
    const sharepointUrl = await uploadBoqExcel(
      boq.client.companyName, 
      filename.replace(/\.xlsx$/, ""), 
      excelBuffer, 
      quotationGroupFolder
    )

    return NextResponse.json({ success: true, sharepointUrl })
  } catch (error) {
    console.error("Failed to export BOQ to Excel:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

function baseCost(base: number, marginPct: number): number {
  if (marginPct >= 100) return base * 2
  return base / (1 - marginPct / 100)
}

