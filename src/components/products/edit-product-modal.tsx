"use client"

import { useState, useEffect } from "react"
import { X, Loader2, Sparkles, Image as ImageIcon, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ImageCropper } from "@/components/ui/image-cropper"

interface Product {
  id: string
  productCode: string
  productName: string
  unitPrice: number
  costPrice: number
  interiorPrice?: number
  dealerPrice?: number
  directPrice?: number
  onlinePrice?: number
  warranty: string | null
  availableColors: string | null
  dimensions: string | null
  specifications: string | null
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
  const [costPrice, setCostPrice] = useState("")
  const [interiorPrice, setInteriorPrice] = useState("")
  const [dealerPrice, setDealerPrice] = useState("")
  const [directPrice, setDirectPrice] = useState("")
  const [onlinePrice, setOnlinePrice] = useState("")
  const [warranty, setWarranty] = useState("")
  const [dimensions, setDimensions] = useState("")
  const [specifications, setSpecifications] = useState("")
  const [status, setStatus] = useState("ACTIVE")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Cropper states
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    if (product) {
      setName(product.productName)
      setCode(product.productCode)
      setCategoryName(product.category.name)
      setPrice(product.unitPrice.toString())
      setCostPrice(product.costPrice?.toString() || "")
      setInteriorPrice(product.interiorPrice?.toString() || "")
      setDealerPrice(product.dealerPrice?.toString() || "")
      setDirectPrice(product.directPrice?.toString() || "")
      setOnlinePrice(product.onlinePrice?.toString() || "")
      setWarranty(product.warranty || "5 Years")
      setDimensions(product.dimensions || "Standard")
      setSpecifications(product.specifications || "")
      setStatus(product.status)
      setImagePreview(product.imageUrl)
      setBase64Image(null)
    }
  }, [product, isOpen])

  if (!isOpen || !product) return null

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

  const handleImageChange = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      setRawImageSrc(reader.result as string)
      setIsCropperOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropSave = async (croppedBase64: string) => {
    setIsCropperOpen(false)
    setImagePreview(croppedBase64)
    setUploadingImage(true)

    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[DEV MODE] Bypassing file upload to prevent Next.js dev compilation restarts. Using Base64 directly.");
        setBase64Image(croppedBase64)
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
          setBase64Image(data.url)
          toast.success("Image cropped and uploaded successfully!")
        } else {
          setBase64Image(croppedBase64)
        }
      } else {
        console.warn("Upload endpoint failed, falling back to base64 encoding")
        setBase64Image(croppedBase64)
      }
    } catch (err) {
      console.error("Failed to upload cropped image:", err)
      setBase64Image(croppedBase64)
    } finally {
      setUploadingImage(false)
    }
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
          costPrice: parseFloat(costPrice) || 0.0,
          interiorPrice: interiorPrice !== "" ? parseFloat(interiorPrice) : parseFloat(price),
          dealerPrice: dealerPrice !== "" ? parseFloat(dealerPrice) : parseFloat(price),
          directPrice: directPrice !== "" ? parseFloat(directPrice) : parseFloat(price),
          onlinePrice: onlinePrice !== "" ? parseFloat(onlinePrice) : parseFloat(price),
          warranty,
          dimensions,
          specifications,
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
              <label className="text-xs font-bold">Selling Price (AED)</label>
              <Input 
                type="number"
                step="0.01"
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                placeholder="E.g., 850.00" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Cost Price (AED)</label>
              <Input 
                type="number"
                step="0.01"
                value={costPrice} 
                onChange={(e) => setCostPrice(e.target.value)} 
                placeholder="E.g., 500.00" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Interior Price (AED)</label>
              <Input 
                type="number"
                step="0.01"
                value={interiorPrice} 
                onChange={(e) => setInteriorPrice(e.target.value)} 
                placeholder="Defaults to Selling Price" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Dealer Price (AED)</label>
              <Input 
                type="number"
                step="0.01"
                value={dealerPrice} 
                onChange={(e) => setDealerPrice(e.target.value)} 
                placeholder="Defaults to Selling Price" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Direct Price (AED)</label>
              <Input 
                type="number"
                step="0.01"
                value={directPrice} 
                onChange={(e) => setDirectPrice(e.target.value)} 
                placeholder="Defaults to Selling Price" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Online Price (AED)</label>
              <Input 
                type="number"
                step="0.01"
                value={onlinePrice} 
                onChange={(e) => setOnlinePrice(e.target.value)} 
                placeholder="Defaults to Selling Price" 
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
              <label className="text-xs font-bold">Product Specifications</label>
              <Textarea 
                value={specifications} 
                onChange={(e) => setSpecifications(e.target.value)} 
                placeholder="E.g., High quality Italian leather, ergonomic lumbar support..." 
                rows={3}
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
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
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
