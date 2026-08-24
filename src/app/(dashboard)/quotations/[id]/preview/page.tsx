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
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CostingBreakdownModal } from "@/components/costing/CostingBreakdownModal"
import { CostingUpdateModal } from "@/components/costing/CostingUpdateModal"
import { calculateProductPrice } from "@/components/costing/QuotationCostingWorkspaceModal"
import { ExecutiveCostSummaryCard } from "@/components/costing/ExecutiveCostSummaryCard"
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
  const [activeViewMode, setActiveViewMode] = useState<"html" | "pdf" | "costing">("costing")
  const [loading, setLoading] = useState(true)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  const costingItemsList = React.useMemo(() => {
    if (!quotation || !Array.isArray(quotation.items)) return []
    const boqItems = quotation.boq?.items || []
    return quotation.items.map((qItem, idx) => {
      const matchedBoqItem = boqItems.find((b: any) => b.itemNo === qItem.itemNo || b.id === qItem.id) || boqItems[idx]
      
      const matCost = Number(matchedBoqItem?.materialCost || 0)
      const factoryCost = Number(matchedBoqItem?.factoryCost || 0)
      const accessoriesCost = Number(matchedBoqItem?.accessoriesCost || 0)
      const labCost = Number(matchedBoqItem?.laborCost || 0)
      const instCost = Number(matchedBoqItem?.installationCost || 0)
      const transCost = Number(matchedBoqItem?.transportCost || 0)
      const overCost = Number(matchedBoqItem?.overheadCost || 0)

      const legacyUnitCost = matCost + labCost + instCost + transCost + overCost
      const unitCost = Number(matchedBoqItem?.unitCost) > 0 
        ? Number(matchedBoqItem?.unitCost) 
        : (factoryCost > 0 || accessoriesCost > 0 ? factoryCost + accessoriesCost : legacyUnitCost)

      const unitSellingPrice = Number(matchedBoqItem?.unitSellingPrice ?? qItem.unitPrice ?? 0)
      const qty = Math.max(1, qItem.quantity || 1)
      const totalCost = unitCost * qty
      const totalSellingPrice = (unitSellingPrice - (unitSellingPrice * ((qItem.discount || 0) / 100))) * qty
      const netProfitUnit = unitSellingPrice - unitCost
      const netProfitTotal = totalSellingPrice - totalCost
      const marginPct = Number(matchedBoqItem?.marginPercentage ?? qItem.margin ?? 0)

      const imageUrl = qItem.customImageUrl || qItem.product?.imageUrl || null

      return {
        ...qItem,
        itemNo: qItem.itemNo || idx + 1,
        imageUrl,
        factoryCost,
        accessoriesCost,
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
    return null
  }, [quotation])

  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isIDC = userRole === "INTERIOR_DESIGN_CONSULTANT"
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER" || userRole === "SUPER_ADMIN" || userRole === "MANAGER"
  const isSuperAdmin = userRole === "SUPER_ADMIN"

  const [userPermissions, setUserPermissions] = useState<any>(null)
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false)
  const [conflictingQuoteNo, setConflictingQuoteNo] = useState("")

  const [isCatalogDialogOpen, setIsCatalogDialogOpen] = useState(false)
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set())
  const [savingItemId, setSavingItemId] = useState<string | null>(null)

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
    if (isAuthorizedForCosting) {
      setActiveViewMode("costing")
    } else if (isIDC) {
      setActiveViewMode("pdf")
    } else {
      setActiveViewMode("html")
    }
  }, [isAuthorizedForCosting, isIDC])

  const handleSaveItemToCatalog = async (item: QuotationItem) => {
    if (!quotation) return
    setSavingItemId(item.id)
    try {
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
          imageUrl: item.customImageUrl || null,
          chairType: item.chairType || null,
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save product to catalog")
      }

      setSavedItemIds((prev) => new Set(prev).add(item.id))
      toast.success(`Saved "${item.description}" to product master catalog!`)
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
              {["CLIENT_APPROVED", "CLIENT_CONFIRMED"].includes(quotation.status) && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 shrink-0">
                  <Check className="h-3 w-3" />
                  Client Approved
                </Badge>
              )}
              {quotation.costingStatus === "PENDING_COSTING" && (
                <Badge className="bg-amber-500 text-white font-semibold flex items-center gap-1 shrink-0">
                  <Clock className="h-3 w-3" />
                  Pending Costing
                </Badge>
              )}
              {quotation.costingStatus === "COSTING_IN_PROGRESS" && (
                <Badge className="bg-blue-600 text-white font-semibold flex items-center gap-1 shrink-0">
                  <Calculator className="h-3 w-3" />
                  In Costing
                </Badge>
              )}
              {quotation.costingStatus === "PARTIALLY_COSTED" && (
                <Badge className="bg-purple-600 text-white font-semibold flex items-center gap-1 shrink-0">
                  <Calculator className="h-3 w-3" />
                  Partially Costed
                </Badge>
              )}
              {quotation.costingStatus === "COSTING_COMPLETED" && (
                <Badge className="bg-emerald-600 text-white font-semibold flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
                  Costing Completed
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Client: <span className="font-semibold text-foreground">{quotation.client?.companyName}</span> | Date: {formattedDate} | Total: <span className="font-bold text-primary">AED {formatCurrency(quotation.grandTotal)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Navigation Bar - Removed 'Customer Document' for Managerial Users */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-border mr-2">
            {!isAuthorizedForCosting && !isIDC && (
              <Button
                type="button"
                variant={activeViewMode === "html" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveViewMode("html")}
                className="h-7 text-xs font-semibold px-3 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 mr-1" /> Customer Document
              </Button>
            )}

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
          <div className="max-w-6xl mx-auto w-full space-y-6">
            
            {/* Executive Top Profitability & Cost Summary Card */}
            {quotationMetrics && quotationMetrics.totalCost > 0 ? (
              <ExecutiveCostSummaryCard metrics={quotationMetrics} />
            ) : (
              <div className="p-5 bg-card border rounded-2xl shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Direct BOQ Cost Data Pending</h3>
                    <p className="text-xs text-muted-foreground">Line items were created without standard BOQ factory cost allocations. Margins are computed from quoted selling rates.</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {costingItemsList.length} Items Quoted
                </Badge>
              </div>
            )}

            {/* BOQ Creator, Estimator & Sales Owner Team Attribution Grid */}
            <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground tracking-tight">BOQ &amp; Estimator Audit Team Attribution</h3>
                    <p className="text-xs text-muted-foreground">Structured audit trail of authoring BOQ creator, assigned cost estimator, and sales manager/executive.</p>
                  </div>
                </div>
                {quotation.boq?.boqNumber && (
                  <Badge variant="secondary" className="font-mono text-xs px-3 py-1 font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    BOQ: {quotation.boq.boqNumber}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* BOQ Creator Details */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <User className="h-4 w-4" /> BOQ Creator
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-background">Author</Badge>
                  </div>
                  <div className="space-y-1 pt-1">
                    <p className="font-bold text-sm text-foreground">{quotation.boq?.preparedBy?.name || "Not Specified"}</p>
                    {quotation.boq?.preparedBy?.designation && (
                      <p className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
                        <Briefcase className="h-3 w-3 text-muted-foreground" /> {quotation.boq.preparedBy.designation}
                      </p>
                    )}
                    {quotation.boq?.preparedBy?.email && (
                      <p className="text-muted-foreground flex items-center gap-1 text-[11px] font-mono">
                        <Mail className="h-3 w-3 text-muted-foreground" /> {quotation.boq.preparedBy.email}
                      </p>
                    )}
                    {quotation.boq?.preparedBy?.phone && (
                      <p className="text-muted-foreground flex items-center gap-1 text-[11px] font-mono">
                        <Phone className="h-3 w-3 text-muted-foreground" /> {quotation.boq.preparedBy.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cost Estimator Details */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <Calculator className="h-4 w-4" /> Cost Estimator
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-background">Costing</Badge>
                  </div>
                  <div className="space-y-1 pt-1">
                    <p className="font-bold text-sm text-foreground">{quotation.boq?.estimator?.name || "Not Assigned"}</p>
                    {quotation.boq?.estimator?.designation && (
                      <p className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
                        <Briefcase className="h-3 w-3 text-muted-foreground" /> {quotation.boq.estimator.designation}
                      </p>
                    )}
                    {quotation.boq?.estimator?.email && (
                      <p className="text-muted-foreground flex items-center gap-1 text-[11px] font-mono">
                        <Mail className="h-3 w-3 text-muted-foreground" /> {quotation.boq.estimator.email}
                      </p>
                    )}
                    {quotation.boq?.estimator?.phone && (
                      <p className="text-muted-foreground flex items-center gap-1 text-[11px] font-mono">
                        <Phone className="h-3 w-3 text-muted-foreground" /> {quotation.boq.estimator.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quotation Owner Details */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                      <Building2 className="h-4 w-4" /> Quotation Prepared By
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-background">Sales</Badge>
                  </div>
                  <div className="space-y-1 pt-1">
                    <p className="font-bold text-sm text-foreground">{quotation.preparedBy?.name || quotation.salesAgentName || "Bosq Executive"}</p>
                    {quotation.preparedBy?.designation && (
                      <p className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
                        <Briefcase className="h-3 w-3 text-muted-foreground" /> {quotation.preparedBy.designation}
                      </p>
                    )}
                    {quotation.preparedBy?.email && (
                      <p className="text-muted-foreground flex items-center gap-1 text-[11px] font-mono">
                        <Mail className="h-3 w-3 text-muted-foreground" /> {quotation.preparedBy.email}
                      </p>
                    )}
                    {quotation.salesAgentContactNumber && (
                      <p className="text-muted-foreground flex items-center gap-1 text-[11px] font-mono">
                        <Phone className="h-3 w-3 text-muted-foreground" /> {quotation.salesAgentContactNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quotation-Level Financial Summary Bar */}
            {quotationCostSummary && (
              <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4 font-sans shadow-lg border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Quotation Financial Audit Summary ({quotation.quotationNumber})
                    </span>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs px-3 py-0.5">
                    {quotationCostSummary.overallMarginPct.toFixed(1)}% Overall Gross Margin
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Factory Cost</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-200 mt-0.5 block">
                      AED {formatCurrency(quotationCostSummary.grandFactoryCost)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Accessories Cost</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-200 mt-0.5 block">
                      AED {formatCurrency(quotationCostSummary.grandAccessoriesCost)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Cost</span>
                    <span className="font-mono font-extrabold text-xs sm:text-sm text-amber-300 mt-0.5 block">
                      AED {formatCurrency(quotationCostSummary.grandTotalCost)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Overall Margin</span>
                    <span className="font-mono font-extrabold text-xs sm:text-sm text-teal-300 mt-0.5 block">
                      {quotationCostSummary.overallMarginPct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Selling Price</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-emerald-300 mt-0.5 block">
                      AED {formatCurrency(quotationCostSummary.grandBaseSellingPrice)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Revenue</span>
                    <span className="font-mono font-extrabold text-xs sm:text-sm text-emerald-400 mt-0.5 block">
                      AED {formatCurrency(quotationCostSummary.grandFinalSellingPrice)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Expected Profit</span>
                    <span className={`font-mono font-extrabold text-xs sm:text-sm mt-0.5 block ${quotationCostSummary.grandTotalProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      AED {formatCurrency(quotationCostSummary.grandTotalProfit)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* High-Readability Line-Item Costing Breakdown & Product Images Table */}
            <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground tracking-tight">Line-Item Costing Breakdown &amp; Product Images Audit</h3>
                    <p className="text-xs text-muted-foreground">Itemized factory costs, accessories, margin %, negotiation %, unit prices, and line profitability.</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-mono font-bold bg-muted/30">
                  {costingItemsList.length} Line Items Total
                </Badge>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b bg-muted/60 text-muted-foreground font-bold uppercase text-[10px]">
                      <th className="p-3 font-mono">#</th>
                      <th className="p-3 min-w-[70px]">Image</th>
                      <th className="p-3 min-w-[220px]">Product &amp; Specifications</th>
                      <th className="p-3 text-center font-mono">Qty</th>
                      <th className="p-3 text-right font-mono min-w-[100px]">Factory Cost</th>
                      <th className="p-3 text-right font-mono min-w-[110px]">Accessories Cost</th>
                      <th className="p-3 text-right font-mono min-w-[110px]">Total Cost (Unit)</th>
                      <th className="p-3 text-right font-mono min-w-[80px]">Margin %</th>
                      <th className="p-3 text-right font-mono min-w-[95px]">Negotiation %</th>
                      <th className="p-3 text-right font-mono min-w-[140px]">Final Selling Price (Unit)</th>
                      <th className="p-3 text-right font-mono min-w-[130px]">Line Total Revenue</th>
                      <th className="p-3 text-right font-mono min-w-[120px]">Expected Profit</th>
                      <th className="p-3 text-center min-w-[110px]">Status</th>
                      <th className="p-3 text-center min-w-[110px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {costingItemsList.map((item, idx) => {
                      const facCost = item.materialCost || 0
                      const accCost = item.laborCost || 0
                      const marginPct = item.marginPercentage ?? 0
                      const negotiationPct = (item as any).negotiationPct ?? 0

                      const calc = calculateProductPrice(facCost, accCost, marginPct, negotiationPct, item.unitPrice)
                      const qty = item.quantity || 1
                      const lineTotalRevenue = calc.finalSellingPrice * qty
                      const totalCostLine = calc.totalCost * qty
                      const expectedProfit = lineTotalRevenue - totalCostLine
                      const isProfitable = expectedProfit >= 0

                      return (
                        <tr key={item.id || idx} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-mono text-muted-foreground align-top font-bold text-xs">{item.itemNo || idx + 1}</td>
                          <td className="p-3 align-top">
                            {item.imageUrl ? (
                              <div 
                                className="relative group w-14 h-14 rounded-xl overflow-hidden border border-border bg-white shadow-2xs shrink-0 cursor-pointer"
                                onClick={() => setPreviewImageUrl(item.imageUrl)}
                                title="Click to view high-res product image"
                              >
                                <img src={item.imageUrl} alt={item.description} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground text-center font-medium">
                                No Image
                              </div>
                            )}
                          </td>
                          <td className="p-3 align-top space-y-1.5 min-w-[200px]">
                            <div className="font-bold text-foreground text-xs leading-tight">{item.description}</div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {quotation.includeCategoryName !== false && item.categoryName && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono font-medium">
                                  {item.categoryName}
                                </Badge>
                              )}
                              {item.chairType && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                  {item.chairType}
                                </Badge>
                              )}
                            </div>
                            {renderSpecificationsHtml(item.specifications, item.productNotes)}
                          </td>
                          <td className="p-3 text-center font-extrabold align-top text-xs text-foreground">{qty}</td>
                          <td className="p-3 text-right font-mono align-top text-xs font-semibold text-slate-700 dark:text-slate-300">AED {formatCurrency(facCost)}</td>
                          <td className="p-3 text-right font-mono align-top text-xs font-semibold text-slate-700 dark:text-slate-300">AED {formatCurrency(accCost)}</td>
                          <td className="p-3 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100 align-top text-xs">AED {formatCurrency(calc.totalCost)}</td>
                          <td className="p-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400 align-top text-xs">{marginPct.toFixed(1)}%</td>
                          <td className="p-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400 align-top text-xs">{negotiationPct.toFixed(1)}%</td>
                          <td className="p-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 align-top text-xs">AED {formatCurrency(calc.finalSellingPrice)}</td>
                          <td className="p-3 text-right font-mono font-extrabold text-emerald-700 dark:text-emerald-300 align-top text-xs">AED {formatCurrency(lineTotalRevenue)}</td>
                          <td className={`p-3 text-right font-mono font-extrabold align-top text-xs ${isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            AED {formatCurrency(expectedProfit)}
                          </td>
                          <td className="p-3 text-center align-top">
                            {renderCostingStatusBadge((item as any).costingStatus)}
                          </td>
                          <td className="p-3 text-center align-top">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCostItem(item)
                                setIsCostModalOpen(true)
                              }}
                              className="h-7 text-[11px] px-2.5 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1 cursor-pointer font-bold rounded-lg"
                            >
                              <Calculator className="h-3.5 w-3.5" />
                              Cost Item
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* REMARKS Section */}
            {quotation.commonRemark && quotation.commonRemark.trim() && (
              {...(() => {
                const isHighlight = !!quotation.commonRemarkHighlight
                const style = isHighlight ? (quotation.commonRemarkStyle || "AMBER") : "NONE"
                
                const getStyleClasses = (s: string) => {
                  switch (s) {
                    case "AMBER":
                      return {
                        box: "bg-amber-500/10 border-amber-500/50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500/30",
                        icon: "text-amber-600 dark:text-amber-400",
                      }
                    case "BLUE":
                      return {
                        box: "bg-blue-500/10 border-blue-500/50 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500/30",
                        icon: "text-blue-600 dark:text-blue-400",
                      }
                    case "EMERALD":
                      return {
                        box: "bg-emerald-500/10 border-emerald-500/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/30",
                        icon: "text-emerald-600 dark:text-emerald-400",
                      }
                    case "ROSE":
                      return {
                        box: "bg-rose-500/10 border-rose-500/50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 ring-1 ring-rose-500/30",
                        icon: "text-rose-600 dark:text-rose-400",
                      }
                    case "NONE":
                      return {
                        box: "bg-slate-100/60 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 ring-1 ring-slate-400/30",
                        icon: "text-slate-600 dark:text-slate-400",
                      }
                    default:
                      return {
                        box: "bg-card border-border/80 text-foreground",
                        icon: "text-primary",
                      }
                  }
                }

                const styleCls = getStyleClasses(style)

                return (
                  <div className={cn(
                    "p-5 rounded-2xl border transition-all shadow-xs space-y-3",
                    styleCls.box
                  )}>
                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                      <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className={cn("h-4 w-4", styleCls.icon)} />
                        REMARKS
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                      {quotation.commonRemark}
                    </p>
                  </div>
                )
              })()}
            )}

            {/* Supporting Documents & Revisions History Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Supporting Documents Card */}
              <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <Paperclip className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground tracking-tight">Supporting Documents</h3>
                      <p className="text-xs text-muted-foreground">Linked SharePoint files and client uploads.</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {(quotation.supportingDocuments || []).length} Files
                  </Badge>
                </div>

                {quotation.supportingDocuments && quotation.supportingDocuments.length > 0 ? (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {quotation.supportingDocuments.map((doc) => (
                      <div key={doc.id} className="p-3 border rounded-xl bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between gap-3 hover:border-border transition-colors">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border shrink-0">
                            {doc.source === "SHAREPOINT" ? (
                              <FolderGit2 className="h-4 w-4 text-blue-600" />
                            ) : (
                              <FileCode className="h-4 w-4 text-emerald-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate" title={doc.title}>{doc.title}</p>
                            <p className="text-[10px] text-muted-foreground">{doc.documentType} • {new Date(doc.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.url, "_blank")}
                          className="h-7 text-xs font-bold shrink-0 cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                    No additional supporting documents attached.
                  </div>
                )}
              </div>

              {/* Quotation Revision History Timeline Card */}
              <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <History className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground tracking-tight">Revision Audit History</h3>
                      <p className="text-xs text-muted-foreground">Historical revision sequence for auditability.</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono font-bold">
                    Revision #{quotation.revisionNumber || 0}
                  </Badge>
                </div>

                {quotation.revisions && quotation.revisions.length > 0 ? (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {quotation.revisions.map((rev) => (
                      <div key={rev.id} className="p-3 border rounded-xl bg-slate-50/70 dark:bg-slate-900/40 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            Revision R{rev.revisionNumber}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(rev.revisionDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-1">
                          <span>Prev: AED {formatCurrency(rev.previousTotal)}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-bold text-foreground">New: AED {formatCurrency(rev.newTotal)}</span>
                        </div>
                        {rev.notes && (
                          <p className="text-[11px] text-muted-foreground italic border-t border-border/40 pt-1 mt-1">{rev.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                    This is the original quotation (Revision 0). No previous revisions recorded.
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : activeViewMode === "pdf" ? (
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
        ) : (
          <div className="max-w-4xl mx-auto w-full bg-white text-slate-900 border rounded-xl p-8 sm:p-10 shadow-lg space-y-6 font-sans">
            {/* Customer Document View Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b pb-6 gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-primary">BOSQ ERGONOMICS</h2>
                <p className="text-xs text-slate-500 font-medium">Premium Commercial Furniture &amp; Office Solutions</p>
                <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                  <p>Client: <strong className="text-slate-900">{quotation.client?.companyName}</strong></p>
                  {quotation.client?.contactPerson && <p>Contact: {quotation.client.contactPerson}</p>}
                  {quotation.client?.email && <p>Email: {quotation.client.email}</p>}
                  {quotation.client?.phone && <p>Phone: {quotation.client.phone}</p>}
                  {quotation.client?.trn && <p>TRN: {quotation.client.trn}</p>}
                </div>
              </div>
              <div className="text-right text-xs space-y-1 sm:self-start">
                <Badge variant="outline" className="text-sm font-bold bg-primary/10 text-primary border-primary/20 px-3 py-1 mb-1">
                  {(quotation.quotationNumber || "").replace(/\s+Copy.*$/gi, "").trim()}
                </Badge>
                <p className="text-slate-500">Date: <strong className="text-slate-900">{formattedDate}</strong></p>
                <p className="text-slate-500">Valid Until: <strong className="text-slate-900">{formattedValidityDate}</strong></p>
                {quotation.projectName && <p className="text-slate-500">Project: <strong className="text-slate-900">{quotation.projectName}</strong></p>}
                <p className="text-slate-500">Prepared By: <strong className="text-slate-900">{quotation.preparedBy?.name || quotation.preparedBy?.email || "Bosq Team"}</strong></p>
              </div>
            </div>

            {/* Line Items Table with Product Images */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="p-3">#</th>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price (AED)</th>
                    <th className="p-3 text-right">Total (AED)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotation.items.map((item, idx) => {
                    const itemImg = item.customImageUrl || item.product?.imageUrl
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-mono text-slate-500 align-top">{item.itemNo || idx + 1}</td>
                        <td className="p-3 align-top space-y-2">
                          <div className="flex items-start gap-3">
                            {itemImg && (
                              <div 
                                className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0 cursor-pointer"
                                onClick={() => setPreviewImageUrl(itemImg)}
                              >
                                <img src={itemImg} alt={item.description} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                            <div className="space-y-1 flex-1">
                              <div className="font-bold text-slate-900 text-xs">{item.description}</div>
                              {renderSpecificationsHtml(item.specifications, item.productNotes)}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold align-top text-xs">{item.quantity}</td>
                        <td className="p-3 text-right font-mono align-top text-xs">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-3 text-right font-mono font-bold align-top text-xs text-primary">{formatCurrency(item.amount)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Subtotal & Financial Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t gap-6">
              <div className="text-xs text-slate-600 space-y-1 max-w-md">
                <p className="font-bold text-slate-900 mb-1">Terms &amp; Conditions:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-500">
                  {termsArray.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>
              <div className="w-full sm:w-64 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs font-sans">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold">AED {formatCurrency(quotation.subtotal)}</span>
                </div>
                {quotation.deliveryCharge > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charge:</span>
                    <span className="font-mono">AED {formatCurrency(quotation.deliveryCharge)}</span>
                  </div>
                )}
                {quotation.discount && quotation.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span className="font-mono">- AED {formatCurrency(quotation.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>VAT (5%):</span>
                  <span className="font-mono">AED {formatCurrency(quotation.vatAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-300 pt-2 mt-1">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary">AED {formatCurrency(quotation.grandTotal)}</span>
                </div>
              </div>
            </div>
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
          <DialogContent className="max-w-2xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <PackagePlus className="h-5 w-5 text-indigo-600" />
                Save Products to Catalog
              </DialogTitle>
              <DialogDescription className="text-xs">
                Save custom items from quotation <strong>{(quotation.quotationNumber || "").replace(/\s+Copy.*$/gi, "").trim()}</strong> (prepared by {quotation.preparedBy?.name || quotation.preparedBy?.email || "User"}) directly to the product catalog.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-2 max-h-[60vh] overflow-y-auto pr-1">
              {quotation.items.map((item) => {
                const isSaved = !!item.product || savedItemIds.has(item.id)
                const isSaving = savingItemId === item.id
                return (
                  <div key={item.id} className="p-3.5 border rounded-xl bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-foreground">{item.description}</span>
                        {quotation.includeCategoryName !== false && item.categoryName && (
                          <Badge variant="outline" className="text-[10px] py-0 font-medium">
                            {item.categoryName}
                          </Badge>
                        )}
                        {isSaved && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-200 py-0 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="h-3 w-3" /> Saved in Catalog
                          </Badge>
                        )}
                      </div>
                      {item.productDescription && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{item.productDescription}</p>
                      )}
                      <div className="text-[11px] text-muted-foreground font-mono">
                        Unit Price: AED {(item.unitPrice || 0).toLocaleString("en-US")} | Qty: {item.quantity}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isSaved ? (
                        <Button variant="ghost" size="sm" disabled className="h-8 text-xs text-muted-foreground">
                          In Catalog
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isSaving}
                          onClick={() => handleSaveItemToCatalog(item)}
                          className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
                        >
                          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <PackagePlus className="h-3.5 w-3.5 mr-1.5" />}
                          Save to Catalog
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <DialogFooter className="mt-2">
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
