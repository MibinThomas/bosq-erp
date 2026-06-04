"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2, Save, Send, ArrowLeft, Loader2, Info, Sparkles, Lock, Check, ChevronsUpDown, Search, AlertCircle } from "lucide-react"
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
      margin: z.union([z.number(), z.string()]).refine(val => (val === "" ? 0 : Number(val)) >= -100, "Margin must be at least -100"),
      manualMargin: z.union([z.number(), z.string()]).optional(),
      customImageUrl: z.string().nullable().optional(),
    })
  ).min(1, "At least one item is required"),
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
            className={cn(
              "w-full justify-between font-normal bg-card",
              !productId && "text-muted-foreground"
            )}
          >
            <span className="truncate flex-1 text-left">
              {productId ? label : "Search catalog product by name or code..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[500px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search products..." />
          <CommandList className="max-h-[260px]">
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
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        product.id === productId
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-3 w-full py-1">
                      <div className="h-10 w-10 shrink-0 border rounded overflow-hidden flex items-center justify-center bg-white shadow-sm">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.productName} className="object-contain w-full h-full" />
                        ) : (
                          <div className="text-[8px] text-muted-foreground text-center px-1 leading-tight">No Image</div>
                        )}
                      </div>
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="font-medium text-sm text-foreground truncate">{product.productName}</span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <span className="truncate">SKU: {product.productCode}</span>
                          <span>•</span>
                          <span className="font-semibold text-primary whitespace-nowrap">AED {basePrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          {/* Bottom Action Footer */}
          <div className="p-2 border-t bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-primary hover:text-primary hover:bg-primary/5 font-medium flex items-center gap-1.5 h-9 cursor-pointer"
              onClick={() => {
                onCustomProductClick()
                setOpen(false)
              }}
            >
              <Plus className="h-4 w-4 text-primary" />
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
                }
              }),
              deliveryCharge: activeData.deliveryCharge || 0,
              notes: activeData.notes || "",
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
          })),
          deliveryCharge: 0,
          notes: "",
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
      items: [{ productId: "", priceSource: "manual", description: "", specifications: "", productNotes: "", quantity: 1, basePrice: 0, unitPrice: 0, discount: 0, margin: 0, manualMargin: "" }],
      deliveryCharge: 0,
      notes: "",
    },
  })

  // Autofill initial Client if passed via Query Param
  useEffect(() => {
    if (initialClientId && clients.length > 0) {
      form.setValue("clientId", initialClientId)
    }
  }, [initialClientId, clients])

  const { fields, append, remove, update } = useFieldArray({
    name: "items",
    control: form.control,
  })

  const watchItems = form.watch("items")
  const watchDeliveryCharge = form.watch("deliveryCharge")
  const watchClientId = form.watch("clientId")

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

  // Subtotal, VAT and Grand Total Calculations
  const subtotal = watchItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unitPrice) || 0
    const discPercent = Number(item.discount) || 0
    const discAmt = price * (discPercent / 100)
    return acc + (price - discAmt) * qty
  }, 0)

  const vatAmount = subtotal * 0.05
  const grandTotal = subtotal + vatAmount + (Number(watchDeliveryCharge) || 0)

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
      form.setValue(`items.${index}.basePrice`, newValue, { shouldValidate: true, shouldDirty: true })
    } else if (fieldChanged === "margin") {
      form.setValue(`items.${index}.margin`, newValue, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.manualMargin`, newValue, { shouldValidate: true, shouldDirty: true })
    } else if (fieldChanged === "unitPrice") {
      form.setValue(`items.${index}.unitPrice`, newValue, { shouldValidate: true, shouldDirty: true })
    } else if (fieldChanged === "priceSource") {
      form.setValue(`items.${index}.priceSource`, newValue, { shouldValidate: true, shouldDirty: true })
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
        form.setValue(`items.${index}.basePrice`, segmentPrice, { shouldValidate: true, shouldDirty: true })
      }
    }

    // 2. Perform math based on what changed
    if (fieldChanged === "unitPrice") {
      if (newValue === "") {
        margin = 0
        form.setValue(`items.${index}.margin`, "", { shouldValidate: true, shouldDirty: true })
        form.setValue(`items.${index}.manualMargin`, "", { shouldValidate: true, shouldDirty: true })
      } else if (unitPrice > 0) {
        // Unit Price = Base Price / (1 - Margin % / 100) => Margin % = (1 - (Base Price / Unit Price)) * 100
        margin = (1 - (basePrice / unitPrice)) * 100
        const roundedMargin = Number(margin.toFixed(2))
        form.setValue(`items.${index}.margin`, roundedMargin, { shouldValidate: true, shouldDirty: true })
        form.setValue(`items.${index}.manualMargin`, roundedMargin, { shouldValidate: true, shouldDirty: true })
      } else {
        margin = 0
        form.setValue(`items.${index}.margin`, 0, { shouldValidate: true, shouldDirty: true })
        form.setValue(`items.${index}.manualMargin`, 0, { shouldValidate: true, shouldDirty: true })
      }
    } else {
      const marginDecimal = margin / 100
      if (marginDecimal >= 1) {
        unitPrice = basePrice
      } else {
        unitPrice = basePrice / (1 - marginDecimal)
      }
      const finalPrice = (newValue === "" && fieldChanged === "margin") || (fieldChanged === "basePrice" && newValue === "") ? "" : Number(unitPrice.toFixed(2))
      form.setValue(`items.${index}.unitPrice`, finalPrice, { shouldValidate: true, shouldDirty: true })
    }
  }

  async function onSubmit(data: QuotationFormValues) {
    // Check if selected client is approved
    const selectedClient = clients.find((c) => c.id === data.clientId)
    if (selectedClient && selectedClient.status !== "Approved") {
      const errorMsg = selectedClient.status === "Pending Approval"
        ? "This client is pending approval. Please contact Admin/Manager before creating quotation."
        : "This client has been rejected. Please contact Admin/Manager before creating quotation."
      toast.error(errorMsg)
      return
    }

    if (isRevision && !revisionNotes.trim()) {
      toast.error("Revision notes are required to revise this quotation!")
      return
    }

    setSubmitting(true)
    try {
      const url = (isRevision || isEdit) ? `/api/quotations/${existingQuote.id}` : "/api/quotations"
      const method = (isRevision || isEdit) ? "PUT" : "POST"

      const formattedItems = data.items.map((item) => {
        const hasManual = item.manualMargin !== undefined && item.manualMargin !== ""
        const finalMargin = hasManual ? item.manualMargin : item.margin
        const price = item.unitPrice === "" ? 0 : Number(item.unitPrice)
        const discPercent = item.discount === "" ? 0 : Number(item.discount)
        const absoluteDiscount = price * (discPercent / 100)

        return {
          ...item,
          quantity: item.quantity === "" ? 1 : Number(item.quantity),
          basePrice: item.basePrice === "" ? 0 : Number(item.basePrice),
          unitPrice: price,
          discount: Number(absoluteDiscount.toFixed(2)),
          margin: finalMargin === "" ? 0 : Number(finalMargin),
        }
      })

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          items: formattedItems,
          deliveryCharge: data.deliveryCharge === "" ? 0 : Number(data.deliveryCharge),
          isRevision: isRevision,
          isUpdate: isEdit,
          revisionNotes: revisionNotes,
          status: isManagerOrAdmin ? "APPROVED" : "PENDING_APPROVAL",
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
            ? `Quotation ${result.quotationNumber} updated successfully! PDF updated on SharePoint.`
            : `Quotation ${result.quotationNumber} compiled & uploaded to SharePoint!`
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
            onSubmit={form.handleSubmit(onSubmit)}
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
                    required
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
                  {selectedClientObj && selectedClientObj.status !== "Approved" && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 text-destructive animate-in fade-in">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-sm">Quotation Creation Blocked</h3>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => append({ productId: "", priceSource: "manual", description: "", specifications: "", productNotes: "", quantity: 1, basePrice: 0, unitPrice: 0, discount: 0, margin: 0, manualMargin: "", customImageUrl: "" })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom Item
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {fields.map((field, index) => (
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
                              setActiveLineIndex(index)
                              setIsQuickAddOpen(true)
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                      {/* Left Column: Image, Title, Specs & Notes */}
                      <div className="lg:col-span-6 space-y-4">
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
                                  <FormLabel className="text-xs font-semibold text-muted-foreground">Product Name / Title <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter product name or short description" {...field} className="bg-muted/10 focus-visible:bg-background" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Specifications & Notes */}
                        <div className="flex flex-col gap-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.specifications`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-semibold text-muted-foreground">Quotation Specifications</FormLabel>
                                <FormControl>
                                  <RichTextEditor
                                    placeholder="Technical specs, dimensions, materials..."
                                    value={field.value || ""}
                                    onChange={(val) => field.onChange(val)}
                                  />
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
                                    rows={4}
                                    className="resize-none bg-muted/10 focus-visible:bg-background min-h-[96px]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Right Column: Pricing Math & Source Selector */}
                      <div className="lg:col-span-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-muted pt-4 lg:pt-0 lg:pl-6 space-y-4">
                        {/* Price Source & Helper Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-muted/50">
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-foreground">Base Price Source</span>
                            <div className="text-[11px] text-muted-foreground">
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
                                "px-2.5 py-1 text-[11px] font-medium rounded transition-all",
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
                                "px-2.5 py-1 text-[11px] font-medium rounded transition-all",
                                watchItems[index]?.priceSource === "manual"
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              Manual Price
                            </button>
                          </div>
                        </div>

                        {/* Inputs Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {/* Quantity */}
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-semibold text-muted-foreground">Quantity</FormLabel>
                                <FormControl>
                                  <NumericInput
                                    type="number"
                                    min="1"
                                    className="h-9 font-medium"
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
                                  <FormLabel className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                    Base Price
                                    {isStandard && <Lock className="h-3 w-3 text-muted-foreground" />}
                                  </FormLabel>
                                  <FormControl>
                                    <NumericInput
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className={cn("h-9 font-mono", isStandard && "bg-muted text-muted-foreground cursor-not-allowed")}
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
                                <FormLabel className="text-xs font-semibold text-muted-foreground">Margin (%)</FormLabel>
                                <FormControl>
                                  <NumericInput
                                    type="number"
                                    min="-100"
                                    max="99.9"
                                    step="0.1"
                                    className="h-9 font-mono"
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
                                  <FormLabel className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                    Unit Price (AED)
                                    {isStandard && <Lock className="h-3 w-3 text-muted-foreground" />}
                                  </FormLabel>
                                  <FormControl>
                                    <NumericInput
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className={cn("h-9 font-mono", isStandard && "bg-muted text-muted-foreground cursor-not-allowed")}
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
                                <FormLabel className="text-xs font-semibold text-muted-foreground">Discount (%)</FormLabel>
                                <FormControl>
                                  <NumericInput
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    className="h-9 font-mono text-destructive focus-visible:ring-destructive"
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
                            <span className="text-xs font-semibold text-muted-foreground block">Line Total</span>
                            <div className="h-9 px-3 rounded-md bg-primary/5 border border-primary/10 flex items-center justify-between text-primary font-semibold font-mono text-sm shadow-inner">
                              <span className="text-[10px] text-primary/70">AED</span>
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

                        {/* Visual Helper + Delete Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                          {/* Math Helper Text */}
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-muted/20 px-2.5 py-1 rounded">
                            <Info className="h-3.5 w-3.5 text-muted-foreground/75 shrink-0" />
                            <span>
                              Formula: Base Price ÷ (1 - Margin %)
                            </span>
                          </div>

                          {/* Delete Row button */}
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs py-1 h-7 rounded px-2.5 ml-auto flex items-center gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove Line
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>

              {/* Financial Calculation Footer */}
              <CardFooter className="flex flex-col items-end border-t pt-6 bg-muted/5 shadow-inner">
                <div className="w-full md:w-1/2 lg:w-1/3 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold font-mono">AED {subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">VAT (5% UAE Tax)</span>
                    <span className="font-semibold font-mono">AED {vatAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      Delivery & Install
                    </span>
                    <div className="w-28">
                      <FormField
                        control={form.control}
                        name="deliveryCharge"
                        render={({ field }) => (
                          <FormControl>
                            <NumericInput
                              type="number"
                              className="h-8 text-right font-mono"
                              min="0"
                              value={field.value}
                              onChange={(val) => {
                                field.onChange(val === "" ? "" : (parseFloat(val) || 0))
                              }}
                            />
                          </FormControl>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xl font-bold border-t pt-4 text-primary">
                    <span>Grand Total</span>
                    <span className="font-mono">AED {grandTotal.toFixed(2)}</span>
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
              <Button
                type="submit"
                disabled={submitting || (selectedClientObj && selectedClientObj.status !== "Approved")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PDF & Saving...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Compile & finalize PDF
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
