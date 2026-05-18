"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2, Save, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const quotationSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().optional(),
  date: z.string(),
  validityDate: z.string(),
  deliveryDate: z.string().optional(),
  paymentTerms: z.string(),
  items: z.array(z.object({
    productId: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).optional().default(0),
  })).min(1, "At least one item is required"),
  deliveryCharge: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
})

type QuotationFormValues = z.infer<typeof quotationSchema>

export default function NewQuotationPage() {
  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{ description: "", quantity: 1, unitPrice: 0, discount: 0 }],
      deliveryCharge: 0,
    }
  })

  const { fields, append, remove } = useFieldArray({
    name: "items",
    control: form.control,
  })

  const watchItems = form.watch("items")
  const watchDeliveryCharge = form.watch("deliveryCharge")

  const subtotal = watchItems.reduce((acc, item) => {
    return acc + ((item.unitPrice || 0) - (item.discount || 0)) * (item.quantity || 1)
  }, 0)
  
  const vatAmount = subtotal * 0.05
  const grandTotal = subtotal + vatAmount + (watchDeliveryCharge || 0)

  function onSubmit(data: QuotationFormValues) {
    console.log(data)
    // Add submit logic here
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Quotation</h1>
          <p className="text-muted-foreground">
            Build a new quotation for a client.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Generate PDF
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="c1">Acme Corp</SelectItem>
                          <SelectItem value="c2">TechFlow LLC</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. HQ Office Fitout" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quotation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
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
                        <FormLabel>Validity</FormLabel>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="50_50">50% Advance, 50% on Delivery</SelectItem>
                          <SelectItem value="100_adv">100% Advance</SelectItem>
                          <SelectItem value="30_days">30 Days PDC</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Quotation Items</CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => append({ description: "", quantity: 1, unitPrice: 0, discount: 0 })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-start border p-4 rounded-md bg-muted/20">
                    <div className="grid gap-4 flex-1">
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 md:col-span-5">
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={index !== 0 ? "sr-only md:not-sr-only" : ""}>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Product description and specifications..." 
                                    className="resize-none h-20"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="col-span-4 md:col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={index !== 0 ? "sr-only md:not-sr-only" : ""}>Qty</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    {...field} 
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="col-span-4 md:col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={index !== 0 ? "sr-only md:not-sr-only" : ""}>Unit Price</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    {...field} 
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="col-span-4 md:col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.discount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={index !== 0 ? "sr-only md:not-sr-only" : ""}>Discount</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    {...field} 
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="col-span-12 md:col-span-1 flex items-center justify-end pt-8">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            
            <CardFooter className="flex-col items-end border-t pt-6 bg-muted/10">
              <div className="w-full md:w-1/2 lg:w-1/3 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">AED {subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">VAT (5%)</span>
                  <span className="font-medium">AED {vatAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Delivery & Install</span>
                  <div className="w-24">
                    <FormField
                      control={form.control}
                      name="deliveryCharge"
                      render={({ field }) => (
                        <FormControl>
                          <Input 
                            type="number" 
                            className="h-8 text-right"
                            min="0"
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                          />
                        </FormControl>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-lg font-bold border-t pt-3">
                  <span>Grand Total</span>
                  <span>AED {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardFooter>
          </Card>
          
        </form>
      </Form>
    </div>
  )
}
