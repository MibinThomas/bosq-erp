"use client"

import React from "react"
import { 
  QuotationCostingWorkspaceModal, 
  QuotationGroupData,
  CostingItemData
} from "./QuotationCostingWorkspaceModal"

interface CostingUpdateModalProps {
  quotationId: string
  item?: any
  quotationData?: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CostingUpdateModal({
  quotationId,
  item,
  quotationData,
  open,
  onOpenChange,
  onSuccess
}: CostingUpdateModalProps) {
  if (!open) return null

  // If full quotationData is passed, use all items from quotationData
  const qData = quotationData || item?.quotation
  const itemsList: CostingItemData[] = (qData?.items && Array.isArray(qData.items))
    ? qData.items.map((i: any) => ({
        id: i.id,
        quotationId: quotationId || qData.id,
        itemNo: i.itemNo || 1,
        description: i.description || i.productName || "Product",
        specifications: i.specifications || null,
        productNotes: i.productNotes || null,
        productDescription: i.productDescription || null,
        quantity: i.quantity || 1,
        unitPrice: i.unitPrice || 0,
        amount: i.amount || 0,
        unitCost: i.unitCost || 0,
        materialCost: i.materialCost || 0,
        laborCost: i.laborCost || 0,
        overheadCost: i.overheadCost || 0,
        transportCost: i.transportCost || 0,
        installationCost: i.installationCost || 0,
        marginPercentage: i.marginPercentage ?? 0,
        costingStatus: i.costingStatus || "PENDING_COSTING",
        estimatorNotes: i.estimatorNotes || null,
        costingRequestedAt: i.costingRequestedAt || null,
        costingCompletedAt: i.costingCompletedAt || null,
        customImageUrl: i.customImageUrl || null,
        imageUrl: i.imageUrl || null,
        categoryName: i.categoryName || null,
        chairType: i.chairType || null,
        batchHeading: i.batchHeading || null,
        product: i.product || null
      }))
    : item ? [{
        id: item.id,
        quotationId: quotationId || item.quotationId,
        itemNo: item.itemNo || 1,
        description: item.description || "Product",
        specifications: item.specifications || null,
        productNotes: item.productNotes || null,
        productDescription: item.productDescription || null,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        amount: item.amount || 0,
        unitCost: item.unitCost || 0,
        materialCost: item.materialCost || 0,
        laborCost: item.laborCost || 0,
        overheadCost: item.overheadCost || 0,
        transportCost: item.transportCost || 0,
        installationCost: item.installationCost || 0,
        marginPercentage: item.marginPercentage ?? 0,
        costingStatus: item.costingStatus || "PENDING_COSTING",
        estimatorNotes: item.estimatorNotes || null,
        costingRequestedAt: item.costingRequestedAt || null,
        costingCompletedAt: item.costingCompletedAt || null,
        customImageUrl: item.customImageUrl || null,
        imageUrl: item.imageUrl || null,
        categoryName: item.categoryName || null,
        chairType: item.chairType || null,
        batchHeading: item.batchHeading || null,
        product: item.product || null
      }] : []

  const groupData: QuotationGroupData = {
    quotationId: quotationId || qData?.id || item?.quotationId || "",
    quotationNumber: qData?.quotationNumber || item?.quotation?.quotationNumber || `QT-${quotationId}`,
    projectName: qData?.projectName || item?.quotation?.projectName || null,
    status: qData?.status || item?.quotation?.status || "DRAFT",
    costingStatus: qData?.costingStatus || item?.quotation?.costingStatus || null,
    client: qData?.client || item?.quotation?.client || { id: "", companyName: "Client", contactPerson: null, email: null, phone: null },
    preparedBy: qData?.preparedBy || item?.quotation?.preparedBy || { id: "", name: "Consultant", email: null, role: "" },
    assignedEstimator: qData?.assignedEstimator || item?.quotation?.assignedEstimator || null,
    requestDate: qData?.createdAt || item?.costingRequestedAt || null,
    items: itemsList
  }

  return (
    <QuotationCostingWorkspaceModal
      quotationGroup={groupData}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  )
}
