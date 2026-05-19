"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Save, Package, DollarSign, PenTool, ClipboardList, Layers } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export default function NewProductPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    productCode: "",
    productName: "",
    categoryName: "Workstations",
    unitPrice: "",
    costPrice: "",
    interiorPrice: "",
    dealerPrice: "",
    directPrice: "",
    onlinePrice: "",
    warranty: "5 Years",
    availableColors: "Standard",
    dimensions: "",
    specifications: "",
    description: "",
  })

  const handleSelectChange = (value: string | null) => {
    setFormData((prev) => ({ ...prev, categoryName: value || "Workstations" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.productName.trim()) {
      toast.error("Product name is required")
      return
    }
    if (!formData.unitPrice.trim() || isNaN(parseFloat(formData.unitPrice))) {
      toast.error("Valid unit price is required")
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        interiorPrice: formData.interiorPrice.trim() || formData.unitPrice,
        dealerPrice: formData.dealerPrice.trim() || formData.unitPrice,
        directPrice: formData.directPrice.trim() || formData.unitPrice,
        onlinePrice: formData.onlinePrice.trim() || formData.unitPrice,
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to create product")
      }

      const newProduct = await res.json()
      toast.success(`Product ${newProduct.productName} created successfully!`)
      router.push("/products")
    } catch (error: any) {
      console.error("Error creating product:", error)
      toast.error(error.message || "Failed to create product. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center space-x-4">
        <Link href="/products">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
          <p className="text-muted-foreground">
            Create a new item in the office furniture master catalog.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border rounded-2xl p-6 bg-card text-card-foreground shadow-sm space-y-6">
          <h2 className="text-lg font-semibold border-b pb-2">Product Specifications</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-primary" />
                Product Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Executive Mesh Chair"
                value={formData.productName}
                onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Category <span className="text-red-500">*</span>
              </label>
              <Select value={formData.categoryName} onValueChange={handleSelectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Workstations">Workstations</SelectItem>
                  <SelectItem value="Executive desks">Executive desks</SelectItem>
                  <SelectItem value="Ergonomic chairs">Ergonomic chairs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                Product Code (Optional)
              </label>
              <Input
                placeholder="Auto-generated if blank (e.g. WS-05)"
                value={formData.productCode}
                onChange={(e) => setFormData(prev => ({ ...prev, productCode: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Selling Price (AED) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 850.00"
                value={formData.unitPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Cost Price (AED)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 500.00"
                value={formData.costPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Interior Price (AED)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Defaults to Selling Price"
                value={formData.interiorPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, interiorPrice: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Dealer Price (AED)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Defaults to Selling Price"
                value={formData.dealerPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, dealerPrice: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Direct Price (AED)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Defaults to Selling Price"
                value={formData.directPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, directPrice: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Online Price (AED)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Defaults to Selling Price"
                value={formData.onlinePrice}
                onChange={(e) => setFormData(prev => ({ ...prev, onlinePrice: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Warranty Period
              </label>
              <Input
                placeholder="e.g. 5 Years"
                value={formData.warranty}
                onChange={(e) => setFormData(prev => ({ ...prev, warranty: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <PenTool className="h-3.5 w-3.5 text-primary" />
                Available Colors
              </label>
              <Input
                placeholder="e.g. Black, Grey, Blue"
                value={formData.availableColors}
                onChange={(e) => setFormData(prev => ({ ...prev, availableColors: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Dimensions
              </label>
              <Input
                placeholder="e.g. 650x650x1200 mm"
                value={formData.dimensions}
                onChange={(e) => setFormData(prev => ({ ...prev, dimensions: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-3.5 w-3.5 text-primary" />
              Technical Specifications
            </label>
            <Textarea
              placeholder="e.g. Breathable Korean mesh, 3D adjustable armrests, multi-lock synchronized mechanism, class-4 gas lift."
              rows={3}
              value={formData.specifications}
              onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Product Description
            </label>
            <Textarea
              placeholder="e.g. Premium ergonomic chair designed for ultimate comfort and durability in long office sessions..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4">
          <Link href="/products">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Product...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Product
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
