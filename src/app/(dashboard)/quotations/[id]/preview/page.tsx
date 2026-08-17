"use client"

import React, { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Download, ExternalLink, Check, X, Edit, Copy, PackagePlus, CheckCircle2, FileText, Coins, TrendingUp, AlertTriangle, Eye, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isManagerOrAdminRole } from "@/lib/utils"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import parse from "html-react-parser"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CostingBreakdownModal } from "@/components/costing/CostingBreakdownModal"
import { ExecutiveCostSummaryCard } from "@/components/costing/ExecutiveCostSummaryCard"
import { Calculator } from "lucide-react"

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

interface Quotation {
  id: string
  quotationNumber: string
  customerSegment: string
  projectName: string | null
  date: string
  validityDate: string
  preparedById: string
  preparedBy: {
    name: string | null
    email: string
    phone: string | null
    designation?: string | null
    role?: string | null
  }
  deliveryDate: string | null
  paymentTerms: string | null
  status: string
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
    totalMaterialCost?: number
    totalLaborCost?: number
    totalInstallation?: number
    totalTransport?: number
    totalOverhead?: number
    totalCost?: number
    marginAmount?: number
    totalSellingPrice?: number
    items?: any[]
  } | null
  items: QuotationItem[]
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
  const [activeViewMode, setActiveViewMode] = useState<"html" | "pdf" | "costing">("html")
  const [loading, setLoading] = useState(true)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const costingItemsList = React.useMemo(() => {
    if (!quotation) return []
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

      return {
        ...qItem,
        itemNo: qItem.itemNo || idx + 1,
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

  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER" || userRole === "SUPER_ADMIN" || userRole === "MANAGER"
  const isPending = quotation?.status === "PENDING_APPROVAL"
  const isSalesPerson = userRole === "SALES_EXECUTIVE"
  const disableDownload = isSalesPerson && isPending

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

  const isSuperAdmin = userRole === "SUPER_ADMIN"
  const isAuthorizedToConfirm = isSuperAdmin || isManagerOrAdmin || (userPermissions?.canConfirmQuotation === true)
  const canSaveToCatalog = isManagerOrAdminRole(userRole)

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

  const handleApprove = async () => {
    if (!quotation) return
    setIsApproving(true)
    try {
      const res = await fetch(`/api/quotations/${quotation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" })
      })
      if (!res.ok) throw new Error("Failed to approve quotation")
      setQuotation({ ...quotation, status: "APPROVED" })
      toast.success("Quotation approved successfully!")
    } catch (error: any) {
      toast.error(error.message || "Failed to approve quotation")
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!quotation) return
    setIsRejecting(true)
    try {
      const res = await fetch(`/api/quotations/${quotation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" })
      })
      if (!res.ok) throw new Error("Failed to reject quotation")
      setQuotation({ ...quotation, status: "REJECTED" })
      toast.success("Quotation rejected.")
    } catch (error: any) {
      toast.error(error.message || "Failed to reject quotation")
    } finally {
      setIsRejecting(false)
    }
  }

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

  const hasAdditionalCost = quotation.deliveryCharge > 0
  const hasDiscount = !!quotation.discount && Number(quotation.discount) > 0
  const hasTaxableSubtotal = hasAdditionalCost || hasDiscount

  const subtotalAfterAdditional = quotation.subtotal + quotation.deliveryCharge
  const discountAmount = Number(quotation.discount) || 0
  const taxableSubtotal = Math.max(0, subtotalAfterAdditional - discountAmount)

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
    
    // Filter out remarks from specifications list
    const specsList = parsed.filter(s => s.key?.toLowerCase() !== "remarks");
    const remarksFromSpecs = parsed.filter(s => s.key?.toLowerCase() === "remarks").map(s => s.value);
    
    const remarksLines = [...remarksFromSpecs];
    if (productNotes) {
      remarksLines.push(productNotes);
    }
    
    if (specsList.length === 0 && remarksLines.length === 0) return null;

    return (
      <div className="mt-2.5">
        {specsList.length > 0 && (
          <div className="mb-2">
            {specsList.map((spec, idx) => {
              const isProdTime = spec.key?.toLowerCase() === "production time";
              const textColorClass = isProdTime ? "text-[#1e3a8a]" : "text-[#444444]";
              const keyColorClass = isProdTime ? "text-[#1e3a8a]" : "text-slate-900";
              return (
                <div key={`spec-${idx}`} className="flex items-start text-[8.5px] mb-[2px] leading-tight pl-0 ml-0">
                  {spec.key ? (
                    <>
                      <span className={`font-bold ${keyColorClass} shrink-0 mr-1`}>{spec.key}:</span>
                      <span className={`${textColorClass} flex-1`}>{spec.value}</span>
                    </>
                  ) : (
                    <span className={`${textColorClass} flex-1`}>{spec.value}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {remarksLines.length > 0 && (
          <div className="text-[8.5px] leading-tight flex mt-2 pl-0 ml-0">
            <span className="font-bold text-[#F17423] mr-1 shrink-0">Remarks:</span>
            <span className="text-[#444444] flex-1">
               {remarksLines.map((r, i) => (
                 <div key={i}>{r}</div>
               ))}
            </span>
          </div>
        )}
      </div>
    );
  }

  const formattedDate = quotation.date ? new Date(quotation.date).toISOString().split("T")[0] : ""
  const formattedValidityDate = quotation.validityDate ? new Date(quotation.validityDate).toISOString().split("T")[0] : ""

  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
    quotation.quotationNumber
  )}&scale=2&rotate=N&includetext=false`

  // Terms and conditions matched exactly with PDF
  const termsArray = [
    "Validity: This quotation is valid for 30 days from date of issue.",
    "Delivery: Delivery within 4-6 weeks of order approval.",
    "Warranty: All structural elements carry a 5-year warranty.",
  ]

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

  return (
    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 flex flex-col overflow-hidden z-20 print:relative print:inset-auto print:bg-white print:h-auto print:overflow-visible">
      {/* Top Header Bar - Invisible when printed */}
      <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-4 px-6 flex flex-wrap justify-between items-center gap-4 print:hidden shrink-0 z-30 shadow-sm">
        <div className="flex items-center space-x-3">
          <Link href="/quotations">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">
                Quotation Preview ({(quotation.quotationNumber || "").replace(/\s+Copy.*$/gi, "").trim()})
              </h1>
              {["CLIENT_APPROVED", "CLIENT_CONFIRMED"].includes(quotation.status) && (
                <Badge className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-1 shrink-0">
                  <Check className="h-3 w-3" />
                  Client Approved
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Client: <span className="font-semibold text-foreground">{quotation.client?.companyName}</span> | Date: {formattedDate} | Total: <span className="font-bold text-primary">AED {formatCurrency(quotation.grandTotal)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-border mr-2">
            <Button
              type="button"
              variant={activeViewMode === "html" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveViewMode("html")}
              className="h-7 text-xs font-semibold px-2.5 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 mr-1" /> Customer Document
            </Button>
            <Button
              type="button"
              variant={activeViewMode === "pdf" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveViewMode("pdf")}
              className="h-7 text-xs font-semibold px-2.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> PDF Viewer
            </Button>
            {isManagerOrAdmin && quotationMetrics && quotationMetrics.totalCost > 0 && (
              <Button
                type="button"
                variant={activeViewMode === "costing" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveViewMode("costing")}
                className="h-7 text-xs font-semibold px-2.5 cursor-pointer"
              >
                <Calculator className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Cost Breakdown
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/quotations/new?editId=${quotation.id}`)}
            title="Edit Quotation"
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
          >
            <Edit className="mr-2 h-4 w-4 text-slate-600" /> Edit
          </Button>
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
            <Copy className="mr-2 h-4 w-4 text-teal-600" /> Copy Quotation
          </Button>
          {canSaveToCatalog && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCatalogDialogOpen(true)}
              title="Save Products to Catalog"
              className="border-indigo-600/50 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 font-semibold cursor-pointer"
            >
              <PackagePlus className="mr-2 h-4 w-4 text-indigo-600" /> Save Products to Catalog
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
              <ExternalLink className="mr-2 h-4 w-4" /> SharePoint File
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => window.open(`/api/quotations/${quotation.id}/pdf`, "_blank")}
            title="Download PDF"
            className="bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer"
          >
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          {isAuthorizedToConfirm && !["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED", "CANCELLED"].includes(quotation.status) && (
            <Button
              variant="outline"
              size="sm"
              className="border-green-600 text-green-700 hover:bg-green-50 font-semibold cursor-pointer"
              onClick={() => handleConfirmQuote(false)}
            >
              <Check className="mr-2 h-4 w-4" /> Mark as Client Approved
            </Button>
          )}
        </div>
      </div>

      {/* Internal Costing Audit Header Summary */}
      {activeViewMode === "costing" && isManagerOrAdmin && quotationMetrics && quotationMetrics.totalCost > 0 && (
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-b shrink-0 max-w-5xl mx-auto w-full print:hidden space-y-4">
          <ExecutiveCostSummaryCard metrics={quotationMetrics} />
        </div>
      )}

      {/* Dedicated Scrollable Workspace */}
      <div className="flex-1 w-full h-full bg-slate-100 dark:bg-slate-900 p-4 sm:p-6 md:p-8 flex flex-col print:hidden overflow-y-auto">
        {activeViewMode === "costing" && isManagerOrAdmin ? (
          <div className="max-w-5xl mx-auto w-full bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-emerald-500" />
                  Line-Item Costing Breakdown Audit
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Internal audit of estimator factory costs, labor/overhead allocations, and net profit per item.
                </p>
              </div>
              <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
                {costingItemsList.length} Items Total
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground font-bold uppercase text-[10px]">
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Material Cost</th>
                    <th className="p-2.5 text-right">Labor / Overhead</th>
                    <th className="p-2.5 text-right">Unit Cost</th>
                    <th className="p-2.5 text-right">Quoted Price</th>
                    <th className="p-2.5 text-right">Margin %</th>
                    <th className="p-2.5 text-right">Net Profit</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b">
                  {costingItemsList.map((item, idx) => {
                    const isProfitable = item.netProfitTotal >= 0
                    return (
                      <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                        <td className="p-2.5 font-mono text-muted-foreground">{item.itemNo}</td>
                        <td className="p-2.5">
                          <div className="font-semibold text-foreground leading-tight line-clamp-1">{item.description}</div>
                          {item.categoryName && (
                            <span className="text-[10px] text-muted-foreground font-mono">{item.categoryName}</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                        <td className="p-2.5 text-right font-mono">AED {formatCurrency(item.materialCost)}</td>
                        <td className="p-2.5 text-right font-mono">AED {formatCurrency(item.laborCost + item.overheadCost)}</td>
                        <td className="p-2.5 text-right font-mono font-semibold text-foreground">AED {formatCurrency(item.unitCost)}</td>
                        <td className="p-2.5 text-right font-mono font-semibold text-primary">AED {formatCurrency(item.unitSellingPrice)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.marginPercentage.toFixed(1)}%
                        </td>
                        <td className={`p-2.5 text-right font-mono font-bold ${isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          AED {formatCurrency(item.netProfitTotal)}
                        </td>
                        <td className="p-2.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCostingModalItem(item)}
                            className="h-7 text-[11px] px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
            {/* Header section with Company Logo & Customer Details */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b pb-6 gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-primary">BOSQ ERGONOMICS</h2>
                <p className="text-xs text-slate-500 font-medium">Premium Commercial Furniture & Office Solutions</p>
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

            {/* Line Items Table */}
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
                  {quotation.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-mono text-slate-500 align-top">{item.itemNo || idx + 1}</td>
                      <td className="p-3 align-top space-y-1">
                        <div className="font-bold text-slate-900 text-xs">{item.description}</div>
                        {renderSpecificationsHtml(item.specifications, item.productNotes)}
                      </td>
                      <td className="p-3 text-center font-bold align-top text-xs">{item.quantity}</td>
                      <td className="p-3 text-right font-mono align-top text-xs">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-right font-mono font-bold align-top text-xs text-primary">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal & Financial Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t gap-6">
              <div className="text-xs text-slate-600 space-y-1 max-w-md">
                <p className="font-bold text-slate-900 mb-1">Terms & Conditions:</p>
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
            <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={() => handleConfirmQuote(true)}>
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
                        {item.categoryName && (
                          <Badge variant="outline" className="text-[10px] py-0 font-medium">
                            {item.categoryName}
                          </Badge>
                        )}
                        {isSaved && (
                          <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-700 border-green-200 py-0 flex items-center gap-1 font-semibold">
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
    </div>
  )
}
