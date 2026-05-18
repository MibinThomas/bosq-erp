"use client"

import { useState, useEffect } from "react"
import { X, Loader2, Sparkles, Image as ImageIcon, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Product {
  id: string
  productCode: string
  productName: string
  unitPrice: number
  costPrice: number
  warranty: string | null
  availableColors: string | null
  dimensions: string | null
  status: string
  imageUrl: string | null
  category: {
    name: string
  }
}

interface EditProductModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditProductModal({ product, isOpen, onClose, onSuccess }: EditProductModalProps) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [categoryName, setCategoryName] = useState("")
  const [price, setPrice] = useState("")
  const [warranty, setWarranty] = useState("")
  const [dimensions, setDimensions] = useState("")
  const [status, setStatus] = useState("ACTIVE")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (product) {
      setName(product.productName)
      setCode(product.productCode)
      setCategoryName(product.category.name)
      setPrice(product.unitPrice.toString())
      setWarranty(product.warranty || "5 Years")
      setDimensions(product.dimensions || "Standard")
      setStatus(product.status)
      setImagePreview(product.imageUrl)
      setBase64Image(null)
    }
  }, [product, isOpen])

  if (!isOpen || !product) return null

  const handleImageChange = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const resultStr = reader.result as string
      setImagePreview(resultStr)
      setBase64Image(resultStr)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !categoryName) {
      toast.error("Product name and category are required.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: name,
          productCode: code,
          categoryName,
          unitPrice: parseFloat(price) || 0.0,
          warranty,
          dimensions,
          status,
          imageUrl: base64Image || undefined
        })
      })

      if (!res.ok) throw new Error("Failed to update product")
      toast.success("Product updated successfully!")
      onSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      toast.error("Failed to update product. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-card rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Update Product
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Modify the attributes and pricing specifications of your item.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-bold">Product Name</label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="E.g., Aero Ergonomic Task Chair"
                required 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Product Code / SKU</label>
              <Input 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                placeholder="E.g., CH-1001" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Category</label>
              <Input 
                value={categoryName} 
                onChange={(e) => setCategoryName(e.target.value)} 
                placeholder="E.g., Chairs"
                required 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Unit Price (AED)</label>
              <Input 
                type="number"
                step="0.01"
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                placeholder="E.g., 850.00" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Warranty Period</label>
              <Input 
                value={warranty} 
                onChange={(e) => setWarranty(e.target.value)} 
                placeholder="E.g., 5 Years" 
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-bold">Dimensions</label>
              <Input 
                value={dimensions} 
                onChange={(e) => setDimensions(e.target.value)} 
                placeholder="E.g., 650W x 600D x 1150H" 
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-bold">Product Status</label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISCONTINUED">DISCONTINUED</option>
              </select>
            </div>

            {/* Image Selector */}
            <div className="col-span-2 space-y-2">
              <label className="text-xs font-bold">Product Image</label>
              <div className="flex items-center gap-4 p-3 border rounded-xl bg-muted/30">
                <div className="h-20 w-20 border rounded-lg bg-white overflow-hidden relative shrink-0 flex items-center justify-center shadow-inner">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="object-contain h-full w-full" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground block">
                    Upload a custom JPEG or PNG catalog product image.
                  </span>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="text-xs cursor-pointer"
                    onChange={(e) => e.target.files?.[0] && handleImageChange(e.target.files[0])}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>

      </div>
    </div>
  )
}
