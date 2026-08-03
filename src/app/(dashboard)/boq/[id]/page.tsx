"use client"

import React, { useState, useEffect, useMemo, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2, Save, Send, ArrowLeft, Loader2, Info, Sparkles, Lock, Check, ChevronsUpDown, Search, AlertCircle, RefreshCw, UserPlus, ChevronUp, ChevronDown, GripVertical } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"

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
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { QuickAddProductModal } from "@/components/products/quick-add-product-modal"
import { QuickAddClientModal } from "@/components/clients/quick-add-client-modal"
import { AssignmentModal } from "@/components/clients/assignment-modal"
import { ImageCropper } from "@/components/ui/image-cropper"
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

const boqSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectName: z.string().min(1, "Project name is required"),
  boqNumber: z.string().optional(),
  customerSegment: z.enum(["Interior", "Dealer", "Project", "Special"]),
  date: z.string(),
  validityDate: z.string(),
  deliveryDate: z.string().optional(),
  paymentTerms: z.string().min(1, "Payment terms is required"),
  preparedById: z.string().optional(),
  salesAgentId: z.string().optional(),
  salesAgentName: z.string().optional(),
  salesAgentTitle: z.string().optional(),
  salesAgentContactNumber: z.string().optional(),
  deliveryCharge: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Delivery charge must be at least 0"),
  notes: z.string().optional(),
  disclaimerTitle: z.string().optional(),
  disclaimer: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().nullable().optional(),
      priceSource: z.enum(["standard", "manual"]).default("standard"),
      description: z.string().min(1, "Description is required"),
      specifications: z.string(),
      productNotes: z.string().optional(),
      quantity: z.union([z.number(), z.string()]).refine(val => (val === "" ? 1 : Number(val)) >= 0, "Quantity must be at least 0"),
      basePrice: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Base price must be at least 0"),
      unitPrice: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Price must be at least 0"),
      discount: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Discount must be at least 0"),
      margin: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= -100, "Margin must be at least -100").refine(val => (val === "" ? 0 : Number(val)) < 100, "Margin must be less than 100%"),
      manualMargin: z.union([z.number(), z.string()]).optional(),
      customImageUrl: z.string().nullable().optional(),
      productDescription: z.string().optional(),
      categoryName: z.string().optional(),
      chairType: z.string().optional(),
      batchHeading: z.string().optional(),
      saveToCatalog: z.boolean().optional(),
      isCostingRequired: z.boolean().default(false),
      type: z.string().default("custom"),
      materialCost: z.union([z.number(), z.string()]).optional(),
      laborCost: z.union([z.number(), z.string()]).optional(),
      installationCost: z.union([z.number(), z.string()]).optional(),
      transportCost: z.union([z.number(), z.string()]).optional(),
      overheadCost: z.union([z.number(), z.string()]).optional(),
    })
  ).min(1, "At least one item is required"),
  vatMode: z.enum(["EXCLUDING", "INCLUDING"]).default("EXCLUDING"),
  specialDiscountType: z.enum(["PERCENTAGE", "FIXED"]).nullable().optional(),
  specialDiscountValue: z.union([z.number(), z.string()]).default(0).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Discount must be at least 0"),
  specialDiscountReason: z.string().optional(),
  additionalCharges: z.array(
    z.object({
      name: z.string().min(1, "Cost Item is required"),
      amount: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Amount must be at least 0"),
    })
  ).default([{ name: "", amount: "" }]),
})

type BOQFormValues = z.infer<typeof boqSchema>

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
}

const ProductSearchSelect = React.memo(({
  productId,
  products,
  watchSegment,
  onProductSelect,
  onCustomProductClick,
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            title={label || "Search catalog product by name or code..."}
            className={cn(
              "w-full justify-between font-normal bg-card overflow-hidden",
              !productId && "text-muted-foreground"
            )}
          >
            <span className="block truncate flex-1 text-left min-w-0">
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
          <CommandInput placeholder="Search products..." />
          <CommandList className="max-h-[350px] overflow-y-auto overflow-x-hidden">
            <CommandEmpty className="p-3 text-center flex flex-col items-center justify-center">
              <p className="text-xs text-muted-foreground mb-2">No product found.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full flex items-center justify-center gap-1.5 cursor-pointer"
                onClick={() => {
                  onCustomProductClick()
                  setOpen(false)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Custom Product
              </Button>
            </CommandEmpty>
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
                    className="p-2 border-b last:border-b-0 border-muted/50 aria-selected:bg-muted/40 cursor-pointer"
                  >
                    <div className="flex items-start gap-4 w-full min-w-0">
                      {/* Product Thumbnail */}
                      <div className="h-14 w-14 shrink-0 border rounded-md overflow-hidden flex items-center justify-center bg-white shadow-sm">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.productName} className="object-cover w-full h-full" />
                        ) : (
                          <div className="text-[9px] text-muted-foreground text-center px-1 leading-tight">No Image</div>
                        )}
                      </div>
                      
                      {/* Product Details Stack */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-semibold text-[13px] text-foreground line-clamp-2 leading-tight" title={product.productName}>
                          {product.productName}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span className="truncate" title={`SKU: ${product.productCode}`}>
                            SKU: <span className="font-medium text-foreground/80">{product.productCode}</span>
                          </span>
                          {(product as any).category?.name && (
                            <>
                              <span className="text-muted-foreground/30 hidden sm:inline">•</span>
                              <span className="truncate" title={`Category: ${(product as any).category.name}`}>
                                Category: {(product as any).category.name}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-primary mt-1.5">
                          {watchSegment} Price: AED {basePrice.toFixed(2)}
                        </div>
                      </div>

                      {/* Check Icon (only visible when selected) */}
                      <div className="shrink-0 flex items-center h-full pt-1 pr-1">
                        <Check
                          className={cn(
                            "h-5 w-5 text-primary",
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
          {/* Bottom Action Footer */}
          <div className="p-2 border-t border-muted/60 bg-muted/5 sticky bottom-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10 font-semibold flex items-center gap-2 h-10 cursor-pointer rounded-md"
              onClick={() => {
                onCustomProductClick()
                setOpen(false)
              }}
            >
              <Plus className="h-4 w-4" />
              <span>+ New Custom Product</span>
            </Button>
          </div>
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
  ({ value, onChange, onBlur, onKeyDown, ...props }, ref) => {
    const [localVal, setLocalVal] = React.useState<string>(String(value ?? ""))

    React.useEffect(() => {
      setLocalVal(String(value ?? ""))
    }, [value])

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      onChange(localVal)
      if (onBlur) {
        onBlur(e)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        onChange(localVal)
        e.currentTarget.blur()
      }
      if (onKeyDown) {
        onKeyDown(e)
      }
    }

    return (
      <Input
        ref={ref}
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
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
      placeholder="e.g. MD Cabin, Reception Area, Meeting Room (Leave empty to ungroup)"
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
      className="h-9 text-xs bg-white font-medium border-muted-foreground/20 focus-visible:ring-primary"
    />
  )
}

const formatCurrency = (val: number) => {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function NewBOQForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialClientId = searchParams.get("clientId") || ""
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER" || userRole === "SUPER_ADMIN" || userRole === "MANAGER"
  const isAdminOrSuperAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN"
  const isEstimator = userRole === "ESTIMATOR"
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assigningClient, setAssigningClient] = useState<{ id: string, name: string } | null>(null)

  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([])
  const [paymentTermsOptions, setPaymentTermsOptions] = useState<{ id: string; name: string; description?: string | null; isDefault?: boolean }[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const categoryOptions = useMemo(() => {
    const names = new Set<string>()
    dbCategories.forEach((c) => {
      if (c.name) names.add(c.name)
    })
    const defaultCategories = ["Chairs", "Desks", "Tables", "General"]
    defaultCategories.forEach((cat) => names.add(cat))
    return Array.from(names)
  }, [dbCategories])
  const [submitting, setSubmitting] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isQuickAddClientOpen, setIsQuickAddClientOpen] = useState(false)
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState("")
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null)

  const [requestAccessClient, setRequestAccessClient] = useState<{ id: string; name: string } | null>(null)
  const [requestNotes, setRequestNotes] = useState("")
  const [requestingAccess, setRequestingAccess] = useState(false)

  const [isRevision, setIsRevision] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [existingQuote, setExistingQuote] = useState<any>(null)
  const [revisionNotes, setRevisionNotes] = useState("")

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
    const target = e.target as HTMLElement
    if (!target.closest('.drag-handle')) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      move(draggedIndex, index)
      setTimeout(() => {
        const currentItems = form.getValues("items")
        const targetHeading = index > 0 
          ? currentItems[index - 1]?.batchHeading 
          : (currentItems[index + 1]?.batchHeading || "")
        form.setValue(`items.${index}.batchHeading`, targetHeading || "", { shouldValidate: true, shouldDirty: true })
      }, 50)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Utility to convert Base64 Data URL to a File
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(",")
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }

  const handleCropSave = async (croppedBase64: string) => {
    if (cropperLineIndex === null) return
    setIsCropperOpen(false)
    setUploadingImage(true)
    try {
      if (process.env.NODE_ENV === "development") {
        form.setValue(`items.${cropperLineIndex}.customImageUrl`, croppedBase64, { shouldValidate: true, shouldDirty: true })
        toast.success("Image cropped and saved locally (Dev Mode Base64)!")
        return
      }
      const croppedFile = dataURLtoFile(croppedBase64, `product-cropped-${Date.now()}.png`)
      const formData = new FormData()
      formData.append("file", croppedFile)
      const uploadRes = await fetch("/api/upload?type=product", {
        method: "POST",
        body: formData,
      })
      if (uploadRes.ok) {
        const data = await uploadRes.json()
        if (data.url) {
          form.setValue(`items.${cropperLineIndex}.customImageUrl`, data.url, { shouldValidate: true, shouldDirty: true })
          toast.success("Image cropped and uploaded successfully!")
        } else {
          form.setValue(`items.${cropperLineIndex}.customImageUrl`, croppedBase64, { shouldValidate: true, shouldDirty: true })
        }
      } else {
        form.setValue(`items.${cropperLineIndex}.customImageUrl`, croppedBase64, { shouldValidate: true, shouldDirty: true })
      }
    } catch (err) {
      console.error("Failed to upload cropped image:", err)
      form.setValue(`items.${cropperLineIndex}.customImageUrl`, croppedBase64, { shouldValidate: true, shouldDirty: true })
    } finally {
      setUploadingImage(false)
      setCropperLineIndex(null)
    }
  }

  // Fetch users for selecting sales agent
  useEffect(() => {
    fetch("/api/users/sales-agents")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data)
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
  }, [])

  // Fetch clients and products catalog
  useEffect(() => {
    async function loadData() {
      try {
        const [clientsRes, productsRes, categoriesRes, termsRes] = await Promise.all([
          fetch("/api/clients?all=true"),
          fetch("/api/products"),
          fetch("/api/products/categories"),
          fetch("/api/settings/terms"),
        ])
        if (!clientsRes.ok || !productsRes.ok) throw new Error("Failed to load catalog data")
        const clientsData = await clientsRes.json()
        const productsData = await productsRes.json()
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          if (Array.isArray(categoriesData)) setDbCategories(categoriesData)
        }

        let fetchedTerms: { id: string; name: string; description?: string | null; isDefault?: boolean }[] = []
        if (termsRes.ok) {
          const termsData = await termsRes.json()
          if (Array.isArray(termsData.paymentTerms)) {
            fetchedTerms = termsData.paymentTerms
            setPaymentTermsOptions(termsData.paymentTerms)
          }
        }
        const defaultPaymentTerm = fetchedTerms.find((t) => t.isDefault)?.name || (fetchedTerms.length > 0 ? fetchedTerms[0].name : "50% Advance, 50% on Delivery")

        setClients(clientsData)
        setProducts(productsData)

        // Load details for revision or update if ID is provided
        const reviseId = searchParams.get("reviseId")
        const editId = searchParams.get("editId")
        const activeId = reviseId || editId

        if (activeId) {
          const fetchRes = await fetch(`/api/boqs/${activeId}`)
          if (fetchRes.ok) {
            const activeData = await fetchRes.json()
            setExistingQuote(activeData)
            if (reviseId) {
              setIsRevision(true)
            } else {
              setIsEdit(true)
            }

            const headings = Array.from(
              new Set((activeData.items || []).map((item: any) => item.batchHeading || "").filter(Boolean))
            ) as string[]
            if (headings.length > 0) {
              setBatches(headings.map(h => ({ id: Math.random().toString(), name: h })))
            } else {
              setBatches([{ id: "default", name: "General Items" }])
            }

            // Populate form values
            form.reset({
              clientId: activeData.clientId,
              projectName: activeData.projectName || "",
              boqNumber: activeData.boqNumber || "",
              customerSegment: activeData.customerSegment || "Project",
              preparedById: activeData.preparedById || "",
              salesAgentId: activeData.salesAgentId || (activeData.salesAgentName ? "manual" : (activeData.preparedById || "")),
              salesAgentName: activeData.salesAgentName || "",
              salesAgentTitle: activeData.salesAgentTitle || "",
              salesAgentContactNumber: activeData.salesAgentContactNumber || "",
              date: reviseId ? new Date().toISOString().split("T")[0] : activeData.date.split("T")[0],
              validityDate: reviseId ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : activeData.validityDate.split("T")[0],
              deliveryDate: activeData.deliveryDate ? new Date(activeData.deliveryDate).toISOString().split("T")[0] : new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              paymentTerms: activeData.paymentTerms || "50% Advance, 50% on Delivery",
              items: activeData.items.map((item: any) => {
                const marginVal = item.margin || 0
                const loadedBase = (item.basePrice !== undefined && item.basePrice !== null && item.basePrice !== 0)
                  ? item.basePrice
                  : Number((item.unitPrice * (1 - marginVal / 100)).toFixed(2))

                let resolvedPriceSource = item.priceSource
                if (!resolvedPriceSource) {
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

                return {
                  productId: item.productId || "",
                  priceSource: resolvedPriceSource,
                  description: item.description,
                  specifications: item.specifications || "",
                  productNotes: item.productNotes || "",
                  quantity: item.quantity,
                  basePrice: loadedBase,
                  unitPrice: item.unitPrice,
                  discount: item.unitPrice > 0 ? Number(((item.discount || 0) / item.unitPrice * 100).toFixed(2)) : 0,
                  margin: marginVal,
                  manualMargin: marginVal,
                  customImageUrl: item.customImageUrl || "",
                  productDescription: item.productDescription || item.product?.description || "",
                  categoryName: item.categoryName || item.product?.category?.name || "Chairs",
                  chairType: item.chairType || item.product?.chairType || "",
                  batchHeading: item.batchHeading || "",
                  saveToCatalog: false,
                }
              }),
              deliveryCharge: activeData.deliveryCharge || 0,
              notes: activeData.notes || "",
              vatMode: activeData.vatMode || "EXCLUDING",
              specialDiscountType: activeData.specialDiscountType || null,
              specialDiscountValue: activeData.specialDiscountValue || 0,
              specialDiscountReason: activeData.specialDiscountReason || "",
              additionalCharges: activeData.additionalCharges || [{ name: "", amount: "" }],
            })
          }
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

        const headings = Array.from(
          new Set((data.items || []).map((item: any) => item.batchHeading || "").filter(Boolean))
        ) as string[]
        if (headings.length > 0) {
          setBatches(headings.map(h => ({ id: Math.random().toString(), name: h })))
        } else {
          setBatches([{ id: "default", name: "General Items" }])
        }

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

        toast.success("Pre-filled boq from Product Master Quote Cart!")
      } catch (err) {
        console.error("Failed to parse cached quoteCartItems:", err)
      }
    }
  }, [loadingOptions, session])

  const form = useForm<BOQFormValues>({
    resolver: zodResolver(boqSchema) as any,
    defaultValues: {
      clientId: initialClientId,
      projectName: "",
      customerSegment: "Project",
      preparedById: (session?.user as any)?.id || "",
      salesAgentId: (session?.user as any)?.id || "",
      salesAgentName: (session?.user as any)?.name || "",
      salesAgentContactNumber: (session?.user as any)?.phone || "",
      date: new Date().toISOString().split("T")[0],
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      deliveryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      paymentTerms: "50% Advance, 50% on Delivery",
      items: [{ productId: "", priceSource: "standard", description: "", specifications: "", productNotes: "", quantity: 1, basePrice: 0, unitPrice: 0, discount: 0, margin: 0, manualMargin: "", customImageUrl: "", productDescription: "", categoryName: "Chairs", chairType: "", batchHeading: "", saveToCatalog: false }],
      deliveryCharge: 0,
      notes: "",
      vatMode: "EXCLUDING",
      specialDiscountType: null,
      specialDiscountValue: 0,
      specialDiscountReason: "",
      additionalCharges: [{ name: "", amount: "" }],
    },
  })

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

  const watchItems = form.watch("items")
  const watchClientId = form.watch("clientId")
  const watchAdditionalCharges = form.watch("additionalCharges") || []
  const watchSpecialDiscountType = form.watch("specialDiscountType")
  const watchSpecialDiscountValue = form.watch("specialDiscountValue")
  const watchVatMode = form.watch("vatMode") || "EXCLUDING"

  const selectedClientObj = clients.find((c) => c.id === watchClientId)

  const watchSegment = form.watch("customerSegment") || "Project"

  const handleAddBatch = () => {
    const newName = `Section ${batches.length + 1}`
    let finalName = newName
    let counter = 1
    while (batches.some((b) => b.name.toLowerCase() === finalName.toLowerCase())) {
      finalName = `Section ${batches.length + 1} (${counter})`
      counter++
    }
    setBatches([...batches, { id: Math.random().toString(), name: finalName }])
    toast.success(`Created section "${finalName}"`)
  }

  const handleRenameBatch = (batchId: string, newName: string) => {
    if (!newName.trim()) return
    if (batches.some((b) => b.id !== batchId && b.name.toLowerCase() === newName.trim().toLowerCase())) {
      toast.error("A section with this name already exists!")
      return
    }

    const oldBatch = batches.find((b) => b.id === batchId)
    if (!oldBatch) return
    const oldName = oldBatch.name

    setBatches(batches.map((b) => (b.id === batchId ? { ...b, name: newName.trim() } : b)))

    const currentItems = form.getValues("items") || []
    currentItems.forEach((item, index) => {
      if (item.batchHeading === oldName) {
        form.setValue(`items.${index}.batchHeading`, newName.trim(), { shouldDirty: true, shouldValidate: true })
      }
    })
  }

  const handleDeleteBatch = (batchId: string) => {
    const batch = batches.find((b) => b.id === batchId)
    if (!batch) return

    const hasItems = watchItems.some((item) => item.batchHeading === batch.name)
    if (hasItems) {
      toast.error("Cannot delete a section that contains items. Move or delete the products first.")
      return
    }

    if (batches.length <= 1) {
      toast.error("BOQ must have at least one section.")
      return
    }

    setBatches(batches.filter((b) => b.id !== batchId))
    toast.success(`Section "${batch.name}" removed.`)
  }

  const handleAddItemToBatch = (batchName: string, isCustom: boolean = false) => {
    const currentItems = form.getValues("items") || []
    let insertIndex = currentItems.length
    for (let i = currentItems.length - 1; i >= 0; i--) {
      if (currentItems[i]?.batchHeading === batchName) {
        insertIndex = i + 1
        break
      }
    }

    insert(insertIndex, {
      productId: "",
      priceSource: isCustom ? "manual" : "standard",
      description: "",
      specifications: "",
      productNotes: "",
      quantity: 1,
      basePrice: 0,
      unitPrice: 0,
      discount: 0,
      margin: 0,
      manualMargin: "",
      customImageUrl: "",
      productDescription: "",
      categoryName: "Chairs",
      chairType: "",
      batchHeading: batchName,
      saveToCatalog: false,
      isCostingRequired: true,
      type: isCustom ? "custom" : "standard",
      materialCost: 0,
      laborCost: 0,
      installationCost: 0,
      transportCost: 0,
      overheadCost: 0,
    })
    toast.success(`Product added to ${batchName}`)
  }

  const handleMoveItemInBatch = (fromIndex: number, direction: "up" | "down") => {
    const currentItems = form.getValues("items") || []
    const currentBatchName = currentItems[fromIndex]?.batchHeading

    let siblingIndex = -1
    if (direction === "up") {
      for (let i = fromIndex - 1; i >= 0; i--) {
        if (currentItems[i]?.batchHeading === currentBatchName) {
          siblingIndex = i
          break
        }
      }
    } else {
      for (let i = fromIndex + 1; i < currentItems.length; i++) {
        if (currentItems[i]?.batchHeading === currentBatchName) {
          siblingIndex = i
          break
        }
      }
    }

    if (siblingIndex !== -1) {
      move(fromIndex, siblingIndex)
    }
  }

  const reorderFlatItemsByBatches = (newBatches: typeof batches) => {
    const currentItems = form.getValues("items") || []
    const reordered: typeof currentItems = []

    newBatches.forEach((batch) => {
      const itemsInBatch = currentItems.filter((item) => item.batchHeading === batch.name)
      reordered.push(...itemsInBatch)
    })

    replace(reordered)
  }

  // Ensure all items are assigned to a valid batch in batches state
  useEffect(() => {
    if (batches.length > 0 && watchItems && watchItems.length > 0) {
      const batchNames = new Set(batches.map((b) => b.name))
      watchItems.forEach((item, index) => {
        if (!item?.batchHeading || !batchNames.has(item.batchHeading)) {
          form.setValue(`items.${index}.batchHeading`, batches[0].name, { shouldValidate: true })
        }
      })
    }
  }, [batches, watchItems])

  const handleBatchDragStart = (e: React.DragEvent, id: string) => {
    const target = e.target as HTMLElement
    if (!target.closest('.batch-drag-handle')) {
      e.preventDefault()
      return
    }
    setDraggedBatchId(id)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleBatchDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (draggedBatchId !== id) {
      setDragOverBatchId(id)
    }
  }

  const handleBatchDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedBatchId || draggedBatchId === targetId) return

    const fromIdx = batches.findIndex((b) => b.id === draggedBatchId)
    const toIdx = batches.findIndex((b) => b.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return

    const newBatches = [...batches]
    const [movedBatch] = newBatches.splice(fromIdx, 1)
    newBatches.splice(toIdx, 0, movedBatch)

    setBatches(newBatches)
    reorderFlatItemsByBatches(newBatches)

    setDraggedBatchId(null)
    setDragOverBatchId(null)
  }

  // Automatically select segment based on client type
  useEffect(() => {
    if (selectedClientObj && selectedClientObj.clientType) {
      const validTypes = ["Dealer", "Interior", "Project", "Special"]
      if (validTypes.includes(selectedClientObj.clientType)) {
        form.setValue("customerSegment", selectedClientObj.clientType as any, { shouldValidate: true, shouldDirty: true })
        toast.info(`Pricing updated to ${selectedClientObj.clientType} Segment based on client profile.`)
      }
    }
  }, [watchClientId, selectedClientObj, form])

  // 1. Subtotal
  const subtotal = watchItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unitPrice) || 0
    const discPercent = Number(item.discount) || 0
    const discAmt = price * (discPercent / 100)
    return acc + (price - discAmt) * qty
  }, 0)

  // 2. Sum of Additional Costs
  const totalAdditionalCost = watchAdditionalCharges.reduce((acc: number, item: any) => {
    return acc + (Number(item?.amount) || 0)
  }, 0)

  // 3. Special Discount
  const discValue = Number(watchSpecialDiscountValue) || 0
  let specialDiscountAmount = 0
  if (discValue > 0) {
    if (watchSpecialDiscountType === "PERCENTAGE") {
      specialDiscountAmount = (subtotal + totalAdditionalCost) * (discValue / 100)
    } else if (watchSpecialDiscountType === "FIXED") {
      specialDiscountAmount = discValue
    }
  }

  // 4. Taxable Amount
  const taxableAmount = Math.max(0, subtotal + totalAdditionalCost - specialDiscountAmount)

  // 5. VAT and Grand Total
  let vatAmount = 0
  let grandTotal = 0
  if (watchVatMode === "INCLUDING") {
    // Exclude Tax (VAT is 0)
    vatAmount = 0
    grandTotal = Math.round(taxableAmount)
  } else {
    // Include Tax (Add 5%)
    vatAmount = taxableAmount * 0.05
    grandTotal = Math.round(taxableAmount + vatAmount)
  }

  // Watch for segment changes and update line item unit prices
  useEffect(() => {
    const currentItems = form.getValues("items") || []
    currentItems.forEach((item, index) => {
      if (item.productId && item.priceSource === "standard") {
        const matchedProduct = products.find((p) => p.id === item.productId)
        if (matchedProduct) {
          let basePrice = matchedProduct.unitPrice
          if (watchSegment === "Interior") basePrice = matchedProduct.interiorPrice || matchedProduct.unitPrice
          else if (watchSegment === "Dealer") basePrice = matchedProduct.dealerPrice || matchedProduct.unitPrice
          else if (watchSegment === "Project") basePrice = matchedProduct.projectPrice || matchedProduct.unitPrice
          else if (watchSegment === "Special") basePrice = matchedProduct.specialPrice || matchedProduct.unitPrice

          form.setValue(`items.${index}.basePrice`, basePrice, { shouldValidate: true, shouldDirty: true })
          const margin = Number(item.margin) || 0
          const marginDecimal = margin / 100
          const calculatedPrice = marginDecimal === 1 ? basePrice : basePrice / (1 - marginDecimal)
          form.setValue(`items.${index}.unitPrice`, Number(calculatedPrice.toFixed(2)), { shouldValidate: true, shouldDirty: true })
        }
      }
    })
  }, [watchSegment, products])

  const handleProductSelect = (index: number, productId: string | null) => {
    if (!productId) return
    const matchedProduct = products.find((p) => p.id === productId)
    if (matchedProduct) {
      let basePrice = matchedProduct.unitPrice
      if (watchSegment === "Interior") basePrice = matchedProduct.interiorPrice || matchedProduct.unitPrice
      else if (watchSegment === "Dealer") basePrice = matchedProduct.dealerPrice || matchedProduct.unitPrice
      else if (watchSegment === "Project") basePrice = matchedProduct.projectPrice || matchedProduct.unitPrice
      else if (watchSegment === "Special") basePrice = matchedProduct.specialPrice || matchedProduct.unitPrice

      form.setValue(`items.${index}.productId`, matchedProduct.id, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.priceSource`, "standard", { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.description`, matchedProduct.productName, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.productDescription`, matchedProduct.description || "", { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.specifications`, matchedProduct.specifications ? matchedProduct.specifications.replace(/【/g, '• ').replace(/】 ?/g, ': ') : "", { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.margin`, 0, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.manualMargin`, 0, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.basePrice`, basePrice, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.unitPrice`, basePrice, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.customImageUrl`, "", { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.categoryName`, matchedProduct.category?.name || "General", { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.chairType`, matchedProduct.chairType || "", { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.isCostingRequired`, basePrice === 0, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.type`, "standard", { shouldValidate: true, shouldDirty: true })

      toast.info(`Populated ${matchedProduct.productName} for ${watchSegment} segment at base price AED ${basePrice}!`)
    }
  }

  const recalculateRow = (
    index: number,
    fieldChanged: "basePrice" | "margin" | "unitPrice" | "priceSource" | "productId",
    newValue: any
  ) => {
    const item = form.getValues(`items.${index}`)
    if (!item) return

    let priceSource = fieldChanged === "priceSource" ? newValue : item.priceSource
    let productId = fieldChanged === "productId" ? newValue : item.productId
    let basePrice = fieldChanged === "basePrice" ? (newValue === "" ? 0 : parseFloat(newValue) || 0) : (item.basePrice === "" ? 0 : parseFloat(item.basePrice as any) || 0)
    let margin = fieldChanged === "margin" ? (newValue === "" ? 0 : parseFloat(newValue) || 0) : (item.margin === "" ? 0 : parseFloat(item.margin as any) || 0)
    let unitPrice = fieldChanged === "unitPrice" ? (newValue === "" ? 0 : parseFloat(newValue) || 0) : (item.unitPrice === "" ? 0 : parseFloat(item.unitPrice as any) || 0)

    // Set the changed field itself in react-hook-form state so it persists
    if (fieldChanged === "basePrice") {
      form.setValue(`items.${index}.basePrice`, newValue, { shouldValidate: false, shouldDirty: true })
    } else if (fieldChanged === "margin") {
      form.setValue(`items.${index}.margin`, newValue, { shouldValidate: false, shouldDirty: true })
      form.setValue(`items.${index}.manualMargin`, newValue, { shouldValidate: false, shouldDirty: true })
    } else if (fieldChanged === "unitPrice") {
      form.setValue(`items.${index}.unitPrice`, newValue, { shouldValidate: false, shouldDirty: true })
    } else if (fieldChanged === "priceSource") {
      form.setValue(`items.${index}.priceSource`, newValue, { shouldValidate: false, shouldDirty: true })
    }

    // Auto-update isCostingRequired if unitPrice changes
    if (fieldChanged === "unitPrice") {
      form.setValue(`items.${index}.isCostingRequired`, newValue === "" || parseFloat(newValue) === 0, { shouldValidate: false, shouldDirty: true })
    }

    // 1. Resolve standard catalog base price if priceSource is standard
    if (priceSource === "standard" && productId) {
      const matchedProduct = products.find((p) => p.id === productId)
      if (matchedProduct) {
        let segmentPrice = matchedProduct.unitPrice
        if (watchSegment === "Interior") segmentPrice = matchedProduct.interiorPrice ?? matchedProduct.unitPrice
        else if (watchSegment === "Dealer") segmentPrice = matchedProduct.dealerPrice ?? matchedProduct.unitPrice
        else if (watchSegment === "Project") segmentPrice = matchedProduct.projectPrice ?? matchedProduct.unitPrice
        else if (watchSegment === "Special") segmentPrice = matchedProduct.specialPrice ?? matchedProduct.unitPrice
        
        basePrice = segmentPrice
        form.setValue(`items.${index}.basePrice`, segmentPrice, { shouldValidate: false, shouldDirty: true })
      }
    }

    // 2. Perform math based on what changed
    if (fieldChanged === "unitPrice") {
      if (newValue === "") {
        margin = 0
        form.setValue(`items.${index}.margin`, "", { shouldValidate: false, shouldDirty: true })
        form.setValue(`items.${index}.manualMargin`, "", { shouldValidate: false, shouldDirty: true })
      } else if (unitPrice > 0) {
        // Unit Price = Base Price / (1 - Margin % / 100) => Margin % = (1 - (Base Price / Unit Price)) * 100
        margin = (1 - (basePrice / unitPrice)) * 100
        const roundedMargin = Number(margin.toFixed(2))
        form.setValue(`items.${index}.margin`, roundedMargin, { shouldValidate: false, shouldDirty: true })
        form.setValue(`items.${index}.manualMargin`, roundedMargin, { shouldValidate: false, shouldDirty: true })
      } else {
        margin = 0
        form.setValue(`items.${index}.margin`, 0, { shouldValidate: false, shouldDirty: true })
        form.setValue(`items.${index}.manualMargin`, 0, { shouldValidate: false, shouldDirty: true })
      }
    } else {
      let marginDecimal = margin / 100
      if (marginDecimal >= 1) {
        marginDecimal = 0.9999 // Prevent division by zero
      }
      unitPrice = basePrice / (1 - marginDecimal)
      const finalPrice = (newValue === "" && fieldChanged === "margin") || (fieldChanged === "basePrice" && newValue === "") ? "" : Number(unitPrice.toFixed(2))
      form.setValue(`items.${index}.unitPrice`, finalPrice, { shouldValidate: false, shouldDirty: true })
    }
  }

  const fetchClientsList = async () => {
    try {
      const res = await fetch("/api/clients?all=true")
      if (res.ok) {
        const data = await res.json()
        setClients(data)
      }
    } catch (err) {
      console.error("Failed to refresh clients list:", err)
    }
  }

  const handleRequestAccess = async (clientId: string, clientName: string, notes?: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || "Requested access to client via boqs page." })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to request access")
      }

      toast.success(`Access request submitted for "${clientName}"! Admin will be notified.`)
      await fetchClientsList()
    } catch (error: any) {
      toast.error(error.message || "Failed to request access. Please try again.")
      throw error
    }
  }

  const handleRequestAccessSubmit = async () => {
    if (!requestAccessClient) return
    setRequestingAccess(true)
    try {
      await handleRequestAccess(requestAccessClient.id, requestAccessClient.name, requestNotes)
      setRequestAccessClient(null)
      setRequestNotes("")
    } catch (err) {
      // toast already handled
    } finally {
      setRequestingAccess(false)
    }
  }
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

      if (isRevision || isEdit) {
        targetUrl = `/api/boqs/${existingQuote.id}`
        method = "PUT"
      } else if (autoSavedQuoteId) {
        targetUrl = `/api/boqs/${autoSavedQuoteId}`
        method = "PUT"
      } else {
        targetUrl = "/api/boqs"
        method = "POST"
      }

      let totalAdditionalCost = 0
      currentData.additionalCharges?.forEach((c: any) => {
        totalAdditionalCost += parseFloat(c.amount) || 0
      })

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
          additionalCharges: currentData.additionalCharges.map((c: any) => ({
            name: c.name,
            amount: c.amount === "" ? 0 : Number(c.amount)
          })),
          isRevision: isRevision,
          isUpdate: isEdit || !!autoSavedQuoteId,
          revisionNotes: revisionNotes,
          status: "DRAFT",
        }),
      })

      if (res.ok) {
        const result = await res.json()
        if (method === "POST" && result.id) {
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

  useEffect(() => {
    const intervalId = setInterval(() => {
      handleAutoSave()
    }, 15000)

    return () => clearInterval(intervalId)
  }, [])

  async function onSubmit(data: BOQFormValues, targetStatus?: "DRAFT" | "SUBMITTED") {
    const resolvedStatus = targetStatus === "DRAFT"
      ? "DRAFT"
      : (targetStatus || "SUBMITTED")

    if (isRevision && resolvedStatus !== "DRAFT" && !revisionNotes.trim()) {
      toast.error("Revision notes are required to revise this boq!")
      return
    }

    setSubmitting(true)
    try {
      const url = (isRevision || isEdit) ? `/api/boqs/${existingQuote.id}` : "/api/boqs"
      const method = (isRevision || isEdit) ? "PUT" : "POST"

      const formattedItems = []
      for (const item of data.items) {
        const isCustom = item.priceSource === "manual" && !item.productId
        if (isCustom) {
          if (!item.description.trim()) {
            throw new Error("Product Name is required for custom products.")
          }
          if (isManagerOrAdmin) {
          }
          if (item.categoryName === "Chairs" && !item.chairType) {
            throw new Error(`Chair Type is required for custom chair "${item.description}".`)
          }

          if (isAdminOrSuperAdmin && item.saveToCatalog) {
            const prodRes = await fetch("/api/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productName: item.description,
                categoryName: item.categoryName || "General",
                unitPrice: Number(item.unitPrice) || 0.0,
                description: item.productDescription,
                specifications: item.specifications || undefined,
                warranty: "5 Years",
                imageUrl: item.customImageUrl || undefined,
                chairType: item.categoryName === "Chairs" ? item.chairType : undefined,
              }),
            })
            if (!prodRes.ok) {
              const errData = await prodRes.json()
              throw new Error(errData.error || `Failed to save custom product "${item.description}" to catalog.`)
            }
            const createdProduct = await prodRes.json()
            item.productId = createdProduct.id
          }
        }

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

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          preparedById: data.preparedById,
          items: formattedItems,
          deliveryCharge: totalAdditionalCost,
          specialDiscountValue: data.specialDiscountValue === "" ? 0 : Number(data.specialDiscountValue),
          additionalCharges: data.additionalCharges.map((c: any) => ({
            name: c.name,
            amount: c.amount === "" ? 0 : Number(c.amount)
          })),
          isRevision: isRevision,
          isUpdate: isEdit,
          revisionNotes: revisionNotes,
          status: resolvedStatus,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to submit boq")
      }

      const result = await res.json()
      toast.success(
        isRevision
          ? `BOQ revised successfully to Revision #${result.revisionNumber}! PDF updated on SharePoint.`
          : isEdit
            ? (resolvedStatus === "DRAFT"
                ? `BOQ draft updated successfully!`
                : `BOQ ${result.boqNumber} updated and compiled successfully! PDF updated on SharePoint.`)
            : (resolvedStatus === "DRAFT"
                ? `BOQ draft saved successfully!`
                : `BOQ ${result.boqNumber} compiled & uploaded to SharePoint!`)
      )
      router.push("/boqs")
    } catch (error: any) {
      console.error("Error submitting boq:", error)
      toast.error(error.message || "Failed to submit boq. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const getSegmentPriceInfo = (productId: string | null | undefined) => {
    if (!productId) return null
    const product = products.find(p => p.id === productId)
    if (!product) return null
    let basePrice = product.unitPrice
    if (watchSegment === "Interior") basePrice = product.interiorPrice ?? product.unitPrice
    else if (watchSegment === "Dealer") basePrice = product.dealerPrice ?? product.unitPrice
    else if (watchSegment === "Project") basePrice = product.projectPrice ?? product.unitPrice
    else if (watchSegment === "Special") basePrice = product.specialPrice ?? product.unitPrice
    return {
      label: `Standard ${watchSegment} Price`,
      price: basePrice
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center space-x-4">
        <Link href="/boqs">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRevision ? "Revise BOQ" : isEdit ? "Update BOQ" : "Create BOQ"}
          </h1>
          <p className="text-muted-foreground">
            {isRevision
              ? `Create a new revised version of BOQ ${existingQuote?.boqNumber}`
              : isEdit
                ? `Modify and update BOQ ${existingQuote?.boqNumber}`
                : "Select a client, add catalog products, and compile a PDF immediately."}
          </p>
        </div>
      </div>

      {isRevision && existingQuote && (
        <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 rounded-xl p-4 flex items-start gap-3 text-purple-950 dark:text-purple-300">
          <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div>
            <h3 className="font-semibold">Revising BOQ {existingQuote.boqNumber}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              You are creating **Revision #{existingQuote.revisionNumber + 1}** for this boq. A new PDF will be compiled and uploaded as the active revision on SharePoint, and the revision history will be logged.
            </p>
          </div>
        </div>
      )}

      {isEdit && existingQuote && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-start gap-3 text-amber-950 dark:text-amber-300">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <h3 className="font-semibold">Updating BOQ {existingQuote.boqNumber}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              You are updating this boq draft directly. Changes will overwrite the current draft version and update the compiled PDF on SharePoint without creating a new revision.
            </p>
          </div>
        </div>
      )}

      {loadingOptions ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading catalog and clients...</p>
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
            className="space-y-8"
          >
            {isRevision && (
              <Card className="rounded-xl border border-purple-200 dark:border-purple-900/30 bg-purple-50/10">
                <CardHeader>
                  <CardTitle className="text-base text-purple-700 dark:text-purple-400">
                    Revision Notes <span className="text-destructive">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Describe the updates in this revision (e.g., 'Reduced price on workstation clusters by 10% per sales manager instructions')."
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    className="min-h-[80px]"
                  />
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {/* Client Selection Card */}
              <Card className="rounded-xl shadow-sm border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    Client Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedClientObj && selectedClientObj.status !== "Approved" && !isRevision && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 text-destructive animate-in fade-in">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-sm">BOQ Revision Blocked</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedClientObj.status === "Pending Approval"
                            ? "This client is pending approval. Please contact Admin/Manager before creating boq."
                            : "This client has been rejected. Please contact Admin/Manager before creating boq."}
                        </p>
                      </div>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col mt-2">
                        <FormLabel>Client Company</FormLabel>
                        <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
                          <PopoverTrigger
                            render={
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  disabled={isRevision}
                                  className={cn(
                                    "w-full justify-between font-normal bg-card",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? clients.find((client) => client.id === field.value)?.companyName
                                    : "Search and select a client..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            }
                          />
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput 
                                placeholder="Search client name..." 
                                value={clientSearch}
                                onValueChange={setClientSearch}
                              />
                              <CommandList>
                                <CommandEmpty className="p-3 text-center">
                                  <p className="text-xs text-muted-foreground mb-2">No client found.</p>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="w-full flex items-center justify-center gap-1.5"
                                    onClick={() => {
                                      setIsQuickAddClientOpen(true)
                                      setIsClientPopoverOpen(false)
                                      setClientSearch("")
                                    }}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Quick Add Client
                                  </Button>
                                </CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="--quick-add-client--"
                                    onSelect={() => {
                                      setIsQuickAddClientOpen(true)
                                      setIsClientPopoverOpen(false)
                                      setClientSearch("")
                                    }}
                                    className="text-primary font-medium flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4 text-primary" />
                                    <span>Quick Add Client...</span>
                                  </CommandItem>
                                  {(() => {
                                    let matchedClients = clients.filter((c) => c.status === "Approved")
                                    
                                    if (clientSearch.trim()) {
                                      const searchLower = clientSearch.toLowerCase().trim()
                                      matchedClients = matchedClients.filter(c => {
                                        const searchStr = `${c.companyName} ${c.clientId} ${(c as any).contactPerson || ""} ${(c as any).trnNumber || ""}`.toLowerCase()
                                        return searchStr.includes(searchLower)
                                      })
                                    }
                                    
                                    const MAX_RESULTS = 50;
                                    matchedClients = matchedClients.slice(0, MAX_RESULTS);

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
                                            "flex flex-col items-start p-2 border-b last:border-b-0 border-muted/50 aria-selected:bg-muted/40 cursor-pointer",
                                            !canSelect && "opacity-85 cursor-default hover:bg-transparent"
                                          )}
                                        >
                                          <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                              <Check
                                                className={cn(
                                                  "h-4 w-4 text-primary",
                                                  isSelected ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              <span className="font-semibold text-sm">{client.companyName}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              {canSelect ? (
                                                isUserAssigned && (
                                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-250 text-[10px] py-0 px-1.5 font-normal">
                                                    Assigned
                                                  </Badge>
                                                )
                                              ) : (
                                                <>
                                                  {isRequested && (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-250 text-[10px] py-0 px-1.5 font-normal">
                                                      Requested
                                                    </Badge>
                                                  )}
                                                  {isRejected && (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-250 text-[10px] py-0 px-1.5 font-normal">
                                                      Rejected
                                                    </Badge>
                                                  )}
                                                  {!isRequested && !isRejected && (
                                                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] py-0 px-1.5 font-normal">
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
                                                <div className="mt-2 ml-6 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                                     onClick={(e) => e.stopPropagation()}
                                                >
                                                  <div className="flex items-start gap-1">
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                    <span>Access request is pending approval.</span>
                                                  </div>
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    disabled
                                                    className="text-[10px] h-7 px-2 border-amber-200 bg-amber-100 text-amber-600 dark:bg-amber-950/40 shrink-0 self-end sm:self-auto opacity-75 cursor-not-allowed"
                                                  >
                                                    Requested
                                                  </Button>
                                                </div>
                                              )
                                            }

                                            if (isRejected) {
                                              const isRequestAgainAllowed = client.allowRequestAgain !== false
                                              return (
                                                <div className="mt-2 ml-6 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-[11px] text-red-850 dark:text-red-300 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                                     onClick={(e) => e.stopPropagation()}
                                                >
                                                  <div className="flex items-start gap-1">
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                    <span>Access request rejected{activeReq.rejectionReason ? `: ${activeReq.rejectionReason}` : "."}</span>
                                                  </div>
                                                  {isRequestAgainAllowed && (
                                                    <Button
                                                      type="button"
                                                      size="sm"
                                                      variant="outline"
                                                      className="text-[10px] h-7 px-2 border-red-300 hover:bg-red-100 dark:hover:bg-red-950 text-red-900 dark:text-red-200 shrink-0 self-end sm:self-auto cursor-pointer"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        setRequestAccessClient({ id: client.id, name: client.companyName })
                                                        setRequestNotes("")
                                                      }}
                                                    >
                                                      Request Again
                                                    </Button>
                                                  )}
                                                </div>
                                              )
                                            }

                                            return (
                                              <div className="mt-2 ml-6 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                                   onClick={(e) => e.stopPropagation()}
                                              >
                                                <div className="flex items-start gap-1">
                                                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                  <span>You can view this client, but cannot create boq unless assigned.</span>
                                                </div>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="outline"
                                                  className="text-[10px] h-7 px-2 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-900 dark:text-amber-200 shrink-0 self-end sm:self-auto cursor-pointer"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    setRequestAccessClient({ id: client.id, name: client.companyName })
                                                    setRequestNotes("")
                                                  }}
                                                >
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

                  <FormField
                    control={form.control}
                    name="customerSegment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Segment <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled>
                          <FormControl>
                            <SelectTrigger className="bg-muted/30">
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

                  {selectedClientObj && (
                    <div className="p-3 border rounded-lg bg-muted/40 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contact Person:</span>
                        <span className="font-semibold">{selectedClientObj.contactPerson || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TRN Number:</span>
                        <span className="font-mono font-semibold">{selectedClientObj.trn || "Not Registered"}</span>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="projectName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Corporate HQ Fitout" {...field} disabled={isRevision} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {userRole === "SUPER_ADMIN" && !isRevision && (
                    <FormField
                      control={form.control}
                      name="boqNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>BOQ Number (Optional Override)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. D4000-1" {...field} />
                          </FormControl>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Leave blank to auto-generate. If provided, this exact number will be used.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* BOQ Specs Card */}
              <Card className="rounded-xl shadow-sm border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">BOQ Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
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
                          <FormLabel>Valid Until</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => {
                      const displayOptions: { id: string; name: string }[] = [...paymentTermsOptions]
                      if (field.value && !displayOptions.some(o => o.name === field.value)) {
                        displayOptions.unshift({ id: "current-selected", name: field.value })
                      }
                      if (displayOptions.length === 0) {
                        displayOptions.push(
                          { id: "1", name: "100% Advance" },
                          { id: "2", name: "50% Advance, 50% on Delivery" },
                          { id: "3", name: "100% on Delivery" },
                          { id: "4", name: "30 Days PDC" }
                        )
                      }
                      return (
                        <FormItem>
                          <FormLabel>Payment Terms</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select terms" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {displayOptions.map((term) => (
                                <SelectItem key={term.id || term.name} value={term.name}>
                                  {term.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />

                  {isManagerOrAdmin && (
                    <FormField
                      control={form.control}
                      name="preparedById"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interior Design Consultant <span className="text-red-500">*</span></FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select consultant">
                                  {users.find(u => u.id === field.value)?.name || "Select consultant"}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name} {u.role && `(${u.role})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="space-y-4 pt-2 border-t border-dashed">
                    <FormField
                      control={form.control}
                      name="salesAgentName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sales Agent Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter sales agent name" {...field} />
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
                          <FormLabel>Sales Agent Title/Designation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Sales Executive, Sales Manager" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="salesAgentContactNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sales Agent Contact Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. +971 50 123 4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Line Items Card */}
            <Card className="rounded-xl shadow-sm border bg-card">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  Line Items Catalog
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                {batches.map((batch, batchIdx) => {
                  const batchItems = fields
                    .map((field, index) => ({ field, index, item: watchItems[index] }))
                    .filter(x => x.item?.batchHeading === batch.name)

                  const batchSubtotal = batchItems.reduce((acc, { item }) => {
                    if (!item) return acc
                    const qty = Number(item.quantity) || 0
                    const price = Number(item.unitPrice) || 0
                    const discPercent = Number(item.discount) || 0
                    const discAmt = price * (discPercent / 100)
                    return acc + (price - discAmt) * qty
                  }, 0)

                  return (
                    <div
                      key={batch.id}
                      draggable
                      onDragStart={(e) => handleBatchDragStart(e, batch.id)}
                      onDragOver={(e) => handleBatchDragOver(e, batch.id)}
                      onDrop={(e) => handleBatchDrop(e, batch.id)}
                      className={cn(
                        "border-2 rounded-xl bg-card p-5 space-y-4 transition-all duration-300 relative border-border hover:border-primary/30 shadow-sm",
                        draggedBatchId === batch.id && "opacity-50",
                        dragOverBatchId === batch.id && "border-primary bg-primary/5 scale-[1.01]"
                      )}
                    >
                      {/* Batch Header Bar */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 w-full sm:flex-grow">
                          <div
                            className="batch-drag-handle flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background hover:bg-muted text-foreground cursor-grab active:cursor-grabbing text-xs font-semibold select-none border border-border shrink-0 shadow-sm"
                            title="Drag to reorder sections"
                          >
                            <GripVertical className="h-4 w-4" />
                            <span>Section</span>
                          </div>
                          
                          <BatchHeadingInput
                            value={batch.name}
                            onChange={(newName) => handleRenameBatch(batch.id, newName)}
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={batchIdx === 0}
                            onClick={() => {
                              const newBatches = [...batches]
                              const temp = newBatches[batchIdx - 1]
                              newBatches[batchIdx - 1] = newBatches[batchIdx]
                              newBatches[batchIdx] = temp
                              setBatches(newBatches)
                              reorderFlatItemsByBatches(newBatches)
                            }}
                            className="h-8 w-8 hover:bg-muted/80 rounded-lg"
                            title="Move Section Up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={batchIdx === batches.length - 1}
                            onClick={() => {
                              const newBatches = [...batches]
                              const temp = newBatches[batchIdx + 1]
                              newBatches[batchIdx + 1] = newBatches[batchIdx]
                              newBatches[batchIdx] = temp
                              setBatches(newBatches)
                              reorderFlatItemsByBatches(newBatches)
                            }}
                            className="h-8 w-8 hover:bg-muted/80 rounded-lg"
                            title="Move Section Down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          
                          <span className="text-xs font-bold text-foreground bg-background px-3 py-1.5 rounded-lg border border-border shadow-sm ml-2">
                            {batchItems.length} Products
                          </span>
                          
                          {batchItems.length === 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBatch(batch.id)}
                              className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer ml-1"
                              title="Delete empty section"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Batch Items List */}
                      <div className="space-y-6">
                        {batchItems.length === 0 ? (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault()
                              setDragOverBatchId(batch.id)
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              if (draggedIndex !== null) {
                                form.setValue(`items.${draggedIndex}.batchHeading`, batch.name, { shouldDirty: true })
                                const currentItems = form.getValues("items") || []
                                move(draggedIndex, currentItems.length - 1)
                                setDraggedIndex(null)
                                setDragOverBatchId(null)
                              }
                            }}
                            className={cn(
                              "border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 text-center text-xs text-muted-foreground bg-muted/10 transition-colors",
                              dragOverBatchId === batch.id && "border-primary bg-primary/5"
                            )}
                          >
                            No products in this section. Drag a product here or click "Add Catalog Product" / "Add Custom Product".
                          </div>
                        ) : (
                          batchItems.map(({ field, index }) => {
                            const showDetails = !!(watchItems[index]?.productId || watchItems[index]?.priceSource === "manual")
                            const isFirstInBatch = batchItems[0]?.index === index
                            const isLastInBatch = batchItems[batchItems.length - 1]?.index === index

                            return (
                              <div
                                key={field.id}
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation()
                                  handleDragStart(e, index)
                                }}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => {
                                  e.stopPropagation()
                                  handleDrop(e, index)
                                }}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                  "group relative p-6 border rounded-xl bg-background shadow-sm hover:shadow-md transition-all duration-300 border-border hover:border-primary/40 space-y-4",
                                  dragOverIndex === index && "border-primary bg-primary/5 scale-[1.01]",
                                  draggedIndex === index && "opacity-50"
                                )}
                              >
                                {/* Drag Handle & Mobile Ordering Fallback Row */}
                                <div className="flex items-center gap-2 border-b border-border pb-3 mb-2">
                                  <div
                                    className="drag-handle flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground cursor-grab active:cursor-grabbing text-xs font-semibold select-none border border-border shadow-sm"
                                    title="Click and drag to reorder item"
                                  >
                                    <GripVertical className="h-3.5 w-3.5 shrink-0" />
                                    <span>☰ Drag</span>
                                  </div>
                                  
                                  {watchItems[index]?.isCostingRequired && (
                                    <Badge variant="destructive" className="text-xs px-2 py-0.5 shadow-sm border border-red-500/30 bg-red-500 hover:bg-red-600">
                                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                      Costing Required
                                    </Badge>
                                  )}

                                  <div className="flex items-center gap-1 ml-auto">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-md hover:bg-muted/80"
                                      disabled={isFirstInBatch}
                                      onClick={() => handleMoveItemInBatch(index, "up")}
                                      title="Move Up"
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-md hover:bg-muted/80"
                                      disabled={isLastInBatch}
                                      onClick={() => handleMoveItemInBatch(index, "down")}
                                      title="Move Down"
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </div>
                        <span className="text-xs text-muted-foreground/80 font-medium ml-auto bg-muted/40 px-2 py-0.5 rounded-md border border-muted-foreground/5">
                          Item #{index + 1}
                        </span>
                      </div>

                      {/* Catalog Autopopulate Select Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary shrink-0">
                          <Sparkles className="h-3.5 w-3.5" />
                          Select from Product Catalog:
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                          <div className="w-full sm:flex-1">
                            <ProductSearchSelect
                              productId={watchItems[index]?.productId}
                              products={products}
                              watchSegment={watchSegment}
                              onProductSelect={(prodId) => handleProductSelect(index, prodId)}
                              onCustomProductClick={() => {
                                form.setValue(`items.${index}.productId`, "", { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.priceSource`, "manual", { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.description`, "", { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.productDescription`, "", { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.categoryName`, "Chairs", { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.chairType`, "", { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.quantity`, 1, { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.basePrice`, 0, { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.unitPrice`, 0, { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.margin`, 0, { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.discount`, 0, { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.specifications`, "", { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.productNotes`, "", { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.customImageUrl`, "", { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.saveToCatalog`, false, { shouldValidate: true, shouldDirty: true })
                              }}
                            />
                          </div>
                        </div>
                      </div>



                      {(() => {
                        const isCustom = watchItems[index]?.priceSource === "manual" && !watchItems[index]?.productId
                        
                        if (!showDetails) return null;


                        if (isCustom) {
                          return (
                            <div className={cn("flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-top-1 duration-200", isEstimator && "pointer-events-none opacity-60")}>
                              
                              {/* TOP ROW: Product Identity */}
                              <div className="flex flex-col xl:flex-row gap-6">
                                {/* Image Upload - Left Side */}
                                <div className="w-full xl:w-48 shrink-0 space-y-2">
                                  <FormLabel className="text-xs font-semibold text-foreground">Product Image</FormLabel>
                                  {watchItems[index]?.customImageUrl ? (
                                    <div className="flex flex-col items-center gap-3 p-3 border rounded-xl bg-muted/30">
                                      <div className="h-32 w-32 border rounded-lg bg-white overflow-hidden relative flex items-center justify-center shadow-sm">
                                        <img src={watchItems[index]?.customImageUrl || ""} alt="Preview" className="object-contain h-full w-full" />
                                        {uploadingImage && cropperLineIndex === index && (
                                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex gap-2 w-full">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setCropperLineIndex(index)
                                            setRawImageSrc(watchItems[index]?.customImageUrl || "")
                                            setIsCropperOpen(true)
                                          }}
                                          className="text-[11px] py-1 h-7 flex-1"
                                        >
                                          Crop
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => form.setValue(`items.${index}.customImageUrl`, "", { shouldValidate: true, shouldDirty: true })}
                                          className="text-[11px] py-1 h-7 text-destructive hover:bg-destructive/10 hover:text-destructive flex-1"
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className={cn(
                                        "border-2 border-dashed rounded-xl p-4 h-[178px] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all bg-muted/20 hover:bg-muted/40 hover:border-primary/50",
                                        uploadingImage && cropperLineIndex === index && "opacity-50 pointer-events-none"
                                      )}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => {
                                        e.preventDefault()
                                        const file = e.dataTransfer.files?.[0]
                                        if (file && file.type.startsWith("image/")) {
                                          setCropperLineIndex(index)
                                          const reader = new FileReader()
                                          reader.onloadend = () => {
                                            setRawImageSrc(reader.result as string)
                                            setIsCropperOpen(true)
                                          }
                                          reader.readAsDataURL(file)
                                        }
                                      }}
                                      onClick={() => {
                                        const input = document.getElementById(`image-upload-input-${index}`)
                                        input?.click()
                                      }}
                                    >
                                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <UploadCloud className="h-5 w-5" />
                                      </div>
                                      <span className="text-[11px] font-semibold text-muted-foreground text-center px-2">
                                        Click or drag image to upload
                                      </span>
                                      <input
                                        id={`image-upload-input-${index}`}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) {
                                            setCropperLineIndex(index)
                                            const reader = new FileReader()
                                            reader.onloadend = () => {
                                              setRawImageSrc(reader.result as string)
                                              setIsCropperOpen(true)
                                            }
                                            reader.readAsDataURL(file)
                                          }
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Product Details - Right Side */}
                                <div className="flex-1 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.description`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-xs font-semibold text-foreground">Product Name *</FormLabel>
                                          <FormControl>
                                            <Input placeholder="Enter product name" {...field} className="bg-muted/10 focus-visible:bg-background" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    {isAdminOrSuperAdmin && (
                                      <FormField
                                        control={form.control}
                                        name={`items.${index}.saveToCatalog`}
                                        render={({ field }) => (
                                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/10 h-[68px] mt-0 md:mt-5">
                                            <div className="space-y-0.5 flex-1 pr-2">
                                              <FormLabel className="text-xs font-semibold text-muted-foreground block">Save to Product Catalog</FormLabel>
                                              <span className="text-[10px] text-muted-foreground block leading-tight">
                                                Add this custom product to the database.
                                              </span>
                                            </div>
                                            <FormControl>
                                              <Switch
                                                checked={field.value || false}
                                                onCheckedChange={field.onChange}
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.categoryName`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-xs font-semibold text-foreground">Category *</FormLabel>
                                          <Select
                                            onValueChange={(val) => {
                                              field.onChange(val)
                                              if (val && val.toLowerCase() !== "chairs" && val.toLowerCase() !== "chair") {
                                                form.setValue(`items.${index}.chairType`, "")
                                              }
                                            }}
                                            value={field.value || (categoryOptions[0] || "Chairs")}
                                          >
                                            <FormControl>
                                              <SelectTrigger className="bg-muted/10 focus:bg-background">
                                                <SelectValue placeholder="Category" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {categoryOptions.map((catName) => (
                                                <SelectItem key={catName} value={catName}>
                                                  {catName === "General" ? "General / Other" : catName}
                                                </SelectItem>
                                              ))}
                                              {field.value && !categoryOptions.includes(field.value) && (
                                                <SelectItem key={field.value} value={field.value}>
                                                  {field.value}
                                                </SelectItem>
                                              )}
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {(watchItems[index]?.categoryName?.toLowerCase() === "chairs" || watchItems[index]?.categoryName?.toLowerCase() === "chair") && (
                                      <FormField
                                        control={form.control}
                                        name={`items.${index}.chairType`}
                                        render={({ field }) => (
                                          <FormItem className="space-y-1">
                                            <FormLabel className="text-xs font-semibold text-foreground">Chair Type *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                              <FormControl>
                                                <SelectTrigger className="bg-muted/10 focus:bg-background">
                                                  <SelectValue placeholder="Chair Type" />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                <SelectItem value="Task Chair">Task Chair</SelectItem>
                                                <SelectItem value="Executive Chair">Executive Chair</SelectItem>
                                                <SelectItem value="Ergonomic Chair">Ergonomic Chair</SelectItem>
                                                <SelectItem value="Visitor Chair">Visitor Chair</SelectItem>
                                                <SelectItem value="Lounge Chair">Lounge Chair</SelectItem>
                                                <SelectItem value="Stool">Stool</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    )}
                                  </div>

                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.productDescription`}
                                    render={({ field }) => {
                                      const valLength = (field.value || "").length
                                      return (
                                        <FormItem className="space-y-1">
                                          <div className="flex justify-between items-center">
                                            <FormLabel className="text-xs font-semibold text-foreground">Product Description</FormLabel>
                                            <span className="text-[9px] font-medium text-muted-foreground">
                                              {valLength} chars
                                            </span>
                                          </div>
                                          <FormControl>
                                            <Textarea
                                              placeholder="Premium ergonomic chair designed for long-hour comfort..."
                                              {...field}
                                              rows={2}
                                              className="resize-none bg-muted/10 focus-visible:bg-background text-xs min-h-[50px]"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )
                                    }}
                                  />
                                </div>
                              </div>

                              {/* MIDDLE ROW: Specs & Notes */}
                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-xl border border-border/50">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.specifications`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-1 flex-1 flex flex-col">
                                      <FormLabel className="text-xs font-semibold text-foreground">BOQ Specifications</FormLabel>
                                      <FormControl className="flex-1">
                                        <div className="h-full min-h-[160px]">
                                          <RichTextEditor
                                            placeholder="Technical specs, dimensions, materials..."
                                            value={field.value || ""}
                                            onChange={(val) => field.onChange(val)}
                                          />
                                        </div>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`items.${index}.productNotes`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-1 h-full flex flex-col">
                                      <FormLabel className="text-xs font-semibold text-foreground">Special / Customization Notes</FormLabel>
                                      <FormControl className="flex-1">
                                        <Textarea
                                          placeholder="Special instructions or customer specific requirements..."
                                          {...field}
                                          className="resize-none bg-background focus-visible:bg-background text-xs h-[160px]"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              {/* BOTTOM ROW: Pricing & Actions */}
                              {/* Inject cost breakdown above pricing */}

                              
                              {/* Cost Breakdown Section for Estimators */}
                              {(watchItems[index]?.isCostingRequired || isEstimator) && (
                                <div className="mt-4 bg-red-50/50 p-5 rounded-xl border border-red-500/20">
                                  <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                    <span className="text-sm font-bold text-red-900">Cost Estimation Breakdown</span>
                                  </div>
                                  <div className={cn("flex flex-wrap gap-4", !isEstimator && "pointer-events-none opacity-80")}>
                                    {["materialCost", "laborCost", "installationCost", "transportCost", "overheadCost"].map((costField) => (
                                      <FormField
                                        key={costField}
                                        control={form.control}
                                        name={`items.${index}.${costField}` as any}
                                        render={({ field }) => (
                                          <FormItem className="space-y-1.5 w-28 shrink-0">
                                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">{costField.replace('Cost', ' Cost')}</FormLabel>
                                            <FormControl>
                                              <NumericInput
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="h-9 text-xs font-mono bg-white"
                                                value={field.value || ""}
                                                onChange={(val) => {
                                                  field.onChange(val === "" ? "" : (parseFloat(val) || 0));
                                                  // Optional: Auto-update unitCost or BasePrice if needed
                                                }}
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}


                              <div className={cn("flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-end bg-primary/[0.03] p-5 rounded-xl border border-primary/10", isEstimator && "pointer-events-none opacity-60")}>
                                <div className="flex flex-col gap-3 w-full xl:w-auto">
                                  <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-foreground">Pricing Details</span>
                                      <span className="text-amber-600 font-medium text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Manual Base Price Source</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap md:flex-nowrap gap-3 items-end">
                                    {/* Quantity */}
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.quantity`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1.5 w-20 shrink-0">
                                          <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Qty</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="0"
                                              className="h-9 text-xs font-medium bg-background"
                                              value={field.value}
                                              onChange={(val) => field.onChange(val === "" ? "" : (parseInt(val) || 0))}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {/* Base Price */}
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.basePrice`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1.5 w-28 shrink-0">
                                          <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Base Price</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              className="h-9 text-xs font-mono bg-background"
                                              value={field.value}
                                              onChange={(val) => recalculateRow(index, "basePrice", val)}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {/* Margin % */}
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.margin`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1.5 w-20 shrink-0">
                                          <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Margin %</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="-100"
                                              max="99.9"
                                              step="0.1"
                                              className="h-9 text-xs font-mono bg-background"
                                              value={field.value}
                                              onChange={(val) => recalculateRow(index, "margin", val)}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {/* Unit Price */}
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.unitPrice`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1.5 w-28 shrink-0">
                                          <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Unit Price</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              className="h-9 text-xs font-mono bg-muted/50 cursor-not-allowed"
                                              disabled
                                              value={field.value}
                                              onChange={(val) => recalculateRow(index, "unitPrice", val)}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {/* Discount */}
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.discount`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1.5 w-24 shrink-0">
                                          <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Discount %</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="0"
                                              max="100"
                                              step="0.1"
                                              className="h-9 text-xs font-mono bg-background"
                                              value={field.value}
                                              onChange={(val) => field.onChange(val === "" ? "" : (parseFloat(val) || 0))}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {/* Line Total */}
                                    <div className="space-y-1.5 w-32 shrink-0 flex flex-col justify-end">
                                      <span className="text-[10px] uppercase font-bold text-primary block">Line Total</span>
                                      <div className="h-9 px-3 rounded-md bg-primary text-primary-foreground flex items-center justify-between font-semibold font-mono text-[12px] shadow-sm">
                                        <span className="opacity-70 text-[10px]">AED</span>
                                        <span>
                                          {(() => {
                                            const qty = Number(watchItems[index]?.quantity) || 0
                                            const price = Number(watchItems[index]?.unitPrice) || 0
                                            const discPercent = Number(watchItems[index]?.discount) || 0
                                            const discAmt = price * (discPercent / 100)
                                            return ((price - discAmt) * qty).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-1">
                                    <Info className="h-3 w-3 shrink-0" />
                                    <span>Formula: Base Price ÷ (1 - Margin %)</span>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto shrink-0 mt-2 xl:mt-0 pb-1">
                                  {fields.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => remove(index)}
                                      className="text-destructive hover:bg-destructive/10 h-9 text-[11px] px-4"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                                      Remove Line
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 text-[11px] px-4 bg-background"
                                    onClick={() => insert(index + 1, { productId: "", priceSource: "manual", description: "", specifications: "", productNotes: "", quantity: 1, basePrice: 0, unitPrice: 0, discount: 0, margin: 0, manualMargin: "", customImageUrl: "", productDescription: "", categoryName: "Chairs", chairType: "", batchHeading: watchItems[index]?.batchHeading || "", saveToCatalog: false, isCostingRequired: true, type: "custom", materialCost: 0, laborCost: 0, installationCost: 0, transportCost: 0, overheadCost: 0 })}
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-2" />
                                    Add Custom Item
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        }


                        else {
                          // Standard Product
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                              {/* Left Column: Image & Title */}
                              <div className="xl:col-span-4 space-y-4 flex flex-col">
                                  {/* Thumbnail Image & Crop Controls */}
                                  {(() => {
                                    const selectedProd = products.find(p => p.id === watchItems[index]?.productId)
                                    const imageUrl = watchItems[index]?.customImageUrl || (selectedProd ? (selectedProd.imageUrl || "") : "")
                                    return (
                                      <div className="flex flex-col gap-2 p-3 border rounded-xl bg-muted/30 w-full">
                                        <div className="flex items-center gap-4">
                                          <div className="h-20 w-20 border rounded-lg bg-white overflow-hidden relative shrink-0 flex items-center justify-center shadow-sm">
                                            {imageUrl ? (
                                              <img src={imageUrl} alt="Preview" className="object-contain h-full w-full" />
                                            ) : (
                                              <span className="text-[10px] text-muted-foreground text-center px-1 font-medium">No Image</span>
                                            )}
                                            {uploadingImage && cropperLineIndex === index && (
                                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            {imageUrl && (
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  setCropperLineIndex(index)
                                                  setRawImageSrc(imageUrl)
                                                  setIsCropperOpen(true)
                                                }}
                                                className="text-xs py-1 h-8 cursor-pointer"
                                              >
                                                Crop / Adjust
                                              </Button>
                                            )}
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                const input = document.getElementById(`catalog-image-upload-input-${index}`)
                                                input?.click()
                                              }}
                                              className="text-xs py-1 h-8 cursor-pointer"
                                            >
                                              Upload Custom
                                            </Button>
                                            <input
                                              id={`catalog-image-upload-input-${index}`}
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                  setCropperLineIndex(index)
                                                  const reader = new FileReader()
                                                  reader.onloadend = () => {
                                                    setRawImageSrc(reader.result as string)
                                                    setIsCropperOpen(true)
                                                  }
                                                  reader.readAsDataURL(file)
                                                }
                                              }}
                                            />
                                            {watchItems[index]?.customImageUrl && (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => form.setValue(`items.${index}.customImageUrl`, "", { shouldValidate: true, shouldDirty: true })}
                                                className="text-xs py-1 h-8 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                              >
                                                Reset
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })()}
                                  
                                  {/* Product Title & Metadata Badges */}
                                  <div className="flex-1 space-y-2">
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.description`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-xs font-semibold text-foreground">Product Name</FormLabel>
                                          <FormControl>
                                            <Input placeholder="Product name" {...field} className="bg-muted/30 text-foreground text-xs cursor-not-allowed font-semibold opacity-100 disabled:opacity-100" disabled />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    {(() => {
                                      const selectedProd = products.find(p => p.id === watchItems[index]?.productId)
                                      if (!selectedProd) return null
                                      return (
                                        <div className="space-y-1.5 pt-1">
                                          <div className="flex flex-wrap gap-1">
                                            <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal bg-muted/40 border-muted">
                                              SKU: {selectedProd.productCode}
                                            </Badge>
                                            {selectedProd.category?.name && (
                                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal bg-muted/40 border-muted">
                                                Cat: {selectedProd.category.name}
                                              </Badge>
                                            )}
                                            {selectedProd.chairType && (
                                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal bg-muted/40 border-muted">
                                                Type: {selectedProd.chairType}
                                              </Badge>
                                            )}
                                            {selectedProd.warranty && (
                                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal bg-emerald-50 text-emerald-700 border-emerald-200">
                                                Warranty: {selectedProd.warranty}
                                              </Badge>
                                            )}
                                            {selectedProd.dimensions && (
                                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal bg-blue-50 text-blue-700 border-blue-200">
                                                Dims: {selectedProd.dimensions}
                                              </Badge>
                                            )}
                                          </div>
                                          {selectedProd.description && (
                                            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight mt-1 italic" title={selectedProd.description}>
                                              {selectedProd.description}
                                            </p>
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </div>
                              </div>

                              {/* Middle Column: Specs & Notes */}
                              <div className="xl:col-span-4 space-y-4 xl:border-l border-muted xl:pl-6 flex flex-col">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.specifications`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-1 flex-1 flex flex-col">
                                      <FormLabel className="text-xs font-semibold text-foreground">BOQ Specifications</FormLabel>
                                      <FormControl className="flex-1">
                                        <div className="h-full min-h-[150px]">
                                          <RichTextEditor
                                            placeholder="Technical specs, dimensions, materials..."
                                            value={field.value || ""}
                                            onChange={(val) => field.onChange(val)}
                                          />
                                        </div>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`items.${index}.productNotes`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-1">
                                      <FormLabel className="text-xs font-semibold text-foreground">Special / Customization Notes</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Special instructions or customer specific requirements..."
                                          {...field}
                                          rows={3}
                                          className="resize-none bg-muted/10 focus-visible:bg-background text-xs min-h-[60px]"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              {/* Right Column: Pricing Controls */}
                              <div className="xl:col-span-4 space-y-4 xl:border-l border-muted xl:pl-6 flex flex-col justify-between">
                                <div className="space-y-4">
                                  {/* Price Source & Helper Row */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-2.5 rounded-md border border-muted/50">
                                    <div className="space-y-0.5">
                                      <span className="text-xs font-semibold text-foreground">Base Price Source</span>
                                      <div className="text-[10px] text-muted-foreground">
                                        {(() => {
                                          const info = getSegmentPriceInfo(watchItems[index]?.productId)
                                          if (watchItems[index]?.priceSource === "standard" && info) {
                                            return (
                                              <span className="text-primary font-medium flex items-center gap-1">
                                                <Check className="h-3 w-3 text-emerald-500" />
                                                Using {info.label}: AED {info.price.toFixed(2)}
                                              </span>
                                            )
                                          }
                                          return <span className="text-amber-600 font-medium">Using Manual Base Price</span>
                                        })()}
                                      </div>
                                    </div>

                                    {/* Pricing Segment Toggle */}
                                    <div className="flex items-center gap-1 bg-background border border-muted-foreground/10 p-1 rounded-md shrink-0">
                                      <button
                                        type="button"
                                        disabled={!watchItems[index]?.productId}
                                        onClick={() => {
                                          form.setValue(`items.${index}.priceSource`, "standard", { shouldValidate: true, shouldDirty: true })
                                          recalculateRow(index, "priceSource", "standard")
                                        }}
                                        className={cn(
                                          "px-2 py-1 text-[10px] font-medium rounded transition-all",
                                          watchItems[index]?.priceSource === "standard"
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground disabled:opacity-40"
                                        )}
                                      >
                                        Standard Price
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          form.setValue(`items.${index}.priceSource`, "manual", { shouldValidate: true, shouldDirty: true })
                                          recalculateRow(index, "priceSource", "manual")
                                        }}
                                        className={cn(
                                          "px-2 py-1 text-[10px] font-medium rounded transition-all",
                                          watchItems[index]?.priceSource === "manual"
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                        )}
                                      >
                                        Manual Price
                                      </button>
                                    </div>
                                  </div>

                                  {/* 3x2 Grid for Pricing */}
                                  <div className="grid grid-cols-3 gap-3">
                                    {/* Quantity */}
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.quantity`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-[11px] font-semibold text-foreground">Quantity</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="0"
                                              className="h-8 text-xs font-medium"
                                              value={field.value}
                                              onChange={(val) => {
                                                field.onChange(val === "" ? "" : (parseInt(val) || 0))
                                              }}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {/* Base Price */}
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.basePrice`}
                                      render={({ field }) => {
                                        const isStandard = watchItems[index]?.priceSource === "standard"
                                        return (
                                          <FormItem className="space-y-1">
                                            <FormLabel className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                                              Base Price
                                              {isStandard && <Lock className="h-3 w-3 text-muted-foreground" />}
                                            </FormLabel>
                                            <FormControl>
                                              <NumericInput
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className={cn("h-8 text-xs font-mono", isStandard && "bg-muted/30 text-foreground cursor-not-allowed font-semibold opacity-100 disabled:opacity-100")}
                                                disabled={isStandard}
                                                value={field.value}
                                                onChange={(val) => {
                                                  recalculateRow(index, "basePrice", val)
                                                }}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )
                                      }}
                                    />

                                    {/* Margin % */}
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.margin`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-[11px] font-semibold text-foreground">Margin (%)</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="-100"
                                              max="99.9"
                                              step="0.1"
                                              className="h-8 text-xs font-mono"
                                              value={field.value}
                                              onChange={(val) => {
                                                recalculateRow(index, "margin", val)
                                              }}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {/* Unit Price (AED) */}
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.unitPrice`}
                                      render={({ field }) => {
                                        const isStandard = watchItems[index]?.priceSource === "standard"
                                        return (
                                          <FormItem className="space-y-1">
                                            <FormLabel className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                                              Unit Price
                                              {isStandard && <Lock className="h-3 w-3 text-muted-foreground" />}
                                            </FormLabel>
                                            <FormControl>
                                              <NumericInput
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className={cn("h-8 text-xs font-mono", isStandard && "bg-muted/30 text-foreground cursor-not-allowed font-semibold opacity-100 disabled:opacity-100")}
                                                disabled={isStandard}
                                                value={field.value}
                                                onChange={(val) => {
                                                  recalculateRow(index, "unitPrice", val)
                                                }}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )
                                      }}
                                    />

                                    {/* Discount (%) */}
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.discount`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-[11px] font-semibold text-foreground">Discount (%)</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="0"
                                              max="100"
                                              step="0.1"
                                              className="h-8 text-xs font-mono text-destructive focus-visible:ring-destructive"
                                              value={field.value}
                                              onChange={(val) => {
                                                field.onChange(val === "" ? "" : (parseFloat(val) || 0))
                                              }}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {/* Calculated Line Total Display */}
                                    <div className="space-y-1 flex flex-col justify-end">
                                      <span className="text-[11px] font-semibold text-muted-foreground block">Line Total</span>
                                      <div className="h-8 px-2 rounded-md bg-primary/5 border border-primary/10 flex items-center justify-between text-primary font-semibold font-mono text-[11px] shadow-inner">
                                        <span className="opacity-70">AED</span>
                                        <span>
                                          {(() => {
                                            const qty = Number(watchItems[index]?.quantity) || 0
                                            const price = Number(watchItems[index]?.unitPrice) || 0
                                            const discPercent = Number(watchItems[index]?.discount) || 0
                                            const discAmt = price * (discPercent / 100)
                                            return ((price - discAmt) * qty).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Visual Helper + Delete Row + Add Custom Item */}
                                <div className="flex flex-col gap-2 pt-4 mt-auto">
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-muted/20 px-2 py-1 rounded">
                                    <Info className="h-3 w-3 text-muted-foreground/75 shrink-0" />
                                    <span>Formula: Base Price ÷ (1 - Margin %)</span>
                                  </div>
                                  
                                  <div className="flex gap-2 w-full">
                                    {fields.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => remove(index)}
                                        className="text-destructive hover:bg-destructive/10 flex-1 h-8 text-[11px]"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                                        Remove Line
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }

                      })()}
                            </div>
                          )})
                        )}
                      </div>

                      {/* Batch Container Footer */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4 mt-2">
                        <div className="text-xs font-bold text-slate-700">
                          {batch.name} Subtotal: AED {formatCurrency(batchSubtotal)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddItemToBatch(batch.name, false)}
                            className="h-8 text-[11px] border-primary/20 hover:border-primary/40 text-primary hover:bg-primary/5 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Catalog Product
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddItemToBatch(batch.name, true)}
                            className="h-8 text-[11px] border-accent/20 hover:border-accent/40 text-accent hover:bg-accent/5 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Custom Product
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-center pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddBatch}
                    className="flex items-center gap-2 cursor-pointer border-primary/30 text-primary hover:bg-primary/5 shadow-sm px-6"
                  >
                    <Plus className="h-4 w-4" />
                    Add Section / Batch
                  </Button>
                </div>
              </CardContent>

              {/* Financial Calculation Footer */}
              <CardFooter className="border-t pt-8 bg-muted/5 shadow-inner flex flex-col gap-8 w-full">
                {/* 1. Discount & Tax Settings Section */}
                <div className="w-full space-y-4">
                  <h4 className="text-sm font-semibold text-foreground tracking-wider uppercase border-b pb-2">Discount & Tax Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end bg-card p-5 rounded-xl border shadow-sm">
                    {/* VAT Mode */}
                    <FormField
                      control={form.control}
                      name="vatMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-foreground">
                            VAT Mode
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10 bg-background border-muted-foreground/20">
                                <SelectValue placeholder="Select VAT Mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="EXCLUDING">Include Tax</SelectItem>
                              <SelectItem value="INCLUDING">Exclude Tax</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Special Discount Type */}
                    {(() => {
                      const hasDiscountAccess = true
                      const hasExistingDiscount = (watchSpecialDiscountType === "PERCENTAGE" || watchSpecialDiscountType === "FIXED") && 
                                                  Number(watchSpecialDiscountValue) > 0
                      const showDiscountFields = hasDiscountAccess || hasExistingDiscount
                      const isDiscountFieldsDisabled = !hasDiscountAccess

                      if (!showDiscountFields) return null

                      return (
                        <>
                          <FormField
                            control={form.control}
                            name="specialDiscountType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                  Special Discount Type
                                  {isDiscountFieldsDisabled && <Lock className="h-3 w-3 text-muted-foreground/50" />}
                                </FormLabel>
                                <Select
                                  onValueChange={(val) => {
                                    field.onChange(val === "none" ? null : val)
                                    if (val === "none") {
                                      form.setValue("specialDiscountValue", 0)
                                      form.setValue("specialDiscountReason", "")
                                    }
                                  }}
                                  value={field.value || "none"}
                                  disabled={isDiscountFieldsDisabled}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-10 bg-background border-muted-foreground/20">
                                      <SelectValue placeholder="No Discount" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">No Discount</SelectItem>
                                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                    <SelectItem value="FIXED">Fixed Amount (AED)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Special Discount Value */}
                          {watchSpecialDiscountType ? (
                            <FormField
                              control={form.control}
                              name="specialDiscountValue"
                              render={({ field }) => {
                                const val = field.value === 0 ? "" : field.value
                                return (
                                  <FormItem className="animate-in fade-in duration-200">
                                    <FormLabel className="text-xs font-semibold text-foreground">
                                      Discount Value {watchSpecialDiscountType === "PERCENTAGE" ? "(%)" : "(AED)"}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="h-10 bg-background border-muted-foreground/20 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={val}
                                        disabled={isDiscountFieldsDisabled}
                                        onChange={(e) => {
                                          const rawVal = e.target.value
                                          const numVal = rawVal === "" ? 0 : parseFloat(rawVal) || 0
                                          field.onChange(rawVal === "" ? "" : numVal)
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )
                              }}
                            />
                          ) : (
                            <div className="h-[68px] hidden md:block"></div>
                          )}

                          {/* Preview / Reason Block */}
                          {watchSpecialDiscountType && (
                            <div className="md:col-span-1 space-y-2 animate-in fade-in duration-200 h-[68px] flex flex-col justify-end">
                              {(() => {
                                const isSuperAdmin = userRole === "SUPER_ADMIN"
                                const allowedDiscount = isSuperAdmin ? 100 : (userPermissions?.maxDiscountPercent ?? 0)
                                
                                let currentAppliedDiscountPercent = 0
                                const discValue = Number(watchSpecialDiscountValue) || 0
                                if (discValue > 0) {
                                  if (watchSpecialDiscountType === "PERCENTAGE") {
                                    currentAppliedDiscountPercent = discValue
                                  } else if (watchSpecialDiscountType === "FIXED") {
                                    const baseForDiscount = subtotal + totalAdditionalCost
                                    currentAppliedDiscountPercent = baseForDiscount > 0 ? (discValue / baseForDiscount) * 100 : 0
                                  }
                                }

                                const isLimitExceeded = false

                                return (
                                  <div className="flex flex-col gap-1 w-full text-right bg-muted/50 rounded p-2 border border-muted">
                                     <span className="text-[10px] text-muted-foreground font-semibold uppercase">Discount Applied</span>
                                     <span className={cn("text-sm font-bold font-mono", isLimitExceeded ? "text-destructive" : "text-emerald-600 dark:text-emerald-500")}>
                                       - AED {specialDiscountAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                     </span>
                                  </div>
                                )
                              })()}
                            </div>
                          )}
                          
                          {/* Discount Reason & Limit Exceeded Row */}
                          {watchSpecialDiscountType && (
                            <div className="md:col-span-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                              <FormField
                                control={form.control}
                                name="specialDiscountReason"
                                render={({ field }) => (
                                  <FormItem className="animate-in fade-in duration-200">
                                    <FormLabel className="text-xs font-semibold text-foreground">Discount Reason (Optional)</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="e.g. Special Approval, Project Discount"
                                        className="h-10 bg-background border-muted-foreground/20"
                                        disabled={isDiscountFieldsDisabled}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              {/* Limit Exceeded Warning - Removed to allow all roles to apply unlimited discount */}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* 2. Bottom Row: Additional Costs & Calculation Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
                  {/* Left Column: Additional Cost Repeater */}
                  <div className="lg:col-span-7 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground tracking-wider uppercase border-b pb-2 flex items-center gap-2">
                      Additional Costs
                      {(() => {
                        const isSuperAdmin = userRole === "SUPER_ADMIN"
                        const isCreator = existingQuote?.preparedById === (session?.user as any)?.id
                        const isNewQuote = !existingQuote
                        const allowedAddCustomCharges = isSuperAdmin || isCreator || isRevision || isNewQuote ? true : (userPermissions?.canAddCustomCharges ?? false)
                        return !allowedAddCustomCharges && <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                      })()}
                    </h4>
                    
                    <div className="space-y-3 p-4 rounded-xl border bg-card shadow-sm">
                      {additionalFields.map((field, index) => {
                        const isSuperAdmin = userRole === "SUPER_ADMIN"
                        const isCreator = existingQuote?.preparedById === (session?.user as any)?.id
                        const isNewQuote = !existingQuote
                        const allowedAddCustomCharges = isSuperAdmin || isCreator || isRevision || isNewQuote ? true : (userPermissions?.canAddCustomCharges ?? false)
                        
                        return (
                          <div key={field.id} className="flex items-center gap-3 animate-in fade-in duration-200">
                            {/* Left side remove button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={additionalFields.length === 1 || !allowedAddCustomCharges}
                              onClick={() => removeAdditional(index)}
                              className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 cursor-pointer disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>

                            {/* Cost Item Description */}
                            <div className="flex-1">
                              <FormField
                                control={form.control}
                                name={`additionalCharges.${index}.name`}
                                render={({ field }) => (
                                  <FormControl>
                                    <Input
                                      placeholder="Enter cost item"
                                      className="h-9 bg-background border-muted-foreground/20"
                                      disabled={!allowedAddCustomCharges}
                                      {...field}
                                    />
                                  </FormControl>
                                )}
                              />
                            </div>

                            {/* Cost Item Amount */}
                            <div className="w-36">
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
                                          className="h-9 pl-10 pr-3 font-mono text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-background border-muted-foreground/20 w-full"
                                          disabled={!allowedAddCustomCharges}
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
                        )
                      })}

                      {(() => {
                        const isSuperAdmin = userRole === "SUPER_ADMIN"
                        const isCreator = existingQuote?.preparedById === (session?.user as any)?.id
                        const isNewQuote = !existingQuote
                        const allowedAddCustomCharges = isSuperAdmin || isCreator || isRevision || isNewQuote ? true : (userPermissions?.canAddCustomCharges ?? false)
                        
                        if (allowedAddCustomCharges) {
                          return (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => appendAdditional({ name: "", amount: "" })}
                              className="mt-3 text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Cost Item
                            </Button>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Financial Calculations Summary */}
                  <div className="lg:col-span-5 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground tracking-wider uppercase border-b pb-2">Calculation Breakdown</h4>
                    
                    <div className="bg-card p-6 rounded-xl border shadow-sm">
                      <div className="space-y-3.5 text-sm border-b border-muted-foreground/10 pb-4">
                        {/* Subtotal */}
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Subtotal (Products)</span>
                          <span className="font-medium font-mono text-foreground">AED {subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {/* Total Additional Cost */}
                        {totalAdditionalCost > 0 && (
                          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-500 font-medium animate-in fade-in duration-300">
                            <span className="text-muted-foreground">Additional Cost</span>
                            <span className="font-mono">+ AED {totalAdditionalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}

                        {/* Special Discount */}
                        {specialDiscountAmount > 0 && (
                          <div className="flex justify-between items-center text-destructive font-medium animate-in fade-in duration-300">
                            <span className="text-muted-foreground flex flex-col">
                              <span>Special Discount</span>
                              {form.watch("specialDiscountReason") && (
                                <span className="text-[10px] text-muted-foreground/85 italic max-w-[180px] truncate">
                                  Reason: {form.watch("specialDiscountReason")}
                                </span>
                              )}
                            </span>
                            <span className="font-mono">- AED {specialDiscountAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}

                        {/* Taxable Amount */}
                        {watchVatMode !== "INCLUDING" && (totalAdditionalCost > 0 || specialDiscountAmount > 0) && (
                          <div className="flex justify-between items-center pt-3 border-t border-dashed border-muted-foreground/20 animate-in fade-in duration-300">
                            <span className="text-muted-foreground font-semibold">Taxable Subtotal</span>
                            <span className="font-semibold font-mono text-foreground">AED {taxableAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}

                        {/* VAT */}
                        {watchVatMode !== "INCLUDING" && (
                          <div className="flex items-center justify-between text-muted-foreground/80 font-medium animate-in fade-in duration-300">
                            <span className="flex items-center gap-1.5">
                              VAT (5%)
                            </span>
                            <span className="font-mono flex items-center text-foreground">
                              AED {vatAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Grand Total / Total Payable */}
                      <div className="flex justify-between items-center text-xl font-bold pt-4 text-primary">
                        <span>{watchVatMode === "INCLUDING" ? "Total Payable" : "Grand Total"}</span>
                        <span className="font-mono text-2xl">AED {grandTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardFooter>
            </Card>

            {/* Submission Actions */}
            <div className="flex justify-end items-center gap-4 mt-6">
              {lastAutoSavedAt && (
                <span className="text-xs text-muted-foreground mr-auto flex items-center gap-1.5 animate-in fade-in duration-500">
                  {isAutoSaving && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  Last auto-saved: {lastAutoSavedAt.toLocaleTimeString()}
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => router.push("/boqs")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : isRevision ? (
                  "Save Revision"
                ) : (
                  "Compile & Create"
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}

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

      {/* Request Access Note Dialog */}
      <Dialog open={requestAccessClient !== null} onOpenChange={(open) => !open && setRequestAccessClient(null)}>
        <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
              <UserPlus className="h-5 w-5 text-orange-500" />
              Request Client Access
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Provide an optional note to justify your request for "{requestAccessClient?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Optional Note</label>
              <Textarea
                placeholder="e.g., Client wants to place a new boq for chairs..."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                rows={3}
                className="bg-slate-900 border-slate-800 text-xs text-white"
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
              className="text-xs h-9 text-slate-400 hover:text-white"
              disabled={requestingAccess}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleRequestAccessSubmit}
              disabled={requestingAccess}
              className="text-xs h-9 font-medium bg-orange-600 hover:bg-orange-500 text-white border-0"
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
    </div>
  )
}

export default function NewBOQPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading boq builder...</p>
      </div>
    }>
      <NewBOQForm />
    </Suspense>
  )
}
