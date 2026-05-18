"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2, Save, Send, ArrowLeft, Loader2, Info, Sparkles } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { toast } from "sonner"
import { QuickAddProductModal } from "@/components/products/quick-add-product-modal"

const quotationSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectName: z.string().min(1, "Project name is required"),
  date: z.string(),
  validityDate: z.string(),
  deliveryDate: z.string().optional(),
  paymentTerms: z.string().min(1, "Payment terms is required"),
  deliveryCharge: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().nullable().optional(),
      description: z.string().min(1, "Description is required"),
      specifications: z.string(),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      unitPrice: z.number().min(0, "Price must be at least 0"),
      discount: z.number().min(0),
    })
  ).min(1, "At least one item is required"),
})

type QuotationFormValues = z.infer<typeof quotationSchema>

interface Client {
  id: string
  companyName: string
  contactPerson: string | null
  trn: string | null
}

interface Product {
  id: string
  productCode: string
  productName: string
  unitPrice: number
  specifications: string | null
  imageUrl: string | null
}

function NewQuotationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialClientId = searchParams.get("clientId") || ""

  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null)

  const [isRevision, setIsRevision] = useState(false)
  const [existingQuote, setExistingQuote] = useState<any>(null)
  const [revisionNotes, setRevisionNotes] = useState("")

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

        // Load details for revision if reviseId parameter is provided
        const reviseId = searchParams.get("reviseId")
        if (reviseId) {
          const reviseRes = await fetch(`/api/quotations/${reviseId}`)
          if (reviseRes.ok) {
            const reviseData = await reviseRes.json()
            setExistingQuote(reviseData)
            setIsRevision(true)

            // Populate form values
            form.reset({
              clientId: reviseData.clientId,
              projectName: reviseData.projectName || "",
              date: new Date().toISOString().split("T")[0],
              validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              deliveryDate: reviseData.deliveryDate ? new Date(reviseData.deliveryDate).toISOString().split("T")[0] : new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              paymentTerms: reviseData.paymentTerms || "50% Advance, 50% on Delivery",
              items: reviseData.items.map((item: any) => ({
                productId: item.productId || "",
                description: item.description,
                specifications: item.specifications || "",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount || 0,
              })),
              deliveryCharge: reviseData.deliveryCharge || 0,
              notes: reviseData.notes || "",
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

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      clientId: initialClientId,
      projectName: "",
      date: new Date().toISOString().split("T")[0],
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      deliveryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      paymentTerms: "50% Advance, 50% on Delivery",
      items: [{ productId: "", description: "", specifications: "", quantity: 1, unitPrice: 0, discount: 0 }],
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

  const { fields, append, remove } = useFieldArray({
    name: "items",
    control: form.control,
  })

  const watchItems = form.watch("items")
  const watchDeliveryCharge = form.watch("deliveryCharge")
  const watchClientId = form.watch("clientId")

  const selectedClientObj = clients.find((c) => c.id === watchClientId)

  // Subtotal, VAT and Grand Total Calculations
  const subtotal = watchItems.reduce((acc, item) => {
    const qty = item.quantity || 0
    const price = item.unitPrice || 0
    const disc = item.discount || 0
    return acc + (price - disc) * qty
  }, 0)

  const vatAmount = subtotal * 0.05
  const grandTotal = subtotal + vatAmount + (watchDeliveryCharge || 0)

  // Handle select catalog product auto-population
  const handleProductSelect = (index: number, productId: string | null) => {
    if (!productId) return
    const matchedProduct = products.find((p) => p.id === productId)
    if (matchedProduct) {
      form.setValue(`items.${index}.productId`, matchedProduct.id)
      form.setValue(`items.${index}.description`, matchedProduct.productName)
      form.setValue(`items.${index}.specifications`, matchedProduct.specifications || "")
      form.setValue(`items.${index}.unitPrice`, matchedProduct.unitPrice)
      toast.info(`Populated item with ${matchedProduct.productName} catalog price!`)
    }
  }

  async function onSubmit(data: QuotationFormValues) {
    if (isRevision && !revisionNotes.trim()) {
      toast.error("Revision notes are required to revise this quotation!")
      return
    }

    setSubmitting(true)
    try {
      const url = isRevision ? `/api/quotations/${existingQuote.id}` : "/api/quotations"
      const method = isRevision ? "PUT" : "POST"

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          isRevision: isRevision,
          revisionNotes: revisionNotes,
          status: "APPROVED", // Auto-approved and finalized on submit
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
            {isRevision ? "Revise Quotation" : "Create Quotation"}
          </h1>
          <p className="text-muted-foreground">
            {isRevision
              ? `Create a new revised version of Quotation ${existingQuote?.quotationNumber}`
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
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Company</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isRevision}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an active client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.companyName}
                              </SelectItem>
                            ))}
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
                            <SelectItem value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</SelectItem>
                            <SelectItem value="100% Advance">100% Advance</SelectItem>
                            <SelectItem value="30 Days PDC">30 Days PDC</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Line Items Card */}
            <Card className="rounded-xl shadow-sm border bg-card">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  Line Items Catalog
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ productId: "", description: "", specifications: "", quantity: 1, unitPrice: 0, discount: 0 })}
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
                      <div className="flex flex-1 items-center gap-2 max-w-lg w-full">
                        <div className="flex-1">
                          <Select
                            onValueChange={(val) => handleProductSelect(index, val)}
                            value={watchItems[index]?.productId || ""}
                          >
                            <SelectTrigger className="bg-card w-full">
                              <SelectValue placeholder="Search or select catalog product..." />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.productCode} - {product.productName} (AED {product.unitPrice})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveLineIndex(index)
                            setIsQuickAddOpen(true)
                          }}
                          className="border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-primary text-xs shrink-0 cursor-pointer h-9 px-3 rounded-md flex items-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          + New
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Description & Technical Specifications */}
                      <div className="md:col-span-6 flex flex-col sm:flex-row gap-4">
                        {(() => {
                          const selectedProd = products.find(p => p.id === watchItems[index]?.productId)
                          if (!selectedProd?.imageUrl) return null
                          return (
                            <div className="h-20 w-20 border rounded-lg bg-white overflow-hidden relative shrink-0 flex items-center justify-center shadow-inner self-start mt-6 hidden sm:flex">
                              <img src={selectedProd.imageUrl} alt="Preview" className="object-contain h-full w-full" />
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
                                <FormLabel>Technical Specifications</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Spec details (e.g. Dimensions, colors, soft-close drawers...)"
                                    rows={2}
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Quantity, Unit Price and Discount */}
                      <div className="md:col-span-5 grid grid-cols-3 gap-3 pt-6 md:pt-0">
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
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
        onClose={() => {
          setIsQuickAddOpen(false)
          setActiveLineIndex(null)
        }}
        onSuccess={(newProduct) => {
          // Append to local catalog state
          setProducts(prev => [...prev, newProduct])
          
          // Auto-select in current line item
          if (activeLineIndex !== null) {
            form.setValue(`items.${activeLineIndex}.productId`, newProduct.id)
            form.setValue(`items.${activeLineIndex}.description`, newProduct.productName)
            form.setValue(`items.${activeLineIndex}.specifications`, newProduct.specifications || "")
            form.setValue(`items.${activeLineIndex}.unitPrice`, newProduct.unitPrice)
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
