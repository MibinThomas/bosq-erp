"use client"

import React, { useState, useEffect, useMemo, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  ArrowLeft, 
  Loader2, 
  Info, 
  Sparkles, 
  Lock, 
  Check, 
  CheckCircle2,
  ChevronsUpDown, 
  Search, 
  AlertCircle, 
  RefreshCw, 
  UserPlus, 
  ChevronUp, 
  ChevronDown, 
  GripVertical,
  Copy,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  DollarSign,
  Layers,
  SlidersHorizontal,
  ChevronRight,
  Clock,
  RotateCcw,
  Palette,
  Calculator,
  MessageSquare,
  Tag,
  User,
  Highlighter,
  Eye,
  X
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { CreateCustomMaterialModal } from "@/components/quotations/create-custom-material-modal"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import RichTextEditor from "@/components/ui/rich-text-editor"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn, isManagerOrAdminRole } from "@/lib/utils"
import { toast } from "sonner"
import { QuickAddProductModal } from "@/components/products/quick-add-product-modal"
import { QuickAddClientModal } from "@/components/clients/quick-add-client-modal"
import { AssignmentModal } from "@/components/clients/assignment-modal"
import { WorkstationConfigurator } from "@/components/products/workstation-configurator"
import { ImageCropper } from "@/components/ui/image-cropper"
import { QuotationItemImageDropzone } from "@/components/quotations/QuotationItemImageDropzone"
import { QuotationSuccessModal } from "@/components/quotations/QuotationSuccessModal"
import { InPageQuotationPreviewModal } from "@/components/quotations/InPageQuotationPreviewModal"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Image as ImageIcon, UploadCloud } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const quotationSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectName: z.string().optional(),
  quotationNumber: z.string().optional(),
  customerSegment: z.enum(["Interior", "Dealer", "Project", "Special"]),
  date: z.string(),
  validityDate: z.string(),
  deliveryDate: z.string().optional(),
  paymentTerms: z.string().optional().default("50% Advance, 50% on Delivery"),
  preparedById: z.string().optional(),
  includeSalesAgent: z.boolean().default(false).optional(),
  includeCompanySeal: z.boolean().default(false).optional(),
  includeCategoryName: z.boolean().default(true).optional(),
  includeSectionHeadings: z.boolean().default(true).optional(),
  includeMaterialsFinishes: z.boolean().default(false).optional(),
  selectedMaterials: z.array(z.any()).default([]).optional(),
  salesAgentId: z.string().optional(),
  salesAgentName: z.string().optional(),
  salesAgentTitle: z.string().optional(),
  salesAgentContactNumber: z.string().optional(),
  salesAgentEmail: z.string().optional(),
  deliveryCharge: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Delivery charge must be at least 0"),
  notes: z.string().optional(),
  disclaimerTitle: z.string().optional(),
  disclaimer: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().nullable().optional(),
      priceSource: z.enum(["standard", "manual"]).default("standard"),
      description: z.string().optional(),
      specifications: z.string().optional().default(""),
      productNotes: z.string().optional(),
      quantity: z.union([z.number(), z.string()]).refine(val => (val === "" ? 1 : Number(val)) >= 0, "Quantity must be at least 0"),
      basePrice: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Base price must be at least 0"),
      unitPrice: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Price must be at least 0"),
      discount: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Discount must be at least 0"),
      discountType: z.enum(["PERCENTAGE", "AMOUNT"]).default("PERCENTAGE").optional(),
      margin: z.union([z.number(), z.string()]).refine(val => (val === "" ? -100 : Number(val)) >= -100, "Margin must be at least -100").refine(val => (val === "" ? 0 : Number(val)) < 100, "Margin must be less than 100%"),
      manualMargin: z.union([z.number(), z.string()]).optional(),
      customImageUrl: z.string().nullable().optional(),
      productDescription: z.string().optional(),
      categoryName: z.string().optional(),
      chairType: z.string().optional(),
      batchHeading: z.string().optional(),
      saveToCatalog: z.boolean().optional(),
      costingStatus: z.string().optional(),
      unitCost: z.number().optional(),
      materialCost: z.number().optional(),
      laborCost: z.number().optional(),
      overheadCost: z.number().optional(),
      transportCost: z.number().optional(),
      installationCost: z.number().optional(),
      marginPercentage: z.number().optional(),
      negotiationPct: z.union([z.number(), z.string()]).optional().default(0),
      estimatorNotes: z.string().nullable().optional(),
      estimatorId: z.string().nullable().optional(),
      costingRequestedAt: z.any().optional(),
      costingCompletedAt: z.any().optional(),
    })
  ).min(1, "At least one product item is required"),
  vatMode: z.enum(["EXCLUDING", "INCLUDING"]).default("EXCLUDING"),
  specialDiscountType: z.enum(["PERCENTAGE", "FIXED"]).nullable().optional(),
  specialDiscountValue: z.union([z.number(), z.string()]).default(0).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Discount must be at least 0"),
  specialDiscountReason: z.string().optional(),
  additionalCharges: z.array(
    z.object({
      name: z.string().optional().default(""),
      amount: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Amount must be at least 0"),
      notes: z.string().optional().default(""),
    })
  ).optional().default([]),
  commonRemark: z.string().optional().default(""),
  commonRemarkHighlight: z.boolean().optional().default(false),
  commonRemarkStyle: z.string().optional().default("AMBER"),
  termsConditions: z.array(z.string()).optional(),
})

type QuotationFormValues = z.infer<typeof quotationSchema>

interface Client {
  id: string
  clientId?: string
  companyName: string
  contactPerson: string | null
  email?: string | null
  phone?: string | null
  trn: string | null
  clientType: string | null
  status: string
  isAssigned?: boolean
  salespersonId?: string | null
  allowRequestAgain?: boolean
  assignments?: Array<{
    userId: string
    isPrimary: boolean
    user: {
      name: string
      role: string
    }
  }>
  accessRequests?: Array<{
    id: string
    status: string
    rejectionReason: string | null
  }>
}

import { QuotationStatusTimeline } from "@/components/quotations/QuotationStatusTimeline"

interface Product {
  id: string
  productCode: string
  productName: string
  unitPrice: number
  interiorPrice?: number
  dealerPrice?: number
  projectPrice?: number
  specialPrice?: number
  specifications: string | null
  imageUrl: string | null
  description?: string | null
  category?: {
    id: string
    name: string
  }
  chairType?: string | null
  warranty?: string | null
  dimensions?: string | null
}

interface ProductSearchSelectProps {
  productId: string | null | undefined
  products: Product[]
  watchSegment: string
  onProductSelect: (productId: string) => void
  onCustomProductClick: () => void
  onOpenConfigurator?: () => void
  disabled?: boolean
}

const ProductSearchSelect = React.memo(({
  productId,
  products,
  watchSegment,
  onProductSelect,
  onCustomProductClick,
  onOpenConfigurator,
  disabled,
}: ProductSearchSelectProps) => {
  const [open, setOpen] = useState(false)
  const selectedProd = products.find(p => p.id === productId)
  let label = ""
  if (selectedProd) {
    let basePrice = selectedProd.unitPrice
    if (watchSegment === "Interior") basePrice = selectedProd.interiorPrice ?? selectedProd.unitPrice
    else if (watchSegment === "Dealer") basePrice = selectedProd.dealerPrice ?? selectedProd.unitPrice
    else if (watchSegment === "Project") basePrice = selectedProd.projectPrice ?? selectedProd.unitPrice
    else if (watchSegment === "Special") basePrice = selectedProd.specialPrice ?? selectedProd.unitPrice
    label = `${selectedProd.productCode} - ${selectedProd.productName} (${watchSegment} Price: AED ${basePrice.toFixed(2)})`
  }

  return (
    <Popover open={open} onOpenChange={disabled ? () => {} : setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            title={label || "Search catalog product by name or code..."}
            className={cn(
              "w-full justify-between font-normal bg-background h-10 border-border/80 hover:border-primary/50 text-xs sm:text-sm overflow-hidden",
              !productId && "text-muted-foreground",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <span className="block truncate flex-1 text-left min-w-0 font-medium">
              {productId ? label : "Search catalog product by name or code..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[650px] p-0" align="start">
        <Command filter={(value, search) => {
          if (value.toLowerCase().includes(search.toLowerCase())) return 1
          return 0
        }}>
          <CommandInput placeholder="Search products by code or name..." className="h-10 text-xs" />
          <CommandList className="max-h-[350px] overflow-y-auto overflow-x-hidden">
            <CommandEmpty className="p-4 text-center text-xs text-muted-foreground">
              No matching product found in catalog.
            </CommandEmpty>
            {onOpenConfigurator && (
              <CommandItem
                value="Configure Workstation Model by Attributes"
                onSelect={() => {
                  onOpenConfigurator()
                  setOpen(false)
                }}
                className="p-2.5 border-b border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs cursor-pointer flex items-center gap-2"
              >
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span>Configure Workstation Model by Attributes</span>
              </CommandItem>
            )}
            <CommandGroup>
              {products.map((product) => {
                let basePrice = product.unitPrice
                if (watchSegment === "Interior") basePrice = product.interiorPrice ?? product.unitPrice
                else if (watchSegment === "Dealer") basePrice = product.dealerPrice ?? product.unitPrice
                else if (watchSegment === "Project") basePrice = product.projectPrice ?? product.unitPrice
                else if (watchSegment === "Special") basePrice = product.specialPrice ?? product.unitPrice

                const productLabel = `${product.productCode} - ${product.productName}`

                return (
                  <CommandItem
                    value={`${productLabel} ${basePrice}`}
                    key={product.id}
                    onSelect={() => {
                      onProductSelect(product.id)
                      setOpen(false)
                    }}
                    className="p-2.5 border-b last:border-b-0 border-muted/50 aria-selected:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3 w-full min-w-0">
                      {/* Product Thumbnail */}
                      <div className="h-12 w-12 shrink-0 border rounded-md overflow-hidden flex items-center justify-center bg-card shadow-xs">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.productName} className="object-cover w-full h-full" />
                        ) : (
                          <div className="text-[9px] text-muted-foreground text-center px-1 leading-tight">No Image</div>
                        )}
                      </div>
                      
                      {/* Product Details Stack */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-semibold text-xs text-foreground line-clamp-1 leading-tight" title={product.productName}>
                          {product.productName}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                          <span className="truncate font-mono" title={`SKU: ${product.productCode}`}>
                            SKU: <span className="font-medium text-foreground">{product.productCode}</span>
                          </span>
                          {(product as any).category?.name && (
                            <>
                              <span>•</span>
                              <span className="truncate" title={`Category: ${(product as any).category.name}`}>
                                {(product as any).category.name}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-xs font-bold text-primary mt-1">
                          {watchSegment} Price: AED {basePrice.toFixed(2)}
                        </div>
                      </div>

                      {/* Check Icon */}
                      <div className="shrink-0 flex items-center h-full pt-1 pr-1">
                        <Check
                          className={cn(
                            "h-4 w-4 text-primary",
                            product.id === productId ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </div>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})
ProductSearchSelect.displayName = "ProductSearchSelect"

interface NumericInputProps extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  value: string | number
  onChange: (value: string) => void
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, onBlur, onFocus, onKeyDown, type: _unusedType, ...props }, ref) => {
    const [localVal, setLocalVal] = React.useState<string>(String(value ?? ""))
    const internalRef = React.useRef<HTMLInputElement | null>(null)
    const isFocusedRef = React.useRef(false)

    // Keep ref in sync with React Hook Form
    React.useImperativeHandle(ref, () => internalRef.current!, [ref])

    // Synchronize external value into local state ONLY when NOT actively focused by user
    React.useEffect(() => {
      if (!isFocusedRef.current) {
        setLocalVal(String(value ?? ""))
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalVal(e.target.value)
      isFocusedRef.current = true
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true
      // Auto-select text on focus if it is "0" or 0 so user can type new price immediately
      if (e.target.value === "0" || e.target.value === "0.00" || e.target.value === "0.0") {
        try {
          e.target.select()
        } catch (err) {}
      }
      if (onFocus) onFocus(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false
      // Commit local value to parent form on blur
      onChange(localVal)
      if (onBlur) onBlur(e)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        isFocusedRef.current = false
        onChange(localVal)
        e.currentTarget.blur()
      }
      if (onKeyDown) onKeyDown(e)
    }

    return (
      <Input
        ref={internalRef}
        type="text"
        inputMode="decimal"
        value={localVal}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)
NumericInput.displayName = "NumericInput"

interface BatchHeadingInputProps {
  value: string
  onChange: (value: string) => void
}

const BatchHeadingInput: React.FC<BatchHeadingInputProps> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <Input
      placeholder="e.g. Executive Cabin, Conference Room, Main Office (Leave blank for default section)"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== value) {
          onChange(localValue)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
      className="h-9 text-xs bg-background font-semibold border-border/70 focus-visible:ring-primary"
    />
  )
}

const formatCurrency = (val: number) => {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function CalculationSummaryPanel({ control }: { control: any }) {
  const watchItems = useWatch({ control, name: "items" }) || []
  const watchAdditionalCharges = useWatch({ control, name: "additionalCharges" }) || []
  const watchSpecialDiscountType = useWatch({ control, name: "specialDiscountType" })
  const watchSpecialDiscountValue = useWatch({ control, name: "specialDiscountValue" })
  const watchSpecialDiscountReason = useWatch({ control, name: "specialDiscountReason" })
  const watchVatMode = useWatch({ control, name: "vatMode" }) || "EXCLUDING"

  const subtotal = useMemo(() => {
    return watchItems.reduce((sum: number, item: any) => {
      const qty = item?.quantity === "" ? 0 : Number(item?.quantity) || 0
      const price = item?.unitPrice === "" ? 0 : Number(item?.unitPrice) || 0
      const discVal = item?.discount === "" ? 0 : Number(item?.discount) || 0
      const discType = item?.discountType || "PERCENTAGE"
      const discPerUnit = discType === "PERCENTAGE" ? price * (discVal / 100) : discVal
      const netPrice = Math.max(0, price - discPerUnit)
      return sum + qty * netPrice
    }, 0)
  }, [watchItems])

  const totalAdditionalCost = useMemo(() => {
    return watchAdditionalCharges.reduce((sum: number, c: any) => {
      const amt = c?.amount === "" ? 0 : Number(c?.amount) || 0
      return sum + amt
    }, 0)
  }, [watchAdditionalCharges])

  const specialDiscountAmount = useMemo(() => {
    const val = watchSpecialDiscountValue === "" ? 0 : Number(watchSpecialDiscountValue) || 0
    if (!watchSpecialDiscountType || val <= 0) return 0

    if (watchSpecialDiscountType === "PERCENTAGE") {
      const grossSub = subtotal + totalAdditionalCost
      return (grossSub * val) / 100
    } else {
      return val
    }
  }, [watchSpecialDiscountType, watchSpecialDiscountValue, subtotal, totalAdditionalCost])

  const taxableAmount = useMemo(() => {
    const grossSub = subtotal + totalAdditionalCost
    return Math.max(0, grossSub - specialDiscountAmount)
  }, [subtotal, totalAdditionalCost, specialDiscountAmount])

  const vatAmount = useMemo(() => {
    if (watchVatMode === "INCLUDING") return 0
    return taxableAmount * 0.05
  }, [taxableAmount, watchVatMode])

  const grandTotal = useMemo(() => {
    if (watchVatMode === "INCLUDING") {
      return taxableAmount
    }
    return taxableAmount + vatAmount
  }, [taxableAmount, vatAmount, watchVatMode])

  return (
    <div className="bg-card p-5 rounded-xl border shadow-2xs space-y-4">
      <div className="space-y-3 text-xs sm:text-sm border-b border-border/80 pb-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Products Subtotal</span>
          <span className="font-semibold font-mono text-foreground">AED {formatCurrency(subtotal)}</span>
        </div>

        {/* Additional Costs Itemized Breakdown */}
        {watchAdditionalCharges.length > 0 && watchAdditionalCharges.some((c: any) => (parseFloat(c?.amount) || 0) > 0) && (
          <div className="space-y-1.5 pt-1 border-t border-dashed border-border/50">
            {watchAdditionalCharges.map((c: any, idx: number) => {
              const amt = c?.amount === "" ? 0 : Number(c?.amount) || 0
              if (amt <= 0 && (!c?.name || !c.name.trim())) return null
              return (
                <div key={idx} className="flex justify-between items-center text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  <span className="text-muted-foreground flex flex-col">
                    <span className="font-semibold text-foreground">{c.name || `Additional Charge #${idx + 1}`}</span>
                    {c.notes && <span className="text-[10px] text-muted-foreground/80 italic">{c.notes}</span>}
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+ AED {formatCurrency(amt)}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Special Discount */}
        {specialDiscountAmount > 0 && (
          <div className="flex justify-between items-center text-destructive font-medium">
            <span className="text-muted-foreground flex flex-col">
              <span>Special Discount</span>
              {watchSpecialDiscountReason && (
                <span className="text-[10px] text-muted-foreground/80 italic truncate max-w-[160px]">
                  {watchSpecialDiscountReason}
                </span>
              )}
            </span>
            <span className="font-mono font-semibold">- AED {formatCurrency(specialDiscountAmount)}</span>
          </div>
        )}

        {/* Taxable Subtotal */}
        {watchVatMode !== "INCLUDING" && (totalAdditionalCost > 0 || specialDiscountAmount > 0) && (
          <div className="flex justify-between items-center pt-2 border-t border-dashed border-border/60">
            <span className="text-muted-foreground font-semibold">Taxable Subtotal</span>
            <span className="font-semibold font-mono text-foreground">AED {formatCurrency(taxableAmount)}</span>
          </div>
        )}

        {/* VAT Amount */}
        {watchVatMode !== "INCLUDING" && (
          <div className="flex items-center justify-between text-muted-foreground font-medium">
            <span>VAT (5%)</span>
            <span className="font-mono font-semibold text-foreground">AED {formatCurrency(vatAmount)}</span>
          </div>
        )}
      </div>

      {/* Grand Total Highlight */}
      <div className="flex justify-between items-center text-lg sm:text-xl font-bold text-primary pt-1">
        <span>{watchVatMode === "INCLUDING" ? "Total Payable" : "Grand Total"}</span>
        <span className="font-mono text-xl sm:text-2xl font-black">
          AED {grandTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  )
}

function StickyDockSummaryPanel({ control, submitting, form, onSubmit, onInvalid, isRevision, isEdit, existingQuote }: { control: any; submitting: boolean; form: any; onSubmit: any; onInvalid?: any; isRevision: boolean; isEdit?: boolean; existingQuote?: any }) {
  const watchItems = useWatch({ control, name: "items" }) || []
  const watchAdditionalCharges = useWatch({ control, name: "additionalCharges" }) || []
  const watchSpecialDiscountType = useWatch({ control, name: "specialDiscountType" })
  const watchSpecialDiscountValue = useWatch({ control, name: "specialDiscountValue" })
  const watchVatMode = useWatch({ control, name: "vatMode" }) || "EXCLUDING"

  const grandTotal = useMemo(() => {
    const sub = watchItems.reduce((sum: number, item: any) => {
      const qty = item?.quantity === "" ? 0 : Number(item?.quantity) || 0
      const price = item?.unitPrice === "" ? 0 : Number(item?.unitPrice) || 0
      const discVal = item?.discount === "" ? 0 : Number(item?.discount) || 0
      const discType = item?.discountType || "PERCENTAGE"
      const discPerUnit = discType === "PERCENTAGE" ? price * (discVal / 100) : discVal
      const netPrice = Math.max(0, price - discPerUnit)
      return sum + qty * netPrice
    }, 0)

    const addCost = watchAdditionalCharges.reduce((sum: number, c: any) => {
      const amt = c?.amount === "" ? 0 : Number(c?.amount) || 0
      return sum + amt
    }, 0)

    const val = watchSpecialDiscountValue === "" ? 0 : Number(watchSpecialDiscountValue) || 0
    let specDisc = 0
    if (watchSpecialDiscountType && val > 0) {
      specDisc = watchSpecialDiscountType === "PERCENTAGE" ? ((sub + addCost) * val) / 100 : val
    }

    const taxable = Math.max(0, sub + addCost - specDisc)
    const vat = watchVatMode === "INCLUDING" ? 0 : taxable * 0.05
    return watchVatMode === "INCLUDING" ? taxable : taxable + vat
  }, [watchItems, watchAdditionalCharges, watchSpecialDiscountType, watchSpecialDiscountValue, watchVatMode])

  const isOfficiallyCreated = isEdit && existingQuote && existingQuote.status !== "DRAFT"
  const primaryButtonText = isRevision ? "Submit Revision" : isOfficiallyCreated ? "Update Quotation" : "Create Quotation"

  return (
    <div className="bg-card p-5 rounded-xl border shadow-2xs space-y-4">
      {/* QuotationSummaryCard content */}
    </div>
  )
}

function BatchSectionSubtotal({ control, batchName, fields }: { control: any; batchName: string; fields: any[] }) {
  const watchItems = useWatch({ control, name: "items" }) || []

  const itemsInBatch = fields.filter((_, idx) => {
    const itemVal = watchItems[idx]
    const itemBatch = itemVal?.batchHeading || ""
    if (batchName === "General Items") {
      return !itemBatch || itemBatch === "General Items"
    }
    return itemBatch === batchName
  })

  const batchSubtotal = itemsInBatch.reduce((sum, fieldItem) => {
    const idx = fields.findIndex(f => f.id === fieldItem.id)
    const itemVal = watchItems[idx] || {}
    const qty = itemVal.quantity === "" ? 0 : Number(itemVal.quantity) || 0
    const price = itemVal.unitPrice === "" ? 0 : Number(itemVal.unitPrice) || 0
    const discVal = itemVal.discount === "" ? 0 : Number(itemVal.discount) || 0
    const discType = itemVal.discountType || "PERCENTAGE"
    const discPerUnit = discType === "PERCENTAGE" ? price * (discVal / 100) : discVal
    const netPrice = Math.max(0, price - discPerUnit)
    return sum + qty * netPrice
  }, 0)

  return (
    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
      <Badge variant="outline" className="text-[11px] font-mono shrink-0 bg-background">
        {itemsInBatch.length} {itemsInBatch.length === 1 ? 'item' : 'items'}
      </Badge>
      <span className="text-xs font-semibold text-foreground font-mono">
        Subtotal: AED {formatCurrency(batchSubtotal)}
      </span>
    </div>
  )
}

const QuotationItemCard = React.memo(function QuotationItemCard({
  index,
  fieldItem,
  control,
  form,
  batchName,
  batches,
  products,
  watchSegment,
  dbCategories,
  userRole,
  isRevision,
  draggedIndex,
  dragOverIndex,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  handleDuplicateItem,
  handleMoveItem,
  remove,
  handleProductSelect,
  handleVariantSelect,
  fieldsLength,
  isConfiguratorEnabled,
}: {
  index: number
  fieldItem: any
  control: any
  form: any
  batchName: string
  batches?: any[]
  products: any[]
  watchSegment: string
  dbCategories: any[]
  userRole?: string
  isRevision?: boolean
  draggedIndex: number | null
  dragOverIndex: number | null
  handleDragStart: (e: React.DragEvent, index: number) => void
  handleDragOver: (e: React.DragEvent, index: number) => void
  handleDrop: (e: React.DragEvent, index: number, targetBatchName: string) => void
  handleDragEnd: () => void
  handleDuplicateItem: (index: number) => void
  handleMoveItem: (index: number, direction: -1 | 1, batchName: string) => void
  remove: (index: number) => void
  handleProductSelect: (index: number, productId: string) => void
  handleVariantSelect?: (index: number, variantProduct: any) => void
  fieldsLength: number
  isConfiguratorEnabled?: boolean
}) {
  const [selectionMode, setSelectionMode] = useState<"search" | "configurator">("search")
  const canUseConfigurator = userRole === "SUPER_ADMIN" || !!isConfiguratorEnabled
  const currentItemVal = useWatch({ control, name: `items.${index}` }) || {}
  const includeCategoryName = useWatch({ control, name: "includeCategoryName" }) ?? true
  const isItemLocked = currentItemVal.costingStatus === "PENDING_COSTING" || currentItemVal.costingStatus === "COSTING_IN_PROGRESS"
  const isIDC = !userRole || userRole === "INTERIOR_DESIGN_CONSULTANT" || userRole === "SALES_EXECUTIVE"
  const isCostedByEstimator = currentItemVal.costingStatus === "COSTING_COMPLETED" || !!currentItemVal.costingCompletedAt
  const isCostingLockedForIDC = isIDC && isCostedByEstimator
  const itemBatch = (currentItemVal.batchHeading || "").trim()
  const isGeneral = !itemBatch || itemBatch === "General Items"
  const batchExists = (batches || []).some(b => b.name === itemBatch || (isGeneral && b.name === "General Items"))

  let belongsToBatch = false
  if (batchExists) {
    belongsToBatch = itemBatch === batchName || (isGeneral && batchName === "General Items")
  } else {
    belongsToBatch = batchName === (batches && batches[0]?.name) || batchName === "General Items"
  }
  if (!belongsToBatch) return null

  const currentProductId = currentItemVal.productId
  const currentUnitPrice = currentItemVal.unitPrice
  const currentQuantity = currentItemVal.quantity
  const currentBasePrice = currentItemVal.basePrice
  const currentMargin = currentItemVal.margin
  const currentDiscount = currentItemVal.discount
  const currentDiscountType = currentItemVal.discountType || "PERCENTAGE"
  const currentPriceSource = currentItemVal.priceSource || "standard"
  const currentImg = currentItemVal.customImageUrl

  const qtyNum = currentQuantity === "" ? 0 : Number(currentQuantity) || 0
  const unitPriceNum = currentUnitPrice === "" ? 0 : Number(currentUnitPrice) || 0
  const discValNum = currentDiscount === "" ? 0 : Number(currentDiscount) || 0
  const discPerUnit = currentDiscountType === "PERCENTAGE" ? unitPriceNum * (discValNum / 100) : discValNum
  const netUnitPrice = Math.max(0, unitPriceNum - discPerUnit)
  const lineTotal = qtyNum * netUnitPrice

  const watchAllItems = useWatch({ control, name: "items" }) || []
  const sectionItemIndices = useMemo(() => {
    return watchAllItems
      .map((item: any, idx: number) => ({ item, idx }))
      .filter(({ item }: any) => {
        const b = item?.batchHeading || ""
        return batchName === "General Items" ? (!b || b === "General Items") : b === batchName
      })
      .map(({ idx }: any) => idx)
  }, [watchAllItems, batchName])

  const posInSection = sectionItemIndices.indexOf(index)
  const isFirstInSection = posInSection <= 0
  const isLastInSection = posInSection === -1 || posInSection >= sectionItemIndices.length - 1

  return (
    <div
      onDragOver={(e) => !isItemLocked && handleDragOver(e, index)}
      onDrop={(e) => !isItemLocked && handleDrop(e, index, batchName)}
      className={cn(
        "p-4 sm:p-5 rounded-xl border bg-card shadow-2xs space-y-4 transition-colors duration-150 hover:border-primary/40",
        dragOverIndex === index && "border-primary border-dashed bg-primary/10 shadow-md ring-2 ring-primary/30",
        draggedIndex === index && "opacity-40 border-primary border-dashed",
        isItemLocked && "border-amber-400/60 bg-amber-500/5 dark:bg-amber-950/20"
      )}
    >
      {/* Item Header Row */}
      <div className="flex items-center justify-between border-b pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            draggable={!isItemLocked}
            onDragStart={(e) => !isItemLocked && handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "drag-handle cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted",
              isItemLocked && "opacity-40 cursor-not-allowed"
            )}
            title={isItemLocked ? "Product is locked during costing" : "Drag item to reorder or move across sections"}
          >
            <GripVertical className="h-4 w-4" />
          </span>
          <Badge variant="outline" className="font-mono text-xs font-bold bg-muted/40">
            #{index + 1}
          </Badge>

          {/* Move Up / Move Down Arrow Controls */}
          <div className="flex items-center gap-0.5 bg-muted/40 border border-border/80 rounded-lg p-0.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isFirstInSection || isItemLocked}
              onClick={() => handleMoveItem(index, -1, batchName)}
              className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={isFirstInSection ? "First item in section" : isItemLocked ? "Locked for costing" : "Move product up"}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isLastInSection || isItemLocked}
              onClick={() => handleMoveItem(index, 1, batchName)}
              className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={isLastInSection ? "Last item in section" : isItemLocked ? "Locked for costing" : "Move product down"}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          {includeCategoryName && currentItemVal.categoryName && (
            <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
              {currentItemVal.categoryName}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Add to Costing Action Button */}
          {!currentItemVal.costingStatus || currentItemVal.costingStatus === "NOT_REQUIRED" || currentItemVal.costingStatus === "NONE" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isItemLocked}
              onClick={() => {
                form.setValue(`items.${index}.costingStatus`, "ADDED_FOR_COSTING", { shouldDirty: true })
                toast.success(`Item #${index + 1} added to Costing Queue.`)
              }}
              className="h-6 px-2 text-[11px] font-semibold border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 cursor-pointer flex items-center gap-1 shrink-0"
              title="Mark this line item for Cost Estimator pricing"
            >
              <Calculator className="h-3 w-3 text-amber-600" />
              <span>+ Add to Costing</span>
            </Button>
          ) : null}

          {/* Add for Costing Action & Status Badges */}
          {currentItemVal.costingStatus === "ADDED_FOR_COSTING" ? (
            <Badge 
              variant="outline"
              className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 text-[11px] font-semibold py-0.5 px-2 flex items-center gap-1 cursor-pointer"
              onClick={() => {
                form.setValue(`items.${index}.costingStatus`, "NOT_REQUIRED", { shouldDirty: true })
                toast.info(`Item #${index + 1} removed from costing queue.`)
              }}
              title="Click to remove from costing queue"
            >
              <Clock className="h-3 w-3 text-amber-600" /> Added for Costing
            </Badge>
          ) : currentItemVal.costingStatus === "PENDING_COSTING" ? (
            <Badge className="bg-amber-500 text-white font-semibold text-[11px] py-0.5 px-2 flex items-center gap-1">
              <Clock className="h-3 w-3 animate-pulse" /> Pending Costing
            </Badge>
          ) : currentItemVal.costingStatus === "COSTING_IN_PROGRESS" ? (
            <Badge className="bg-blue-600 text-white font-semibold text-[11px] py-0.5 px-2 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Costing In Progress
            </Badge>
          ) : currentItemVal.costingStatus === "COSTING_COMPLETED" || isCostedByEstimator ? (
            <Badge className="bg-emerald-600 text-white font-semibold text-[11px] py-0.5 px-2.5 flex items-center gap-1">
              <Check className="h-3 w-3 stroke-[3]" /> Costing Completed by {currentItemVal.estimator?.name || "Estimator"}
            </Badge>
          ) : currentPriceSource === "standard" ? (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 text-[11px] font-semibold py-0.5 px-2 flex items-center gap-1">
              <Tag className="h-3 w-3 text-blue-500" /> Price from Catalog
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-300 text-[11px] font-semibold py-0.5 px-2 flex items-center gap-1">
              <User className="h-3 w-3 text-purple-500" /> Provided by {currentItemVal.consultantName || "Interior Design Consultant"}
            </Badge>
          )}

          {isItemLocked && (
            <Badge variant="outline" className="bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 text-[11px] font-semibold py-0.5 px-2 flex items-center gap-1 shrink-0">
              <Lock className="h-3 w-3 text-slate-500" /> Locked for Costing
            </Badge>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isItemLocked}
            onClick={() => handleDuplicateItem(index)}
            className="text-[11px] h-7 flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="h-3 w-3" /> Duplicate
          </Button>

          {fieldsLength > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isItemLocked}
              onClick={() => remove(index)}
              className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={isItemLocked ? "Item is locked during costing" : "Remove item"}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Product Search / Workstation Configurator Selector */}
      <div className="space-y-1.5">
        {selectionMode === "search" || !canUseConfigurator ? (
          <>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Catalog Product</label>
              {canUseConfigurator && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectionMode("configurator")}
                  className="text-[11px] h-6 px-2 text-primary hover:bg-primary/10 flex items-center gap-1.5 font-semibold cursor-pointer"
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>Configure Workstation Model</span>
                </Button>
              )}
            </div>
            <ProductSearchSelect
              productId={currentProductId}
              products={products}
              watchSegment={watchSegment}
              onProductSelect={(prodId) => handleProductSelect(index, prodId)}
              onCustomProductClick={() => {
                form.setValue(`items.${index}.productId`, "")
                form.setValue(`items.${index}.priceSource`, "manual")
              }}
              onOpenConfigurator={canUseConfigurator ? () => setSelectionMode("configurator") : undefined}
              disabled={isItemLocked}
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                Workstation Model Configurator
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectionMode("search")}
                className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium cursor-pointer"
              >
                <Search className="h-3 w-3" />
                <span>Switch to Catalog Search</span>
              </Button>
            </div>
            <WorkstationConfigurator
              watchSegment={watchSegment}
              onSelectVariant={(variantProduct) => {
                if (handleVariantSelect) {
                  handleVariantSelect(index, variantProduct)
                } else {
                  handleProductSelect(index, variantProduct.id)
                }
                setSelectionMode("search")
              }}
              onCancel={() => setSelectionMode("search")}
            />
          </>
        )}
      </div>

      {/* 2-Column Responsive Layout (Details & Pricing) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        {/* Left Side: Image & Description Info */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex gap-3 items-start">
            {/* Quotation Item Image Dropzone */}
            <QuotationItemImageDropzone
              value={currentImg}
              onChange={(url) => form.setValue(`items.${index}.customImageUrl`, url, { shouldValidate: true, shouldDirty: true })}
              onRemove={() => form.setValue(`items.${index}.customImageUrl`, "", { shouldValidate: true, shouldDirty: true })}
              itemIndex={index}
            />

            {/* Product Description */}
            <div className="flex-1 space-y-2">
              <FormField
                control={control}
                name={`items.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground">Product Title / Heading</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product title..." disabled={isItemLocked} className="h-9 text-xs bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Additional Category / Chair Type Selects */}
          {includeCategoryName && (
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={control}
                name={`items.${index}.categoryName`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-medium text-muted-foreground">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "Chairs"} disabled={isItemLocked}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs bg-background" disabled={isItemLocked}>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dbCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.name} className="text-xs">{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {currentItemVal.categoryName === "Chairs" && (
                <FormField
                  control={control}
                  name={`items.${index}.chairType`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-medium text-muted-foreground">Chair Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""} disabled={isItemLocked}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs bg-background" disabled={isItemLocked}>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Executive Chair" className="text-xs">Executive Chair</SelectItem>
                          <SelectItem value="Workstation Chair" className="text-xs">Workstation Chair</SelectItem>
                          <SelectItem value="Meeting Chair" className="text-xs">Meeting Chair</SelectItem>
                          <SelectItem value="Lounge Chair" className="text-xs">Lounge Chair</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}

          {/* Save to Catalog Switch for Managerial & Super Admin roles */}
          {isManagerOrAdminRole(userRole) && (
            <FormField
              control={control}
              name={`items.${index}.saveToCatalog`}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2.5 bg-muted/10">
                  <div className="space-y-0.5 flex-1 pr-2">
                    <FormLabel className="text-xs font-semibold text-foreground block">Save to Product Catalog</FormLabel>
                    <span className="text-[10px] text-muted-foreground block leading-tight">
                      Add this custom product to the product catalog upon saving.
                    </span>
                  </div>
                  <FormControl>
                    <Switch
                      disabled={isItemLocked}
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {/* Detailed Product Description Field */}
          <FormField
            control={control}
            name={`items.${index}.productDescription`}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-semibold text-foreground">Detailed Product Description</FormLabel>
                  <span className="text-[10px] text-muted-foreground font-normal">Appears in PDF & Preview</span>
                </div>
                <FormControl>
                  <Textarea
                    disabled={isItemLocked}
                    placeholder="Enter detailed product description (e.g. materials, mechanism, finish, fabric, warranty...)"
                    className="min-h-[75px] text-xs bg-background leading-relaxed"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Special Notes Field */}
          <FormField
            control={control}
            name={`items.${index}.productNotes`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground">Special Notes</FormLabel>
                <FormControl>
                  <Textarea
                    disabled={isItemLocked}
                    placeholder="Enter special notes or instructions..."
                    className="min-h-[55px] text-xs bg-background leading-relaxed"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Right Side: Pricing & Margins Grid Controls */}
        <div className="lg:col-span-6 space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border/60">
          {/* Estimator Costing Lock Banner & Final Price Audit for Costed Items */}
          {isCostedByEstimator && (
            <div className="bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-3 rounded-xl space-y-2 text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-1.5 font-bold text-xs">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 stroke-[3]" />
                  Costing Completed by {currentItemVal.estimator?.name || "Estimator"}
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-bold border-emerald-300">
                  Final Estimated Price: AED {formatCurrency(unitPriceNum)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1.5 border-t border-emerald-300/40">
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase font-sans">Base Unit Cost</span>
                  <span className="font-bold text-foreground">AED {formatCurrency(currentItemVal.unitCost || currentItemVal.basePrice || (unitPriceNum / (1 + (currentItemVal.margin || 0) / 100)))}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase font-sans">Margin %</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">{(currentItemVal.margin || 0).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase font-sans">Final Selling Price</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">AED {formatCurrency(unitPriceNum)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase font-sans">Line Total ({qtyNum} Qty)</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">AED {formatCurrency(lineTotal)}</span>
                </div>
              </div>
              {currentItemVal.estimatorNotes && (
                <div className="text-[11px] text-muted-foreground italic pt-1 border-t border-emerald-300/40">
                  <span className="font-semibold not-italic">Estimator Note:</span> "{currentItemVal.estimatorNotes}"
                </div>
              )}
            </div>
          )}

          {/* Price Source Toggle */}
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pricing Mode
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={currentPriceSource === "standard" ? "default" : "outline"}
                size="sm"
                disabled={isItemLocked || isCostingLockedForIDC}
                onClick={() => {
                  form.setValue(`items.${index}.priceSource`, "standard")
                  if (currentProductId) handleProductSelect(index, currentProductId)
                }}
                className="h-6 text-[10px] px-2 cursor-pointer"
              >
                Standard Price
              </Button>
              <Button
                type="button"
                variant={currentPriceSource === "manual" ? "default" : "outline"}
                size="sm"
                disabled={isItemLocked || isCostingLockedForIDC}
                onClick={() => form.setValue(`items.${index}.priceSource`, "manual")}
                className="h-6 text-[10px] px-2 cursor-pointer"
              >
                Manual Override
              </Button>
            </div>
          </div>

          {/* 6-Column Pricing Fields */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
            {/* Quantity */}
            <FormField
              control={control}
              name={`items.${index}.quantity`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-semibold text-muted-foreground">Qty</FormLabel>
                  <FormControl>
                    <NumericInput
                      type="number"
                      disabled={isItemLocked}
                      className="h-8 text-xs font-mono text-center bg-background"
                      value={field.value}
                      onChange={(val) => field.onChange(val === "" ? "" : Number(val))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Base Price */}
            <FormField
              control={control}
              name={`items.${index}.basePrice`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-semibold text-muted-foreground">Base AED</FormLabel>
                  <FormControl>
                    <NumericInput
                      disabled={isItemLocked || isCostingLockedForIDC || currentPriceSource === "standard"}
                      className="h-8 text-xs font-mono bg-background"
                      value={field.value}
                      onChange={(val) => {
                        const bPrice = val === "" ? 0 : Number(val)
                        field.onChange(bPrice)
                        const marginVal = Number(form.getValues(`items.${index}.margin`)) || 0
                        const uPrice = Number((bPrice * (1 + marginVal / 100)).toFixed(2))
                        form.setValue(`items.${index}.unitPrice`, uPrice, { shouldValidate: false })
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Margin % */}
            <FormField
              control={control}
              name={`items.${index}.margin`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-semibold text-muted-foreground">Margin %</FormLabel>
                  <FormControl>
                    <NumericInput
                      disabled={isItemLocked}
                      className="h-8 text-xs font-mono text-center bg-background"
                      value={field.value}
                      onChange={(val) => {
                        const marginVal = val === "" ? 0 : Number(val)
                        field.onChange(marginVal)
                        form.setValue(`items.${index}.manualMargin`, marginVal, { shouldValidate: false })
                        const bPrice = Number(form.getValues(`items.${index}.basePrice`)) || 0
                        if (bPrice > 0) {
                          const uPrice = Number((bPrice * (1 + marginVal / 100)).toFixed(2))
                          form.setValue(`items.${index}.unitPrice`, uPrice, { shouldValidate: false })
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Unit Price */}
            <FormField
              control={control}
              name={`items.${index}.unitPrice`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-semibold text-muted-foreground">Unit AED</FormLabel>
                  <FormControl>
                    <NumericInput
                      disabled={isItemLocked || isCostingLockedForIDC}
                      className="h-8 text-xs font-mono bg-background font-bold text-primary"
                      value={field.value}
                      onChange={(val) => {
                        const uPrice = val === "" ? 0 : Number(val)
                        field.onChange(uPrice)
                        const bPrice = Number(form.getValues(`items.${index}.basePrice`)) || 0
                        if (bPrice > 0) {
                          const calculatedMargin = Number((((uPrice - bPrice) / bPrice) * 100).toFixed(2))
                          form.setValue(`items.${index}.margin`, calculatedMargin, { shouldValidate: false })
                          form.setValue(`items.${index}.manualMargin`, calculatedMargin, { shouldValidate: false })
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Item Discount Field */}
            <FormField
              control={control}
              name={`items.${index}.discount`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-[11px] font-semibold text-muted-foreground">Discount</FormLabel>
                    <button
                      type="button"
                      disabled={isItemLocked}
                      onClick={() => {
                        const nextType = currentDiscountType === "PERCENTAGE" ? "AMOUNT" : "PERCENTAGE"
                        form.setValue(`items.${index}.discountType`, nextType)
                      }}
                      className="text-[10px] text-primary hover:underline font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Toggle between % and AED discount"
                    >
                      {currentDiscountType === "PERCENTAGE" ? "%" : "AED"}
                    </button>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <NumericInput
                        disabled={isItemLocked}
                        className="h-8 text-xs font-mono bg-background pr-6"
                        value={field.value}
                        onChange={(val) => field.onChange(val === "" ? "" : Number(val))}
                      />
                      <span className="absolute right-1.5 top-2 text-[9px] font-bold text-muted-foreground pointer-events-none">
                        {currentDiscountType === "PERCENTAGE" ? "%" : "AED"}
                      </span>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Total Amount */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[11px] font-semibold text-muted-foreground block">Total AED</label>
              <div className="h-8 flex flex-col justify-center items-end px-2 bg-background border rounded-md font-mono text-xs font-bold text-foreground">
                <span>{discValNum > 0 ? Math.round(lineTotal).toLocaleString("en-US") : formatCurrency(lineTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion / Collapsible for Specifications & Notes */}
      <div className="pt-2">
        <FormField
          control={control}
          name={`items.${index}.specifications`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px] font-semibold text-muted-foreground">Product Specifications (Formatted text on PDF)</FormLabel>
              <FormControl>
                <RichTextEditor
                  disabled={isItemLocked}
                  readOnly={isItemLocked}
                  value={field.value || ""}
                  onChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  )
})
function StickyFooterToolbar({
  grandTotal,
  submitting,
  primaryButtonText,
  onSubmit,
  onInvalid,
  form,
  handleSendToCostingClick,
  pendingCostingCount,
  hasPendingCostingItems,
  isQuotationLockedForCosting,
}: {
  grandTotal: number
  submitting: boolean
  primaryButtonText: string
  onSubmit: (data: any, status?: any) => void
  onInvalid: (errors: any) => void
  form: any
  handleSendToCostingClick: () => void
  pendingCostingCount: number
  hasPendingCostingItems: boolean
  isQuotationLockedForCosting?: boolean
}) {
  return (
    <div className="fixed bottom-0 left-0 md:left-64 right-0 z-40 bg-background/95 backdrop-blur-md border-t shadow-2xl py-3 px-4 sm:px-8">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">Grand Total:</span>
          <span className="text-base sm:text-xl font-black font-mono text-primary">
            AED {grandTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting || isQuotationLockedForCosting}
            onClick={() => onSubmit(form.getValues(), "DRAFT")}
            className="text-xs h-9 sm:h-10 px-3 sm:px-4 font-medium flex items-center gap-1.5 cursor-pointer bg-background disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden">Draft</span>
          </Button>

          {/* Send to Estimator Button in Bottom Toolbar */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting || isQuotationLockedForCosting}
            onClick={handleSendToCostingClick}
            className="text-xs h-9 sm:h-10 px-3 sm:px-4 font-semibold flex items-center gap-1.5 border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Lock quotation and submit to Cost Estimator for pricing"
          >
            <Calculator className="h-4 w-4 text-amber-600" />
            <span className="hidden sm:inline">Send to Estimator</span>
            <span className="sm:hidden">Estimator</span>
            {pendingCostingCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-1.5 py-0 text-[10px] font-mono font-bold">
                {pendingCostingCount}
              </Badge>
            )}
          </Button>

          {(hasPendingCostingItems || isQuotationLockedForCosting) && (
            <span className="hidden md:flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0 bg-amber-500/10 border border-amber-300/60 px-2 py-1 rounded-lg">
              <Lock className="h-3.5 w-3.5" /> Awaiting Estimator
            </span>
          )}

          <Button
            type="button"
            size="sm"
            disabled={submitting || hasPendingCostingItems || isQuotationLockedForCosting}
            onClick={() => {
              if (isQuotationLockedForCosting || hasPendingCostingItems) {
                toast.error("Quotation editing is locked while pending Estimator costing.")
                return
              }
              form.handleSubmit((data: any) => onSubmit(data, "SUBMITTED"), onInvalid)()
            }}
            className={cn(
              "text-xs h-9 sm:h-10 px-4 sm:px-6 font-bold flex items-center gap-1.5 cursor-pointer shadow-md bg-orange-600 hover:bg-orange-500 text-white",
              (hasPendingCostingItems || isQuotationLockedForCosting || submitting) && "opacity-60 cursor-not-allowed"
            )}
            title={isQuotationLockedForCosting ? "Quotation is locked while pending Estimator costing." : undefined}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasPendingCostingItems ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{primaryButtonText}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function NewQuotationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialClientId = searchParams.get("clientId") || ""
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema) as any,
    mode: "onSubmit",
    shouldFocusError: false,
    defaultValues: {
      clientId: initialClientId,
      projectName: "",
      customerSegment: "Project",
      preparedById: (session?.user as any)?.id || "",
      includeSalesAgent: false,
      includeCompanySeal: false,
      includeCategoryName: true,
      includeSectionHeadings: true,
      includeMaterialsFinishes: false,
      selectedMaterials: [],
      salesAgentId: "",
      salesAgentName: "",
      salesAgentTitle: "",
      salesAgentContactNumber: "",
      salesAgentEmail: "",
      deliveryCharge: 0,
      notes: "",
      disclaimerTitle: "Disclaimers",
      disclaimer: "",
      commonRemark: "",
      commonRemarkHighlight: false,
      commonRemarkStyle: "AMBER",
      vatMode: "EXCLUDING",
      specialDiscountType: null,
      specialDiscountValue: 0,
      specialDiscountReason: "",
      additionalCharges: [{ name: "", amount: "", notes: "" }],
      date: new Date().toISOString().split("T")[0],
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      deliveryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      paymentTerms: "50% Advance, 50% on Delivery",
      items: [{ productId: "", priceSource: "standard", description: "", specifications: "", productNotes: "", quantity: 1, basePrice: 0, unitPrice: 0, discount: 0, discountType: "PERCENTAGE", margin: 0, manualMargin: "", negotiationPct: 0, customImageUrl: "", productDescription: "", categoryName: "Chairs", chairType: "", batchHeading: "", saveToCatalog: false }],
    },
  })

  const [loadingOptions, setLoadingOptions] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([])
  const [paymentTermsOptions, setPaymentTermsOptions] = useState<{ id: string; name: string; description?: string | null; isDefault?: boolean }[]>([])
  const [materialsLibrary, setMaterialsLibrary] = useState<any[]>([])
  const [isMaterialPickerOpen, setIsMaterialPickerOpen] = useState(false)
  const [isCreateCustomMaterialOpen, setIsCreateCustomMaterialOpen] = useState(false)
  const [materialPickerSearch, setMaterialPickerSearch] = useState("")
  const [materialPickerCategory, setMaterialPickerCategory] = useState("all")

  const watchIncludeMaterialsFinishes = form.watch("includeMaterialsFinishes")
  const watchSelectedMaterials = form.watch("selectedMaterials") || []
  const watchItems = form.watch("items") || []

  const [isCostingSelectionOpen, setIsCostingSelectionOpen] = useState(false)
  const [selectedCostingItemIndexes, setSelectedCostingItemIndexes] = useState<number[]>([])

  const pendingCostingCount = useMemo(() => {
    return watchItems.filter((item: any) => item.costingStatus === "ADDED_FOR_COSTING" || item.costingStatus === "PENDING_COSTING" || item.costingStatus === "COSTING_IN_PROGRESS").length
  }, [watchItems])

  const hasPendingCostingItems = useMemo(() => {
    return watchItems.some((item: any) => item.costingStatus === "ADDED_FOR_COSTING" || item.costingStatus === "PENDING_COSTING" || item.costingStatus === "COSTING_IN_PROGRESS")
  }, [watchItems])

  const handleSendToCostingClick = async () => {
    if (submitting || isQuotationLockedForCosting) return
    const currentItems = form.getValues("items") || []
    if (currentItems.length === 0) {
      toast.error("Please add at least one product item before sending to Estimator.")
      return
    }

    try {
      setSubmitting(true)
      let targetId = existingQuote?.id || autoSavedQuoteId || searchParams.get("editId")

      await handleAutoSave()
      targetId = autoSavedQuoteId || (form.getValues() as any)?.id || existingQuote?.id || targetId

      if (!targetId) {
        await onSubmit(form.getValues(), "DRAFT")
        targetId = autoSavedQuoteId || existingQuote?.id
      }

      if (!targetId) {
        toast.error("Please save the quotation draft first before sending to Estimator.")
        setSubmitting(false)
        return
      }

      let itemIds: string[] = []
      const fetchRes = await fetch(`/api/quotations/${targetId}`)
      if (fetchRes.ok) {
        const freshQuote = await fetchRes.json()
        const savedItems = freshQuote.items || []
        const addedItems = savedItems.filter((i: any) => i.costingStatus === "ADDED_FOR_COSTING")
        if (addedItems.length > 0) {
          itemIds = addedItems.map((i: any) => i.id)
        } else {
          itemIds = savedItems.map((i: any) => i.id)
        }
      }

      const res = await fetch(`/api/quotations/${targetId}/costing-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: itemIds,
          notes: "Sent to Estimator for product costing"
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to send quotation to Estimator.")
      }

      toast.success("Quotation sent to Estimator for costing and locked for editing.")
      router.push("/quotations")
    } catch (err: any) {
      console.error("Error sending to Estimator:", err)
      toast.error(err.message || "Failed to send quotation to Estimator.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmSendToCosting = (selectedIndexes: number[]) => {
    if (selectedIndexes.length === 0) {
      toast.error("Please select at least one product item to send to Estimator.")
      return
    }

    const currentItems = form.getValues("items") || []
    currentItems.forEach((item: any, idx: number) => {
      if (selectedIndexes.includes(idx)) {
        form.setValue(`items.${idx}.costingStatus`, "PENDING_COSTING", { shouldDirty: true })
      } else if (item.costingStatus === "ADDED_FOR_COSTING" || item.costingStatus === "PENDING_COSTING") {
        form.setValue(`items.${idx}.costingStatus`, "NOT_REQUIRED", { shouldDirty: true })
      }
    })

    setIsCostingSelectionOpen(false)
    toast.success(`Sent ${selectedIndexes.length} product(s) to Cost Estimator. Products are now locked for costing.`)
    
    setTimeout(() => {
      form.handleSubmit((data) => onSubmit(data, "DRAFT"), onInvalid)()
    }, 100)
  }

  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState("")

  const selectedClientId = form.watch("clientId")
  const selectedClientObj = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId)
  }, [clients, selectedClientId])

  const watchSegment = form.watch("customerSegment") || "Project"

  const [isRevision, setIsRevision] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [isCopy, setIsCopy] = useState(false)

  useEffect(() => {
    if (!selectedClientObj) return
    let resolvedSegment: "Interior" | "Dealer" | "Project" | "Special" = "Project"
    const cType = (selectedClientObj.clientType || "").toLowerCase()
    if (cType.includes("interior")) resolvedSegment = "Interior"
    else if (cType.includes("dealer")) resolvedSegment = "Dealer"
    else if (cType.includes("special") || cType.includes("online")) resolvedSegment = "Special"
    else resolvedSegment = "Project"

    form.setValue("customerSegment", resolvedSegment)

    // Only set preparedById from client default if creating a brand new quotation from scratch
    if (!isRevision && !isEdit && !isCopy) {
      const assignedConsultantId = selectedClientObj.salespersonId || selectedClientObj.assignments?.find((a: any) => a.isPrimary)?.userId || selectedClientObj.assignments?.[0]?.userId
      if (assignedConsultantId) {
        form.setValue("preparedById", assignedConsultantId, { shouldDirty: true, shouldValidate: true })
      }
    }
  }, [selectedClientObj, isRevision, isEdit, isCopy])
  const [existingQuote, setExistingQuote] = useState<any>(null)
  const [isConfiguratorEnabled, setIsConfiguratorEnabled] = useState<boolean>(false)
  const [revisionNotes, setRevisionNotes] = useState("")
  const [contactNumbers, setContactNumbers] = useState<string[]>([""])
  const [agentEmails, setAgentEmails] = useState<string[]>([""])
  const [defaultTermsConditions, setDefaultTermsConditions] = useState<string[]>([
    "Validity: This quotation is valid for 30 days from date of issue.",
    "Delivery: Delivery within 4-6 weeks of order approval.",
    "Warranty: All structural elements carry a 5-year warranty."
  ])

  const handleMoveTerm = (index: number, direction: -1 | 1) => {
    const current = [...(form.getValues("termsConditions") || [])]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= current.length) return
    const temp = current[index]
    current[index] = current[newIndex]
    current[newIndex] = temp
    form.setValue("termsConditions", current, { shouldDirty: true, shouldValidate: true })
  }

  const handleEditTerm = (index: number, val: string) => {
    const current = [...(form.getValues("termsConditions") || [])]
    const isHighlighted = (current[index] || "").includes("[HIGHLIGHT]")
    const cleanVal = val.replace(/\[HIGHLIGHT\]\s*/g, "")
    current[index] = isHighlighted ? `[HIGHLIGHT] ${cleanVal}` : cleanVal
    form.setValue("termsConditions", current, { shouldDirty: true, shouldValidate: true })
  }

  const handleToggleHighlightTerm = (index: number) => {
    const current = [...(form.getValues("termsConditions") || [])]
    const term = current[index] || ""
    if (term.includes("[HIGHLIGHT]")) {
      current[index] = term.replace(/\[HIGHLIGHT\]\s*/g, "")
    } else {
      current[index] = `[HIGHLIGHT] ${term.replace(/\[HIGHLIGHT\]\s*/g, "")}`
    }
    form.setValue("termsConditions", current, { shouldDirty: true, shouldValidate: true })
  }

  const handleRemoveTerm = (index: number) => {
    const current = [...(form.getValues("termsConditions") || [])]
    const updated = current.filter((_, i) => i !== index)
    form.setValue("termsConditions", updated, { shouldDirty: true, shouldValidate: true })
  }

  const handleAddTerm = () => {
    const current = [...(form.getValues("termsConditions") || [])]
    current.push("")
    form.setValue("termsConditions", current, { shouldDirty: true, shouldValidate: true })
  }

  const handleResetTermsToDefault = () => {
    form.setValue("termsConditions", [...defaultTermsConditions], { shouldDirty: true, shouldValidate: true })
    toast.success("Terms & Conditions reset to default settings.")
  }

  const handleDeleteSection = (batchId: string) => {
    if (batches.length <= 1) {
      toast.error("At least one quotation section must remain.")
      return
    }

    const targetBatch = batches.find(b => b.id === batchId)
    if (!targetBatch) return

    const currentItems = form.getValues("items") || []
    const itemsInBatch = currentItems.filter(item => (item.batchHeading || "General Items") === targetBatch.name)

    if (itemsInBatch.length > 0) {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete section "${targetBatch.name}" along with its ${itemsInBatch.length} product(s)?`
      )
      if (!confirmDelete) return
    }

    const updatedItems = currentItems.filter(item => (item.batchHeading || "General Items") !== targetBatch.name)
    form.setValue("items", updatedItems, { shouldDirty: true, shouldValidate: true })

    const updatedBatches = batches.filter(b => b.id !== batchId)
    setBatches(updatedBatches)
    toast.success(`Section "${targetBatch.name}" deleted.`)
  }

  const [users, setUsers] = useState<any[]>([])
  const [userPermissions, setUserPermissions] = useState<any>(null)
  const [canCreateClient, setCanCreateClient] = useState<boolean>(false)

  const [cropperLineIndex, setCropperLineIndex] = useState<number | null>(null)
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [batches, setBatches] = useState<{ id: string; name: string }[]>([
    { id: "default", name: "General Items" }
  ])
  const [draggedBatchId, setDraggedBatchId] = useState<string | null>(null)
  const [dragOverBatchId, setDragOverBatchId] = useState<string | null>(null)

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Smooth, continuous 60FPS drag-and-drop auto-scroll engine
  useEffect(() => {
    if (draggedIndex === null && draggedBatchId === null) return

    let animationFrameId: number | null = null
    let lastTime = performance.now()
    let currentY = -1

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault()
      currentY = e.clientY
    }

    const scrollLoop = (now: number) => {
      const deltaTime = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      if (currentY >= 0) {
        const viewportHeight = window.innerHeight
        const topThreshold = 140
        const bottomThreshold = viewportHeight - 140

        let scrollVelocity = 0

        if (currentY < topThreshold) {
          const intensity = Math.pow((topThreshold - Math.max(0, currentY)) / topThreshold, 1.2)
          scrollVelocity = -950 * intensity
        } else if (currentY > bottomThreshold) {
          const distance = Math.max(0, currentY - bottomThreshold)
          const maxDistance = viewportHeight - bottomThreshold
          const intensity = Math.pow(Math.min(1, distance / maxDistance), 1.2)
          scrollVelocity = 950 * intensity
        }

        if (scrollVelocity !== 0) {
          const scrollTarget = document.querySelector("main.overflow-y-auto") || window
          scrollTarget.scrollBy({
            top: scrollVelocity * deltaTime,
            behavior: "instant" as ScrollBehavior
          })
        }
      }

      animationFrameId = requestAnimationFrame(scrollLoop)
    }

    window.addEventListener("dragover", handleGlobalDragOver, { capture: true })
    animationFrameId = requestAnimationFrame(scrollLoop)

    return () => {
      window.removeEventListener("dragover", handleGlobalDragOver, { capture: true })
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [draggedIndex, draggedBatchId])

  const [autoSavedQuoteId, setAutoSavedQuoteId] = useState<string | null>(null)
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const lastSavedDataRef = useRef<string>("")
  const autoSaveStateRef = useRef({
    isRevision,
    isEdit,
    existingQuote,
    autoSavedQuoteId,
    revisionNotes
  })

  useEffect(() => {
    autoSaveStateRef.current = { isRevision, isEdit, existingQuote, autoSavedQuoteId, revisionNotes }
  }, [isRevision, isEdit, existingQuote, autoSavedQuoteId, revisionNotes])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `item-${index}`)
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index && dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
    setDraggedBatchId(null)
    setDragOverBatchId(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number, targetBatchName?: string) => {
    e.preventDefault()
    e.stopPropagation()

    // Handle file drop directly on the item card container
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile && (droppedFile.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(droppedFile.name))) {
        const fileInput = document.getElementById(`image-dropzone-input-${dropIndex}`) as HTMLInputElement
        if (fileInput) {
          const dt = new DataTransfer()
          dt.items.add(droppedFile)
          fileInput.files = dt.files
          fileInput.dispatchEvent(new Event("change", { bubbles: true }))
        } else {
          const reader = new FileReader()
          reader.onloadend = () => {
            setRawImageSrc(reader.result as string)
            setCropperLineIndex(dropIndex)
            setIsCropperOpen(true)
          }
          reader.readAsDataURL(droppedFile)
        }
        return
      }
    }

    if (draggedIndex === null) {
      handleDragEnd()
      return
    }

    const currentItems = [...form.getValues("items")]
    const draggedItem = { ...currentItems[draggedIndex] }
    const oldBatchHeading = draggedItem.batchHeading || "General Items"
    const newBatchHeading = targetBatchName ? (targetBatchName === "General Items" ? "" : targetBatchName) : draggedItem.batchHeading

    draggedItem.batchHeading = newBatchHeading

    currentItems.splice(draggedIndex, 1)

    // Calculate insertion index
    let insertIndex = dropIndex
    if (draggedIndex < dropIndex) {
      insertIndex = Math.max(0, dropIndex - 1)
    }
    
    currentItems.splice(insertIndex, 0, draggedItem)

    form.setValue("items", currentItems, { shouldDirty: true, shouldValidate: true })
    handleDragEnd()

    const formattedTargetName = targetBatchName || "General Items"
    if (oldBatchHeading !== formattedTargetName) {
      toast.success(`Moved product to section "${formattedTargetName}"`)
    }
  }

  const handleMoveItem = (index: number, direction: -1 | 1, batchName: string) => {
    const currentItems = [...form.getValues("items")]
    if (index < 0 || index >= currentItems.length) return

    const isItemInBatch = (item: any, bName: string) => {
      const b = item?.batchHeading || ""
      return bName === "General Items" ? (!b || b === "General Items") : b === bName
    }

    const sectionIndices = currentItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => isItemInBatch(item, batchName))
      .map(({ idx }) => idx)

    const posInSection = sectionIndices.indexOf(index)
    if (posInSection === -1) return

    const targetPos = posInSection + direction
    if (targetPos < 0 || targetPos >= sectionIndices.length) return

    const targetIndex = sectionIndices[targetPos]

    const temp = currentItems[index]
    currentItems[index] = currentItems[targetIndex]
    currentItems[targetIndex] = temp

    form.setValue("items", currentItems, { shouldDirty: true, shouldValidate: true })
  }

  const handleBatchDragStart = (e: React.DragEvent, batchId: string) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `batch-${batchId}`)
    setDraggedBatchId(batchId)
  }

  const handleBatchDragOver = (e: React.DragEvent, batchId: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (draggedBatchId !== null && draggedBatchId !== batchId) {
      setDragOverBatchId(batchId)
    } else if (draggedIndex !== null) {
      setDragOverBatchId(batchId)
    }
  }

  const handleBatchDrop = (e: React.DragEvent, dropBatchId: string, dropBatchName: string) => {
    e.preventDefault()
    e.stopPropagation()

    // 1. Handle item drop onto section container
    if (draggedIndex !== null) {
      const currentItems = [...form.getValues("items")]
      const draggedItem = { ...currentItems[draggedIndex] }
      const oldBatchHeading = draggedItem.batchHeading || "General Items"
      const newBatchHeading = dropBatchName === "General Items" ? "" : dropBatchName

      draggedItem.batchHeading = newBatchHeading

      // Remove item from old position
      currentItems.splice(draggedIndex, 1)

      // Find the last item belonging to dropBatchName
      let lastItemIndex = -1
      currentItems.forEach((item, idx) => {
        const itemBatch = item.batchHeading || "General Items"
        if ((dropBatchName === "General Items" && (!item.batchHeading || item.batchHeading === "General Items")) || itemBatch === dropBatchName) {
          lastItemIndex = idx
        }
      })

      if (lastItemIndex !== -1) {
        currentItems.splice(lastItemIndex + 1, 0, draggedItem)
      } else {
        currentItems.push(draggedItem)
      }

      form.setValue("items", currentItems, { shouldDirty: true, shouldValidate: true })
      handleDragEnd()

      if (oldBatchHeading !== dropBatchName) {
        toast.success(`Moved product to section "${dropBatchName}"`)
      }
      return
    }

    // 2. Handle section reordering
    if (draggedBatchId === null || draggedBatchId === dropBatchId) {
      handleDragEnd()
      return
    }

    const draggedBatchIndex = batches.findIndex(b => b.id === draggedBatchId)
    const dropBatchIndex = batches.findIndex(b => b.id === dropBatchId)

    if (draggedBatchIndex === -1 || dropBatchIndex === -1) {
      handleDragEnd()
      return
    }

    const updatedBatches = [...batches]
    const [draggedBatch] = updatedBatches.splice(draggedBatchIndex, 1)
    updatedBatches.splice(dropBatchIndex, 0, draggedBatch)
    setBatches(updatedBatches)

    const currentItems = [...form.getValues("items")]
    const reorderedItems: any[] = []

    updatedBatches.forEach(b => {
      const itemsInBatch = currentItems.filter(item => (item.batchHeading || "General Items") === b.name)
      reorderedItems.push(...itemsInBatch)
    })

    const unassignedItems = currentItems.filter(item => !updatedBatches.some(b => b.name === (item.batchHeading || "General Items")))
    reorderedItems.push(...unassignedItems)

    form.setValue("items", reorderedItems, { shouldDirty: true, shouldValidate: true })
    handleDragEnd()
  }

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null)
  const [isQuickAddClientOpen, setIsQuickAddClientOpen] = useState(false)

  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false)
  const [revisionReasonText, setRevisionReasonText] = useState("")
  const [submittingRevision, setSubmittingRevision] = useState(false)

  const handleConfirmRequestRevision = async () => {
    if (!revisionReasonText.trim()) {
      toast.error("Please enter a mandatory reason for the costing revision.")
      return
    }

    const targetId = existingQuote?.id || autoSavedQuoteId
    if (!targetId) return

    try {
      setSubmittingRevision(true)
      const res = await fetch(`/api/quotations/${targetId}/costing-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionReason: revisionReasonText }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to request costing revision")
      }

      toast.success("Costing revision requested! Quotation sent back to Estimator.")
      setIsRevisionModalOpen(false)
      router.push("/quotations")
    } catch (err: any) {
      toast.error(err.message || "Error requesting costing revision")
    } finally {
      setSubmittingRevision(false)
    }
  }

  const handleReopenCosting = async () => {
    const targetId = existingQuote?.id || autoSavedQuoteId
    if (!targetId) return

    try {
      setSubmitting(true)
      const res = await fetch(`/api/quotations/${targetId}/costing-revision`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Reopened costing" }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to reopen costing")
      }

      toast.success("Costing process reopened. Estimator can now edit costing fields.")
      const fetchRes = await fetch(`/api/quotations/${targetId}`)
      if (fetchRes.ok) {
        setExistingQuote(await fetchRes.json())
      }
    } catch (err: any) {
      toast.error(err.message || "Error reopening costing")
    } finally {
      setSubmitting(false)
    }
  }

  const [successModalData, setSuccessModalData] = useState<{
    isOpen: boolean
    quotation: {
      id: string
      quotationNumber: string
      clientName?: string
      projectName?: string
      grandTotal?: number
      isRevision?: boolean
      isEdit?: boolean
      pdfUrl?: string
    } | null
  }>({ isOpen: false, quotation: null })

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assigningClient, setAssigningClient] = useState<{ id: string; name: string } | null>(null)

  const [requestAccessClient, setRequestAccessClient] = useState<{ id: string; name: string } | null>(null)
  const [requestNotes, setRequestNotes] = useState("")
  const [requestingAccess, setRequestingAccess] = useState(false)

  // Undo & Redo History Stack
  const historyStackRef = useRef<any[]>([])
  const redoStackRef = useRef<any[]>([])
  const isHistoryActionRef = useRef<boolean>(false)

  // In-Page Preview Dialog State
  const [isInPagePreviewOpen, setIsInPagePreviewOpen] = useState(false)
  const [previewQuoteData, setPreviewQuoteData] = useState<any>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const handleRequestAccess = async (clientId: string, clientName: string, notes?: string) => {
    try {
      const res = await fetch("/api/clients/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, requestNotes: notes }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request")
      }
      toast.success(`Access request submitted for ${clientName}! Admin will review your request.`)
      const clientsRes = await fetch("/api/clients?all=true")
      if (clientsRes.ok) {
        setClients(await clientsRes.json())
      }
    } catch (err: any) {
      toast.error(err.message || "Error submitting access request")
      throw err
    }
  }

  useEffect(() => {
    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data)
          const sessionUserId = (session?.user as any)?.id
          if (sessionUserId && !form.getValues("preparedById") && !isRevision && !isEdit && !isCopy) {
            form.setValue("preparedById", sessionUserId)
          }
        }
      })
      .catch(err => console.error("Failed to load users", err))

    fetch("/api/users/me/permissions")
      .then(res => res.json())
      .then(data => {
        if (data && data.permissions) {
          setUserPermissions(data.permissions.QUOTATIONS || {})
          setCanCreateClient(!!data.permissions.CLIENTS?.create)
        }
      })
      .catch(err => console.error("Failed to load permissions", err))
  }, [session])

  useEffect(() => {
    async function loadData() {
      try {
        const [clientsRes, productsRes, categoriesRes, settingsRes, termsRes, materialsRes] = await Promise.all([
          fetch("/api/clients?all=true"),
          fetch("/api/products"),
          fetch("/api/products/categories"),
          fetch("/api/settings/system"),
          fetch("/api/settings/terms"),
          fetch("/api/materials"),
        ])
        if (!clientsRes.ok || !productsRes.ok) throw new Error("Failed to load catalog data")
        const clientsData = await clientsRes.json()
        const productsData = await productsRes.json()
        if (materialsRes.ok) {
          const matData = await materialsRes.json()
          if (Array.isArray(matData)) setMaterialsLibrary(matData)
        }
        let sysDisclaimerTitle = "Disclaimers"
        let sysDisclaimer = ""
        if (settingsRes.ok) {
          const sysData = await settingsRes.json()
          sysDisclaimerTitle = sysData.company_disclaimer_title || "Disclaimers"
          sysDisclaimer = sysData.company_disclaimer || ""
        }
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          if (Array.isArray(categoriesData)) setDbCategories(categoriesData)
        }

        let fetchedTerms: { id: string; name: string; description?: string | null; isDefault?: boolean }[] = []
        let loadedDefaultTerms: string[] = []

        if (termsRes.ok) {
          const termsData = await termsRes.json()
          if (Array.isArray(termsData.paymentTerms)) {
            fetchedTerms = termsData.paymentTerms
            setPaymentTermsOptions(termsData.paymentTerms)
          }
          if (Array.isArray(termsData.termsConditions) && termsData.termsConditions.length > 0) {
            loadedDefaultTerms = termsData.termsConditions.map((t: any) => `${t.title}: ${t.content}`)
            setDefaultTermsConditions(loadedDefaultTerms)
          }
        }
        if (loadedDefaultTerms.length === 0) {
          loadedDefaultTerms = [
            "Validity: This quotation is valid for 30 days from date of issue.",
            "Delivery: Delivery within 4-6 weeks of order approval.",
            "Warranty: All structural elements carry a 5-year warranty."
          ]
        }
        const defaultPaymentTerm = fetchedTerms.find((t) => t.isDefault)?.name || (fetchedTerms.length > 0 ? fetchedTerms[0].name : "50% Advance, 50% on Delivery")

        setClients(clientsData)
        setProducts(productsData)

        // Check if workstation configurator is enabled for current user/role
        fetch("/api/products/configurator")
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.enabled) {
              setIsConfiguratorEnabled(true)
            }
          })
          .catch((err) => console.error("Failed to check configurator state:", err))

        const reviseId = searchParams.get("reviseId")
        const editId = searchParams.get("editId")
        const copyId = searchParams.get("copyId")
        const activeId = reviseId || editId || copyId

        if (activeId) {
          const fetchRes = await fetch(`/api/quotations/${activeId}`)
          if (fetchRes.ok) {
            const activeData = await fetchRes.json()
            setExistingQuote(activeData)
            if (reviseId) {
              setIsRevision(true)
            } else if (editId) {
              setIsEdit(true)
            } else if (copyId) {
              setIsCopy(true)
            }

            const rawPhones = activeData.salesAgentContactNumber || ""
            const phoneList = rawPhones ? rawPhones.split(/[,;\/]+/).map((s: string) => s.trim()).filter(Boolean) : []
            setContactNumbers(phoneList.length > 0 ? phoneList : [""])

            const rawEmails = activeData.salesAgentEmail || ""
            const emailList = rawEmails ? rawEmails.split(/[,;\/]+/).map((s: string) => s.trim()).filter(Boolean) : []
            setAgentEmails(emailList.length > 0 ? emailList : [""])

            const orderedBatchNames: string[] = []
            ;(activeData.items || []).forEach((item: any) => {
              const b = (item.batchHeading || "").trim()
              const name = !b || b === "General Items" ? "General Items" : b
              if (!orderedBatchNames.includes(name)) {
                orderedBatchNames.push(name)
              }
            })
            if (orderedBatchNames.length === 0) {
              orderedBatchNames.push("General Items")
            }

            setBatches(orderedBatchNames.map(name => ({ id: Math.random().toString(), name })))

            let activeTerms: string[] = []
            if (Array.isArray(activeData.termsConditions) && activeData.termsConditions.length > 0) {
              activeTerms = activeData.termsConditions
            } else if (typeof activeData.termsConditions === "string" && activeData.termsConditions.trim()) {
              try {
                const parsed = JSON.parse(activeData.termsConditions)
                if (Array.isArray(parsed) && parsed.length > 0) activeTerms = parsed
              } catch (e) {
                activeTerms = activeData.termsConditions.split("\n").map((s: string) => s.trim()).filter(Boolean)
              }
            }
            if (activeTerms.length === 0) {
              activeTerms = loadedDefaultTerms
            }

            // Populate form values
            form.reset({
              clientId: activeData.clientId,
              projectName: activeData.projectName || "",
              quotationNumber: copyId ? "" : (activeData.quotationNumber || ""),
              customerSegment: activeData.customerSegment || "Project",
              preparedById: activeData.preparedById,
              includeSalesAgent: activeData.includeSalesAgent ?? !!(activeData.salesAgentName || activeData.salesAgentContactNumber || activeData.salesAgentEmail),
              includeCompanySeal: activeData.includeCompanySeal ?? false,
              includeCategoryName: activeData.includeCategoryName ?? true,
              includeSectionHeadings: activeData.includeSectionHeadings ?? true,
              includeMaterialsFinishes: activeData.includeMaterialsFinishes ?? false,
              selectedMaterials: Array.isArray(activeData.selectedMaterials) ? activeData.selectedMaterials : [],
              salesAgentId: activeData.salesAgentId || "",
              salesAgentName: activeData.salesAgentName || "",
              salesAgentTitle: activeData.salesAgentTitle || "",
              salesAgentContactNumber: activeData.salesAgentContactNumber || "",
              salesAgentEmail: activeData.salesAgentEmail || "",
              date: reviseId ? new Date().toISOString().split("T")[0] : activeData.date.split("T")[0],
              validityDate: reviseId ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : activeData.validityDate.split("T")[0],
              deliveryDate: activeData.deliveryDate ? new Date(activeData.deliveryDate).toISOString().split("T")[0] : new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              paymentTerms: activeData.paymentTerms || defaultPaymentTerm,
              termsConditions: activeTerms,
              items: activeData.items.map((item: any) => {
                const isCostedByEstimator = item.costingStatus === "COSTING_COMPLETED" || !!item.costingCompletedAt || (item.unitCost > 0 && (item.marginPercentage || 0) > 0)

                // Estimator Final Selling Price calculated during costing
                let estimatorFinalSellingPrice = item.estimatorUnitPrice || item.unitPrice || 0
                if ((!estimatorFinalSellingPrice || estimatorFinalSellingPrice === 0) && item.unitCost > 0) {
                  const estMargin = item.marginPercentage !== undefined ? item.marginPercentage : 0
                  estimatorFinalSellingPrice = Number((item.unitCost * (1 + estMargin / 100)).toFixed(2))
                }

                let loadedBase = 0
                let marginVal = 0

                if (isCostedByEstimator && estimatorFinalSellingPrice > 0) {
                  // The Estimator's Final Selling Price becomes the Base Price for the Interior Design Consultant
                  loadedBase = estimatorFinalSellingPrice
                  // IDC manual margin defaults to 0 (or uses saved manualMargin)
                  marginVal = item.manualMargin !== undefined && item.manualMargin !== null
                    ? Number(item.manualMargin)
                    : 0
                } else if (item.unitCost > 0) {
                  loadedBase = item.unitCost
                  marginVal = item.marginPercentage !== undefined ? item.marginPercentage : (item.margin || 0)
                } else if (item.basePrice !== undefined && item.basePrice !== null && item.basePrice !== 0) {
                  loadedBase = item.basePrice
                  marginVal = item.margin || 0
                } else {
                  loadedBase = item.unitPrice || 0
                  marginVal = item.margin || 0
                }

                let loadedUnitPrice = Number((loadedBase * (1 + marginVal / 100)).toFixed(2))
                if (loadedUnitPrice === 0 && item.unitPrice > 0) {
                  loadedUnitPrice = item.unitPrice
                }

                let resolvedPriceSource = item.priceSource
                if (isCostedByEstimator) {
                  resolvedPriceSource = "manual"
                } else if (!resolvedPriceSource) {
                  if (!item.productId) {
                    resolvedPriceSource = "manual"
                  } else {
                    const matchedProd = productsData.find((p: any) => p.id === item.productId)
                    if (matchedProd) {
                      let segPrice = matchedProd.unitPrice
                      if (activeData.customerSegment === "Interior") segPrice = matchedProd.interiorPrice ?? matchedProd.unitPrice
                      else if (activeData.customerSegment === "Dealer") segPrice = matchedProd.dealerPrice ?? matchedProd.unitPrice
                      else if (activeData.customerSegment === "Project") segPrice = matchedProd.projectPrice ?? matchedProd.unitPrice
                      else if (activeData.customerSegment === "Special") segPrice = matchedProd.specialPrice ?? matchedProd.unitPrice

                      if (Math.abs(loadedBase - segPrice) > 0.05) {
                        resolvedPriceSource = "manual"
                      } else {
                        resolvedPriceSource = "standard"
                      }
                    } else {
                      resolvedPriceSource = "manual"
                    }
                  }
                }

                const resolvedCostingStatus = isCostedByEstimator
                  ? "COSTING_COMPLETED"
                  : (item.costingStatus || (activeData.costingStatus === "COSTING_COMPLETED" ? "COSTING_COMPLETED" : "NOT_REQUIRED"))

                return {
                  productId: item.productId || "",
                  priceSource: resolvedPriceSource,
                  description: item.description,
                  specifications: item.specifications || "",
                  productNotes: item.productNotes || "",
                  quantity: item.quantity,
                  basePrice: loadedBase,
                  unitPrice: loadedUnitPrice,
                  discount: loadedUnitPrice > 0 ? Number(((item.discount || 0) / loadedUnitPrice * 100).toFixed(2)) : (item.discount || 0),
                  discountType: "PERCENTAGE",
                  margin: marginVal,
                  manualMargin: marginVal,
                  customImageUrl: item.customImageUrl || "",
                  productDescription: item.productDescription || item.product?.description || "",
                  categoryName: item.categoryName || item.product?.category?.name || "Chairs",
                  chairType: item.chairType || item.product?.chairType || "",
                  batchHeading: item.batchHeading || "",
                  saveToCatalog: false,
                  costingStatus: resolvedCostingStatus,
                  unitCost: item.unitCost || 0,
                  materialCost: item.materialCost || 0,
                  laborCost: item.laborCost || 0,
                  overheadCost: item.overheadCost || 0,
                  transportCost: item.transportCost || 0,
                  installationCost: item.installationCost || 0,
                  marginPercentage: marginVal,
                  estimatorNotes: item.estimatorNotes || "",
                  estimatorId: item.estimatorId || null,
                  estimator: item.estimator || null,
                  costingRequestedAt: item.costingRequestedAt || null,
                  costingCompletedAt: item.costingCompletedAt || null,
                }
              }),
              deliveryCharge: activeData.deliveryCharge || 0,
              notes: activeData.notes || "",
              disclaimerTitle: activeData.disclaimerTitle || sysDisclaimerTitle,
              disclaimer: activeData.disclaimer || sysDisclaimer,
              commonRemark: activeData.commonRemark || "",
              commonRemarkHighlight: activeData.commonRemarkHighlight ?? false,
              commonRemarkStyle: activeData.commonRemarkStyle || "AMBER",
              vatMode: activeData.vatMode || "EXCLUDING",
              specialDiscountType: activeData.specialDiscountType || null,
              specialDiscountValue: activeData.specialDiscountValue || 0,
              specialDiscountReason: activeData.specialDiscountReason || "",
              additionalCharges: Array.isArray(activeData.additionalCharges) && activeData.additionalCharges.length > 0
                ? activeData.additionalCharges
                : [{ name: "", amount: "", notes: "" }],
            })
          }
        } else {
          if (sysDisclaimerTitle) form.setValue("disclaimerTitle", sysDisclaimerTitle)
          if (sysDisclaimer) form.setValue("disclaimer", sysDisclaimer)
          if (defaultPaymentTerm) form.setValue("paymentTerms", defaultPaymentTerm)
          form.setValue("termsConditions", loadedDefaultTerms)
        }
      } catch (error) {
        console.error("Error loading form options:", error)
        toast.error("Failed to load clients or products catalog.")
      } finally {
        setLoadingOptions(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (loadingOptions) return

    const cachedCart = localStorage.getItem("quoteCartItems")
    if (cachedCart) {
      try {
        const data = JSON.parse(cachedCart)
        localStorage.removeItem("quoteCartItems")

        const orderedCartBatches: string[] = []
        ;(data.items || []).forEach((item: any) => {
          const b = (item.batchHeading || "").trim()
          const name = !b || b === "General Items" ? "General Items" : b
          if (!orderedCartBatches.includes(name)) {
            orderedCartBatches.push(name)
          }
        })
        if (orderedCartBatches.length === 0) {
          orderedCartBatches.push("General Items")
        }

        setBatches(orderedCartBatches.map(name => ({ id: Math.random().toString(), name })))

        form.reset({
          clientId: data.clientId,
          customerSegment: data.customerSegment || "Project",
          projectName: "",
          preparedById: (session?.user as any)?.id || "",
          salesAgentId: (session?.user as any)?.id || "",
          salesAgentName: (session?.user as any)?.name || "",
          salesAgentContactNumber: (session?.user as any)?.phone || "",
          date: new Date().toISOString().split("T")[0],
          validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          deliveryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          paymentTerms: "50% Advance, 50% on Delivery",
          items: data.items.map((item: any) => ({
            productId: item.productId || "",
            priceSource: item.priceSource || (item.productId ? "standard" : "manual"),
            description: item.description,
            specifications: item.specifications || "",
            productNotes: "",
            quantity: item.quantity,
            basePrice: item.basePrice,
            unitPrice: item.unitPrice,
            discount: 0,
            margin: 0,
            manualMargin: "",
            customImageUrl: item.customImageUrl || "",
            productDescription: item.productDescription || item.shortDescription || item.description || "",
            categoryName: item.categoryName || "Chairs",
            chairType: item.chairType || "",
            batchHeading: item.batchHeading || "",
            saveToCatalog: false,
          })),
          deliveryCharge: 0,
          notes: "",
          vatMode: "EXCLUDING",
          specialDiscountType: null,
          specialDiscountValue: 0,
          specialDiscountReason: "",
          additionalCharges: [{ name: "", amount: "" }],
        })

        toast.success("Pre-filled quotation from Product Master Quote Cart!")
      } catch (err) {
        console.error("Failed to parse cached quoteCartItems:", err)
      }
    }
  }, [loadingOptions, session])

  // Autofill initial Client if passed via Query Param
  useEffect(() => {
    if (initialClientId && clients.length > 0) {
      form.setValue("clientId", initialClientId)
    }
  }, [initialClientId, clients])

  const { fields, append, remove, update, insert, move, replace } = useFieldArray({
    name: "items",
    control: form.control,
  })

  const { fields: additionalFields, append: appendAdditional, remove: removeAdditional } = useFieldArray({
    name: "additionalCharges",
    control: form.control,
  })

  const watchClientId = form.watch("clientId")
  const watchCustomerSegment = form.watch("customerSegment") || "Project"
  const watchAdditionalCharges = form.watch("additionalCharges") || []
  const watchTermsConditions = form.watch("termsConditions") || []
  const watchSpecialDiscountType = form.watch("specialDiscountType")
  const watchSpecialDiscountValue = form.watch("specialDiscountValue")
  const watchVatMode = form.watch("vatMode") || "EXCLUDING"

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setRawImageSrc(event.target?.result as string)
      setCropperLineIndex(index)
      setIsCropperOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleCropSave = async (croppedBase64: string) => {
    if (cropperLineIndex === null) return
    setUploadingImage(true)

    try {
      const fetchRes = await fetch(croppedBase64)
      const croppedBlob = await fetchRes.blob()

      const formData = new FormData()
      formData.append("file", croppedBlob, "custom-product.jpg")

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Failed to upload cropped image")
      const data = await res.json()

      form.setValue(`items.${cropperLineIndex}.customImageUrl`, data.url, {
        shouldDirty: true,
        shouldValidate: true,
      })

      toast.success("Image cropped & uploaded successfully!")
    } catch (err) {
      console.error(err)
      toast.error("Error saving cropped image")
    } finally {
      setUploadingImage(false)
      setIsCropperOpen(false)
      setRawImageSrc(null)
      setCropperLineIndex(null)
    }
  }

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId)
    if (!prod) return

    let basePrice = prod.unitPrice
    if (watchSegment === "Interior") basePrice = prod.interiorPrice ?? prod.unitPrice
    else if (watchSegment === "Dealer") basePrice = prod.dealerPrice ?? prod.unitPrice
    else if (watchSegment === "Project") basePrice = prod.projectPrice ?? prod.unitPrice
    else if (watchSegment === "Special") basePrice = prod.specialPrice ?? prod.unitPrice

    const currentItem = form.getValues(`items.${index}`)

    form.setValue(`items.${index}.productId`, prod.id)
    form.setValue(`items.${index}.priceSource`, "standard")
    form.setValue(`items.${index}.description`, prod.productName)
    form.setValue(`items.${index}.specifications`, prod.specifications || "")
    form.setValue(`items.${index}.customImageUrl`, prod.imageUrl || "")
    form.setValue(`items.${index}.basePrice`, basePrice)

    const marginVal = Number(currentItem.margin) || 0
    const marginMultiplier = 1 + marginVal / 100
    const calculatedUnitPrice = Number((basePrice * marginMultiplier).toFixed(2))

    form.setValue(`items.${index}.unitPrice`, calculatedUnitPrice)
    form.setValue(`items.${index}.manualMargin`, marginVal)
    form.setValue(`items.${index}.productDescription`, prod.description || prod.specifications || "")

    if (prod.category?.name) {
      form.setValue(`items.${index}.categoryName`, prod.category.name)
    }
    if (prod.chairType) {
      form.setValue(`items.${index}.chairType`, prod.chairType)
    }
  }

  const handleVariantSelect = (index: number, variantProduct: any) => {
    setProducts((prev) => {
      if (!prev.some((p) => p.id === variantProduct.id)) {
        return [...prev, variantProduct]
      }
      return prev
    })
    handleProductSelect(index, variantProduct.id)
  }

  const handleDuplicateItem = (index: number) => {
    const itemToCopy = form.getValues(`items.${index}`)
    const { id, ...cleanItem } = (itemToCopy || {}) as any
    insert(index + 1, {
      ...cleanItem,
    })
    toast.success("Item duplicated")
  }

  const handleAddItemToBatch = (batchName: string) => {
    append({
      productId: "",
      priceSource: "standard",
      description: "",
      specifications: "",
      productNotes: "",
      quantity: 1,
      basePrice: 0,
      unitPrice: 0,
      discount: 0,
      discountType: "PERCENTAGE",
      margin: 0,
      manualMargin: "",
      negotiationPct: 0,
      customImageUrl: "",
      productDescription: "",
      categoryName: "Chairs",
      chairType: "",
      batchHeading: batchName === "General Items" ? "" : batchName,
      saveToCatalog: false,
    })
  }

  const handleAddBatch = (afterIndex?: number) => {
    const newBatchName = `Section ${batches.length + 1}`
    const newBatchId = Math.random().toString()
    const newBatch = { id: newBatchId, name: newBatchName }

    if (afterIndex !== undefined && afterIndex >= 0 && afterIndex < batches.length) {
      const updated = [...batches]
      updated.splice(afterIndex + 1, 0, newBatch)
      setBatches(updated)
    } else {
      setBatches([...batches, newBatch])
    }
    handleAddItemToBatch(newBatchName)
  }

  const onInvalid = (errors: any) => {
    console.error("Quotation form validation errors:", errors)
    const messages: string[] = []

    if (errors.clientId) messages.push("Client selection is required")
    if (errors.projectName) messages.push("Project Name is required")
    if (errors.paymentTerms) messages.push("Payment Terms are required")
    if (errors.items) {
      if (typeof errors.items.message === "string") {
        messages.push(errors.items.message)
      } else if (Array.isArray(errors.items)) {
        messages.push("Please check product items pricing and quantity")
      }
    }

    const mainMsg = messages.length > 0
      ? messages.join(" • ")
      : "Please fill in all required fields before creating the quotation."

    toast.error(`Validation Error: ${mainMsg}`)
  }

  const onSubmit = async (data: QuotationFormValues, resolvedStatus: "DRAFT" | "SUBMITTED" = "SUBMITTED") => {
    if (submitting) return
    setSubmitting(true)

    try {
      if (!data.clientId) {
        toast.error("Please select a Client before saving or submitting a quotation.")
        setSubmitting(false)
        return
      }

      const selectedClient = clients.find(c => c.id === data.clientId)
      const isSuperAdmin = userRole === "SUPER_ADMIN"
      const targetId = autoSavedQuoteId || (existingQuote?.id ? existingQuote.id : null)
      const isCreator = existingQuote?.preparedById === (session?.user as any)?.id
      const isNewQuote = !existingQuote && !autoSavedQuoteId

      if (selectedClient && selectedClient.status !== "Approved" && !isRevision) {
        toast.error(
          selectedClient.status === "Pending Approval"
            ? "Cannot create quotation: Client is pending approval."
            : "Cannot create quotation: Client has been rejected."
        )
        setSubmitting(false)
        return
      }

      if (selectedClient && !isSuperAdmin && !isCreator && !isRevision && !isNewQuote) {
        const isUserAssigned = selectedClient.salespersonId === (session?.user as any)?.id || selectedClient.assignments?.some((a: any) => a.userId === (session?.user as any)?.id)
        if (!isUserAssigned) {
          toast.error("Forbidden: You are not assigned to this client. Please request access or contact Admin.")
          setSubmitting(false)
          return
        }
      }

      let url = "/api/quotations"
      let method = "POST"
      let sendIsRevision = false

      if (isRevision && existingQuote) {
        url = `/api/quotations/${existingQuote.id}`
        method = "PUT"
        sendIsRevision = true
        if (!revisionNotes.trim()) {
          toast.error("Please provide revision notes explaining the changes.")
          setSubmitting(false)
          return
        }
      } else if ((isEdit && existingQuote) || targetId) {
        url = `/api/quotations/${targetId}`
        method = "PUT"
        sendIsRevision = false
      }

      const formattedItems = []
      for (const item of data.items) {
        if (item.saveToCatalog && isManagerOrAdminRole(userRole)) {
          if (!item.description || item.description.trim() === "") {
            toast.error("Product Title / Heading is required when saving an item to the catalog.")
            setSubmitting(false)
            return
          }
          try {
            let categoryId = ""
            if (item.categoryName) {
              const matchedCat = dbCategories.find(c => c.name.toLowerCase() === item.categoryName?.toLowerCase())
              if (matchedCat) categoryId = matchedCat.id
            }

            const catRes = await fetch("/api/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productName: item.description,
                categoryName: item.categoryName || "Chairs",
                unitPrice: item.unitPrice === "" ? 0 : Number(item.unitPrice),
                description: item.productDescription || item.description,
                specifications: item.specifications || "",
                imageUrl: item.customImageUrl || null,
                categoryId: categoryId || null,
                chairType: item.chairType || null,
              }),
            })
            if (catRes.ok) {
              const newProd = await catRes.json()
              item.productId = newProd.id
              toast.success(`Saved "${item.description}" to product master catalog!`)
            }
          } catch (e) {
            console.error("Failed to auto-save item to catalog:", e)
          }
        }

        const hasManual = item.manualMargin !== undefined && item.manualMargin !== ""
        const finalMargin = hasManual ? item.manualMargin : item.margin
        const price = item.unitPrice === "" ? 0 : Number(item.unitPrice)
        const discVal = item.discount === "" ? 0 : Number(item.discount)
        const discType = item.discountType || "PERCENTAGE"
        const absoluteDiscountPerUnit = discType === "PERCENTAGE" ? price * (discVal / 100) : discVal
        const qty = item.quantity === "" ? 1 : Number(item.quantity)
        const lineAmount = Math.max(0, (price - absoluteDiscountPerUnit) * qty)

        formattedItems.push({
          ...item,
          description: item.description || "",
          productId: item.productId || null,
          quantity: qty,
          basePrice: item.basePrice === "" ? 0 : Number(item.basePrice),
          unitPrice: price,
          discount: Number(absoluteDiscountPerUnit.toFixed(2)),
          amount: Number(lineAmount.toFixed(2)),
          margin: finalMargin === "" ? 0 : Number(finalMargin),
        })
      }

      // Deduplicate / merge identical item entries
      const deduplicatedFormattedItems: typeof formattedItems = []
      formattedItems.forEach((item) => {
        const itemKey = `${(item.batchHeading || "").trim().toLowerCase()}|${(item.productId || item.description || "").trim().toLowerCase()}|${item.unitPrice}|${(item.specifications || "").trim()}`
        const existingIdx = deduplicatedFormattedItems.findIndex((d) => {
          const dKey = `${(d.batchHeading || "").trim().toLowerCase()}|${(d.productId || d.description || "").trim().toLowerCase()}|${d.unitPrice}|${(d.specifications || "").trim()}`
          return dKey === itemKey
        })

        if (existingIdx > -1) {
          const existing = deduplicatedFormattedItems[existingIdx]
          const mergedQty = existing.quantity + item.quantity
          deduplicatedFormattedItems[existingIdx] = {
            ...existing,
            quantity: mergedQty,
          }
        } else {
          deduplicatedFormattedItems.push({ ...item })
        }
      })

      const cleanAdditionalCharges = (data.additionalCharges || [])
        .filter((c: any) => (c.name && c.name.trim()) || (c.amount !== "" && Number(c.amount) > 0) || (c.notes && c.notes.trim()))
        .map((c: any) => ({
          name: c.name ? c.name.trim() : "Additional Charge",
          amount: c.amount === "" ? 0 : Number(c.amount),
          notes: c.notes ? c.notes.trim() : "",
        }))

      const calcDeliveryCharge = cleanAdditionalCharges.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0)

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          preparedById: data.preparedById,
          items: deduplicatedFormattedItems,
          deliveryCharge: calcDeliveryCharge,
          specialDiscountValue: data.specialDiscountValue === "" ? 0 : Number(data.specialDiscountValue),
          additionalCharges: cleanAdditionalCharges,
          commonRemark: data.commonRemark || "",
          commonRemarkHighlight: !!data.commonRemarkHighlight,
          commonRemarkStyle: data.commonRemarkStyle || "AMBER",
          isRevision: sendIsRevision,
          isUpdate: isEdit || !!targetId,
          revisionNotes: revisionNotes,
          status: resolvedStatus,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to submit quotation")
      }

      const result = await res.json()
      toast.success(
        isRevision
          ? (resolvedStatus === "DRAFT"
              ? `Quotation revision draft saved!`
              : `Quotation revised successfully to Revision #${result.revisionNumber}!`)
          : (isEdit || !!targetId)
            ? (resolvedStatus === "DRAFT"
                ? `Quotation draft updated successfully!`
                : `Quotation ${result.quotationNumber} updated successfully!`)
            : (resolvedStatus === "DRAFT"
                ? `Quotation draft saved successfully!`
                : `Quotation ${result.quotationNumber} created successfully!`)
      )

      if (resolvedStatus === "DRAFT" && result.id) {
        setAutoSavedQuoteId(result.id)
        setExistingQuote(result)
        setIsEdit(true)
        lastSavedDataRef.current = JSON.stringify(data)
      } else {
        const grandSub = deduplicatedFormattedItems.reduce((s, i) => s + (i.quantity * i.unitPrice - (i.discount * i.quantity)), 0)
        setSuccessModalData({
          isOpen: true,
          quotation: {
            id: result.id,
            quotationNumber: result.quotationNumber,
            clientName: selectedClient?.companyName || (selectedClient as any)?.name || "",
            projectName: data.projectName,
            grandTotal: grandSub + calcDeliveryCharge,
            isRevision: isRevision,
            isEdit: isEdit,
            pdfUrl: `/api/quotations/${result.id}/pdf`,
          }
        })
      }
    } catch (error: any) {
      console.error("Error submitting quotation:", error)
      toast.error(error.message || "Failed to submit quotation. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleAutoSave = async () => {
    const currentData = form.getValues()
    if (!currentData.clientId || currentData.items.length === 0) return

    const dataString = JSON.stringify(currentData)
    if (dataString === lastSavedDataRef.current) return

    setIsAutoSaving(true)
    try {
      const { isRevision, isEdit, existingQuote, autoSavedQuoteId, revisionNotes } = autoSaveStateRef.current

      let targetUrl = ""
      let method = ""
      let sendIsRevision = false

      if (autoSavedQuoteId) {
        targetUrl = `/api/quotations/${autoSavedQuoteId}`
        method = "PUT"
        sendIsRevision = false
      } else if (isRevision || isEdit) {
        targetUrl = `/api/quotations/${existingQuote.id}`
        method = "PUT"
        sendIsRevision = isRevision
      } else {
        targetUrl = "/api/quotations"
        method = "POST"
        sendIsRevision = false
      }

      const cleanAdditionalCharges = (currentData.additionalCharges || [])
        .filter((c: any) => (c.name && c.name.trim()) || (c.amount !== "" && Number(c.amount) > 0) || (c.notes && c.notes.trim()))
        .map((c: any) => ({
          name: c.name ? c.name.trim() : "Additional Charge",
          amount: c.amount === "" ? 0 : Number(c.amount),
          notes: c.notes ? c.notes.trim() : "",
        }))

      const totalAdditionalCost = cleanAdditionalCharges.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0)

      const formattedItems = []
      for (const item of currentData.items) {
        const hasManual = item.manualMargin !== undefined && item.manualMargin !== ""
        const finalMargin = hasManual ? item.manualMargin : item.margin
        const price = item.unitPrice === "" ? 0 : Number(item.unitPrice)
        const discPercent = item.discount === "" ? 0 : Number(item.discount)
        const absoluteDiscount = price * (discPercent / 100)

        formattedItems.push({
          ...item,
          productId: item.productId || null,
          quantity: item.quantity === "" ? 1 : Number(item.quantity),
          basePrice: item.basePrice === "" ? 0 : Number(item.basePrice),
          unitPrice: price,
          discount: Number(absoluteDiscount.toFixed(2)),
          margin: finalMargin === "" ? 0 : Number(finalMargin),
        })
      }

      const res = await fetch(targetUrl, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentData,
          preparedById: currentData.preparedById,
          items: formattedItems,
          deliveryCharge: totalAdditionalCost,
          specialDiscountValue: currentData.specialDiscountValue === "" ? 0 : Number(currentData.specialDiscountValue),
          additionalCharges: cleanAdditionalCharges,
          commonRemark: currentData.commonRemark || "",
          commonRemarkHighlight: !!currentData.commonRemarkHighlight,
          commonRemarkStyle: currentData.commonRemarkStyle || "AMBER",
          isRevision: sendIsRevision,
          isUpdate: isEdit || !!autoSavedQuoteId,
          revisionNotes: revisionNotes,
          status: "DRAFT",
        }),
      })

      if (res.ok) {
        const result = await res.json()
        if (result.id) {
          setAutoSavedQuoteId(result.id)
        }
        setLastAutoSavedAt(new Date())
        lastSavedDataRef.current = dataString
      }
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsAutoSaving(false)
    }
  }

  // Track Form Changes for Undo History Stack
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (isHistoryActionRef.current) return
      
      const snapshot = JSON.parse(JSON.stringify(value))
      const lastSnapshot = historyStackRef.current[historyStackRef.current.length - 1]
      
      if (!lastSnapshot || JSON.stringify(snapshot) !== JSON.stringify(lastSnapshot)) {
        historyStackRef.current.push(snapshot)
        if (historyStackRef.current.length > 35) {
          historyStackRef.current.shift()
        }
        redoStackRef.current = []
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  // Undo / Redo Handlers
  const performUndo = () => {
    if (historyStackRef.current.length <= 1) {
      toast.info("Nothing to undo")
      return
    }
    isHistoryActionRef.current = true
    const current = historyStackRef.current.pop()
    if (current) {
      redoStackRef.current.push(current)
    }
    const previous = historyStackRef.current[historyStackRef.current.length - 1]
    if (previous) {
      form.reset(previous)
      toast.info("Undid previous change", { duration: 1500 })
    }
    setTimeout(() => {
      isHistoryActionRef.current = false
    }, 50)
  }

  const performRedo = () => {
    if (redoStackRef.current.length === 0) {
      toast.info("Nothing to redo")
      return
    }
    isHistoryActionRef.current = true
    const nextState = redoStackRef.current.pop()
    if (nextState) {
      historyStackRef.current.push(nextState)
      form.reset(nextState)
      toast.info("Redid change", { duration: 1500 })
    }
    setTimeout(() => {
      isHistoryActionRef.current = false
    }, 50)
  }

  // In-Page PDF Preview Opener
  const handleOpenInPagePreview = async () => {
    setLoadingPreview(true)
    setIsInPagePreviewOpen(true)
    try {
      let targetQuoteId = existingQuote?.id || autoSavedQuoteId || searchParams.get("editId") || searchParams.get("reviseId")
      
      // Save current draft state so PDF renders exact up-to-date inputs
      await handleAutoSave()
      targetQuoteId = autoSavedQuoteId || (form.getValues() as any)?.id || targetQuoteId

      if (targetQuoteId) {
        const res = await fetch(`/api/quotations/${targetQuoteId}`)
        if (res.ok) {
          const data = await res.json()
          setPreviewQuoteData(data)
        }
      }
    } catch (err) {
      console.error("Failed to load PDF preview:", err)
    } finally {
      setLoadingPreview(false)
    }
  }

  // Keyboard Navigation Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputOrTextarea = ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)

      // Ctrl + Z (Undo)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault()
          performRedo()
        } else if (!isInputOrTextarea) {
          e.preventDefault()
          performUndo()
        }
      }
      // Ctrl + Y (Redo)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault()
        performRedo()
      }
      // Ctrl + S (Save Draft)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        onSubmit(form.getValues(), "DRAFT")
      }
      // Ctrl + P (In-Page Preview)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault()
        handleOpenInPagePreview()
      }
      // Shift + ArrowDown (Scroll Down)
      else if (e.shiftKey && e.key === "ArrowDown") {
        e.preventDefault()
        const mainElem = document.querySelector("main.overflow-y-auto") || window
        mainElem.scrollBy({ top: 380, behavior: "smooth" })
      }
      // Shift + ArrowUp (Scroll Up)
      else if (e.shiftKey && e.key === "ArrowUp") {
        e.preventDefault()
        const mainElem = document.querySelector("main.overflow-y-auto") || window
        mainElem.scrollBy({ top: -380, behavior: "smooth" })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [form, existingQuote, autoSavedQuoteId])

  useEffect(() => {
    const subscription = form.watch(() => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave()
      }, 5000) // 5 seconds of inactivity delay
    })

    return () => {
      subscription.unsubscribe()
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [form])

  const handleRequestAccessSubmit = async () => {
    if (!requestAccessClient) return
    setRequestingAccess(true)
    try {
      await handleRequestAccess(requestAccessClient.id, requestAccessClient.name, requestNotes)
      setRequestAccessClient(null)
      setRequestNotes("")
    } catch (err) {
      // handled
    } finally {
      setRequestingAccess(false)
    }
  }

  const isOfficiallyCreated = isEdit && existingQuote && existingQuote.status !== "DRAFT"
  const headerTitle = isRevision ? "Revise Quotation" : isOfficiallyCreated ? "Update Quotation" : isCopy ? "Copy Quotation" : "Create Quotation"
  const primaryButtonText = isRevision ? "Save Revision" : isOfficiallyCreated ? "Update Quotation" : "Create Quotation"
  const watchIncludeSectionHeadings = useWatch({ control: form.control, name: "includeSectionHeadings" }) ?? true

  const calculatedGrandTotal = useMemo(() => {
    const sub = watchItems.reduce((sum: number, item: any) => {
      const qty = item?.quantity === "" ? 0 : Number(item?.quantity) || 0
      const price = item?.unitPrice === "" ? 0 : Number(item?.unitPrice) || 0
      const discVal = item?.discount === "" ? 0 : Number(item?.discount) || 0
      const discType = item?.discountType || "PERCENTAGE"
      const discPerUnit = discType === "PERCENTAGE" ? price * (discVal / 100) : discVal
      const netPrice = Math.max(0, price - discPerUnit)
      return sum + qty * netPrice
    }, 0)

    const addCost = watchAdditionalCharges.reduce((sum: number, c: any) => {
      const amt = c?.amount === "" ? 0 : Number(c?.amount) || 0
      return sum + amt
    }, 0)

    const val = watchSpecialDiscountValue === "" ? 0 : Number(watchSpecialDiscountValue) || 0
    let specDisc = 0
    if (watchSpecialDiscountType && val > 0) {
      specDisc = watchSpecialDiscountType === "PERCENTAGE" ? ((sub + addCost) * val) / 100 : val
    }

    const taxable = Math.max(0, sub + addCost - specDisc)
    const vat = watchVatMode === "INCLUDING" ? 0 : taxable * 0.05
    return watchVatMode === "INCLUDING" ? taxable : taxable + vat
  }, [watchItems, watchAdditionalCharges, watchSpecialDiscountType, watchSpecialDiscountValue, watchVatMode])
  const currentUserRole = userRole || (session?.user as any)?.role || ""
  const isIDC = ["INTERIOR_DESIGN_CONSULTANT", "SALES_EXECUTIVE"].includes(currentUserRole)
  const currentCostingStatus = (existingQuote?.costingStatus || "").toUpperCase()
  const isQuotationLockedForCosting = isIDC && isEdit && ["PENDING_COSTING", "COSTING_IN_PROGRESS", "PARTIALLY_COSTED"].includes(currentCostingStatus)

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-28 px-3 sm:px-6 lg:px-8">
      {/* 1. Header Navigation & Dynamic Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Link href="/quotations">
            <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl shrink-0 shadow-xs hover:bg-muted">
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {headerTitle}
              </h1>
              {isRevision && existingQuote && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold py-0.5 px-2">
                  Rev #{existingQuote.revisionNumber + 1}
                </Badge>
              )}
              {isOfficiallyCreated && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold py-0.5 px-2">
                  Edit Mode
                </Badge>
              )}
              {isCopy && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold py-0.5 px-2">
                  Copy Mode
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {isRevision
                ? `Creating Revision #${existingQuote?.revisionNumber + 1} for ${existingQuote?.quotationNumber}`
                : isOfficiallyCreated
                  ? `Editing Quotation ${existingQuote?.quotationNumber}`
                  : isCopy
                    ? `Generating sequential copy of ${existingQuote?.quotationNumber}`
                    : "Select a client, build custom catalog line items, and generate a quotation PDF."}
            </p>
          </div>
        </div>

        {/* Top Header Desktop Action Bar */}
        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          {/* Real-time Auto-save Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
            {isAutoSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Auto-saving...</span>
              </>
            ) : lastAutoSavedAt ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Saved {lastAutoSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : (
              <span>Draft ready</span>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting || isQuotationLockedForCosting}
            onClick={() => onSubmit(form.getValues(), "DRAFT")}
            className="text-xs h-9 font-medium flex items-center gap-1.5 cursor-pointer bg-background disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Draft</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={handleOpenInPagePreview}
            className="text-xs h-9 font-semibold flex items-center gap-1.5 cursor-pointer border-primary/50 text-primary hover:bg-primary/10 bg-background"
            title="Preview quotation in-page (Ctrl + P)"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>PDF Preview</span>
          </Button>
        </div>
      </div>

      {/* Quotation Workflow Status Timeline */}
      {existingQuote && (
        <QuotationStatusTimeline
          status={existingQuote.status}
          costingStatus={existingQuote.costingStatus}
          createdAt={existingQuote.createdAt}
          preparedByName={existingQuote.preparedBy?.name}
          sentToCostingAt={existingQuote.sentToCostingAt}
          sentToCostingByName={existingQuote.sentToCostingBy?.name}
          costingCompletedAt={existingQuote.costingCompletedAt}
          costedByName={existingQuote.costedBy?.name || existingQuote.assignedEstimator?.name}
          revisionRequestedAt={existingQuote.revisionRequestedAt}
          revisionRequestedByName={existingQuote.revisionRequestedBy?.name}
          revisionReason={existingQuote.revisionReason}
          costingRevisionCycles={existingQuote.costingRevisionCycles}
          approvedAt={existingQuote.approvedAt}
          approvedByName={existingQuote.approvedBy?.name}
        />
      )}

      {/* Costing Completed Banner & Action Options */}
      {existingQuote && existingQuote.costingStatus === "COSTING_COMPLETED" && (
        <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-4 sm:p-5 rounded-2xl flex items-center justify-between flex-wrap gap-4 text-emerald-950 dark:text-emerald-100 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                Costing Process Completed
                <Badge className="bg-emerald-600 text-white font-bold text-[10px] uppercase">
                  Costing Completed
                </Badge>
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 max-w-2xl">
                Base costs have been locked by the Estimator. You can update Margin (%), Negotiation (%), and Discount (%). If costs or specs require review, click &quot;Request Costing Revision&quot;.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRevisionModalOpen(true)}
              className="text-xs h-9 px-4 font-bold border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 cursor-pointer flex items-center gap-1.5"
            >
              <Clock className="h-3.5 w-3.5 text-rose-600" />
              <span>Request Costing Revision</span>
            </Button>
            {["SUPER_ADMIN", "ADMIN", "ESTIMATOR", "SALES_MANAGER"].includes(currentUserRole) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReopenCosting}
                disabled={submitting}
                className="text-xs h-9 px-4 font-semibold border-blue-400 text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                <span>Reopen Costing</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Lock Banner when quotation is locked for costing */}
      {isQuotationLockedForCosting && (
        <div className="bg-amber-500/15 border-2 border-amber-500/40 p-4 sm:p-5 rounded-2xl flex items-center justify-between flex-wrap gap-4 text-amber-950 dark:text-amber-100 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Lock className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                Quotation Locked for Estimator Costing
                <Badge className="bg-amber-600 text-white font-bold text-[10px] uppercase">
                  {existingQuote?.costingStatus}
                </Badge>
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 max-w-2xl">
                This quotation was sent to the Costing Estimator team. Product specifications, quantities, prices, and client details are locked for editing until costing is submitted by the estimator.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/quotations")}
            className="text-xs h-9 px-4 font-semibold border-amber-400 bg-background text-amber-950 hover:bg-amber-100 cursor-pointer"
          >
            Back to Quotations
          </Button>
        </div>
      )}

      {/* Context Banner Alerts */}
      {isRevision && existingQuote && (
        <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 rounded-xl p-3.5 sm:p-4 flex items-start gap-3 text-purple-950 dark:text-purple-300">
          <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold">Revising Quotation {existingQuote.quotationNumber}</span>
            <p className="text-muted-foreground mt-0.5">
              Creating Revision #{existingQuote.revisionNumber + 1}. The updated compiled PDF will be uploaded to SharePoint as the active revision while logging revision history.
            </p>
          </div>
        </div>
      )}

      {isEdit && existingQuote && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 sm:p-4 flex items-start gap-3 text-amber-950 dark:text-amber-300">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold">Updating Quotation {existingQuote.quotationNumber}</span>
            <p className="text-muted-foreground mt-0.5">
              Modifying existing quotation draft directly. Changes will overwrite current draft data and update the compiled PDF on SharePoint without incrementing revision number.
            </p>
          </div>
        </div>
      )}

      {isCopy && existingQuote && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3.5 sm:p-4 flex items-start gap-3 text-blue-950 dark:text-blue-300">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold">Creating Copy of Quotation {existingQuote.quotationNumber}</span>
            <p className="text-muted-foreground mt-0.5">
              Generating a sequential copy of Quotation {existingQuote.quotationNumber}. Line items, client info, and terms & conditions have been copied into draft.
            </p>
          </div>
        </div>
      )}

      {loadingOptions ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-card border rounded-2xl shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">Loading quotation builder, clients catalog & pricing configurations...</p>
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => onSubmit(data, "SUBMITTED"))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const target = e.target as HTMLElement
                if (
                  target.tagName === "TEXTAREA" ||
                  target.closest(".ProseMirror") ||
                  target.closest("[contenteditable]")
                ) {
                  return
                }
                e.preventDefault()
              }
            }}
            className="space-y-6"
          >
            {/* Revision Notes Card */}
            {isRevision && (
              <Card className="border border-purple-200 dark:border-purple-900/40 bg-purple-50/10 shadow-xs">
                <CardHeader className="py-3 px-4 sm:px-6 bg-purple-50/20 border-b border-purple-100">
                  <CardTitle className="text-xs sm:text-sm text-purple-800 dark:text-purple-300 font-semibold uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    Revision Notes <span className="text-destructive">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <Textarea
                    placeholder="Describe the specific updates made in this revision (e.g., 'Discounted workstation line items by 5% as per client request')."
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    className="min-h-[80px] bg-background text-xs sm:text-sm"
                  />
                </CardContent>
              </Card>
            )}

            {/* CARD 1: Quotation Information (Client & Project Metadata) */}
            <Card className="shadow-xs border-border/80 rounded-xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-3 px-4 sm:px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  1. Quotation & Client Details
                </CardTitle>
                {selectedClientObj && (
                  <Badge variant="outline" className="text-[11px] font-medium bg-background border-border/80">
                    Client ID: {selectedClientObj.clientId || selectedClientObj.id}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {/* Client Block Alert if Blocked */}
                {selectedClientObj && selectedClientObj.status !== "Approved" && !isRevision && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 flex items-start gap-3 text-destructive animate-in fade-in">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-semibold">Quotation Creation Blocked</span>
                      <p className="text-muted-foreground mt-0.5">
                        {selectedClientObj.status === "Pending Approval"
                          ? "This client is pending approval. Please contact Admin/Manager before creating quotation."
                          : "This client has been rejected. Please contact Admin/Manager before creating quotation."}
                      </p>
                    </div>
                  </div>
                )}

                {/* 4-Column Responsive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {/* Client Selector */}
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col lg:col-span-2">
                        <FormLabel className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span>Client Company <span className="text-destructive">*</span></span>
                          {canCreateClient && (
                            <button
                              type="button"
                              onClick={() => setIsQuickAddClientOpen(true)}
                              className="text-[11px] text-primary hover:underline font-normal flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="h-3 w-3" /> Quick Add Client
                            </button>
                          )}
                        </FormLabel>
                        <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
                          <PopoverTrigger
                            render={
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  disabled={isRevision}
                                  className={cn(
                                    "w-full justify-between font-normal bg-background h-10 text-xs sm:text-sm border-border/80 hover:border-primary/50",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <span className="truncate">
                                    {field.value
                                      ? clients.find((client) => client.id === field.value)?.companyName
                                      : "Search and select client company..."}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            }
                          />
                          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[540px] md:w-[620px] min-w-[360px] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput 
                                placeholder="Search client name, ID, contact..." 
                                value={clientSearch}
                                onValueChange={setClientSearch}
                                className="h-10 text-xs"
                              />
                              <CommandList className="max-h-[300px]">
                                <CommandEmpty className="p-3 text-center text-xs text-muted-foreground">
                                  No client found.
                                </CommandEmpty>
                                <CommandGroup>
                                  {canCreateClient && (
                                    <CommandItem
                                      value="--quick-add-client--"
                                      onSelect={() => {
                                        setIsQuickAddClientOpen(true)
                                        setIsClientPopoverOpen(false)
                                        setClientSearch("")
                                      }}
                                      className="text-primary font-medium flex items-center gap-1.5 cursor-pointer text-xs p-2.5"
                                    >
                                      <Plus className="h-4 w-4 text-primary" />
                                      <span>+ Quick Add New Client...</span>
                                    </CommandItem>
                                  )}
                                  {(() => {
                                    let matchedClients = clients.filter((c) => c.status === "Approved")
                                    
                                    if (clientSearch.trim()) {
                                      const searchLower = clientSearch.toLowerCase().trim()
                                      matchedClients = matchedClients.filter(c => {
                                        const searchStr = `${c.companyName} ${c.clientId} ${(c as any).contactPerson || ""} ${(c as any).trnNumber || ""}`.toLowerCase()
                                        return searchStr.includes(searchLower)
                                      })
                                    }
                                    
                                    const MAX_RESULTS = 50
                                    matchedClients = matchedClients.slice(0, MAX_RESULTS)

                                    const isExcluded = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(userRole)
                                    
                                    const assigned = matchedClients.filter(c => {
                                      const isUserAssigned = c.salespersonId === (session?.user as any)?.id || c.assignments?.some((a: any) => a.userId === (session?.user as any)?.id)
                                      return isUserAssigned || isExcluded
                                    })
                                    const unassigned = matchedClients.filter(c => {
                                      const isUserAssigned = c.salespersonId === (session?.user as any)?.id || c.assignments?.some((a: any) => a.userId === (session?.user as any)?.id)
                                      return !(isUserAssigned || isExcluded)
                                    })

                                    const renderClientItem = (client: typeof clients[0], canSelect: boolean) => {
                                      const isUserAssigned = client.salespersonId === (session?.user as any)?.id || client.assignments?.some((a: any) => a.userId === (session?.user as any)?.id)
                                      const activeReq = client.accessRequests?.[0]
                                      const isRequested = activeReq?.status === "Requested"
                                      const isRejected = activeReq?.status === "Rejected"

                                      const statusText = canSelect
                                        ? (isUserAssigned ? "Assigned to You" : (client.assignments?.[0]?.user?.name ? `Assigned to ${client.assignments[0].user.name}` : "Assigned"))
                                        : (() => {
                                            if (isRequested) return "Access Requested"
                                            if (isRejected) return "Request Rejected"
                                            return "Not Assigned"
                                          })()
                                          
                                      const isSelected = field.value === client.id

                                      return (
                                        <CommandItem
                                          key={client.id}
                                          value={`${client.companyName} ${client.clientId}`}
                                          onSelect={() => {
                                            if (!canSelect) return
                                            form.setValue("clientId", client.id)
                                            setIsClientPopoverOpen(false)
                                            setClientSearch("")
                                          }}
                                          className={cn(
                                            "flex flex-col items-start p-2.5 border-b last:border-b-0 border-muted/50 aria-selected:bg-accent cursor-pointer",
                                            !canSelect && "opacity-85 cursor-default hover:bg-transparent"
                                          )}
                                        >
                                          <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                              <Check
                                                className={cn(
                                                  "h-4 w-4 text-primary shrink-0",
                                                  isSelected ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              <span className="font-semibold text-xs text-foreground">{client.companyName}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              {canSelect ? (
                                                isUserAssigned && (
                                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5 font-normal">
                                                    Assigned
                                                  </Badge>
                                                )
                                              ) : (
                                                <>
                                                  {isRequested && (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 px-1.5 font-normal">
                                                      Requested
                                                    </Badge>
                                                  )}
                                                  {isRejected && (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] py-0 px-1.5 font-normal">
                                                      Rejected
                                                    </Badge>
                                                  )}
                                                  {!isRequested && !isRejected && (
                                                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] py-0 px-1.5 font-normal">
                                                      Unassigned
                                                    </Badge>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          </div>

                                          <div className="text-[11px] text-muted-foreground ml-6 mt-0.5 flex items-center gap-1">
                                            <span className="font-mono">{client.clientId}</span>
                                            <span>·</span>
                                            <span>{client.clientType || "Project"}</span>
                                            <span>·</span>
                                            <span>{statusText}</span>
                                          </div>

                                          {!canSelect && (() => {
                                            if (isRequested) {
                                              return (
                                                <div 
                                                  className="mt-2.5 w-full p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-950 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                                    <span className="truncate text-[11px] font-medium">Access request is pending approval.</span>
                                                  </div>
                                                  <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 border-amber-300/80 text-[10px] font-semibold py-0.5 px-2 shrink-0">
                                                    Pending
                                                  </Badge>
                                                </div>
                                              )
                                            }
                                            if (isRejected) {
                                              const isRequestAgainAllowed = client.allowRequestAgain !== false
                                              return (
                                                <div 
                                                  className="mt-2.5 w-full p-2.5 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center justify-between gap-3 shadow-xs"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                    <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                                    <span className="truncate text-[11px] font-medium">Access request was rejected.</span>
                                                  </div>
                                                  {isRequestAgainAllowed && (
                                                    <Button
                                                      type="button"
                                                      size="sm"
                                                      variant="outline"
                                                      className="h-7 px-3 text-[11px] font-semibold border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer shrink-0 transition-all active:scale-95"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        setRequestAccessClient({ id: client.id, name: client.companyName })
                                                        setRequestNotes("")
                                                      }}
                                                    >
                                                      <RotateCcw className="h-3 w-3 mr-1" />
                                                      Request Again
                                                    </Button>
                                                  )}
                                                </div>
                                              )
                                            }
                                            return (
                                              <div 
                                                className="mt-2.5 w-full p-2.5 bg-primary/5 dark:bg-primary/15 border border-primary/25 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                  <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
                                                  <span className="truncate text-[11px] text-muted-foreground font-medium">Unassigned Client · Request access to create quotations</span>
                                                </div>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  className="h-7 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer shrink-0 transition-all active:scale-95"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    setRequestAccessClient({ id: client.id, name: client.companyName })
                                                    setRequestNotes("")
                                                  }}
                                                >
                                                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                                                  Request Access
                                                </Button>
                                              </div>
                                            )
                                          })()}
                                        </CommandItem>
                                      )
                                    }

                                    return (
                                      <>
                                        {assigned.length > 0 && (
                                          <CommandGroup heading="Assigned Clients">
                                            {assigned.map(c => renderClientItem(c, true))}
                                          </CommandGroup>
                                        )}
                                        {unassigned.length > 0 && (
                                          <CommandGroup heading="Unassigned / Other Clients">
                                            {unassigned.map(c => renderClientItem(c, false))}
                                          </CommandGroup>
                                        )}
                                      </>
                                    )
                                  })()}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Project Name */}
                  <FormField
                    control={form.control}
                    name="projectName"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                        <FormLabel className="text-xs font-semibold text-foreground">
                          Project Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Executive Office Renovation Phase 1" {...field} disabled={isRevision} className="h-10 text-xs sm:text-sm bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Customer Segment */}
                  <FormField
                    control={form.control}
                    name="customerSegment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-foreground">Customer Segment</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled>
                          <FormControl>
                            <SelectTrigger className="bg-muted/40 h-10 text-xs sm:text-sm">
                              <SelectValue placeholder="Select customer segment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Interior">Interior (Prefix: I)</SelectItem>
                            <SelectItem value="Dealer">Dealer (Prefix: D)</SelectItem>
                            <SelectItem value="Project">Direct (Prefix: P)</SelectItem>
                            <SelectItem value="Special">Online (Prefix: P)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date Fields */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-foreground">Issue Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-10 text-xs bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="validityDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-foreground">Valid Until</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-10 text-xs bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-foreground">Expected Delivery</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-10 text-xs bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Selected Client Summary Card */}
                {selectedClientObj && (
                  <div className="p-3.5 border rounded-xl bg-muted/20 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Contact Person:</span>
                      <span className="font-semibold text-foreground">{selectedClientObj.contactPerson || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">TRN Number:</span>
                      <span className="font-mono font-semibold text-foreground">{selectedClientObj.trn || "Not Registered"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Phone / Contact:</span>
                      <span className="font-medium text-foreground">{selectedClientObj.phone || selectedClientObj.email || "-"}</span>
                    </div>
                  </div>
                )}

                {/* Consultant Select Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 border-t pt-4">
                  {/* Consultant Select */}
                  <FormField
                    control={form.control}
                    name="preparedById"
                    render={({ field }) => {
                      const selectedConsultant = users.find(u => u.id === field.value)
                      return (
                        <FormItem className="md:col-span-1">
                          <FormLabel className="text-xs font-semibold text-foreground flex items-center justify-between">
                            <span>Interior Design Consultant <span className="text-destructive">*</span></span>
                            {selectedClientObj?.salespersonId && (
                              <span className="text-[10px] text-emerald-600 font-medium">Assigned</span>
                            )}
                          </FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(val)}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 text-xs sm:text-sm bg-background">
                                <SelectValue placeholder="Select consultant">
                                  {selectedConsultant ? `${selectedConsultant.name || selectedConsultant.email}${selectedConsultant.role ? ` (${selectedConsultant.role.replace(/_/g, " ")})` : ''}` : (field.value && users.length === 0 ? "Loading consultant..." : "Select consultant")}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[360px] max-w-[550px] shadow-lg">
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id} className="text-xs py-2 cursor-pointer">
                                  {u.name || u.email} {u.designation ? `(${u.designation})` : u.role ? `(${u.role})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedConsultant && (
                            <div className="mt-2 p-3 border rounded-xl bg-muted/20 text-xs space-y-1 animate-in fade-in">
                              <div className="flex justify-between items-center font-semibold text-foreground">
                                <span>{selectedConsultant.name || selectedConsultant.email}</span>
                                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                  {selectedConsultant.designation || selectedConsultant.role || "Consultant"}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-[11px] pt-0.5">
                                {selectedConsultant.phone && <span>Phone: {selectedConsultant.phone}</span>}
                                {selectedConsultant.email && <span>Email: {selectedConsultant.email}</span>}
                              </div>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />
                </div>

                {/* Sales Representative Details Section */}
                <div className="space-y-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="includeSalesAgent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3.5 bg-muted/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-xs sm:text-sm font-semibold cursor-pointer text-foreground">
                            Include Sales Representative Info on Exported PDF
                          </FormLabel>
                          <p className="text-[11px] text-muted-foreground">
                            Toggle to specify sales agent contact info on quotation header/footer.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("includeSalesAgent") && (
                    <div className="p-4 rounded-xl border bg-card space-y-4 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="salesAgentName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-foreground">Sales Rep Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. John Smith" className="h-9 text-xs bg-background" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="salesAgentTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-foreground">Title / Designation</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Senior Sales Consultant" className="h-9 text-xs bg-background" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Contact Numbers List */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground block">Contact Phone Numbers</label>
                        {contactNumbers.map((phone, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              value={phone}
                              onChange={(e) => {
                                const updated = [...contactNumbers]
                                updated[idx] = e.target.value
                                setContactNumbers(updated)
                                form.setValue("salesAgentContactNumber", updated.filter(Boolean).join(", "))
                              }}
                              placeholder={`Phone #${idx + 1}`}
                              className="h-9 text-xs bg-background flex-1"
                            />
                            {contactNumbers.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const updated = contactNumbers.filter((_, i) => i !== idx)
                                  setContactNumbers(updated)
                                  form.setValue("salesAgentContactNumber", updated.filter(Boolean).join(", "))
                                }}
                                className="h-8 w-8 text-destructive shrink-0 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setContactNumbers([...contactNumbers, ""])}
                          className="text-[11px] h-7 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Add Phone Number
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Company Seal Toggle Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="includeCompanySeal"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3.5 bg-muted/20">
                        <div className="space-y-0.5 pr-2">
                          <FormLabel className="text-xs sm:text-sm font-semibold cursor-pointer text-foreground">
                            Include Company Seal on Quotation
                          </FormLabel>
                          <p className="text-[11px] text-muted-foreground">
                            Toggle to show or hide the company seal in the quotation preview and exported PDF.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="includeCategoryName"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3.5 bg-muted/20">
                        <div className="space-y-0.5 pr-2">
                          <FormLabel className="text-xs sm:text-sm font-semibold cursor-pointer text-foreground">
                            Show Product Category on Quotation
                          </FormLabel>
                          <p className="text-[11px] text-muted-foreground">
                            Toggle to show or hide product category badges (e.g. PREMIUM CHAIRS) on preview and PDF.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="includeSectionHeadings"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3.5 bg-muted/20">
                        <div className="space-y-0.5 pr-2">
                          <FormLabel className="text-xs sm:text-sm font-semibold cursor-pointer text-foreground flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            Enable Section Headings on Quotation
                          </FormLabel>
                          <p className="text-[11px] text-muted-foreground">
                            Toggle to enable or disable grouping products into section headings (e.g. Section 1, Section 2) in the editor, preview, and PDF.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Materials & Finishes Toggle & Selector Section */}
                <div className="space-y-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="includeMaterialsFinishes"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3.5 bg-muted/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-xs sm:text-sm font-semibold cursor-pointer text-foreground flex items-center gap-2">
                            <Palette className="h-4 w-4 text-orange-500" />
                            Include Materials & Finishes Schedule
                          </FormLabel>
                          <p className="text-[11px] text-muted-foreground">
                            Default: OFF. When enabled, selected material swatch details will be appended as a dedicated Materials & Finishes Schedule in the PDF.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {watchIncludeMaterialsFinishes && (
                    <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 space-y-4 animate-in fade-in duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                            <Palette className="h-4 w-4 text-orange-500" />
                            Selected Material Swatches ({watchSelectedMaterials.length})
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Select materials from library to include swatch cards in the quotation output.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsMaterialPickerOpen(true)}
                          className="text-xs h-8 flex items-center gap-1.5 cursor-pointer bg-background"
                        >
                          <Plus className="h-3.5 w-3.5" /> Select Materials ({materialsLibrary.length} available)
                        </Button>
                      </div>

                      {watchSelectedMaterials.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-background/50">
                          No materials selected yet. Click <b>Select Materials</b> to choose swatches from your library.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {watchSelectedMaterials.map((mat: any, idx: number) => (
                            <div key={mat.id || idx} className="rounded-lg border bg-background p-3 flex items-center gap-3 relative group shadow-xs">
                              <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                                {mat.swatchUrl ? (
                                  <img src={mat.swatchUrl} alt={mat.name} className="h-full w-full object-cover" />
                                ) : (
                                  <Palette className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground border">
                                    {mat.code}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground truncate">{mat.category}</span>
                                </div>
                                <p className="text-xs font-semibold text-foreground truncate mt-0.5">{mat.name}</p>
                                {mat.brand && <p className="text-[10px] text-orange-500 font-medium truncate">{mat.brand}</p>}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = watchSelectedMaterials.filter((m: any) => (m.id || m.code) !== (mat.id || mat.code))
                                  form.setValue("selectedMaterials", updated, { shouldDirty: true, shouldValidate: true })
                                }}
                                className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                                title="Remove swatch"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: Line Items Catalog & Product Sections */}
            <Card className="shadow-xs border-border/80 rounded-xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-3 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    2. Quotation Line Items ({fields.length} Products)
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {watchIncludeSectionHeadings && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBatch()}
                      className="text-xs h-8 flex items-center gap-1.5 cursor-pointer bg-background"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Section
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setActiveLineIndex(fields.length)
                      setIsQuickAddOpen(true)
                    }}
                    className="text-xs h-8 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Quick Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {/* Batches Loop */}
                {batches.map((batch, batchIdx) => {
                  return (
                    <div
                      key={batch.id}
                      onDragOver={(e) => handleBatchDragOver(e, batch.id)}
                      onDrop={(e) => handleBatchDrop(e, batch.id, batch.name)}
                      className={cn(
                        "space-y-4 transition-all",
                        watchIncludeSectionHeadings && "rounded-xl border p-4 bg-muted/10",
                        dragOverBatchId === batch.id && "border-primary border-dashed bg-primary/5 shadow-md"
                      )}
                    >
                      {/* Section Header */}
                      {watchIncludeSectionHeadings && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            draggable
                            onDragStart={(e) => handleBatchDragStart(e, batch.id)}
                            onDragEnd={handleDragEnd}
                            className="batch-drag-handle cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
                            title="Drag section to reorder"
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>
                          <div className="max-w-md flex-1">
                            <BatchHeadingInput
                              value={batch.name}
                              onChange={(val) => {
                                const oldName = batch.name
                                const updatedBatches = batches.map(b => b.id === batch.id ? { ...b, name: val } : b)
                                setBatches(updatedBatches)

                                fields.forEach((_, idx) => {
                                  const currentHeading = form.getValues(`items.${idx}.batchHeading`)
                                  if ((oldName === "General Items" && !currentHeading) || currentHeading === oldName) {
                                    form.setValue(`items.${idx}.batchHeading`, val)
                                  }
                                })
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                          <BatchSectionSubtotal control={form.control} batchName={batch.name} fields={fields} />

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddItemToBatch(batch.name)}
                            className="text-[11px] h-7 flex items-center gap-1 cursor-pointer bg-background"
                          >
                            <Plus className="h-3 w-3" /> Add Item
                          </Button>

                          {batches.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSection(batch.id)}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete Section"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                      {/* Line Item Cards in Section */}
                      <div className="space-y-4">
                        {fields.map((fieldItem, index) => (
                          <QuotationItemCard
                            key={fieldItem.id}
                            index={index}
                            fieldItem={fieldItem}
                            control={form.control}
                            form={form}
                            batchName={batch.name}
                            batches={batches}
                            products={products}
                            watchSegment={watchCustomerSegment}
                            dbCategories={dbCategories}
                            userRole={userRole}
                            isRevision={isRevision}
                            draggedIndex={draggedIndex}
                            dragOverIndex={dragOverIndex}
                            handleDragStart={handleDragStart}
                            handleDragOver={handleDragOver}
                            handleDrop={handleDrop}
                            handleDragEnd={handleDragEnd}
                            handleDuplicateItem={handleDuplicateItem}
                            handleMoveItem={handleMoveItem}
                            remove={remove}
                            handleProductSelect={handleProductSelect}
                            handleVariantSelect={handleVariantSelect}
                            fieldsLength={fields.length}
                            isConfiguratorEnabled={isConfiguratorEnabled}
                          />
                        ))}
                      </div>

                      {/* Section Bottom Action Controls */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-2.5 pt-3 border-t border-border/50">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddItemToBatch(batch.name)}
                          className="text-xs h-8 flex items-center gap-1.5 cursor-pointer bg-background hover:bg-muted"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Product to {batch.name}
                        </Button>
                      </div>
                    </div>
                  )
                })}

                {/* Bottom Add Section Action Block */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddBatch()}
                    className="w-full sm:w-auto px-6 h-9 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer border-dashed border-primary/50 text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add New Section
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2.5: REMARKS */}
            {(() => {
              const watchCommonRemarkHighlight = form.watch("commonRemarkHighlight")
              const watchCommonRemarkStyle = form.watch("commonRemarkStyle") || "AMBER"
              const currentStyle = watchCommonRemarkHighlight ? watchCommonRemarkStyle : "NONE"

              const getStyleClasses = (style: string) => {
                switch (style) {
                  case "AMBER":
                    return {
                      card: "border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/20 ring-1 ring-amber-500/30",
                      header: "bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30",
                      icon: "text-amber-600 dark:text-amber-400",
                      textarea: "border-amber-400/60 focus-visible:ring-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 font-medium",
                    }
                  case "BLUE":
                    return {
                      card: "border-blue-500/50 bg-blue-500/5 dark:bg-blue-950/20 ring-1 ring-blue-500/30",
                      header: "bg-blue-500/10 dark:bg-blue-950/40 border-blue-500/30",
                      icon: "text-blue-600 dark:text-blue-400",
                      textarea: "border-blue-400/60 focus-visible:ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 font-medium",
                    }
                  case "EMERALD":
                    return {
                      card: "border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30",
                      header: "bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30",
                      icon: "text-emerald-600 dark:text-emerald-400",
                      textarea: "border-emerald-400/60 focus-visible:ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 font-medium",
                    }
                  case "ROSE":
                    return {
                      card: "border-rose-500/50 bg-rose-500/5 dark:bg-rose-950/20 ring-1 ring-rose-500/30",
                      header: "bg-rose-500/10 dark:bg-rose-950/40 border-rose-500/30",
                      icon: "text-rose-600 dark:text-rose-400",
                      textarea: "border-rose-400/60 focus-visible:ring-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 font-medium",
                    }
                  case "NONE":
                    return {
                      card: "border-slate-300 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/60 ring-1 ring-slate-400/30",
                      header: "bg-slate-200/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700",
                      icon: "text-slate-600 dark:text-slate-400",
                      textarea: "border-slate-300 dark:border-slate-700 focus-visible:ring-slate-500 bg-slate-50/80 dark:bg-slate-900/80 text-foreground font-medium",
                    }
                  default:
                    return {
                      card: "border-border/80",
                      header: "bg-muted/30",
                      icon: "text-primary",
                      textarea: "bg-background",
                    }
                }
              }

              const styleClasses = getStyleClasses(currentStyle)

              return (
                <Card className={cn(
                  "shadow-xs border-border/80 rounded-xl overflow-hidden transition-all duration-200",
                  styleClasses.card
                )}>
                  <CardHeader className={cn(
                    "border-b py-3 px-4 sm:px-6 flex flex-row items-center justify-between gap-4 flex-wrap",
                    styleClasses.header
                  )}>
                    <CardTitle className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className={cn("h-4 w-4", styleClasses.icon)} />
                      <span>REMARKS</span>
                      <span className="text-[10px] normal-case text-muted-foreground font-normal hidden sm:inline">(Optional remark displayed below products)</span>
                    </CardTitle>

                    {/* Highlight Switch & Marker Style Configurator Controls */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <FormField
                        control={form.control}
                        name="commonRemarkHighlight"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0 cursor-pointer">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(val) => {
                                  field.onChange(val)
                                  if (val && !form.getValues("commonRemarkStyle")) {
                                    form.setValue("commonRemarkStyle", "AMBER")
                                  }
                                }}
                                className="data-[state=checked]:bg-primary"
                              />
                            </FormControl>
                            <FormLabel className="text-xs font-semibold cursor-pointer flex items-center gap-1.5 text-foreground select-none">
                              <Highlighter className={cn("h-3.5 w-3.5", field.value ? styleClasses.icon : "text-muted-foreground")} />
                              <span>Highlight Remark</span>
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      {/* Configurable Highlight Marker Style Options */}
                      {watchCommonRemarkHighlight && (
                        <div className="flex items-center gap-1.5 bg-background/90 p-1 rounded-lg border shadow-2xs">
                          {[
                            { id: "AMBER", label: "Yellow / Amber", color: "bg-amber-400 border-amber-500", ring: "ring-amber-400" },
                            { id: "BLUE", label: "Blue / Info", color: "bg-blue-400 border-blue-500", ring: "ring-blue-400" },
                            { id: "EMERALD", label: "Green / Success", color: "bg-emerald-400 border-emerald-500", ring: "ring-emerald-400" },
                            { id: "ROSE", label: "Red / Urgent", color: "bg-rose-400 border-rose-500", ring: "ring-rose-400" },
                            { id: "NONE", label: "Without Color / Standard Slate", color: "bg-slate-200 dark:bg-slate-700 border-slate-400 text-slate-700 dark:text-slate-200", ring: "ring-slate-400" },
                          ].map((marker) => {
                            const isSelected = watchCommonRemarkStyle === marker.id
                            return (
                              <button
                                key={marker.id}
                                type="button"
                                onClick={() => form.setValue("commonRemarkStyle", marker.id, { shouldDirty: true })}
                                title={`Marker style: ${marker.label}`}
                                className={cn(
                                  "w-6 h-6 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center shrink-0",
                                  marker.color,
                                  isSelected ? `scale-110 ring-2 ${marker.ring} ring-offset-1` : "opacity-60 hover:opacity-100"
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3 text-slate-950 font-bold" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6 space-y-3">
                    <FormField
                      control={form.control}
                      name="commonRemark"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Enter any remarks, overall product notes, or special instructions to be displayed below the product list..."
                              rows={3}
                              className={cn(
                                "text-xs bg-background transition-colors resize-y font-sans",
                                styleClasses.textarea
                              )}
                              {...field}
                            />
                          </FormControl>
                          <p className="text-[11px] text-muted-foreground">
                            This remark section will appear directly below the product list on the quotation preview and exported PDF document under the heading "REMARKS".
                          </p>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )
            })()}

            {/* CARD 3: Disclaimers & Terms & Conditions Manager */}
            <Card className="shadow-xs border-border/80 rounded-xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-3 px-4 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  3. Disclaimers & Quotation Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {/* Quotation Disclaimers Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-xs font-semibold text-foreground uppercase">Quotation Disclaimers</h4>
                    <span className="text-[11px] text-muted-foreground">Appears above Terms on exported PDF</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <FormField
                        control={form.control}
                        name="disclaimerTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-foreground">Heading Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Disclaimers" className="bg-background text-xs h-9" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name="disclaimer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-foreground">Disclaimer Content (Optional)</FormLabel>
                            <FormControl>
                              <Textarea rows={2} placeholder="Enter disclaimers... Leave empty to omit" className="bg-background text-xs" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Quotation Terms & Conditions Section */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-2">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground uppercase">Terms & Conditions</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Customize, reorder, or add custom terms for this quotation. Order below will be reflected on PDF.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetTermsToDefault}
                      className="text-xs h-8 flex items-center gap-1.5 cursor-pointer shrink-0 bg-background"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reset to Defaults
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {watchTermsConditions && watchTermsConditions.length > 0 ? (
                      watchTermsConditions.map((termRaw, termIdx) => {
                        const isHighlighted = termRaw.includes("[HIGHLIGHT]")
                        const cleanTermText = termRaw.replace(/\[HIGHLIGHT\]\s*/g, "")

                        return (
                          <div 
                            key={termIdx} 
                            className={cn(
                              "flex items-start gap-2 bg-card border rounded-xl p-3 shadow-2xs transition-all",
                              isHighlighted 
                                ? "bg-amber-500/10 border-amber-500/50 dark:bg-amber-950/30 shadow-xs" 
                                : "hover:border-primary/40"
                            )}
                          >
                            {/* Reorder Buttons */}
                            <div className="flex flex-col gap-1 pt-1 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={termIdx === 0}
                                onClick={() => handleMoveTerm(termIdx, -1)}
                                className="h-6 w-6 text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-30"
                                title="Move Up"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={termIdx === watchTermsConditions.length - 1}
                                onClick={() => handleMoveTerm(termIdx, 1)}
                                className="h-6 w-6 text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-30"
                                title="Move Down"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <span className="text-xs font-bold text-muted-foreground pt-2.5 w-6 text-center shrink-0 font-mono">
                              {(termIdx + 1).toString().padStart(2, '0')}.
                            </span>

                            <div className="flex-1 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                {isHighlighted ? (
                                  <Badge variant="outline" className="bg-amber-500 text-white border-amber-600 text-[10px] font-bold py-0.5 px-2 flex items-center gap-1 shadow-2xs">
                                    <Sparkles className="h-3 w-3 fill-white" /> Highlighted Clause
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-medium">Standard Clause</span>
                                )}

                                <Button
                                  type="button"
                                  variant={isHighlighted ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleToggleHighlightTerm(termIdx)}
                                  className={cn(
                                    "h-6 px-2 text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition-all",
                                    isHighlighted 
                                      ? "bg-amber-500 hover:bg-amber-600 text-white shadow-2xs border-amber-600" 
                                      : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 hover:border-amber-400"
                                  )}
                                  title={isHighlighted ? "Remove highlight" : "Highlight this point"}
                                >
                                  <Sparkles className={cn("h-3 w-3", isHighlighted ? "fill-white text-white" : "text-amber-500")} />
                                  {isHighlighted ? "Highlighted" : "Highlight"}
                                </Button>
                              </div>

                              <Textarea
                                value={cleanTermText}
                                rows={2}
                                onChange={(e) => handleEditTerm(termIdx, e.target.value)}
                                placeholder="e.g. Validity: Valid for 30 days..."
                                className={cn(
                                  "bg-background text-xs min-h-[48px] leading-relaxed transition-all",
                                  isHighlighted && "border-amber-500/60 bg-amber-50/50 dark:bg-amber-950/30 font-normal"
                                )}
                              />
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveTerm(termIdx)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer mt-1"
                              title="Remove term"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-6 border border-dashed rounded-lg bg-muted/10 text-xs text-muted-foreground">
                        No terms added. Click "Add Term" below to add custom terms.
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTerm}
                    className="text-xs h-8 flex items-center gap-1.5 cursor-pointer mt-2 bg-background"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Term / Condition
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* CARD 4: Additional Costs & Financial Summary */}
            <Card className="shadow-xs border-border/80 rounded-xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-3 px-4 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  4. Additional Costs & Financial Calculation Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
                  {/* Left Column: Additional Costs Repeater */}
                  <div className="lg:col-span-7 space-y-4">
                    <h4 className="text-xs font-semibold text-foreground uppercase border-b pb-2 flex items-center justify-between">
                      <span>Additional Costs &amp; Custom Fees</span>
                      <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                        {additionalFields.length} Fee(s)
                      </Badge>
                    </h4>
                    
                    <div className="space-y-3 p-4 rounded-xl border bg-card shadow-2xs">
                      {additionalFields.map((field, index) => {
                        return (
                          <div key={field.id} className="p-3 bg-muted/20 border rounded-xl space-y-2">
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAdditional(index)}
                                className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                                title="Remove cost item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>

                              <div className="flex-1">
                                <FormField
                                  control={form.control}
                                  name={`additionalCharges.${index}.name`}
                                  render={({ field }) => (
                                    <FormControl>
                                      <Input
                                        placeholder="Cost Name (e.g. Delivery & Unloading, Installation Fee, Freight)"
                                        className="h-9 bg-background text-xs font-semibold"
                                        {...field}
                                      />
                                    </FormControl>
                                  )}
                                />
                              </div>

                              <div className="w-36 sm:w-44">
                                <FormField
                                  control={form.control}
                                  name={`additionalCharges.${index}.amount`}
                                  render={({ field }) => {
                                    const val = field.value === 0 ? "" : field.value
                                    return (
                                      <FormControl>
                                        <div className="relative flex items-center">
                                          <span className="absolute left-3 text-[10px] font-bold text-muted-foreground font-mono">AED</span>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="h-9 pl-10 pr-3 font-mono text-right text-xs font-bold bg-background w-full"
                                            value={val}
                                            onChange={(e) => {
                                              const rawVal = e.target.value
                                              const numVal = rawVal === "" ? "" : parseFloat(rawVal) || 0
                                              field.onChange(numVal)
                                            }}
                                          />
                                        </div>
                                      </FormControl>
                                    )
                                  }}
                                />
                              </div>
                            </div>

                            {/* Optional Notes Sub-field */}
                            <div className="pl-12">
                              <FormField
                                control={form.control}
                                name={`additionalCharges.${index}.notes`}
                                render={({ field }) => (
                                  <FormControl>
                                    <Input
                                      placeholder="Optional Notes (e.g., Heavy crane unloading, weekend site access fee...)"
                                      className="h-7 bg-background text-[11px] text-muted-foreground italic border-dashed"
                                      {...field}
                                    />
                                  </FormControl>
                                )}
                              />
                            </div>
                          </div>
                        )
                      })}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendAdditional({ name: "", amount: "", notes: "" })}
                        className="mt-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-background"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Cost Item
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: Financial Calculations Summary */}
                  <div className="lg:col-span-5 space-y-4">
                    <h4 className="text-xs font-semibold text-foreground uppercase border-b pb-2">Calculation Summary</h4>
                    <CalculationSummaryPanel control={form.control} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      )}

      {/* STICKY FLOATING ACTION DOCK (MOBILE & DESKTOP) */}
      <StickyFooterToolbar
        grandTotal={calculatedGrandTotal}
        submitting={submitting}
        primaryButtonText={primaryButtonText}
        onSubmit={onSubmit}
        onInvalid={onInvalid}
        form={form}
        handleSendToCostingClick={handleSendToCostingClick}
        pendingCostingCount={pendingCostingCount}
        hasPendingCostingItems={hasPendingCostingItems}
        isQuotationLockedForCosting={isQuotationLockedForCosting}
      />

      {/* Modals & Dialogs */}
      <QuickAddProductModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={(product) => {
          setProducts((prev) => [product, ...prev])
          if (activeLineIndex !== null) {
            handleProductSelect(activeLineIndex, product.id)
          }
        }}
      />

      <QuickAddClientModal
        isOpen={isQuickAddClientOpen}
        onClose={() => setIsQuickAddClientOpen(false)}
        onSuccess={(client) => {
          setClients((prev) => [client, ...prev])
          form.setValue("clientId", client.id)
        }}
      />

      <AssignmentModal
        open={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        clientId={assigningClient?.id || ""}
        clientName={assigningClient?.name || ""}
        onSuccess={async () => {
          const res = await fetch("/api/clients?all=true")
          if (res.ok) {
            const data = await res.json()
            setClients(data)
          }
        }}
      />

      <ImageCropper
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        imageSrc={rawImageSrc || ""}
        onCrop={handleCropSave}
      />

      {/* In-Page Draft Quotation PDF Preview Modal */}
      <InPageQuotationPreviewModal
        open={isInPagePreviewOpen}
        onOpenChange={setIsInPagePreviewOpen}
        quoteId={previewQuoteData?.id || existingQuote?.id || autoSavedQuoteId || searchParams.get("editId") || searchParams.get("reviseId")}
        quotationNumber={previewQuoteData?.quotationNumber || existingQuote?.quotationNumber}
        clientName={previewQuoteData?.client?.companyName}
        loading={loadingPreview}
      />

      {/* Request Access Note Dialog */}
      <Dialog open={requestAccessClient !== null} onOpenChange={(open) => !open && setRequestAccessClient(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Request Client Access
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide an optional note to justify your request for "{requestAccessClient?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Optional Request Note</label>
              <Textarea
                placeholder="e.g., Client wants to place a new quotation for chairs..."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                rows={3}
                className="text-xs bg-background"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRequestAccessClient(null)
                setRequestNotes("")
              }}
              className="text-xs h-9"
              disabled={requestingAccess}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleRequestAccessSubmit}
              disabled={requestingAccess}
              className="text-xs h-9 font-medium"
            >
              {requestingAccess ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Swatch Picker Modal */}
      <Dialog open={isMaterialPickerOpen} onOpenChange={setIsMaterialPickerOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border shadow-xl">
          <DialogHeader className="pb-3 border-b bg-muted/20 -mx-6 -mt-6 p-6">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
                <Palette className="h-4 w-4" />
              </div>
              <div>
                <span>Select Material Swatches</span>
                <span className="ml-2 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                  {watchSelectedMaterials.length} selected
                </span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Search and pick materials to append to the Materials & Finishes Schedule on the PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={materialPickerSearch}
                onChange={(e) => setMaterialPickerSearch(e.target.value)}
                placeholder="Search by code, name, or brand..."
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="w-full sm:w-44">
              <Select value={materialPickerCategory} onValueChange={(val) => val && setMaterialPickerCategory(val)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Array.from(new Set(materialsLibrary.map((m: any) => m.category))).map((cat: any) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsCreateCustomMaterialOpen(true)}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-9 font-semibold flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Custom Material
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[50vh] pr-1">
            {materialsLibrary.filter((mat: any) => {
              const matchesCategory = materialPickerCategory === "all" || mat.category.toLowerCase() === materialPickerCategory.toLowerCase()
              const matchesSearch = !materialPickerSearch.trim() ||
                mat.name.toLowerCase().includes(materialPickerSearch.toLowerCase()) ||
                mat.code.toLowerCase().includes(materialPickerSearch.toLowerCase()) ||
                (mat.brand && mat.brand.toLowerCase().includes(materialPickerSearch.toLowerCase()))
              return matchesCategory && matchesSearch
            }).length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Palette className="h-8 w-8 text-muted-foreground/50" />
                <p className="max-w-md">
                  No materials found. Select <b>Create Custom Material</b> to add a material for this quotation or add it to the Material Library (subject to permissions).
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsCreateCustomMaterialOpen(true)}
                  className="bg-orange-600 hover:bg-orange-500 text-white text-xs gap-1.5 font-semibold mt-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Create Custom Material
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {materialsLibrary
                  .filter((mat: any) => {
                    const matchesCategory = materialPickerCategory === "all" || mat.category.toLowerCase() === materialPickerCategory.toLowerCase()
                    const matchesSearch = !materialPickerSearch.trim() ||
                      mat.name.toLowerCase().includes(materialPickerSearch.toLowerCase()) ||
                      mat.code.toLowerCase().includes(materialPickerSearch.toLowerCase()) ||
                      (mat.brand && mat.brand.toLowerCase().includes(materialPickerSearch.toLowerCase()))
                    return matchesCategory && matchesSearch
                  })
                  .map((mat: any) => {
                    const isSelected = watchSelectedMaterials.some((m: any) => (m.id || m.code) === (mat.id || mat.code))
                    return (
                      <div
                        key={mat.id || mat.code}
                        onClick={() => {
                          const current = watchSelectedMaterials
                          let updated = []
                          if (isSelected) {
                            updated = current.filter((m: any) => (m.id || m.code) !== (mat.id || mat.code))
                          } else {
                            updated = [...current, {
                              id: mat.id,
                              name: mat.name,
                              code: mat.code,
                              category: mat.category,
                              brand: mat.brand || null,
                              description: mat.description || null,
                              swatchUrl: mat.swatchUrl || null
                            }]
                          }
                          form.setValue("selectedMaterials", updated, { shouldDirty: true, shouldValidate: true })
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center gap-3 relative ${
                          isSelected 
                            ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500" 
                            : "border-border bg-card hover:border-orange-500/50 hover:bg-muted/30"
                        }`}
                      >
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                          {mat.swatchUrl ? (
                            <img src={mat.swatchUrl} alt={mat.name} className="h-full w-full object-cover" />
                          ) : (
                            <Palette className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted border">
                              {mat.code}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">{mat.category}</span>
                          </div>
                          <p className="font-semibold text-foreground truncate mt-0.5">{mat.name}</p>
                          {mat.brand && <p className="text-[10px] text-orange-500 font-medium truncate">{mat.brand}</p>}
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {watchSelectedMaterials.length} material(s) selected
            </span>
            <Button 
              type="button" 
              onClick={() => setIsMaterialPickerOpen(false)}
              className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs h-9 px-4"
            >
              Done Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Custom Material Modal */}
      <CreateCustomMaterialModal
        isOpen={isCreateCustomMaterialOpen}
        onClose={() => setIsCreateCustomMaterialOpen(false)}
        userRole={userRole}
        onSavedToLibrary={(newMat) => {
          setMaterialsLibrary((prev) => [newMat, ...prev])
        }}
        onSaveCustom={(customMat) => {
          const current = form.getValues("selectedMaterials") || []
          const exists = current.some((m: any) => (m.id || m.code) === (customMat.id || customMat.code))
          if (!exists) {
            form.setValue("selectedMaterials", [customMat, ...current], { shouldDirty: true, shouldValidate: true })
          }
          // Automatically close both custom material popup and parent material selection popup
          setIsCreateCustomMaterialOpen(false)
          setIsMaterialPickerOpen(false)
        }}
      />

      {/* Costing Selection Modal */}
      <Dialog open={isCostingSelectionOpen} onOpenChange={setIsCostingSelectionOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Calculator className="h-5 w-5 text-amber-600" />
              Select Products to Add for Costing
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose which line items require custom pricing from the Cost Estimator. Selected products will be marked as <strong>Added for Costing</strong> and locked during estimation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between border-b pb-2 text-xs">
              <span className="font-semibold text-muted-foreground">Quotation Line Items ({watchItems.length})</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedCostingItemIndexes.length === watchItems.length) {
                    setSelectedCostingItemIndexes([])
                  } else {
                    setSelectedCostingItemIndexes(watchItems.map((_: any, idx: number) => idx))
                  }
                }}
                className="text-xs h-6 px-2 text-amber-700 hover:bg-amber-50 font-semibold cursor-pointer"
              >
                {selectedCostingItemIndexes.length === watchItems.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            {watchItems.map((item: any, idx: number) => {
              const isChecked = selectedCostingItemIndexes.includes(idx)
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedCostingItemIndexes((prev) =>
                      isChecked ? prev.filter((i) => i !== idx) : [...prev, idx]
                    )
                  }}
                  className={`p-3.5 border rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isChecked
                      ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-500"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                        <span className="font-semibold text-xs text-foreground truncate">
                          {item.description || "Product #" + (idx + 1)}
                        </span>
                        {form.watch("includeCategoryName") !== false && item.categoryName && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                            {item.categoryName}
                          </Badge>
                        )}
                      </div>
                      {item.specifications && (
                        <p className="text-[11px] text-muted-foreground truncate">{item.specifications}</p>
                      )}
                      <div className="text-[11px] text-muted-foreground font-mono">
                        Qty: {item.quantity} | Unit Price: AED {(item.unitPrice || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {isChecked && (
                    <Badge className="bg-amber-600 text-white text-[10px] py-0.5 px-2 shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Added
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>

          <DialogFooter className="mt-4 pt-3 border-t flex justify-between items-center">
            <Button variant="outline" onClick={() => setIsCostingSelectionOpen(false)} className="text-xs h-9 cursor-pointer">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleConfirmSendToCosting(selectedCostingItemIndexes)}
              disabled={selectedCostingItemIndexes.length === 0 || submitting}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 px-5 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Calculator className="h-4 w-4" />
              <span>Add {selectedCostingItemIndexes.length} Product(s) for Costing</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Costing Revision Modal */}
      <Dialog open={isRevisionModalOpen} onOpenChange={setIsRevisionModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
              <Clock className="h-5 w-5" /> Request Costing Revision
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send this quotation back to the Estimator team for cost, specification, or quantity revision. Please specify a mandatory reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Revision Reason / Comments <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={revisionReasonText}
              onChange={(e) => setRevisionReasonText(e.target.value)}
              placeholder="E.g., Please review accessories cost and custom veneer finish specification for Item #2."
              className="text-xs min-h-[100px]"
            />
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRevisionModalOpen(false)}
              className="text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submittingRevision || !revisionReasonText.trim()}
              onClick={handleConfirmRequestRevision}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-4 cursor-pointer flex items-center gap-1.5"
            >
              {submittingRevision ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Revision Request</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs sm:text-sm text-muted-foreground">Loading quotation builder...</p>
      </div>
    }>
      <NewQuotationForm />
    </Suspense>
  )
}
