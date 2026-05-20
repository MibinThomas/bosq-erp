"use client"

import React, { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Download, ExternalLink, Check, X, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

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
  product?: {
    imageUrl: string | null
    sku: string
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

  const renderSpecificationsHtml = (specs: string | null | undefined) => {
    if (!specs) return null
    const lines = specs.split("\n").map((l) => l.trim()).filter((l) => l !== "")
    return (
      <div className="mt-1 text-[10px] text-slate-500 space-y-0.5">
        {lines.map((line, idx) => {
          if (line.includes(":")) {
            const colonIndex = line.indexOf(":")
            const key = line.substring(0, colonIndex).trim()
            const val = line.substring(colonIndex + 1).trim()
            return (
              <div key={idx} className="flex">
                <span className="font-semibold text-slate-700 mr-1">{key}:</span>
                <span>{val}</span>
              </div>
            )
          }
          return <div key={idx}>{line}</div>
        })}
      </div>
    )
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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-12">
      {/* Top Header Bar - Invisible when printed */}
      <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 py-4 px-6 flex flex-wrap justify-between items-center gap-4 print:hidden">
        <div className="flex items-center space-x-3">
          <Link href="/quotations">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Quotation Preview ({quotation.quotationNumber})
            </h1>
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
        </div>
      </div>

      {/* Main A4 Document Sheet Wrapper */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto my-6 p-[15mm] bg-white text-slate-900 shadow-xl border border-slate-200 rounded-sm font-sans text-[11px] leading-relaxed relative print:my-0 print:border-none print:shadow-none print:p-0 print:max-w-none print:min-h-0 print:bg-white print:text-black">
        
        {/* Two-Column Header Section */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-5 mb-6">
          {/* Left Column: Logo & Company details */}
          <div className="w-[53%] space-y-4">
            <div className="mb-3">
              {/* BOSQ Logo - larger and flush left */}
              <img
                src="/assets/logo/bosq-orange-bg-reg.png"
                alt="BOSQ"
                className="w-44 h-14 object-contain object-left"
              />
            </div>
            <div className="space-y-1">
              <h2 className="font-bold text-slate-900 text-[12px] uppercase">
                AYN MUSK FOR FURNITURE CO. L.L.C.
              </h2>
              <div className="flex">
                <span className="font-bold text-slate-800 w-16">Address:</span>
                <span className="text-slate-600 flex-1">
                  Office No 133, KML Business Center, Al Quoz 1, Meydan Road, Dubai
                </span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-800 w-16">Emirate:</span>
                <span className="text-slate-600 flex-1">Dubai</span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-800 w-16">Email:</span>
                <span className="text-slate-600 flex-1">accounts@bosq.ae</span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-800 w-16">Contact:</span>
                <span className="text-slate-600 flex-1">+9714 529 9697</span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-800 w-16">TRN:</span>
                <span className="text-slate-600 flex-1">100523736700003</span>
              </div>
            </div>

            {/* Client Info Block */}
            <div className="pt-2 space-y-1">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-1 text-[11px] uppercase tracking-wide">
                Client Information
              </h3>
              <div className="flex">
                <span className="font-bold text-slate-800 w-16">Company:</span>
                <span className="text-slate-600 flex-1 font-semibold">{quotation.client.companyName}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-800 w-16">Address:</span>
                <span className="text-slate-600 flex-1">{quotation.client.address || "-"}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-800 w-16">PO BOX:</span>
                <span className="text-slate-600 flex-1">-</span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-800 w-16">Phone:</span>
                <span className="text-slate-600 flex-1">{quotation.client.phone || "-"}</span>
              </div>
            </div>
          </div>

          {/* Right Column: AYN Musk Logo, Quotation details & Barcode */}
          <div className="w-[44%] flex flex-col items-end text-right space-y-4">
            <div>
              <img
                src="/assets/logo/AYN Musk_PNG.png"
                alt="AYN Musk"
                className="w-32 h-9 object-contain"
              />
            </div>
            
            <div className="w-full space-y-1 text-slate-600">
              <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight mb-2">
                Quotation
              </h1>
              
              <div className="flex justify-end">
                <span className="font-bold text-slate-800 mr-2">Date:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-end">
                <span className="font-bold text-slate-800 mr-2">Quotation #:</span>
                <span className="font-semibold text-slate-900">{quotation.quotationNumber}</span>
              </div>
              <div className="flex justify-end">
                <span className="font-bold text-slate-800 mr-2">TRNID:</span>
                <span>{quotation.client.trn || "-"}</span>
              </div>
              <div className="flex justify-end">
                <span className="font-bold text-slate-800 mr-2">Customer ID:</span>
                <span>{quotation.client.clientId || "-"}</span>
              </div>
              <div className="flex justify-end">
                <span className="font-bold text-slate-800 mr-2">Quotation Valid Until:</span>
                <span>{formattedValidityDate}</span>
              </div>
              <div className="flex justify-end">
                <span className="font-bold text-slate-800 mr-2">Purchase Order:</span>
                <span>-</span>
              </div>
              <div className="flex justify-end">
                <span className="font-bold text-slate-800 mr-2">Sales Executive:</span>
                <span>{quotation.preparedBy?.name || "Sales Executive"}</span>
              </div>
              <div className="flex justify-end">
                <span className="font-bold text-slate-800 mr-2">Contact Number:</span>
                <span>+971 50 360 9762</span>
              </div>
            </div>

            {/* Dynamic Barcode */}
            <div className="pt-2 flex flex-col items-end">
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

        {/* Project Name banner if set */}
        {quotation.projectName && (
          <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-sm mb-6 flex">
            <span className="font-bold text-slate-800 mr-2">Project:</span>
            <span className="text-slate-700 font-semibold">{quotation.projectName}</span>
          </div>
        )}

        {/* Products Table */}
        <table className="w-full border-collapse mb-8 text-[10.5px]">
          <thead>
            <tr className="bg-slate-900 text-white text-left font-semibold uppercase text-[9px] tracking-wider">
              <th className="p-3 w-[48%] rounded-l-sm">Item Description</th>
              <th className="p-3 w-[18%] text-center">Image</th>
              <th className="p-3 w-[8%] text-center">QTY</th>
              <th className="p-3 w-[12%] text-right">Price</th>
              <th className="p-3 w-[14%] text-right rounded-r-sm">Total</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, idx) => (
              <tr
                key={item.id}
                className={`border-b border-slate-100 align-top ${
                  idx % 2 === 1 ? "bg-slate-50/50" : ""
                }`}
              >
                {/* Description and specifications */}
                <td className="p-3">
                  <div className="font-bold text-slate-800">{item.description}</div>
                  {renderSpecificationsHtml(item.specifications)}
                </td>

                {/* Product Image */}
                <td className="p-3 text-center">
                  {item.product?.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.description}
                      className="w-28 h-28 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-16 h-12 border border-dashed border-slate-200 rounded-sm flex items-center justify-center text-[8px] text-slate-400 bg-slate-50 mx-auto">
                      No Image
                    </div>
                  )}
                </td>

                {/* Qty */}
                <td className="p-3 text-center font-medium text-slate-700">
                  {item.quantity}
                </td>

                {/* Price */}
                <td className="p-3 text-right text-slate-700 font-mono">
                  {formatCurrency(item.unitPrice)}
                </td>

                {/* Total */}
                <td className="p-3 text-right font-bold text-slate-950 font-mono">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Totals & Terms & Conditions side-by-side */}
        <div className="flex justify-between items-start gap-8 mb-10 page-break-inside-avoid">
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
          <div className="w-[44%] border border-slate-100 bg-slate-50/50 rounded-sm p-4 space-y-2 font-medium">
            <div className="flex justify-between text-slate-600 border-b border-slate-100 pb-1.5">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(quotation.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 border-b border-slate-100 pb-1.5">
              <span>VAT (5%)</span>
              <span className="font-mono">{formatCurrency(quotation.vatAmount)}</span>
            </div>
            {quotation.deliveryCharge > 0 && (
              <div className="flex justify-between text-slate-600 border-b border-slate-100 pb-1.5">
                <span>Delivery & Install</span>
                <span className="font-mono">{formatCurrency(quotation.deliveryCharge)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 font-bold text-[12px] pt-1">
              <span>Grand Total</span>
              <span className="font-mono text-slate-950">
                AED {formatCurrency(quotation.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Signatures section */}
        <div className="flex justify-between gap-12 pt-8 border-t border-slate-100 mt-12 page-break-inside-avoid">
          <div className="w-[45%] text-left space-y-4">
            <div className="border-b border-slate-300 h-10 w-full"></div>
            <div>
              <div className="font-bold text-slate-800">Prepared By</div>
              <div className="text-slate-500 text-[10px]">
                {quotation.preparedBy?.name || "Sales Executive"} | AYN MUSK FOR FURNITURE
              </div>
            </div>
          </div>

          <div className="w-[45%] text-left space-y-4">
            <div className="border-b border-slate-300 h-10 w-full"></div>
            <div>
              <div className="font-bold text-slate-800">Accepted & Approved By</div>
              <div className="text-slate-500 text-[10px]">Authorized Customer Signature</div>
            </div>
          </div>
        </div>

        {/* Absolute-styled/bottom document footer */}
        <div className="pt-12 mt-12 border-t border-slate-100 flex justify-between text-slate-500 text-[9px]">
          <div>
            <img
              src="/assets/logo/bosq-orange-bg-reg.png"
              alt="BOSQ"
              className="w-14 h-4 object-contain"
            />
          </div>
          <div className="text-center font-medium">
            AYN MUSK FOR FURNITURE CO. L.L.C. | Meydan Road, Al Quoz 1, Dubai
          </div>
          <div className="text-right">TRN: 100523736700003</div>
        </div>
      </div>
    </div>
  )
}
