"use client"

import React, { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Download, ExternalLink, Check, X, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import parse from "html-react-parser"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

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
  product?: {
    imageUrl: string | null
    sku: string
    shortDescription?: string | null
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
  items: QuotationItem[]
}

export default function QuotationHtmlPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(true)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER"
  const isPending = quotation?.status === "PENDING_APPROVAL"
  const isSalesPerson = userRole === "SALES_EXECUTIVE"
  const disableDownload = isSalesPerson && isPending

  const [userPermissions, setUserPermissions] = useState<any>(null)
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false)
  const [conflictingQuoteNo, setConflictingQuoteNo] = useState("")

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

  const sanitizeHtmlToText = (html: string) => {
    if (!html) return "";
    let text = html;
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

  const renderSpecificationsHtml = (specs: string | null | undefined, productNotes?: string | null) => {
    if (!specs && !productNotes) return null;

    const rawText = sanitizeHtmlToText(specs || "");
    const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l !== "");
    
    let normalSpecs: React.ReactNode[] = [];
    let productionTime: string | null = null;
    let remarksLines: string[] = [];
    let warranty: string | null = null;
    
    let currentContext = "normal";

    lines.forEach((line, idx) => {
      let isKeyLine = false;
      let key = "";
      let val = "";
      
      if (line.includes(":")) {
        const colonIndex = line.indexOf(":");
        key = line.substring(0, colonIndex).trim();
        val = line.substring(colonIndex + 1).trim();
        isKeyLine = true;
      }
      
      if (isKeyLine && key.toLowerCase().includes("production time")) {
        currentContext = "productionTime";
        productionTime = val;
      } else if (isKeyLine && key.toLowerCase().includes("remarks")) {
        currentContext = "remarks";
        if (val) remarksLines.push(val);
      } else if (isKeyLine && key.toLowerCase().includes("warranty")) {
        currentContext = "normal";
        warranty = val;
      } else if (isKeyLine) {
        currentContext = "normal";
        normalSpecs.push(
          <div key={`spec-${idx}`} className="flex text-[8.5px] mb-[4px] leading-tight pl-0 ml-0">
            <span className="font-bold text-slate-900 w-[95px] shrink-0">{key}:</span>
            <span className="text-[#444444] flex-1">{val}</span>
          </div>
        );
      } else {
        if (currentContext === "remarks") {
          remarksLines.push(line);
        } else {
          normalSpecs.push(<div key={`text-${idx}`} className="text-[#444444] mb-[4px] leading-tight text-[8.5px]">{line}</div>);
        }
      }
    });

    if (productNotes) {
      remarksLines.push(productNotes);
    }

    return (
      <div className="mt-2 space-y-[4px]">
        {normalSpecs.length > 0 && <div className="mb-2">{normalSpecs}</div>}
        
        {productionTime && (
          <div className="font-bold text-[#1e3a8a] text-[8.5px] mb-2 leading-tight">
            Production Time: <span className="font-normal">{productionTime}</span>
          </div>
        )}

        {warranty && (
          <div className="flex text-[8.5px] mb-[4px] leading-tight">
            <span className="font-bold text-slate-900 w-[95px] shrink-0">Warranty:</span>
            <span className="text-[#444444] flex-1">{warranty}</span>
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

  const formattedDate = new Date(quotation.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const formattedValidityDate = new Date(quotation.validityDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
    quotation.quotationNumber
  )}&scale=2&rotate=N&includetext=false`

  // Terms and conditions matched exactly with PDF
  const termsArray = [
    "Validity: This quotation is valid for 30 days from date of issue.",
    "Delivery: Delivery within 4-6 weeks of order approval.",
    "Warranty: All structural elements carry a 5-year warranty.",
  ]

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
                Quotation Preview ({quotation.quotationNumber})
              </h1>
              {quotation.status === "CLIENT_CONFIRMED" && (
                <Badge className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-1 shrink-0">
                  <Check className="h-3 w-3" />
                  Client Confirmed Quote
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Verify the exact layout & values before approval.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isManagerOrAdmin && isPending && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-green-600 text-green-700 hover:bg-green-50"
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
              >
                {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-600 text-red-700 hover:bg-red-50"
                onClick={handleReject}
                disabled={isApproving || isRejecting}
              >
                {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                Reject
              </Button>
            </>
          )}
          {isManagerOrAdmin && (
            <Link href={`/quotations/new?editId=${quotation.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/50 text-primary hover:bg-primary/10"
              >
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </Link>
          )}
          {quotation.sharepointUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(quotation.sharepointUrl || "", "_blank")}
              disabled={disableDownload}
              title={disableDownload ? "SharePoint folder is locked pending manager approval" : "Open SharePoint Folder"}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> SharePoint File
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/quotations/${quotation.id}/pdf?preview=true`, "_blank")}
            disabled={disableDownload}
            title={disableDownload ? "PDF download is locked pending manager approval" : "Download PDF"}
          >
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          {isAuthorizedToConfirm && !["CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED", "CANCELLED"].includes(quotation.status) && (
            <Button
              variant="outline"
              size="sm"
              className="border-green-600 text-green-700 hover:bg-green-50 font-semibold"
              onClick={() => handleConfirmQuote(false)}
            >
              <Check className="mr-2 h-4 w-4" /> Mark as Client Confirmed
            </Button>
          )}
        </div>
      </div>

      {/* Dedicated Scrollable Preview Area Workspace */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 lg:p-10 w-full bg-slate-100 dark:bg-slate-900 print:relative print:p-0 print:overflow-visible print:h-auto">
        {/* Main A4 Document Sheet Wrapper */}
        <div className="w-[210mm] min-w-[210mm] min-h-[297mm] mx-auto p-[10mm] sm:p-[15mm] bg-white text-slate-900 shadow-xl border border-slate-200 rounded-sm font-sans text-[11px] leading-relaxed relative overflow-hidden print:my-0 print:border-none print:shadow-none print:p-0 print:max-w-none print:min-w-0 print:min-h-0 print:bg-white print:text-black">
          
          {/* Bottom Right Watermark Logo */}
          <div className="absolute -bottom-[140px] -right-[312px] pointer-events-none z-0">
            <img src="/assets/logo/Watermark.svg" className="w-[338px]" alt="Watermark" />
          </div>
        
        {/* Two-Row Header Section for perfect alignment */}
        <div className={`flex flex-col border-b border-slate-200 ${quotation.items.length === 1 ? 'pb-2 mb-3' : 'pb-5 mb-6'}`}>
          
          {/* Top Row: Logo & Quotation Heading */}
          <div className="flex justify-between items-start w-full mb-6">
            <div className="w-[53%]">
              <img
                src="/assets/logo/BOSQ R LOGO.svg"
                alt="BOSQ"
                className="w-44 h-14 object-contain object-left"
              />
            </div>
            <div className="w-[44%] text-right">
              <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight mb-0 mt-[30px]">
                Quotation
              </h1>
            </div>
          </div>

          {/* Bottom Row: Client Info & Quotation Details */}
          <div className="flex justify-between items-start w-full">
            
            {/* Left Column: Client Info Block */}
            <div className="w-[53%] space-y-1 text-[9.9px]">
              <h2 className="font-bold text-slate-900 text-[10.8px] uppercase mb-2">CLIENT INFORMATION</h2>
              <div className="flex">
                <span className="font-bold text-slate-800 w-28">Quotation for:</span>
                <span className="text-slate-600 flex-1 font-semibold">{quotation.client.companyName}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-800 w-16">Address:</span>
                <span className="text-slate-600 flex-1">{quotation.client.address || "-"}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-800 w-28">Phone:</span>
                <span className="text-slate-600 flex-1">{quotation.client?.phone || "-"}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-800 w-28">Email:</span>
                <span className="text-slate-600 flex-1">{quotation.client?.email || "-"}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-800 w-28">TRN:</span>
                <span className="text-slate-600 flex-1">{quotation.client?.trn || "-"}</span>
              </div>
            </div>

            {/* Right Column: Quotation Meta Details */}
            <div className="w-[44%] flex flex-col items-end text-right space-y-1 text-slate-600 text-[9.9px]">
              <div className="flex justify-end w-full">
                <span className="font-bold text-slate-800 mr-2">Date:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-end w-full">
                <span className="font-bold text-slate-800 mr-2">Quotation #:</span>
                <span className="font-semibold text-slate-900">{quotation.quotationNumber}</span>
              </div>
              <div className="flex justify-end w-full">
                <span className="font-bold text-slate-800 mr-2">TRNID:</span>
                <span>{quotation.client.trn || "-"}</span>
              </div>
              <div className="flex justify-end w-full">
                <span className="font-bold text-slate-800 mr-2">Customer ID:</span>
                <span>{quotation.client.clientId || "-"}</span>
              </div>
              <div className="flex justify-end w-full">
                <span className="font-bold text-slate-800 mr-2">Quotation Valid Until:</span>
                <span>{formattedValidityDate}</span>
              </div>
              <div className="flex justify-end w-full">
                <span className="font-bold text-slate-800 mr-2">Contact Number:</span>
                <span>{quotation.salesAgentContactNumber || quotation.preparedBy?.phone || "-"}</span>
              </div>

              {/* Dynamic Barcode */}
              <div className="pt-2 flex flex-col items-end w-full">
                <img
                  src={barcodeUrl}
                  alt={quotation.quotationNumber}
                  className="h-10 w-44 object-contain object-right"
                />
                <span className="text-[9px] text-slate-500 font-mono mt-1 uppercase tracking-widest text-right">
                  {quotation.quotationNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Sales Executive & Project Name */}
          <div className="flex justify-between w-full mt-6 text-[9.9px]">
            <div>
              <span className="font-bold mr-1" style={{ color: "#827f82" }}>Sales Executive:</span>
              <span style={{ color: "#827f82" }}>{quotation.salesAgentName || quotation.preparedBy?.name || "Sales Executive"}</span>
            </div>
            {quotation.projectName && (
              <div>
                <span className="font-bold mr-1" style={{ color: "#827f82" }}>Project:</span>
                <span style={{ color: "#827f82" }}>{quotation.projectName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Products Table */}
        <table className={`w-full table-fixed border-collapse text-[11px] ${quotation.items.length === 1 ? 'mb-[32px]' : 'mb-[40px]'}`}>
          <thead>
            <tr className="text-slate-900 text-left font-bold border-y border-slate-900">
              <th className="py-3 px-4 w-[45%]">Item Description</th>
              <th className="py-3 px-4 w-[25%] text-center">Image</th>
              <th className="py-3 px-4 w-[30%]">
                <div className="flex w-full">
                  <span className="w-[25%] text-center">QTY</span>
                  <span className="w-[37.5%] text-right">Price</span>
                  <span className="w-[37.5%] text-right">Total</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, idx) => (
              <tr
                key={item.id}
                className="border-b border-[#fab48a] align-top"
              >
                {/* Description and specifications */}
                <td className="px-4 align-top pt-[12px] pb-[14px] w-[45%] break-words whitespace-normal max-w-full shrink overflow-hidden">
                  {/* 1. Product Name */}
                  <div className="font-bold text-slate-900 text-[9.5px] leading-[1.1] mb-2 break-words whitespace-normal max-w-full shrink overflow-hidden">{item.description}</div>
                  
                  {/* 2. Product Type / Category */}
                  {item.product?.category?.name && (
                    <div className="text-[#383e42] text-[5.85px] font-bold uppercase mb-[2px] tracking-[0.08em] break-words whitespace-normal max-w-full shrink overflow-hidden">
                      {item.product.category.name}
                    </div>
                  )}

                  {/* 2.5 Chair Type (if applicable) */}
                  {(item.product?.category?.name?.toLowerCase() === "chair" || item.product?.category?.name?.toLowerCase() === "chairs") && item.product?.chairType && (
                    <div className="text-[6.5px] mb-[2px] flex break-words whitespace-normal max-w-full shrink overflow-hidden">
                      <span className="font-bold text-slate-900 mr-1 shrink-0">Chair Type:</span>
                      <span className="text-[#444444] flex-1 break-words">{item.product.chairType}</span>
                    </div>
                  )}

                  {/* 3. Short Description */}
                  {item.product?.shortDescription && (
                    <div className="text-[#444444] text-[6.5px] mb-[4px] leading-[1.4] max-w-[95%] line-clamp-4 break-words whitespace-normal shrink overflow-hidden">
                      {item.product.shortDescription}
                    </div>
                  )}

                  {/* 4, 5, 6. Specifications, Production Time, Remarks */}
                  {renderSpecificationsHtml(item.specifications, item.productNotes)}
                </td>

                {/* Product Image */}
                <td className="px-4 text-center align-top pt-[12px] pb-[14px] w-[25%] overflow-hidden">
                  {item.customImageUrl || item.product?.imageUrl ? (
                    <img
                      src={(item.customImageUrl || item.product?.imageUrl) ?? undefined}
                      alt={item.description}
                      className="w-full max-w-[150px] h-[150px] object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-full max-w-[150px] h-[150px] border border-dashed border-slate-200 rounded-sm flex items-center justify-center text-[8.5px] text-slate-400 bg-slate-50 mx-auto">
                      No Image
                    </div>
                  )}
                </td>

                {/* Qty, Price, Total Grouped into 30% Column */}
                <td className="px-4 align-top pt-[12px] pb-[14px] w-[30%]">
                  <div className="flex w-full">
                    <div className="w-[25%] text-center font-medium text-slate-800">{item.quantity}</div>
                    <div className="w-[37.5%] text-right text-slate-800 font-mono">{formatCurrency(item.unitPrice)}</div>
                    <div className="w-[37.5%] text-right font-bold text-slate-950 font-mono">{formatCurrency(item.amount)}</div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Totals & Terms & Conditions side-by-side */}
        <div className={`flex justify-between items-start gap-8 page-break-inside-avoid ${quotation.items.length === 1 ? 'mb-4' : 'mb-10'}`}>
          {/* Left: Terms and conditions */}
          <div className="w-[50%] space-y-3">
            <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1 tracking-wide uppercase text-[10px]">
              Terms & Conditions
            </h4>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 text-[10px]">
              {termsArray.map((term, idx) => (
                <li key={idx}>{term}</li>
              ))}
            </ol>
          </div>

          {/* Right: Sum totals */}
          <div className="w-[44%] border border-slate-100 bg-slate-50/50 rounded-sm p-4 space-y-2 font-medium text-[11px]">
            {/* 1. Subtotal (Products) */}
            <div className="flex justify-between text-slate-600 border-b border-slate-100 pb-1.5">
              <span>Subtotal (Products)</span>
              <span className="font-mono">{formatCurrency(quotation.subtotal)}</span>
            </div>

            {/* 2. Additional Cost Items */}
            {Array.isArray(quotation.additionalCharges) && quotation.additionalCharges.filter((c: any) => c.name && (Number(c.amount) > 0)).map((charge: any, idx: number) => (
              <div key={`charge-${idx}`} className="flex justify-between text-slate-500 pl-3 italic text-[10px] pb-1">
                <span>• {charge.name}</span>
                <span className="font-mono">{formatCurrency(Number(charge.amount))}</span>
              </div>
            ))}

            {/* Total Additional Cost */}
            {quotation.deliveryCharge > 0 && (
              <div className="flex justify-between text-slate-600 border-b border-slate-100 pb-1.5">
                <span>Total Additional Cost</span>
                <span className="font-mono">{formatCurrency(quotation.deliveryCharge)}</span>
              </div>
            )}

            {/* 3. Special Discount */}
            {quotation.discount && quotation.discount > 0 ? (
              <div className="flex justify-between text-red-600 border-b border-slate-100 pb-1.5">
                <div className="flex flex-col">
                  <span>
                    Special Discount
                    {quotation.specialDiscountType === "PERCENTAGE" && ` (${quotation.specialDiscountValue}%)`}
                  </span>
                  {quotation.specialDiscountReason && (
                    <span className="text-[9px] text-slate-500 italic">
                      Reason: {quotation.specialDiscountReason}
                    </span>
                  )}
                </div>
                <span className="font-mono">- {formatCurrency(quotation.discount)}</span>
              </div>
            ) : null}

            {/* 4. Taxable Subtotal */}
            {(quotation.deliveryCharge > 0 || (quotation.discount && quotation.discount > 0)) && (
              <div className="flex justify-between text-slate-800 font-bold border-b border-slate-200 border-dashed pb-1.5">
                <span>Taxable Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(Math.max(0, quotation.subtotal + quotation.deliveryCharge - (quotation.discount || 0)))}
                </span>
              </div>
            )}

            {/* 5. VAT (5%) */}
            <div className="flex justify-between text-slate-600 border-b border-slate-100 pb-1.5">
              <span>
                VAT (5%)
                {quotation.vatMode === "INCLUDING" && " (Inclusive)"}
              </span>
              <span className="font-mono">{formatCurrency(quotation.vatAmount)}</span>
            </div>

            {/* 6. Grand Total */}
            <div className="flex justify-between text-slate-900 font-bold text-[12px] pt-1">
              <span>Grand Total</span>
              <span className="font-mono text-slate-950">
                AED {formatCurrency(quotation.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Signatures section */}
        <div className={`flex justify-between gap-12 border-t border-slate-100 page-break-inside-avoid ${quotation.items.length === 1 ? 'pt-4 mt-4' : 'pt-8 mt-12'}`}>
          <div className="w-[45%] text-left space-y-4">
            <div className="border-b border-[#fab48a] h-10 w-full"></div>
            <div>
              <div className="font-bold text-slate-800">Prepared By</div>
              <div className="text-slate-500 text-[10px]">
                {quotation.preparedBy?.name || "Sales Executive"} | AYN MUSK FOR FURNITURE
              </div>
            </div>
          </div>

          <div className="w-[45%] text-left space-y-4">
            <div className="border-b border-[#fab48a] h-10 w-full"></div>
            <div>
              <div className="font-bold text-slate-800">Accepted & Approved By</div>
              <div className="text-slate-500 text-[10px]">Authorized Customer Signature</div>
            </div>
          </div>
        </div>

        {/* Absolute-styled/bottom document footer */}
        <div className={`border-t border-slate-100 flex justify-between items-center text-slate-500 text-[9px] ${quotation.items.length === 1 ? 'pt-4 mt-4' : 'pt-12 mt-12'}`}>
          <div>
            <img
              src="/assets/logo/AYN Musk_PNG.png"
              alt="AYN Musk"
              className="w-24 h-6 object-contain object-left"
            />
          </div>
          <div className="text-center font-medium">
            AYN MUSK FOR FURNITURE CO. L.L.C. | Meydan Road, Al Quoz 1, Dubai
          </div>
          <div className="text-right">TRN: 100523736700003</div>
        </div>
      </div>
      
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
    </div>
  </div>
  )
}
