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
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER" || userRole === "SUPER_ADMIN" || userRole === "MANAGER"
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
              {["CLIENT_APPROVED", "CLIENT_CONFIRMED"].includes(quotation.status) && (
                <Badge className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-1 shrink-0">
                  <Check className="h-3 w-3" />
                  Client Approved
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Verify the exact layout & values before approval.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {((isManagerOrAdmin || (session?.user as any)?.id === quotation.preparedById) && quotation.status === "DRAFT") && (
            <Link href={`/quotations/new?editId=${quotation.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/50 text-primary hover:bg-primary/10 cursor-pointer"
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
              title="Open SharePoint Folder"
              className="cursor-pointer"
            >
              <ExternalLink className="mr-2 h-4 w-4" /> SharePoint File
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/quotations/${quotation.id}/pdf?preview=true`, "_blank")}
            title="Download PDF"
            className="cursor-pointer"
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

      {/* Dedicated Scrollable Preview Area Workspace */}
      <div className="flex-1 w-full h-full bg-slate-100 dark:bg-slate-900 p-4 sm:p-6 md:p-8 flex flex-col print:hidden">
        <iframe
          src={`/api/quotations/${quotation.id}/pdf#toolbar=0&navpanes=0`}
          className="w-full flex-1 min-h-[85vh] border-0 shadow-xl rounded-md bg-white"
          title={`Quotation ${quotation.quotationNumber} Preview`}
        />
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
  )
}
