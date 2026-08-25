"use client"

import React, { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { 
  ArrowLeft, 
  Loader2, 
  Download, 
  ExternalLink, 
  Check, 
  X, 
  Edit, 
  Copy, 
  Package,
  PackagePlus, 
  CheckCircle2, 
  FileText, 
  Coins, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Eye, 
  ShieldCheck,
  UserCheck,
  Briefcase,
  Paperclip,
  Phone,
  Mail,
  ZoomIn,
  FolderGit2,
  MessageSquare,
  Highlighter,
  FileCode,
  User,
  ShieldAlert,
  Info,
  Building2,
  FileSpreadsheet,
  Clock,
  History,
  Layers,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { isManagerOrAdminRole, cn } from "@/lib/utils"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CostingBreakdownModal } from "@/components/costing/CostingBreakdownModal"
import { CostingUpdateModal } from "@/components/costing/CostingUpdateModal"
import { calculateProductPrice } from "@/components/costing/QuotationCostingWorkspaceModal"
import { ExecutiveCostSummaryCard } from "@/components/costing/ExecutiveCostSummaryCard"
import { ManagerialAuditSection, ManagerialAuditSummary, AuditItemMetric } from "@/components/quotations/ManagerialAuditSection"
import { ApprovalMatrixBanner } from "@/components/quotations/ApprovalMatrixBanner"
import { Calculator, Sparkles, RefreshCw } from "lucide-react"

interface QuotationItem {
  id: string
  itemNo: number
  description: string
  specifications: string | null
  quantity: number
  unitPrice: number
  discount: number
  margin: number
  amount: number
  materialCost?: number
  laborCost?: number
  overheadCost?: number
  transportCost?: number
  installationCost?: number
  unitCost?: number
  marginPercentage?: number
  estimatorUnitPrice?: number
  consultantDiscountAmount?: number
  consultantDiscountPct?: number
  costingStatus?: string
  estimatorNotes?: string | null
  customImageUrl: string | null
  productNotes?: string | null
  productDescription?: string | null
  categoryName?: string | null
  chairType?: string | null
  batchHeading?: string | null
  product?: {
    imageUrl: string | null
    sku: string
    description?: string | null
    category?: { name: string } | null
    chairType?: string | null
  } | null
}

interface SupportingDocument {
  id: string
  title: string
  documentType: string
  url: string
  fileSize?: number
  uploadedByName?: string
  createdAt: string
  source: string
}

interface UserInfo {
  id: string
  name: string | null
  email: string
  phone?: string | null
  designation?: string | null
  role?: string | null
}

interface RevisionHistoryItem {
  id: string
  revisionNumber: number
  revisionDate: string
  previousTotal: number
  newTotal: number
  notes?: string | null
}

interface Quotation {
  id: string
  quotationNumber: string
  customerSegment: string
  projectName: string | null
  date: string
  validityDate: string
  preparedById: string
  preparedBy: UserInfo
  deliveryDate: string | null
  paymentTerms: string | null
  status: string
  costingStatus?: string | null
  revisionNumber: number
  subtotal: number
  deliveryCharge: number
  vatAmount: number
  grandTotal: number
  notes: string | null
  sharepointUrl: string | null
  salesAgentId?: string | null
  salesAgentName?: string | null
  salesAgentContactNumber?: string | null
  vatMode?: string
  specialDiscountType?: string | null
  specialDiscountValue?: number | null
  specialDiscountReason?: string | null
  discount?: number | null
  additionalCharges?: any
  commonRemark?: string | null
  commonRemarkHighlight?: boolean | null
  commonRemarkStyle?: string | null
  includeCategoryName?: boolean
  client: {
    companyName: string
    contactPerson: string | null
    phone: string | null
    email: string | null
    address: string | null
    trn: string | null
    clientId: string
  }
  boq?: {
    id?: string
    boqNumber?: string
    status?: string
    totalMaterialCost?: number
    totalLaborCost?: number
    totalInstallation?: number
    totalTransport?: number
    totalOverhead?: number
    totalFactoryCost?: number
    totalCost?: number
    marginAmount?: number
    totalSellingPrice?: number
    preparedBy?: UserInfo | null
    estimator?: UserInfo | null
    items?: any[]
  } | null
  items: QuotationItem[]
  supportingDocuments?: SupportingDocument[]
  revisions?: RevisionHistoryItem[]
  seriesQuotations?: any[]
  companyLogoUrl?: string | null
  aynMuskLogoUrl?: string | null
  barcodeBase64?: string | null
}

const formatRole = (role?: string | null) => {
  if (!role) return ""
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

export default function QuotationHtmlPreviewPage() {
  const router = useRouter()
  const rawParams = useParams()
  const id = (rawParams?.id as string) || ""
  const { data: session } = useSession()
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [costingModalItem, setCostingModalItem] = useState<any>(null)
  const [editingCostItem, setEditingCostItem] = useState<any>(null)
  const [isCostModalOpen, setIsCostModalOpen] = useState(false)
  const [activeViewMode, setActiveViewMode] = useState<"pdf" | "costing">("costing")
  const [loading, setLoading] = useState(true)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  const costingItemsList = React.useMemo(() => {
    if (!quotation || !Array.isArray(quotation.items)) return []
    const boqItems = quotation.boq?.items || []
    return quotation.items.map((qItem, idx) => {
      const matchedBoqItem = boqItems.find((b: any) => b.itemNo === qItem.itemNo || b.id === qItem.id) || boqItems[idx]
      
      // Read directly from QuotationItem saved fields, falling back to legacy BOQ
      const matCost = Number(qItem.materialCost ?? matchedBoqItem?.materialCost ?? matchedBoqItem?.factoryCost ?? 0)
      const labCost = Number(qItem.laborCost ?? matchedBoqItem?.laborCost ?? matchedBoqItem?.accessoriesCost ?? 0)
      const instCost = Number(qItem.installationCost ?? matchedBoqItem?.installationCost ?? 0)
      const transCost = Number(qItem.transportCost ?? matchedBoqItem?.transportCost ?? 0)
      const overCost = Number(qItem.overheadCost ?? matchedBoqItem?.overheadCost ?? 0)

      const computedUnitCost = matCost + labCost + instCost + transCost + overCost
      const unitCost = Number(qItem.unitCost) > 0 
        ? Number(qItem.unitCost) 
        : (computedUnitCost > 0 ? computedUnitCost : Number(matchedBoqItem?.unitCost || 0))

      const unitSellingPrice = Number(qItem.unitPrice ?? matchedBoqItem?.unitSellingPrice ?? 0)
      const qty = Math.max(1, qItem.quantity || 1)
      const totalCost = unitCost * qty
      const totalSellingPrice = (unitSellingPrice - (unitSellingPrice * ((qItem.discount || 0) / 100))) * qty
      const netProfitUnit = unitSellingPrice - unitCost
      const netProfitTotal = totalSellingPrice - totalCost
      const marginPct = Number(qItem.marginPercentage ?? matchedBoqItem?.marginPercentage ?? qItem.margin ?? 0)
      const negotiationPct = Number((qItem as any).negotiationPct ?? 0)

      const imageUrl = qItem.customImageUrl || qItem.product?.imageUrl || null

      return {
        ...qItem,
        itemNo: qItem.itemNo || idx + 1,
        imageUrl,
        factoryCost: matCost,
        accessoriesCost: labCost,
        materialCost: matCost,
        laborCost: labCost,
        installationCost: instCost,
        transportCost: transCost,
        overheadCost: overCost,
        unitCost,
        totalCost,
        unitSellingPrice,
        totalSellingPrice,
        marginPercentage: marginPct,
        negotiationPct,
        netProfitUnit,
        netProfitTotal,
        netMarginPct: totalSellingPrice > 0 ? (netProfitTotal / totalSellingPrice) * 100 : 0
      }
    })
  }, [quotation])

  const quotationCostSummary = React.useMemo(() => {
    if (!costingItemsList || costingItemsList.length === 0) return null

    let grandFactoryCost = 0
    let grandAccessoriesCost = 0
    let grandTotalCost = 0
    let grandBaseSellingPrice = 0
    let grandFinalSellingPrice = 0

    costingItemsList.forEach((item) => {
      const facCost = item.materialCost || 0
      const accCost = item.laborCost || 0
      const marginPct = item.marginPercentage ?? 0
      const negotiationPct = (item as any).negotiationPct ?? 0

      const calc = calculateProductPrice(facCost, accCost, marginPct, negotiationPct, item.unitPrice)
      const qty = item.quantity || 1

      grandFactoryCost += facCost * qty
      grandAccessoriesCost += accCost * qty
      grandTotalCost += calc.totalCost * qty
      grandBaseSellingPrice += calc.baseSellingPrice * qty
      grandFinalSellingPrice += calc.finalSellingPrice * qty
    })

    const grandTotalProfit = grandFinalSellingPrice - grandTotalCost
    const overallMarginPct = grandFinalSellingPrice > 0 ? (grandTotalProfit / grandFinalSellingPrice) * 100 : 0

    return {
      grandFactoryCost,
      grandAccessoriesCost,
      grandTotalCost,
      grandBaseSellingPrice,
      grandFinalSellingPrice,
      grandTotalProfit,
      overallMarginPct
    }
  }, [costingItemsList])

  const renderCostingStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_COSTING":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 font-semibold text-[10px] py-0.5 px-2">
            Pending Costing
          </Badge>
        )
      case "COSTING_IN_PROGRESS":
        return (
          <Badge className="bg-blue-600 text-white font-semibold text-[10px] py-0.5 px-2">
            In Progress
          </Badge>
        )
      case "COSTING_COMPLETED":
        return (
          <Badge className="bg-emerald-600 text-white font-semibold text-[10px] py-0.5 px-2">
            Costing Completed
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="text-[10px]">
            {status || "Not Required"}
          </Badge>
        )
    }
  }

  const quotationMetrics = React.useMemo(() => {
    if (!quotation) return null
    if (quotation.boq && Number(quotation.boq.totalCost) > 0) {
      return {
        totalMaterialCost: quotation.boq.totalMaterialCost || 0,
        totalLaborCost: quotation.boq.totalLaborCost || 0,
        totalInstallation: quotation.boq.totalInstallation || 0,
        totalTransport: quotation.boq.totalTransport || 0,
        totalOverhead: quotation.boq.totalOverhead || 0,
        totalCost: quotation.boq.totalCost || 0,
        marginAmount: quotation.boq.marginAmount ?? (quotation.grandTotal - (quotation.boq.totalCost || 0)),
        totalSellingPrice: quotation.grandTotal || quotation.boq.totalSellingPrice || 0
      }
    }
    if (costingItemsList && costingItemsList.length > 0) {
      let totalMaterialCost = 0
      let totalLaborCost = 0
      let totalInstallation = 0
      let totalTransport = 0
      let totalOverhead = 0
      let totalCost = 0
      let totalSellingPrice = 0

      costingItemsList.forEach((item) => {
        const qty = item.quantity || 1
        totalMaterialCost += (item.materialCost || 0) * qty
        totalLaborCost += (item.laborCost || 0) * qty
        totalInstallation += (item.installationCost || 0) * qty
        totalTransport += (item.transportCost || 0) * qty
        totalOverhead += (item.overheadCost || 0) * qty
        totalCost += (item.unitCost || 0) * qty
        totalSellingPrice += (item.unitSellingPrice || 0) * qty
      })

      return {
        totalMaterialCost,
        totalLaborCost,
        totalInstallation,
        totalTransport,
        totalOverhead,
        totalCost,
        marginAmount: totalSellingPrice - totalCost,
        totalSellingPrice: totalSellingPrice || quotation.grandTotal || 0,
        itemCount: costingItemsList.length
      }
    }
    return null
  }, [quotation, costingItemsList])

  const userRole = (session?.user as any)?.role || ""
  const isIDC = userRole === "INTERIOR_DESIGN_CONSULTANT" || userRole === "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER" || userRole === "SUPER_ADMIN" || userRole === "MANAGER"
  const isSuperAdmin = userRole === "SUPER_ADMIN"

  const [userPermissions, setUserPermissions] = useState<any>(null)
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false)
  const [conflictingQuoteNo, setConflictingQuoteNo] = useState("")

  const [isCatalogDialogOpen, setIsCatalogDialogOpen] = useState(false)
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set())
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const [itemStockMap, setItemStockMap] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch("/api/users/me/permissions")
      .then(res => res.json())
      .then(data => {
        if (data && data.permissions) {
          setUserPermissions(data.permissions.QUOTATIONS || {})
        }
      })
      .catch(err => console.error("Failed to load permissions", err))
  }, [])

  const isAuthorizedForCosting = isSuperAdmin || isManagerOrAdmin || (userPermissions?.costPriceVisible === true) || (userPermissions?.canViewCostingBreakdown === true)
  const isAuthorizedToConfirm = isSuperAdmin || isManagerOrAdmin || (userPermissions?.canConfirmQuotation === true)
  const canSaveToCatalog = isManagerOrAdminRole(userRole)

  // Auto set active view mode based on authorization & role
  useEffect(() => {
    if (isIDC) {
      if (isAuthorizedForCosting) {
        setActiveViewMode("costing")
      } else {
        setActiveViewMode("pdf")
      }
    } else if (isAuthorizedForCosting) {
      setActiveViewMode("costing")
    }
  }, [isAuthorizedForCosting, isIDC])

  const handleSaveItemToCatalog = async (item: QuotationItem, customStock?: number) => {
    if (!quotation) return
    setSavingItemId(item.id)
    try {
      const targetStock = customStock !== undefined 
        ? customStock 
        : (itemStockMap[item.id] !== undefined ? itemStockMap[item.id] : (item.quantity || 10))

      const res = await fetch(`/api/quotations/${quotation.id}/save-item-to-catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          productName: item.description,
          categoryName: item.categoryName || "Chairs",
          unitPrice: item.unitPrice,
          description: item.productDescription || item.description,
          specifications: item.specifications || "",
          imageUrl: item.customImageUrl || (item as any).product?.imageUrl || null,
          chairType: item.chairType || null,
          stock: targetStock,
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save product to catalog")
      }

      setSavedItemIds((prev) => new Set(prev).add(item.id))
      toast.success(`Saved "${item.description}" to product master catalog with stock ${targetStock}!`)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to save product to catalog")
    } finally {
      setSavingItemId(null)
    }
  }

  const handleConfirmQuote = async (forceReplace: boolean = false) => {
    if (!quotation) return
    try {
      const res = await fetch(`/api/quotations/${quotation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLIENT_CONFIRM", forceReplace })
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === "ALREADY_CONFIRMED") {
          setConflictingQuoteNo(data.confirmedQuotationNumber)
          setIsReplaceDialogOpen(true)
          return
        }
        throw new Error(data.error || "Failed to confirm quotation")
      }

      setQuotation(data)
      setIsReplaceDialogOpen(false)
      toast.success("Quotation marked as Client Confirmed successfully!")
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm quotation.")
    }
  }

  useEffect(() => {
    async function loadQuotation() {
      try {
        const res = await fetch(`/api/quotations/${id}`)
        if (!res.ok) {
          throw new Error("Failed to load quotation details")
        }
        const data = await res.json()
        setQuotation(data)
      } catch (error: any) {
        console.error(error)
        toast.error(error.message || "Failed to load quotation.")
      } finally {
        setLoading(false)
      }
    }
    loadQuotation()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading quotation preview...</p>
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="max-w-md mx-auto my-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-destructive">Quotation Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The quotation you are trying to preview could not be found or you do not have permission to view it.
        </p>
        <Link href="/quotations">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </Link>
      </div>
    )
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const sanitizeHtmlToText = (html: string) => {
    if (!html) return "";
    let text = html;
    text = text.replace(/style="[^"]*"/gi, '');
    text = text.replace(/style='[^']*'/gi, '');
    text = text.replace(/size="[^"]*"/gi, '');
    text = text.replace(/color="[^"]*"/gi, '');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<li>/gi, '\n• ');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    return text.trim();
  }

  const parseSpecifications = (specs: string | null | undefined) => {
    if (!specs) return [];
    const rawText = sanitizeHtmlToText(specs);
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line !== "");
    const parsedSpecs: { key?: string; value: string }[] = [];

    lines.forEach((line) => {
      if (/^product\s+specifications$/i.test(line)) {
        return;
      }

      if (line.includes(",") && line.includes(":")) {
        const parts = line.split(',');
        let currentSpec: { key?: string; value: string } | null = null;
        
        parts.forEach((part) => {
          const trimmed = part.trim();
          if (trimmed.includes(":")) {
            const colonIndex = trimmed.indexOf(":");
            const key = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();
            
            if (currentSpec) {
              parsedSpecs.push(currentSpec);
            }
            currentSpec = { key, value };
          } else {
            if (currentSpec) {
              currentSpec.value += ", " + trimmed;
            } else {
              parsedSpecs.push({ value: trimmed });
            }
          }
        });
        if (currentSpec) {
          parsedSpecs.push(currentSpec);
        }
      } else {
        if (line.includes(":")) {
          const colonIndex = line.indexOf(":");
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          parsedSpecs.push({ key, value });
        } else {
          parsedSpecs.push({ value: line });
        }
      }
    });

    return parsedSpecs.filter(spec => {
      const val = spec.value.trim().toLowerCase();
      if (!val || val === "-" || val === "not specified" || val === "none") {
        return false;
      }
      return true;
    });
  }

  const renderSpecificationsHtml = (specs: string | null | undefined, productNotes?: string | null) => {
    const parsed = parseSpecifications(specs);
    const specsList = parsed.filter(s => s.key?.toLowerCase() !== "remarks");
    const remarksFromSpecs = parsed.filter(s => s.key?.toLowerCase() === "remarks").map(s => s.value);
    
    const remarksLines = [...remarksFromSpecs];
    if (productNotes) {
      remarksLines.push(productNotes);
    }
    
    if (specsList.length === 0 && remarksLines.length === 0) return null;

    return (
      <div className="mt-2 text-[11px] leading-relaxed font-sans space-y-1">
        {specsList.length > 0 && (
          <div className="grid grid-cols-1 gap-0.5 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
            {specsList.map((spec, idx) => {
              const isProdTime = spec.key?.toLowerCase() === "production time";
              return (
                <div key={`spec-${idx}`} className="flex items-start">
                  {spec.key ? (
                    <>
                      <span className={`font-semibold shrink-0 mr-1.5 text-[10px] uppercase ${isProdTime ? "text-blue-700 dark:text-blue-400 font-bold" : "text-slate-700 dark:text-slate-300"}`}>{spec.key}:</span>
                      <span className={`text-[11px] ${isProdTime ? "text-blue-700 dark:text-blue-300 font-semibold" : "text-slate-600 dark:text-slate-400"}`}>{spec.value}</span>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">{spec.value}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {remarksLines.length > 0 && (
          <div className="flex items-start text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200/80 dark:border-amber-900/50 text-[11px]">
            <span className="font-bold mr-1.5 shrink-0 text-amber-900 dark:text-amber-200 text-[10px] uppercase">Remarks:</span>
            <span className="flex-1 font-medium">
               {remarksLines.map((r, i) => (
                 <div key={i}>{r}</div>
               ))}
            </span>
          </div>
        )}
      </div>
    );
  }

  const formattedDate = quotation?.date ? new Date(quotation.date).toISOString().split("T")[0] : ""
  const formattedValidityDate = quotation?.validityDate ? new Date(quotation.validityDate).toISOString().split("T")[0] : ""

  const termsArray = [
    "Validity: This quotation is valid for 30 days from date of issue.",
    "Delivery: Delivery within 4-6 weeks of order approval.",
    "Warranty: All structural elements carry a 5-year warranty.",
  ]

  return (
    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden z-20 print:relative print:inset-auto print:bg-white print:h-auto print:overflow-visible font-sans">
      
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-6 flex flex-wrap justify-between items-center gap-4 print:hidden shrink-0 z-30 shadow-xs">
        <div className="flex items-center space-x-3">
          <Link href="/quotations">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Quotation Preview ({(quotation.quotationNumber || "").replace(/\s+Copy.*$/gi, "").trim()})
              </h1>
              {(() => {
                if (["CLIENT_APPROVED", "CLIENT_CONFIRMED"].includes(quotation.status)) {
                  return (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 shrink-0">
                      <Check className="h-3 w-3" />
                      Client Approved
                    </Badge>
                  )
                }
                if (quotation.costingStatus === "COSTING_COMPLETED") {
                  return (
                    <Badge className="bg-emerald-600 text-white font-semibold flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      Costing Completed
                    </Badge>
                  )
                }
                if (quotation.costingStatus === "PARTIALLY_COSTED") {
                  return (
                    <Badge className="bg-purple-600 text-white font-semibold flex items-center gap-1 shrink-0">
                      <Calculator className="h-3 w-3" />
                      Partially Costed
                    </Badge>
                  )
                }
                if (quotation.costingStatus === "COSTING_IN_PROGRESS") {
                  return (
                    <Badge className="bg-blue-600 text-white font-semibold flex items-center gap-1 shrink-0">
                      <Calculator className="h-3 w-3" />
                      In Costing
                    </Badge>
                  )
                }
                if (quotation.costingStatus === "PENDING_COSTING") {
                  return (
                    <Badge className="bg-amber-500 text-white font-semibold flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />
                      Pending Costing
                    </Badge>
                  )
                }
                if (quotation.status && quotation.status !== "DRAFT") {
                  return (
                    <Badge className="bg-blue-600 text-white font-semibold flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      Active Quotation
                    </Badge>
                  )
                }
                return (
                  <Badge variant="outline" className="text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    Draft
                  </Badge>
                )
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              Client: <span className="font-semibold text-foreground">{quotation.client?.companyName}</span> | Date: {formattedDate} | Total: <span className="font-bold text-primary">AED {formatCurrency(quotation.grandTotal)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Navigation Bar */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-border mr-2">

            {isAuthorizedForCosting && (
              <Button
                type="button"
                variant={activeViewMode === "costing" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveViewMode("costing")}
                className={`h-7 text-xs font-bold px-3 cursor-pointer ${activeViewMode === "costing" ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs" : "text-emerald-700 dark:text-emerald-400"}`}
              >
                <Calculator className="h-3.5 w-3.5 mr-1.5" /> Managerial Audit &amp; Costing
              </Button>
            )}

            <Button
              type="button"
              variant={activeViewMode === "pdf" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveViewMode("pdf")}
              className="h-7 text-xs font-semibold px-3 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> PDF Viewer
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/quotations/new?editId=${quotation.id}`)}
            title="Edit Quotation"
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
          >
            <Edit className="mr-1.5 h-4 w-4 text-slate-600" /> Edit
          </Button>

          {!isIDC && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/quotations/${quotation.id}/copy`, { method: "POST" })
                  if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.error || "Failed to copy quotation")
                  }
                  const newQuote = await res.json()
                  toast.success(`Created copy "${newQuote.quotationNumber}"!`)
                  router.push(`/quotations/${newQuote.id}/preview`)
                } catch (err: any) {
                  toast.error(err.message || "Failed to copy quotation.")
                }
              }}
              title="Make a Copy"
              className="border-teal-600/50 text-teal-700 hover:bg-teal-50 dark:text-teal-300 font-semibold cursor-pointer"
            >
              <Copy className="mr-1.5 h-4 w-4 text-teal-600" /> Copy Quotation
            </Button>
          )}

          {canSaveToCatalog && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCatalogDialogOpen(true)}
              title="Save Products to Catalog"
              className="border-indigo-600/50 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 font-semibold cursor-pointer"
            >
              <PackagePlus className="mr-1.5 h-4 w-4 text-indigo-600" /> Save Products to Catalog
            </Button>
          )}

          {quotation.sharepointUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(quotation.sharepointUrl || "", "_blank")}
              title="Open SharePoint Folder"
              className="cursor-pointer"
            >
              <ExternalLink className="mr-1.5 h-4 w-4" /> SharePoint File
            </Button>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={() => window.open(`/api/quotations/${quotation.id}/pdf`, "_blank")}
            title="Download PDF"
            className="bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer"
          >
            <Download className="mr-1.5 h-4 w-4" /> Download PDF
          </Button>

          {isAuthorizedToConfirm && !["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED", "CANCELLED"].includes(quotation.status) && (
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 font-semibold cursor-pointer"
              onClick={() => handleConfirmQuote(false)}
            >
              <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> Mark as Client Approved
            </Button>
          )}
        </div>
      </div>

      {/* Main Executive Workspace Area */}
      <div className="flex-1 w-full h-full bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 md:p-8 flex flex-col print:hidden overflow-y-auto">
        {activeViewMode === "costing" && isAuthorizedForCosting ? (
          <div className="w-full max-w-none space-y-4">
            {/* 13-Column Reference Audit Table Only (Full Width) */}
            {(() => {
              const qAny = quotation as any
              const qMetricsAny = quotationMetrics as any
              const summaryMetrics: ManagerialAuditSummary = {
                grandFactoryCost: costingItemsList.reduce((a, b) => a + (b.materialCost || 0) * (b.quantity || 1), 0),
                grandAccessoriesCost: costingItemsList.reduce((a, b) => a + (b.laborCost || 0) * (b.quantity || 1), 0),
                grandTotalCost: costingItemsList.reduce((a, b) => a + (b.unitCost || (b.materialCost + b.laborCost)) * (b.quantity || 1), 0),
                grandEstimatorRevenue: qAny.totalEstimatorSellingPrice || qMetricsAny?.totalSellingPrice || 0,
                grandConsultantRevenue: qMetricsAny?.totalSellingPrice || 0,
                grandTotalDiscountAmount: qAny.totalConsultantDiscountAmount || 0,
                overallDiscountPct: qAny.overallDiscountPercentage || 0,
                grandExpectedProfit: qMetricsAny?.marginAmount || 0,
                overallGrossMarginPct: qMetricsAny?.overallMargin || 0,
                maxItemDiscountPct: qAny.maxDiscountPercentage || 0,
                approvalStatus: qAny.approvalStatus || "AUTO_APPROVED",
                preparedByName: quotation.preparedBy?.name || quotation.preparedBy?.email || quotation.salesAgentName || "Sales Consultant",
                estimatorName: (quotation as any).assignedEstimator?.name || "Cost Estimator",
              }

              const auditItems: AuditItemMetric[] = costingItemsList.map((item: any, idx: number) => {
                const estPrice = item.estimatorUnitPrice || item.unitPrice || 0
                const consPrice = item.unitPrice || 0
                const discAmt = Math.max(0, estPrice - consPrice)
                const discPct = estPrice > 0 ? Math.round((discAmt / estPrice) * 100) : (item.discount || 0)
                const qty = item.quantity || 1
                const lineCostUnit = item.unitCost || (item.materialCost + item.laborCost) || 0
                const isCosted = item.costingStatus === "COSTING_COMPLETED"
                let statusText = "Not Costed"
                if (isCosted) {
                  statusText = "Costing Done"
                } else if (item.costingStatus === "COSTING_IN_PROGRESS") {
                  statusText = "In Costing"
                } else if (item.costingStatus === "PARTIALLY_COSTED") {
                  statusText = "Partially Costed"
                } else if (item.costingStatus === "PENDING_COSTING") {
                  statusText = "Pending Costing"
                } else if (quotation.costingStatus === "COSTING_COMPLETED") {
                  statusText = "Costing Done"
                } else if (quotation.costingStatus === "PARTIALLY_COSTED") {
                  statusText = "Partially Costed"
                } else if (quotation.status && quotation.status !== "DRAFT") {
                  statusText = "Not Costed"
                }

                return {
                  id: item.id,
                  itemNo: idx + 1,
                  imageUrl: item.imageUrl || item.customImageUrl || item.product?.imageUrl || null,
                  description: item.description,
                  specifications: item.specifications || item.productDescription || item.productNotes,
                  modelCode: item.product?.sku || item.product?.modelCode || item.description,
                  productType: item.categoryName || item.chairType || item.product?.categoryName || null,
                  upholsteryMaterial: item.product?.upholsteryMaterial || null,
                  baseType: item.product?.baseType || null,
                  finishColor: item.product?.finishColor || null,
                  recommendedUsage: item.product?.recommendedUsage || null,
                  quantity: qty,
                  factoryCost: item.materialCost || 0,
                  accessoriesCost: item.laborCost || 0,
                  totalCostUnit: lineCostUnit,
                  marginPct: item.marginPercentage || 0,
                  negotiationPct: 0,
                  estimatorPriceUnit: estPrice,
                  costingDone: isCosted || statusText === "Costing Done",
                  costingStatusText: statusText,
                  discountByIDC: discPct > 0 ? `${discPct}%` : "0%",
                  finalPriceUnit: consPrice,
                }
              })

              return (
                <ManagerialAuditSection
                  summary={summaryMetrics}
                  items={auditItems}
                  userRole={userRole}
                />
              )
            })()}
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs flex items-center justify-between text-blue-800 dark:text-blue-200 shrink-0">
              <span>Streaming PDF document preview directly from server. If your browser blocks embedded PDF viewers:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/quotations/${quotation.id}/pdf`, "_blank")}
                className="h-7 text-xs bg-white dark:bg-slate-900 border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold cursor-pointer shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open PDF in New Tab
              </Button>
            </div>
            <iframe
              src={`/api/quotations/${quotation.id}/pdf?preview=true#toolbar=0&navpanes=0`}
              className="w-full flex-1 min-h-[85vh] border-0 shadow-xl rounded-md bg-white"
              title={`Quotation ${(quotation.quotationNumber || "").replace(/\s+Copy.*$/gi, "").trim()} Preview`}
            />
          </div>
        )}
      </div>

      {/* Lightbox Image Preview Modal */}
      {previewImageUrl && (
        <Dialog open={!!previewImageUrl} onOpenChange={() => setPreviewImageUrl(null)}>
          <DialogContent className="max-w-3xl p-3 rounded-2xl bg-black/95 border-slate-800 text-white z-50">
            <div className="relative flex flex-col items-center justify-center p-2">
              <img src={previewImageUrl} alt="Product Preview" className="max-h-[75vh] w-auto rounded-lg object-contain" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewImageUrl(null)}
                className="mt-3 text-xs text-white hover:bg-white/20"
              >
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <CostingBreakdownModal
        isOpen={!!costingModalItem}
        onClose={() => setCostingModalItem(null)}
        item={costingModalItem}
      />

      <Dialog open={isReplaceDialogOpen} onOpenChange={setIsReplaceDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              Confirm Replacement
            </DialogTitle>
            <DialogDescription className="text-sm">
              A quotation revision (<strong>{conflictingQuoteNo}</strong>) is already marked as Client Confirmed. Do you want to replace the confirmed quotation?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsReplaceDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => handleConfirmQuote(true)}>
              Replace Confirmed Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Products to Catalog Modal */}
      {quotation && (
        <Dialog open={isCatalogDialogOpen} onOpenChange={setIsCatalogDialogOpen}>
          <DialogContent className="max-w-4xl sm:max-w-5xl w-full rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                <PackagePlus className="h-6 w-6 text-indigo-600" />
                Save Products to Catalog &amp; Manage Inventory Stock
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                Save custom items from quotation <strong>{(quotation.quotationNumber || "").replace(/\s+Copy.*$/gi, "").trim()}</strong> (prepared by {quotation.preparedBy?.name || quotation.preparedBy?.email || "User"}) directly to the product catalog and manage inventory stock levels.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 my-3 max-h-[65vh] overflow-y-auto pr-1">
              {quotation.items.map((item) => {
                const isSaved = !!item.product || savedItemIds.has(item.id)
                const isSaving = savingItemId === item.id
                const itemImg = item.customImageUrl || (item as any).product?.imageUrl || null
                const currentStock = itemStockMap[item.id] !== undefined ? itemStockMap[item.id] : ((item as any).product?.stock ?? item.quantity ?? 10)

                return (
                  <div key={item.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs hover:border-slate-300 transition-all">
                    
                    {/* Left: Product Image & Metadata */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Product Thumbnail */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 flex items-center justify-center relative">
                        {itemImg ? (
                          <img src={itemImg} alt={item.description} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-[10px] text-slate-400">
                            <Package className="h-6 w-6 text-slate-300 mb-0.5" />
                            <span>No Image</span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground truncate">{item.description}</span>
                          {quotation.includeCategoryName !== false && item.categoryName && (
                            <Badge variant="outline" className="text-[10px] py-0 font-semibold bg-slate-100 dark:bg-slate-800">
                              {item.categoryName}
                            </Badge>
                          )}
                          {isSaved && (
                            <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 py-0.5 px-2 flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="h-3 w-3" /> Saved in Catalog
                            </Badge>
                          )}
                        </div>
                        
                        {item.productDescription && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.productDescription}</p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono flex-wrap pt-0.5">
                          <span>Unit Price: <strong className="text-foreground">AED {(item.unitPrice || 0).toLocaleString("en-US")}</strong></span>
                          <span>|</span>
                          <span>Quote Qty: <strong className="text-foreground">{item.quantity}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Update Stock Controls & Save Button */}
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Stock Qty:
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={currentStock}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            setItemStockMap((prev) => ({
                              ...prev,
                              [item.id]: isNaN(val) ? 0 : Math.max(0, val)
                            }))
                          }}
                          className="w-24 h-8 text-xs font-mono font-bold text-center bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex items-end h-full pt-4">
                        {isSaved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSaving}
                            onClick={() => handleSaveItemToCatalog(item, currentStock)}
                            className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-semibold cursor-pointer shrink-0"
                          >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1 text-indigo-600" />}
                            Update Stock
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isSaving}
                            onClick={() => handleSaveItemToCatalog(item, currentStock)}
                            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs shrink-0"
                          >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <PackagePlus className="h-3.5 w-3.5 mr-1.5" />}
                            Save to Catalog
                          </Button>
                        )}
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>

            <DialogFooter className="mt-3 pt-3 border-t">
              <Button variant="outline" onClick={() => setIsCatalogDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {quotation && (
        <CostingUpdateModal
          quotationId={quotation.id}
          quotationData={quotation}
          item={editingCostItem}
          open={isCostModalOpen}
          onOpenChange={setIsCostModalOpen}
          onSuccess={() => {
            fetch(`/api/quotations/${quotation.id}`)
              .then((res) => res.json())
              .then((data) => setQuotation(data))
          }}
        />
      )}
    </div>
  )
}
