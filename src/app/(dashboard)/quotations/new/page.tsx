"use client"

import { useState, useEffect, Suspense } from "react"
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
  deliveryCharge: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().nullable().optional(),
      description: z.string().min(1, "Description is required"),
      specifications: z.string(),
      productNotes: z.string().optional(),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      basePrice: z.number().min(0),
      unitPrice: z.number().min(0, "Price must be at least 0"),
      discount: z.number().min(0),
      margin: z.number().min(-100),
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
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null)

  const [isRevision, setIsRevision] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [existingQuote, setExistingQuote] = useState<any>(null)
  const [revisionNotes, setRevisionNotes] = useState("")

  const [users, setUsers] = useState<any[]>([])

  // Fetch users if manager or admin
  useEffect(() => {
    if (isManagerOrAdmin) {
      fetch("/api/settings/users")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setUsers(data)
          }
        })
        .catch(err => console.error("Failed to load users", err))
    }
  }, [isManagerOrAdmin])

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
              salesAgentId: activeData.salesAgentId || activeData.preparedById || "",
              salesAgentName: activeData.salesAgentName || "",
              salesAgentContactNumber: activeData.salesAgentContactNumber || "",
              date: reviseId ? new Date().toISOString().split("T")[0] : activeData.date.split("T")[0],
              validityDate: reviseId ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : activeData.validityDate.split("T")[0],
              deliveryDate: activeData.deliveryDate ? new Date(activeData.deliveryDate).toISOString().split("T")[0] : new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              paymentTerms: activeData.paymentTerms || "50% Advance, 50% on Delivery",
              items: activeData.items.map((item: any) => {
                const marginVal = item.margin || 0
                const basePriceVal = item.unitPrice / (1 + marginVal / 100)
                return {
                  productId: item.productId || "",
                  description: item.description,
                  specifications: item.specifications || "",
                  productNotes: item.productNotes || "",
                  quantity: item.quantity,
                  basePrice: Number(basePriceVal.toFixed(2)),
                  unitPrice: item.unitPrice,
                  discount: item.discount || 0,
                  margin: marginVal,
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
            description: item.description,
            specifications: item.specifications || "",
            productNotes: "",
            quantity: item.quantity,
            basePrice: item.basePrice,
            unitPrice: item.unitPrice,
            discount: 0,
            margin: 0,
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
    resolver: zodResolver(quotationSchema),
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
      items: [{ productId: "", description: "", specifications: "", productNotes: "", quantity: 1, basePrice: 0, unitPrice: 0, discount: 0, margin: 0 }],
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
    const qty = item.quantity || 0
    const price = item.unitPrice || 0
    const disc = item.discount || 0
    return acc + (price - disc) * qty
  }, 0)

  const vatAmount = subtotal * 0.05
  const grandTotal = subtotal + vatAmount + (watchDeliveryCharge || 0)

  // Watch for segment changes and update line item unit prices
  useEffect(() => {
    const currentItems = form.getValues("items") || []
    currentItems.forEach((item, index) => {
      if (item.productId) {
        const matchedProduct = products.find((p) => p.id === item.productId)
        if (matchedProduct) {
          let basePrice = matchedProduct.unitPrice
          if (watchSegment === "Interior") basePrice = matchedProduct.interiorPrice || matchedProduct.unitPrice
          else if (watchSegment === "Dealer") basePrice = matchedProduct.dealerPrice || matchedProduct.unitPrice
          else if (watchSegment === "Direct") basePrice = matchedProduct.directPrice || matchedProduct.unitPrice
          else if (watchSegment === "Online") basePrice = matchedProduct.onlinePrice || matchedProduct.unitPrice

          form.setValue(`items.${index}.basePrice`, basePrice, { shouldValidate: true, shouldDirty: true })
          const margin = item.margin || 0
          const calculatedPrice = basePrice * (1 + margin / 100)
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
      form.setValue(`items.${index}.description`, matchedProduct.productName, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.specifications`, matchedProduct.specifications ? matchedProduct.specifications.replace(/【/g, '• ').replace(/】 ?/g, ': ') : "", { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.margin`, 0, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.basePrice`, basePrice, { shouldValidate: true, shouldDirty: true })
      form.setValue(`items.${index}.unitPrice`, basePrice, { shouldValidate: true, shouldDirty: true })

      toast.info(`Populated ${matchedProduct.productName} for ${watchSegment} segment at base price AED ${basePrice}!`)
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

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                        <Popover>
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
                                <CommandEmpty>No client found.</CommandEmpty>
                                <CommandGroup>
                                  {clients.filter(c => c.status === "Approved").map((client) => (
                                    <CommandItem
                                      value={client.companyName}
                                      key={client.id}
                                      onSelect={() => {
                                        form.setValue("clientId", client.id)
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

                  {isManagerOrAdmin ? (
                    <FormField
                      control={form.control}
                      name="salesAgentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sales Agent <span className="text-red-500">*</span></FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val)
                              const selectedUser = users.find((u) => u.id === val)
                              if (selectedUser) {
                                form.setValue("salesAgentName", selectedUser.name)
                                form.setValue("salesAgentContactNumber", selectedUser.phone || "")
                              }
                            }}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select sales agent">
                                  {users.find(u => u.id === field.value)?.name || "Select sales agent"}
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
                  ) : (
                    <FormItem>
                      <FormLabel>Sales Agent</FormLabel>
                      <Input value={(session?.user as any)?.name || "Sales Rep"} disabled />
                    </FormItem>
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
                  onClick={() => append({ productId: "", description: "", specifications: "", quantity: 1, basePrice: 0, unitPrice: 0, discount: 0, margin: 0, customImageUrl: "" })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom Item
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="relative p-5 border rounded-xl bg-muted/20 space-y-4 transition-all">
                    {/* Catalog Autopopulate Select Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary shrink-0">
                        <Sparkles className="h-3.5 w-3.5" />
                        Select from Product Catalog:
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                        <div className="w-full sm:flex-1">
                          {(() => {
                            const selectedProd = products.find(p => p.id === watchItems[index]?.productId)
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
                              <Popover>
                                <PopoverTrigger
                                  render={
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between font-normal bg-card",
                                        !watchItems[index]?.productId && "text-muted-foreground"
                                      )}
                                    >
                                      <span className="truncate flex-1 text-left">
                                        {watchItems[index]?.productId ? label : "Search catalog product by name or code..."}
                                      </span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  }
                                />
                                <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[500px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search products..." />
                                    <CommandList className="max-h-[300px]">
                                      <CommandEmpty>No product found.</CommandEmpty>
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
                                              onSelect={() => handleProductSelect(index, product.id)}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4 shrink-0",
                                                  product.id === watchItems[index]?.productId
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
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            )
                          })()}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveLineIndex(index)
                            setIsQuickAddOpen(true)
                          }}
                          className="border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-primary text-xs shrink-0 cursor-pointer h-9 px-3 w-full sm:w-auto rounded-md flex items-center justify-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          + New Custom Product
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Description & Technical Specifications */}
                      <div className="md:col-span-5 flex flex-col sm:flex-row gap-4">
                        {(() => {
                          const selectedProd = products.find(p => p.id === watchItems[index]?.productId)
                          const imageUrl = watchItems[index]?.customImageUrl || selectedProd?.imageUrl
                          if (!imageUrl) return null
                          return (
                            <div className="h-24 w-24 sm:h-20 sm:w-20 border rounded-lg bg-white overflow-hidden relative shrink-0 flex items-center justify-center shadow-inner self-center sm:self-start mt-2 sm:mt-6">
                              <img src={imageUrl} alt="Preview" className="object-contain h-full w-full" />
                            </div>
                          )
                        })()}
                        <div className="flex-1 space-y-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Product Name / Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Item description" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`items.${index}.specifications`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quotation Specifications</FormLabel>
                                <FormControl>
                                  <RichTextEditor
                                    placeholder="Spec details (e.g. Dimensions, colors, soft-close drawers...)"
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
                              <FormItem>
                                <FormLabel>Product Notes</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Special notes, customization, delivery remarks..."
                                    {...field}
                                    rows={2}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Quantity, Unit Price and Discount */}
                      <div className="md:col-span-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 md:pt-0">
                        <FormField
                          control={form.control}
                          name={`items.${index}.basePrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1">
                                Base Price
                                {!isManagerOrAdmin && <Lock className="h-3 w-3 text-muted-foreground" />}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!isManagerOrAdmin}
                                  {...field}
                                  onChange={(e) => {
                                    const newBase = parseFloat(e.target.value) || 0
                                    field.onChange(newBase)
                                    const currentMargin = watchItems[index]?.margin || 0
                                    const newPrice = newBase * (1 + currentMargin / 100)
                                    form.setValue(`items.${index}.unitPrice`, Number(newPrice.toFixed(2)))
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qty</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.margin`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Margin (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="-100"
                                  step="0.1"
                                  {...field}
                                  onChange={(e) => {
                                    const newMargin = parseFloat(e.target.value) || 0
                                    field.onChange(newMargin)

                                    const itemId = watchItems[index]?.productId
                                    const matchedProduct = products.find((p) => p.id === itemId)
                                    let basePrice = 0
                                    if (matchedProduct) {
                                      basePrice = matchedProduct.unitPrice
                                      if (watchSegment === "Interior") basePrice = matchedProduct.interiorPrice || matchedProduct.unitPrice
                                      else if (watchSegment === "Dealer") basePrice = matchedProduct.dealerPrice || matchedProduct.unitPrice
                                      else if (watchSegment === "Direct") basePrice = matchedProduct.directPrice || matchedProduct.unitPrice
                                      else if (watchSegment === "Online") basePrice = matchedProduct.onlinePrice || matchedProduct.unitPrice
                                    } else {
                                      basePrice = watchItems[index]?.basePrice || 0
                                    }

                                    if (basePrice > 0) {
                                      const newPrice = basePrice * (1 + newMargin / 100)
                                      form.setValue(`items.${index}.unitPrice`, Number(newPrice.toFixed(2)))
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Price (AED)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value) || 0
                                    field.onChange(newPrice)

                                    const itemId = watchItems[index]?.productId
                                    const matchedProduct = products.find((p) => p.id === itemId)
                                    let basePrice = 0
                                    if (matchedProduct) {
                                      basePrice = matchedProduct.unitPrice
                                      if (watchSegment === "Interior") basePrice = matchedProduct.interiorPrice ?? matchedProduct.unitPrice
                                      else if (watchSegment === "Dealer") basePrice = matchedProduct.dealerPrice ?? matchedProduct.unitPrice
                                      else if (watchSegment === "Direct") basePrice = matchedProduct.directPrice ?? matchedProduct.unitPrice
                                      else if (watchSegment === "Online") basePrice = matchedProduct.onlinePrice ?? matchedProduct.unitPrice
                                    } else {
                                      const currentMargin = watchItems[index]?.margin || 0
                                      if (currentMargin === 0) {
                                        form.setValue(`items.${index}.basePrice`, newPrice)
                                        basePrice = newPrice
                                      } else {
                                        basePrice = watchItems[index]?.basePrice || 0
                                      }
                                    }

                                    if (basePrice > 0) {
                                      const calculatedMargin = ((newPrice / basePrice) - 1) * 100
                                      form.setValue(`items.${index}.margin`, Number(calculatedMargin.toFixed(1)))
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.discount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount (AED)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="md:col-span-1 flex items-center justify-end md:justify-center pt-4 md:pt-0">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
                            <Input
                              type="number"
                              className="h-8 text-right font-mono"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
            form.setValue(`items.${activeLineIndex}.description`, newProduct.productName)
            form.setValue(`items.${activeLineIndex}.specifications`, newProduct.specifications ? newProduct.specifications.replace(/【/g, '• ').replace(/】 ?/g, ': ') : "")
            form.setValue(`items.${activeLineIndex}.margin`, 0)
            form.setValue(`items.${activeLineIndex}.basePrice`, basePrice)
            form.setValue(`items.${activeLineIndex}.unitPrice`, basePrice)
            form.setValue(`items.${activeLineIndex}.customImageUrl`, newProduct.imageUrl || "")
          }
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
