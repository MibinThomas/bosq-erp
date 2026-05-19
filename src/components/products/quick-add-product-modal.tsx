"use client"

import { useState } from "react"
import { X, Loader2, Sparkles, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

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

interface QuickAddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newProduct: Product) => void
}

export function QuickAddProductModal({ isOpen, onClose, onSuccess }: QuickAddProductModalProps) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [categoryName, setCategoryName] = useState("Chairs")
  const [price, setPrice] = useState("")
  const [warranty, setWarranty] = useState("5 Years")
  const [dimensions, setDimensions] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

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
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: name,
          productCode: code || undefined,
          categoryName,
          unitPrice: parseFloat(price) || 0.0,
          warranty,
          dimensions: dimensions || "Standard",
          imageUrl: base64Image || undefined
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create product")
      }

      const created = await res.json()
      toast.success("New product saved to catalog!")
      onSuccess({
        id: created.id,
        productCode: created.productCode,
        productName: created.productName,
        unitPrice: created.unitPrice,
        interiorPrice: created.interiorPrice,
        dealerPrice: created.dealerPrice,
        directPrice: created.directPrice,
        onlinePrice: created.onlinePrice,
        specifications: created.specifications || "",
        imageUrl: created.imageUrl || null
      })
      
      // Reset form
      setName("")
      setCode("")
      setCategoryName("Chairs")
      setPrice("")
      setWarranty("5 Years")
      setDimensions("")
      setImagePreview(null)
      setBase64Image(null)
      onClose()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to create product.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Add Custom Product to Catalog
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Add a brand new item to the master catalog and use it in this quotation instantly.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Product Name / Title</label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="E.g., High-Back Ergonomic Leather Executive Chair"
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Product Code / SKU</label>
                <Input 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)} 
                  placeholder="Auto-generated if blank" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Category</label>
                <Input 
                  value={categoryName} 
                  onChange={(e) => setCategoryName(e.target.value)} 
                  placeholder="E.g., Chairs, Desks"
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Unit Price (AED)</label>
                <Input 
                  type="number"
                  step="0.01"
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  placeholder="E.g., 950.00" 
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
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Dimensions</label>
              <Input 
                value={dimensions} 
                onChange={(e) => setDimensions(e.target.value)} 
                placeholder="E.g., 680W x 620D x 1200H" 
              />
            </div>

            {/* Image Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold">Product Image</label>
              <div className="flex items-center gap-4 p-3 border rounded-xl bg-muted/30">
                <div className="h-16 w-16 border rounded-lg bg-white overflow-hidden relative shrink-0 flex items-center justify-center shadow-inner">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="object-contain h-full w-full" />
                  ) : (
                    <ImageIcon className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground block">
                    Upload PNG or JPG image for this chair.
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
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Item...
                </>
              ) : (
                <>
                  Add to Quotation
                </>
              )}
            </Button>
          </div>
        </form>

      </div>
    </div>
  )
}
