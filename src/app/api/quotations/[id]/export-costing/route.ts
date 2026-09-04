import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"
import { buildCostingExcelWorkbook, CostingExportItem } from "@/lib/costing-excel-builder"

export async function GET(
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
      include: {
        permissionOverrides: {
          where: { module: { in: ["QUOTATIONS", "COSTING_REQUESTS", "BOQS"] } }
        }
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role & RBAC Check for Super Admin and Managerial roles
    const userRole = (dbUser.role || "").toUpperCase()
    const isManagerialRole = [
      "SUPER_ADMIN",
      "ADMIN",
      "MANAGER",
      "SALES_MANAGER",
      "ESTIMATOR",
      "COST_ESTIMATOR"
    ].includes(userRole)

    const canViewCostingPerm = await hasPermission(dbUser.id, "QUOTATIONS", "canViewCostingBreakdown")
    const canExportCostingPerm = await hasPermission(dbUser.id, "QUOTATIONS", "export")
    const costPriceVisibleOverride = dbUser.permissionOverrides.find(o => o.action === "costPriceVisible" || o.action === "canViewCostingBreakdown")?.value

    const isAuthorized = isManagerialRole || canViewCostingPerm || canExportCostingPerm || costPriceVisibleOverride === true

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to export detailed costing breakdowns." },
        { status: 403 }
      )
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        client: true,
        preparedBy: true,
        assignedEstimator: true,
        boq: {
          include: {
            items: true
          }
        },
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          },
          orderBy: { itemNo: "asc" }
        }
      }
    })

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
    }

    const boqItems = quotation.boq?.items || []
    const preparedByName = quotation.preparedBy?.name || quotation.preparedBy?.email || quotation.salesAgentName || "Sales Consultant"
    const estimatorName = quotation.assignedEstimator?.name || "Cost Estimator"

    const costingItems: CostingExportItem[] = quotation.items.map((qItem: any, idx: number) => {
      const matchedBoqItem = boqItems.find((b: any) => b.itemNo === qItem.itemNo || b.id === qItem.id) || boqItems[idx]

      const matCost = Number(qItem.materialCost ?? matchedBoqItem?.materialCost ?? matchedBoqItem?.factoryCost ?? 0)
      const labCost = Number(qItem.laborCost ?? matchedBoqItem?.laborCost ?? matchedBoqItem?.accessoriesCost ?? 0)
      const instCost = Number(qItem.installationCost ?? matchedBoqItem?.installationCost ?? 0)
      const transCost = Number(qItem.transportCost ?? matchedBoqItem?.transportCost ?? 0)
      const overCost = Number(qItem.overheadCost ?? matchedBoqItem?.overheadCost ?? 0)

      const computedUnitCost = matCost + labCost + instCost + transCost + overCost
      const unitCost = Number(qItem.unitCost) > 0
        ? Number(qItem.unitCost)
        : (computedUnitCost > 0 ? computedUnitCost : Number(matchedBoqItem?.unitCost || 0))

      const estPrice = Number(qItem.estimatorUnitPrice || qItem.unitPrice || matchedBoqItem?.unitSellingPrice || 0)
      const consPrice = Number(qItem.unitPrice || 0)
      const discAmt = Math.max(0, estPrice - consPrice)
      const discPct = estPrice > 0 ? Math.round((discAmt / estPrice) * 100) : Number(qItem.discount || 0)
      const isEstimatorCosted = qItem.costingStatus === "COSTING_COMPLETED" || !!qItem.costingCompletedAt || (unitCost > 0 && (matCost > 0 || labCost > 0))
      const isCatalogPrice = !!(qItem.productId || qItem.product)

      let statusText = isCatalogPrice ? "Price from Catalog" : `Provided by ${preparedByName}`
      if (isEstimatorCosted) {
        statusText = `Costing Completed by ${estimatorName}`
      } else if (qItem.costingStatus === "COSTING_IN_PROGRESS") {
        statusText = `In Costing by ${estimatorName}`
      } else if (qItem.costingStatus === "PENDING_COSTING") {
        statusText = "Pending Costing"
      }

      return {
        id: qItem.id,
        itemNo: qItem.itemNo || idx + 1,
        batchHeading: qItem.batchHeading || null,
        description: qItem.description || qItem.product?.productName || "Product Item",
        specifications: qItem.specifications || qItem.productDescription || qItem.productNotes || null,
        modelCode: qItem.product?.sku || qItem.product?.modelCode || qItem.description,
        productType: qItem.categoryName || qItem.chairType || qItem.product?.category?.name || null,
        upholsteryMaterial: qItem.product?.upholsteryMaterial || null,
        baseType: qItem.product?.baseType || null,
        finishColor: qItem.product?.finishColor || null,
        recommendedUsage: qItem.product?.recommendedUsage || null,
        quantity: Math.max(1, qItem.quantity || 1),
        factoryCost: matCost,
        accessoriesCost: labCost,
        totalCostUnit: unitCost > 0 ? unitCost : (matCost + labCost),
        marginPct: Number(qItem.marginPercentage ?? qItem.margin ?? 0),
        negotiationPct: Number(qItem.negotiationPct ?? qItem.negotiationPercentage ?? 0),
        estimatorPriceUnit: estPrice,
        costingDone: isEstimatorCosted,
        costingStatusText: statusText,
        discountByIDC: discPct > 0 ? `${discPct}%` : "0%",
        finalPriceUnit: consPrice,
        customImageUrl: qItem.customImageUrl || null,
        product: qItem.product ? {
          imageUrl: qItem.product.imageUrl || null,
          sku: qItem.product.sku || null
        } : null
      }
    })

    const workbook = await buildCostingExcelWorkbook({
      quotationNumber: quotation.quotationNumber,
      projectName: quotation.projectName,
      date: quotation.date,
      client: quotation.client ? {
        companyName: quotation.client.companyName,
        contactPerson: quotation.client.contactPerson,
        phone: quotation.client.phone,
        email: quotation.client.email
      } : null,
      preparedBy: quotation.preparedBy ? {
        name: quotation.preparedBy.name,
        email: quotation.preparedBy.email
      } : null,
      assignedEstimator: quotation.assignedEstimator ? {
        name: quotation.assignedEstimator.name,
        email: quotation.assignedEstimator.email
      } : null,
      items: costingItems
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const excelBuffer = Buffer.from(buffer as any)

    const cleanQuoteNum = (quotation.quotationNumber || "Quotation").replace(/[\/\\:\*\?"<>\|]/g, "").trim()
    const cleanClient = (quotation.client?.companyName || "Client").replace(/[\/\\:\*\?"<>\|]/g, "").trim()
    const filename = `${cleanQuoteNum}_${cleanClient}_Costing_Breakdown.xlsx`

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error("Failed to export costing breakdown to Excel:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
