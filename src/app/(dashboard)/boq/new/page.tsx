"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2, Save, Send, ArrowLeft, Loader2, Search, ChevronsUpDown, Check } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

const boqSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectName: z.string().min(1, "Project name is required"),
  customerSegment: z.enum(["Interior", "Dealer", "Project", "Special"]).default("Project"),
  isTemplate: z.boolean().default(false),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().nullable().optional(),
      description: z.string().min(1, "Description is required"),
      specifications: z.string().optional(),
      dimensions: z.string().optional(),
      quantity: z.union([z.number(), z.string()]).refine(val => (val === "" ? 1 : Number(val)) > 0, "Quantity must be greater than 0"),
      unit: z.string().default("Nos"),
      customImageUrl: z.string().nullable().optional(),
    })
  ).min(1, "At least one item is required"),
})

type BoqFormValues = z.infer<typeof boqSchema>

export default function NewBoqPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [clients, setClients] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])

  const form = useForm<BoqFormValues>({
    resolver: zodResolver(boqSchema),
    defaultValues: {
      clientId: "",
      projectName: "",
      customerSegment: "Project",
      isTemplate: false,
      notes: "",
      termsConditions: "",
      items: [{
        productId: null,
        description: "",
        specifications: "",
        dimensions: "",
        quantity: 1,
        unit: "Nos",
        customImageUrl: null,
      }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    name: "items",
    control: form.control,
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [clientsRes, productsRes, settingsRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/products"),
          fetch("/api/settings")
        ])

        const [clientsData, productsData, settingsData] = await Promise.all([
          clientsRes.json(),
          productsRes.json(),
          settingsRes.json()
        ])

        setClients(clientsData.data || clientsData || [])
        setProducts(productsData.data || productsData || [])
        
        if (settingsData && settingsData.termsConditions) {
          const defaultTerms = settingsData.termsConditions.filter((t: any) => t.isDefault)
          const termsText = defaultTerms.map((t: any) => `${t.title}:\n${t.content}`).join("\n\n")
          form.setValue("termsConditions", termsText)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load necessary data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [form])

  const onSubmit = async (data: BoqFormValues, status: string = "DRAFT") => {
    try {
      setSaving(true)
      const payload = {
        ...data,
        status
      }

      const res = await fetch("/api/boq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create BOQ")
      }

      const boq = await res.json()
      toast.success(`BOQ ${boq.boqNumber} created successfully`)
      router.push("/boq")
    } catch (error) {
      console.error("Error creating BOQ:", error)
      toast.error(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create BOQ</h1>
            <p className="text-muted-foreground">Prepare a Bill of Quantities for estimating</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Client</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("justify-between", !field.value && "text-muted-foreground")}
                          >
                            {field.value
                              ? clients.find((c) => c.id === field.value)?.companyName
                              : "Select client"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput placeholder="Search client..." />
                          <CommandList>
                            <CommandEmpty>No client found.</CommandEmpty>
                            <CommandGroup>
                              {clients.map((client) => (
                                <CommandItem
                                  value={client.companyName}
                                  key={client.id}
                                  onSelect={() => field.onChange(client.id)}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", client.id === field.value ? "opacity-100" : "opacity-0")} />
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
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Office Fitout Phase 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerSegment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Segment</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select segment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Project">Project</SelectItem>
                        <SelectItem value="Interior">Interior</SelectItem>
                        <SelectItem value="Dealer">Dealer</SelectItem>
                        <SelectItem value="Special">Special</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isTemplate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Save as Template</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Allow reusing this BOQ for future projects
                      </div>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>BOQ Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="relative rounded-lg border p-6 bg-slate-50/50">
                  <div className="absolute right-4 top-4">
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
                  
                  <div className="grid gap-6 md:grid-cols-12 mb-4">
                    <div className="md:col-span-12">
                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Describe the item" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-12">
                    <div className="md:col-span-6">
                      <FormField
                        control={form.control}
                        name={`items.${index}.specifications`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specifications</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Detailed specifications" className="resize-none" rows={3} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.dimensions`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dimensions</FormLabel>
                            <FormControl>
                              <Input placeholder="L x W x H" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <FormField
                        control={form.control}
                        name={`items.${index}.unit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <FormControl>
                              <Input placeholder="Nos" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => append({
                  productId: null,
                  description: "",
                  specifications: "",
                  dimensions: "",
                  quantity: 1,
                  unit: "Nos",
                  customImageUrl: null,
                })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Internal)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any internal notes for estimators" className="resize-none min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="termsConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms & Conditions</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Terms and conditions" className="resize-none min-h-[150px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 sticky bottom-6 bg-background/80 backdrop-blur-sm p-4 rounded-xl border shadow-lg">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.handleSubmit((d) => onSubmit(d, "DRAFT"))()}
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={() => form.handleSubmit((d) => onSubmit(d, "SENT_TO_ESTIMATOR"))()}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit to Estimator
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
