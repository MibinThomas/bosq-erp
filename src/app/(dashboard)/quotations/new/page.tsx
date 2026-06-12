"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2, Save, Send, ArrowLeft, Loader2, Info, Sparkles, Lock, Check, ChevronsUpDown, Search, AlertCircle, RefreshCw } from "lucide-react"
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
import { ImageCropper } from "@/components/ui/image-cropper"
import { Image as ImageIcon, UploadCloud } from "lucide-react"

const quotationSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectName: z.string().min(1, "Project name is required"),
  customerSegment: z.enum(["Interior", "Dealer", "Direct", "Online"]),
  date: z.string(),
  validityDate: z.string(),
  deliveryDate: z.string().optional(),
  paymentTerms: z.string().min(1, "Payment terms is required"),
  preparedById: z.string().optional(),
  salesAgentId: z.string().optional(),
  salesAgentName: z.string().optional(),
  salesAgentContactNumber: z.string().optional(),
  deliveryCharge: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Delivery charge must be at least 0"),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().nullable().optional(),
      priceSource: z.enum(["standard", "manual"]).default("standard"),
      description: z.string().min(1, "Description is required"),
      specifications: z.string(),
      productNotes: z.string().optional(),
      quantity: z.union([z.number(), z.string()]).refine(val => (val === "" ? 1 : Number(val)) >= 1, "Quantity must be at least 1"),
      basePrice: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Base price must be at least 0"),
      unitPrice: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Price must be at least 0"),
      discount: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= 0, "Discount must be at least 0"),
      margin: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= -100, "Margin must be at least -100").refine(val => (val === "" ? 0 : Number(val)) < 100, "Margin must be less than 100%"),
      manualMargin: z.union([z.number(), z.string()]).optional(),
      customImageUrl: z.string().nullable().optional(),
      shortDescription: z.string().optional(),
      categoryName: z.string().optional(),
      chairType: z.string().optional(),
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

type QuotationFormValues = z.infer<typeof quotationSchema>

interface Client {
  id: string
  companyName: string
  contactPerson: string | null
  trn: string | null
  clientType: string | null
  status: string
}

interface Product {
  id: string
  productCode: string
  productName: string
  unitPrice: number
  interiorPrice?: number
  dealerPrice?: number
  directPrice?: number
  onlinePrice?: number
  specifications: string | null
  imageUrl: string | null
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
    else if (watchSegment === "Direct") basePrice = selectedProd.directPrice ?? selectedProd.unitPrice
    else if (watchSegment === "Online") basePrice = selectedProd.onlinePrice ?? selectedProd.unitPrice
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
        <Command>
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
                else if (watchSegment === "Direct") basePrice = product.directPrice ?? product.unitPrice
                else if (watchSegment === "Online") basePrice = product.onlinePrice ?? product.unitPrice

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

function NewQuotationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialClientId = searchParams.get("clientId") || ""
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER"

  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isQuickAddClientOpen, setIsQuickAddClientOpen] = useState(false)
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false)
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null)

  const [isRevision, setIsRevision] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [existingQuote, setExistingQuote] = useState<any>(null)
  const [revisionNotes, setRevisionNotes] = useState("")

  const [users, setUsers] = useState<any[]>([])
  const [userPermissions, setUserPermissions] = useState<any>(null)

  const [cropperLineIndex, setCropperLineIndex] = useState<number | null>(null)
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

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
      const uploadRes = await fetch("/api/upload", {
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
    fetch("/api/settings/users")
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
        }
      })
      .catch(err => console.error("Failed to load permissions", err))
  }, [])

  // Fetch clients and products catalog
  useEffect(() => {
    async function loadData() {
      try {
        const [clientsRes, productsRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/products"),
        ])
        if (!clientsRes.ok || !productsRes.ok) throw new Error("Failed to load catalog data")
        const clientsData = await clientsRes.json()
        const productsData = await productsRes.json()

        setClients(clientsData)
        setProducts(productsData)

        // Load details for revision or update if ID is provided
        const reviseId = searchParams.get("reviseId")
        const editId = searchParams.get("editId")
        const activeId = reviseId || editId

        if (activeId) {
          const fetchRes = await fetch(`/api/quotations/${activeId}`)
          if (fetchRes.ok) {
            const activeData = await fetchRes.json()
            setExistingQuote(activeData)
            if (reviseId) {
              setIsRevision(true)
            } else {
              setIsEdit(true)
            }

            // Populate form values
            form.reset({
              clientId: activeData.clientId,
              projectName: activeData.projectName || "",
              customerSegment: activeData.customerSegment || "Direct",
              preparedById: activeData.preparedById || "",
              salesAgentId: activeData.salesAgentId || (activeData.salesAgentName ? "manual" : (activeData.preparedById || "")),
              salesAgentName: activeData.salesAgentName || "",
              salesAgentContactNumber: activeData.salesAgentContactNumber || "",
              date: reviseId ? new Date().toISOString().split("T")[0] : activeData.date.split("T")[0],
              validityDate: reviseId ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : activeData.validityDate.split("T")[0],
              deliveryDate: activeData.deliveryDate ? new Date(activeData.deliveryDate).toISOString().split("T")[0] : new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              paymentTerms: activeData.paymentTerms || "50% Advance, 50% on Delivery",
              items: activeData.items.map((item: any) => {
                const marginVal = item.margin || 0
                const basePriceVal = item.unitPrice * (1 - marginVal / 100)
                return {
                  productId: item.productId || "",
                  priceSource: item.productId ? "standard" : "manual",
                  description: item.description,
                  specifications: item.specifications || "",
                  productNotes: item.productNotes || "",
                  quantity: item.quantity,
                  basePrice: Number(basePriceVal.toFixed(2)),
                  unitPrice: item.unitPrice,
                  discount: item.unitPrice > 0 ? Number(((item.discount || 0) / item.unitPrice * 100).toFixed(2)) : 0,
                  margin: marginVal,
                  manualMargin: marginVal,
                  customImageUrl: item.customImageUrl || "",
                  shortDescription: item.product?.shortDescription || "",
                  categoryName: item.product?.category?.name || "Chairs",
                  chairType: item.product?.chairType || "",
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

        form.reset({
          clientId: data.clientId,
          customerSegment: data.customerSegment || "Direct",
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
            priceSource: item.productId ? "standard" : "manual",
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
            shortDescription: item.shortDescription || "",
            categoryName: item.categoryName || "Chairs",
            chairType: item.chairType || "",
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

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema) as any,
    defaultValues: {
      clientId: initialClientId,
      projectName: "",
      customerSegment: "Direct",
      preparedById: (session?.user as any)?.id || "",
      salesAgentId: (session?.user as any)?.id || "",
      salesAgentName: (session?.user as any)?.name || "",
      salesAgentContactNumber: (session?.user as any)?.phone || "",
      date: new Date().toISOString().split("T")[0],
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      deliveryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      paymentTerms: "50% Advance, 50% on Delivery",
      items: [{ productId: "", priceSource: "standard", description: "", specifications: "", productNotes: "", quantity: 1, basePrice: 0, unitPrice: 0, discount: 0, margin: 0, manualMargin: "", shortDescription: "", categoryName: "Chairs", chairType: "" }],
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

  const { fields, append, remove, update, insert } = useFieldArray({
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

  const watchSegment = form.watch("customerSegment") || "Direct"

  // Automatically select segment based on client type
  useEffect(() => {
    if (selectedClientObj && selectedClientObj.clientType) {
      const validTypes = ["Dealer", "Interior", "Direct", "Online"]
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
    grandTotal = taxableAmount
  } else {
    // Include Tax (Add 5%)
    vatAmount = taxableAmount * 0.05
    grandTotal = taxableAmount + vatAmount
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
          else if (watchSegment === "Direct") basePrice = matchedProduct.directPrice || matchedProduct.unitPrice
          else if (watchSegment === "Online") basePrice = matchedProduct.onlinePrice || matchedProduct.unitPrice

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
      else if (watchSegment === "Direct") basePrice = matchedProduct.directPrice || matchedProduct.unitPrice
      else if (watchSegment === "Online") basePrice = matchedProduct.onlinePrice || matchedProduct.unitPrice

      form.setValue(`items.${index}.productId`, matchedProduct.id, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.priceSource`, "standard", { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.description`, matchedProduct.productName, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.specifications`, matchedProduct.specifications ? matchedProduct.specifications.replace(/【/g, '• ').replace(/】 ?/g, ': ') : "", { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.margin`, 0, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.manualMargin`, 0, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.basePrice`, basePrice, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.unitPrice`, basePrice, { shouldValidate: true, shouldDirty: true })

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

    // 1. Resolve standard catalog base price if priceSource is standard
    if (priceSource === "standard" && productId) {
      const matchedProduct = products.find((p) => p.id === productId)
      if (matchedProduct) {
        let segmentPrice = matchedProduct.unitPrice
        if (watchSegment === "Interior") segmentPrice = matchedProduct.interiorPrice ?? matchedProduct.unitPrice
        else if (watchSegment === "Dealer") segmentPrice = matchedProduct.dealerPrice ?? matchedProduct.unitPrice
        else if (watchSegment === "Direct") segmentPrice = matchedProduct.directPrice ?? matchedProduct.unitPrice
        else if (watchSegment === "Online") segmentPrice = matchedProduct.onlinePrice ?? matchedProduct.unitPrice
        
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

  async function onSubmit(data: QuotationFormValues, targetStatus?: "DRAFT" | "QUOTE_CREATED") {
    if (isRevision && !revisionNotes.trim()) {
      toast.error("Revision notes are required to revise this quotation!")
      return
    }

    const resolvedStatus = isRevision ? "REVISED" : (targetStatus || "DRAFT")

    setSubmitting(true)
    try {
      const url = (isRevision || isEdit) ? `/api/quotations/${existingQuote.id}` : "/api/quotations"
      const method = (isRevision || isEdit) ? "PUT" : "POST"

      const formattedItems = []
      for (const item of data.items) {
        const isCustom = item.priceSource === "manual" && !item.productId
        if (isCustom) {
          if (!item.description.trim()) {
            throw new Error("Product Name is required for custom products.")
          }
          if (!item.shortDescription || item.shortDescription.trim().length < 145 || item.shortDescription.trim().length > 260) {
            throw new Error(`Custom product "${item.description}" short description must be between 145 and 260 characters (currently ${item.shortDescription?.trim().length || 0} chars).`)
          }
          if (item.categoryName === "Chairs" && !item.chairType) {
            throw new Error(`Chair Type is required for custom chair "${item.description}".`)
          }

          if (isManagerOrAdmin) {
            const prodRes = await fetch("/api/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productName: item.description,
                categoryName: item.categoryName || "General",
                unitPrice: Number(item.unitPrice) || 0.0,
                shortDescription: item.shortDescription,
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
        throw new Error(err.error || "Failed to submit quotation")
      }

      const result = await res.json()
      toast.success(
        isRevision
          ? `Quotation revised successfully to Revision #${result.revisionNumber}! PDF updated on SharePoint.`
          : isEdit
            ? (resolvedStatus === "DRAFT"
                ? `Quotation draft updated successfully!`
                : `Quotation ${result.quotationNumber} updated and compiled successfully! PDF updated on SharePoint.`)
            : (resolvedStatus === "DRAFT"
                ? `Quotation draft saved successfully!`
                : `Quotation ${result.quotationNumber} compiled & uploaded to SharePoint!`)
      )
      router.push("/quotations")
    } catch (error: any) {
      console.error("Error submitting quotation:", error)
      toast.error(error.message || "Failed to submit quotation. Please try again.")
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
    else if (watchSegment === "Direct") basePrice = product.directPrice ?? product.unitPrice
    else if (watchSegment === "Online") basePrice = product.onlinePrice ?? product.unitPrice
    return {
      label: `Standard ${watchSegment} Price`,
      price: basePrice
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center space-x-4">
        <Link href="/quotations">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRevision ? "Revise Quotation" : isEdit ? "Update Quotation" : "Create Quotation"}
          </h1>
          <p className="text-muted-foreground">
            {isRevision
              ? `Create a new revised version of Quotation ${existingQuote?.quotationNumber}`
              : isEdit
                ? `Modify and update Quotation ${existingQuote?.quotationNumber}`
                : "Select a client, add catalog products, and compile a PDF immediately."}
          </p>
        </div>
      </div>

      {isRevision && existingQuote && (
        <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 rounded-xl p-4 flex items-start gap-3 text-purple-950 dark:text-purple-300">
          <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div>
            <h3 className="font-semibold">Revising Quotation {existingQuote.quotationNumber}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              You are creating **Revision #{existingQuote.revisionNumber + 1}** for this quotation. A new PDF will be compiled and uploaded as the active revision on SharePoint, and the revision history will be logged.
            </p>
          </div>
        </div>
      )}

      {isEdit && existingQuote && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-start gap-3 text-amber-950 dark:text-amber-300">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <h3 className="font-semibold">Updating Quotation {existingQuote.quotationNumber}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              You are updating this quotation draft directly. Changes will overwrite the current draft version and update the compiled PDF on SharePoint without creating a new revision.
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
            onSubmit={form.handleSubmit((data) => onSubmit(data, "QUOTE_CREATED"))}
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
                        <h3 className="font-semibold text-sm">Quotation Revision Blocked</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedClientObj.status === "Pending Approval"
                            ? "This client is pending approval. Please contact Admin/Manager before creating quotation."
                            : "This client has been rejected. Please contact Admin/Manager before creating quotation."}
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
                            <Command>
                              <CommandInput placeholder="Search client name..." />
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
                                    }}
                                    className="text-primary font-medium flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4 text-primary" />
                                    <span>Quick Add Client...</span>
                                  </CommandItem>
                                  {clients.filter(c => c.status === "Approved" || c.status === "Pending Approval" || c.id === field.value).map((client) => (
                                    <CommandItem
                                      value={client.companyName}
                                      key={client.id}
                                      onSelect={() => {
                                        form.setValue("clientId", client.id)
                                        setIsClientPopoverOpen(false)
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          client.id === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {client.companyName}
                                    </CommandItem>
                                  ))}
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
                            <SelectItem value="Direct">Direct (Prefix: P)</SelectItem>
                            <SelectItem value="Online">Online (Prefix: P)</SelectItem>
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
                </CardContent>
              </Card>

              {/* Quotation Specs Card */}
              <Card className="rounded-xl shadow-sm border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Quotation Metadata</CardTitle>
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="100% Advance">100% Advance</SelectItem>
                            <SelectItem value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</SelectItem>
                            <SelectItem value="100% on Delivery">100% on Delivery</SelectItem>
                            <SelectItem value="30 Days PDC">30 Days PDC</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="salesAgentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Agent <span className="text-red-500">*</span></FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val)
                            if (val === "manual") {
                              form.setValue("salesAgentName", "")
                              form.setValue("salesAgentContactNumber", "")
                            } else {
                              const selectedUser = users.find((u) => u.id === val)
                              if (selectedUser) {
                                form.setValue("salesAgentName", selectedUser.name)
                                form.setValue("salesAgentContactNumber", selectedUser.phone || "")
                              }
                            }
                          }}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sales agent">
                                {field.value === "manual"
                                  ? "Manual Entry"
                                  : users.find(u => u.id === field.value)?.name || "Select sales agent"}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} {u.role && `(${u.role})`}
                              </SelectItem>
                            ))}
                            <SelectItem value="manual">+ Type Agent Manually...</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("salesAgentId") === "manual" && (
                    <div className="space-y-4 pt-2 border-t border-dashed animate-in fade-in slide-in-from-top-1">
                      <FormField
                        control={form.control}
                        name="salesAgentName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manual Sales Agent Name <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Enter agent name" {...field} />
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
                            <FormLabel>Manual Agent Contact Number</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. +971 50 123 4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
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
              <CardContent className="p-6 space-y-6">
                {fields.map((field, index) => {
                  const showDetails = !!(watchItems[index]?.productId || watchItems[index]?.priceSource === "manual")
                  return (
                    <div key={field.id} className="group relative p-6 border rounded-xl bg-card hover:shadow-md transition-all duration-300 border-muted-foreground/10 hover:border-primary/20 space-y-4">
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
                                form.setValue(`items.${index}.priceSource`, "manual", { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.description`, "", { shouldValidate: true, shouldDirty: true })
                                form.setValue(`items.${index}.shortDescription`, "", { shouldValidate: true, shouldDirty: true })
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
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                              {/* Left Column: Image, Title, Type */}
                              <div className="xl:col-span-4 space-y-4 flex flex-col">
                                {/* Product Image Upload Zone */}
                                <div className="space-y-2">
                                  <FormLabel className="text-xs font-semibold text-muted-foreground">Product Image</FormLabel>
                                  {watchItems[index]?.customImageUrl ? (
                                    <div className="flex items-center gap-4 p-3 border rounded-xl bg-muted/30">
                                      <div className="h-20 w-20 border rounded-lg bg-white overflow-hidden relative shrink-0 flex items-center justify-center shadow-sm">
                                        <img src={watchItems[index]?.customImageUrl || ""} alt="Preview" className="object-contain h-full w-full" />
                                        {uploadingImage && cropperLineIndex === index && (
                                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="space-y-1">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setCropperLineIndex(index)
                                            setRawImageSrc(watchItems[index]?.customImageUrl || "")
                                            setIsCropperOpen(true)
                                          }}
                                          className="text-xs py-1 h-8"
                                        >
                                          Crop / Adjust
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => form.setValue(`items.${index}.customImageUrl`, "", { shouldValidate: true, shouldDirty: true })}
                                          className="text-xs py-1 h-8 text-destructive hover:bg-destructive/10 hover:text-destructive ml-2"
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className={cn(
                                        "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-muted/20 hover:bg-muted/40",
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
                                      <UploadCloud className="h-6 w-6 text-muted-foreground" />
                                      <span className="text-[11px] font-semibold text-muted-foreground text-center">
                                        Upload product image
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

                                {/* Product Name */}
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.description`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-1">
                                      <FormLabel className="text-xs font-semibold text-muted-foreground">Product Name *</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Enter product name" {...field} className="bg-muted/10 focus-visible:bg-background" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="grid grid-cols-2 gap-3">
                                  {/* Category Name */}
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.categoryName`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-semibold text-muted-foreground">Category *</FormLabel>
                                        <Select
                                          onValueChange={(val) => {
                                            field.onChange(val)
                                            if (val !== "Chairs") {
                                              form.setValue(`items.${index}.chairType`, "")
                                            }
                                          }}
                                          value={field.value || "Chairs"}
                                        >
                                          <FormControl>
                                            <SelectTrigger className="bg-muted/10 focus:bg-background">
                                              <SelectValue placeholder="Category" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="Chairs">Chairs</SelectItem>
                                            <SelectItem value="Desks">Desks</SelectItem>
                                            <SelectItem value="Tables">Tables</SelectItem>
                                            <SelectItem value="General">General / Other</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {/* Chair Type */}
                                  {watchItems[index]?.categoryName === "Chairs" && (
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.chairType`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-xs font-semibold text-muted-foreground">Chair Type *</FormLabel>
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

                                {/* Short Description */}
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.shortDescription`}
                                  render={({ field }) => {
                                    const valLength = (field.value || "").length
                                    const isValidLength = valLength >= 145 && valLength <= 260
                                    return (
                                      <FormItem className="space-y-1">
                                        <div className="flex justify-between items-center">
                                          <FormLabel className="text-xs font-semibold text-muted-foreground">Short Description *</FormLabel>
                                          <span className={cn("text-[9px] font-medium", valLength > 0 && !isValidLength ? "text-destructive font-bold" : "text-muted-foreground")}>
                                            {valLength} / 260 (Min 145)
                                          </span>
                                        </div>
                                        <FormControl>
                                          <Textarea
                                            placeholder="Premium ergonomic chair designed for long-hour comfort..."
                                            {...field}
                                            rows={3}
                                            className={cn(
                                              "resize-none bg-muted/10 focus-visible:bg-background text-xs min-h-[60px]",
                                              valLength > 0 && !isValidLength && "border-destructive focus-visible:ring-destructive"
                                            )}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )
                                  }}
                                />
                              </div>

                              {/* Middle Column: Specs & Notes */}
                              <div className="xl:col-span-4 space-y-4 xl:border-l border-muted xl:pl-6 flex flex-col">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.specifications`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-1 flex-1 flex flex-col">
                                      <FormLabel className="text-xs font-semibold text-muted-foreground">Quotation Specifications</FormLabel>
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
                                      <FormLabel className="text-xs font-semibold text-muted-foreground">Special / Customization Notes</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Special instructions or customer specific requirements..."
                                          {...field}
                                          rows={3}
                                          className="resize-none bg-muted/10 focus-visible:bg-background text-xs"
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
                                  <div className="bg-muted/30 p-2.5 rounded-md border border-muted/50 flex justify-between items-center">
                                    <span className="text-xs font-semibold text-foreground">Base Price Source</span>
                                    <span className="text-amber-600 font-medium text-[11px] bg-amber-500/10 px-2 py-0.5 rounded">Manual Base Price</span>
                                  </div>

                                  {/* 3x2 Grid for Pricing */}
                                  <div className="grid grid-cols-3 gap-3">
                                    {/* Quantity */}
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.quantity`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-[11px] font-semibold text-muted-foreground">Quantity</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="1"
                                              className="h-8 text-xs font-medium"
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
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-[11px] font-semibold text-muted-foreground">Base Price</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              className="h-8 text-xs font-mono"
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
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-[11px] font-semibold text-muted-foreground">Margin (%)</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="-100"
                                              max="99.9"
                                              step="0.1"
                                              className="h-8 text-xs font-mono"
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
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-[11px] font-semibold text-muted-foreground">Unit Price</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              className="h-8 text-xs font-mono bg-muted/50 cursor-not-allowed"
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
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-[11px] font-semibold text-muted-foreground">Discount (%)</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="0"
                                              max="100"
                                              step="0.1"
                                              className="h-8 text-xs font-mono text-destructive"
                                              value={field.value}
                                              onChange={(val) => field.onChange(val === "" ? "" : (parseFloat(val) || 0))}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {/* Line Total */}
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

                                {/* Math Helper & Actions */}
                                <div className="flex flex-col gap-2 pt-4 mt-auto">
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-muted/20 px-2 py-1 rounded">
                                    <Info className="h-3 w-3 text-muted-foreground/75 shrink-0" />
                                    <span>Base Price ÷ (1 - Margin %)</span>
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
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 h-8 text-[11px]"
                                      onClick={() => insert(index + 1, { productId: "", priceSource: "manual", description: "", specifications: "", productNotes: "", quantity: 1, basePrice: 0, unitPrice: 0, discount: 0, margin: 0, manualMargin: "", customImageUrl: "", shortDescription: "", categoryName: "Chairs", chairType: "" })}
                                    >
                                      <Plus className="h-3.5 w-3.5 mr-1" />
                                      Add Custom Item
                                    </Button>
                                  </div>
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
                                <div className="flex gap-4">
                                  {/* Thumbnail Image */}
                                  {(() => {
                                    const selectedProd = products.find(p => p.id === watchItems[index]?.productId)
                                    const imageUrl = watchItems[index]?.customImageUrl || selectedProd?.imageUrl
                                    return (
                                      <div className="h-20 w-20 border rounded-lg bg-white overflow-hidden relative shrink-0 flex items-center justify-center shadow-sm">
                                        {imageUrl ? (
                                          <img src={imageUrl} alt="Preview" className="object-contain h-full w-full" />
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground text-center px-1 font-medium">No Image</span>
                                        )}
                                      </div>
                                    )
                                  })()}
                                  
                                  {/* Product Title */}
                                  <div className="flex-1">
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.description`}
                                      render={({ field }) => (
                                        <FormItem className="space-y-1">
                                          <FormLabel className="text-xs font-semibold text-muted-foreground">Product Name</FormLabel>
                                          <FormControl>
                                            <Input placeholder="Product name" {...field} className="bg-muted text-muted-foreground text-xs cursor-not-allowed" disabled />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Middle Column: Specs & Notes */}
                              <div className="xl:col-span-4 space-y-4 xl:border-l border-muted xl:pl-6 flex flex-col">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.specifications`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-1 flex-1 flex flex-col">
                                      <FormLabel className="text-xs font-semibold text-muted-foreground">Quotation Specifications</FormLabel>
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
                                      <FormLabel className="text-xs font-semibold text-muted-foreground">Special / Customization Notes</FormLabel>
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
                                          <FormLabel className="text-[11px] font-semibold text-muted-foreground">Quantity</FormLabel>
                                          <FormControl>
                                            <NumericInput
                                              type="number"
                                              min="1"
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
                                            <FormLabel className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                              Base Price
                                              {isStandard && <Lock className="h-3 w-3 text-muted-foreground" />}
                                            </FormLabel>
                                            <FormControl>
                                              <NumericInput
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className={cn("h-8 text-xs font-mono", isStandard && "bg-muted text-muted-foreground cursor-not-allowed")}
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
                                          <FormLabel className="text-[11px] font-semibold text-muted-foreground">Margin (%)</FormLabel>
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
                                            <FormLabel className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                              Unit Price
                                              {isStandard && <Lock className="h-3 w-3 text-muted-foreground" />}
                                            </FormLabel>
                                            <FormControl>
                                              <NumericInput
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className={cn("h-8 text-xs font-mono", isStandard && "bg-muted text-muted-foreground cursor-not-allowed")}
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
                                          <FormLabel className="text-[11px] font-semibold text-muted-foreground">Discount (%)</FormLabel>
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
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 h-8 text-[11px]"
                                      onClick={() => insert(index + 1, { productId: "", priceSource: "manual", description: "", specifications: "", productNotes: "", quantity: 1, basePrice: 0, unitPrice: 0, discount: 0, margin: 0, manualMargin: "", customImageUrl: "", shortDescription: "", categoryName: "Chairs", chairType: "" })}
                                    >
                                      <Plus className="h-3.5 w-3.5 mr-1" />
                                      Add Custom Item
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }

                      })()}
                    </div>
                  )
                })}
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
                          <FormLabel className="text-xs font-semibold text-muted-foreground">
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
                    <FormField
                      control={form.control}
                      name="specialDiscountType"
                      render={({ field }) => {
                        const isSuperAdmin = userRole === "SUPER_ADMIN"
                        const allowedDiscount = isSuperAdmin ? 100 : (userPermissions?.maxDiscountPercent ?? 0)
                        const hasDiscountAccess = isSuperAdmin || allowedDiscount > 0
                        return (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                              Special Discount Type
                              {!hasDiscountAccess && <Lock className="h-3 w-3 text-muted-foreground/50" />}
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
                              disabled={!hasDiscountAccess}
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
                        )
                      }}
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
                              <FormLabel className="text-xs font-semibold text-muted-foreground">
                                Discount Value {watchSpecialDiscountType === "PERCENTAGE" ? "(%)" : "(AED)"}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="h-10 bg-background border-muted-foreground/20 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={val}
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
                        {/* We could place the reason field here, or show a live preview of the discount amount */}
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

                          const isLimitExceeded = currentAppliedDiscountPercent > allowedDiscount

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
                              <FormLabel className="text-xs font-semibold text-muted-foreground">Discount Reason (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. Special Approval, Project Discount"
                                  className="h-10 bg-background border-muted-foreground/20"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Limit Exceeded Warning */}
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

                          const isLimitExceeded = currentAppliedDiscountPercent > allowedDiscount
                          if (isLimitExceeded) {
                            return (
                              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 flex items-start gap-3 animate-in shake duration-300">
                                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                <div>
                                  <h5 className="font-semibold text-xs">Discount Limit Exceeded</h5>
                                  <p className="text-[11px] mt-0.5">
                                    Your role's max discount is **{allowedDiscount}%**. Currently applying **{currentAppliedDiscountPercent.toFixed(2)}%**. You will be blocked on submission.
                                  </p>
                                </div>
                              </div>
                            )
                          }
                          return null
                        })()}
                      </div>
                    )}
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
                        {(totalAdditionalCost > 0 || specialDiscountAmount > 0) && (
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

                      {/* Grand Total */}
                      <div className="flex justify-between items-center text-xl font-bold pt-4 text-primary">
                        <span>Grand Total</span>
                        <span className="font-mono text-2xl">AED {grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardFooter>

            </Card>

            <div className="flex items-center justify-end space-x-4">
              <Link href="/quotations">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              {!isRevision && (
                <Button
                  type="button"
                  onClick={() => form.handleSubmit((data) => onSubmit(data, "DRAFT"))()}
                  disabled={submitting}
                  variant="secondary"
                  className="disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Draft...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save as Draft
                    </>
                  )}
                </Button>
              )}
              <Button
                type="button"
                onClick={() => form.handleSubmit((data) => onSubmit(data, "QUOTE_CREATED"))()}
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isRevision ? "Saving Revision..." : "Generating PDF & Saving..."}
                  </>
                ) : (
                  <>
                    {isRevision ? <RefreshCw className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                    {isRevision ? "Compile & Save Revision" : "Compile & finalize PDF"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}

      <QuickAddProductModal
        isOpen={isQuickAddOpen}
        userRole={userRole}
        onClose={() => {
          setIsQuickAddOpen(false)
          setActiveLineIndex(null)
        }}
        onSuccess={(newProduct) => {
          // Only append to local catalog if it's a real saved product (managers/admins)
          const isTemp = newProduct.id.startsWith("custom-")
          if (!isTemp) {
            setProducts(prev => [...prev, newProduct])
          }

          // Auto-populate the active line item
          if (activeLineIndex !== null) {
            let basePrice = newProduct.unitPrice
            if (watchSegment === "Interior") basePrice = newProduct.interiorPrice ?? newProduct.unitPrice
            else if (watchSegment === "Dealer") basePrice = newProduct.dealerPrice ?? newProduct.unitPrice
            else if (watchSegment === "Direct") basePrice = newProduct.directPrice ?? newProduct.unitPrice
            else if (watchSegment === "Online") basePrice = newProduct.onlinePrice ?? newProduct.unitPrice

            // For temp custom items, clear productId so they submit as free-text lines
            form.setValue(`items.${activeLineIndex}.productId`, isTemp ? "" : newProduct.id)
            form.setValue(`items.${activeLineIndex}.priceSource`, isTemp ? "manual" : "standard")
            form.setValue(`items.${activeLineIndex}.description`, newProduct.productName)
            form.setValue(`items.${activeLineIndex}.specifications`, newProduct.specifications ? newProduct.specifications.replace(/【/g, '• ').replace(/】 ?/g, ': ') : "")
            form.setValue(`items.${activeLineIndex}.margin`, 0)
            form.setValue(`items.${activeLineIndex}.manualMargin`, 0)
            form.setValue(`items.${activeLineIndex}.basePrice`, basePrice)
            form.setValue(`items.${activeLineIndex}.unitPrice`, basePrice)
            form.setValue(`items.${activeLineIndex}.customImageUrl`, newProduct.imageUrl || "")
          }
        }}
      />

      <QuickAddClientModal
        isOpen={isQuickAddClientOpen}
        userRole={userRole}
        onClose={() => setIsQuickAddClientOpen(false)}
        onSuccess={(newClient) => {
          setClients((prev) => [...prev, newClient])
          form.setValue("clientId", newClient.id)
        }}
      />

      <ImageCropper
        isOpen={isCropperOpen}
        imageSrc={rawImageSrc}
        onClose={() => {
          setIsCropperOpen(false)
          setRawImageSrc(null)
        }}
        onCrop={handleCropSave}
      />
    </div>
  )
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading quotation builder...</p>
      </div>
    }>
      <NewQuotationForm />
    </Suspense>
  )
}
