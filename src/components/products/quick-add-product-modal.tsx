"use client"

import { useState, useEffect } from "react"
import { X, Loader2, Sparkles, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ImageCropper } from "@/components/ui/image-cropper"
import RichTextEditor from "@/components/ui/rich-text-editor"

interface Product {
  id: string
  productCode: string
  productName: string
  unitPrice: number
  interiorPrice?: number
  dealerPrice?: number
  projectPrice?: number
  specialPrice?: number
  specifications: string | null
  imageUrl: string | null
  stock?: number
}

interface QuickAddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newProduct: Product) => void
  userRole?: string
}

export function QuickAddProductModal({ isOpen, onClose, onSuccess, userRole }: QuickAddProductModalProps) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [categoryName, setCategoryName] = useState("Chairs")
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string }[]>([])
  const [price, setPrice] = useState("")

  useEffect(() => {
    if (isOpen) {
      fetch("/api/products/categories")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setCategoriesList(data)
        })
        .catch(console.error)
    }
  }, [isOpen])
  const [warranty, setWarranty] = useState("5 Years")
  const [description, setDescription] = useState("")
  const [specifications, setSpecifications] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Cropper states
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Sales Executives cannot write to the product catalog - they add directly to the quote line
  const isSalesExec = userRole === "SALES_EXECUTIVE"

  if (!isOpen) return null

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
      // In local development, avoid uploading files to public/uploads disk directory 
      // to completely prevent Next.js dev server file-watching hot-reload restarts.
      if (process.env.NODE_ENV === "development") {
        console.log("[DEV MODE] Bypassing file upload to prevent Next.js dev compilation restarts. Using Base64 directly.");
        setBase64Image(croppedBase64)
        toast.success("Image cropped and saved locally (Dev Mode Base64)!")
        return
      }

      const croppedFile = dataURLtoFile(croppedBase64, `product-cropped-${Date.now()}.png`)
      const formData = new FormData()
      formData.append("file", croppedFile)

      const uploadRes = await fetch("/api/upload?type=product", {
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
    if (!name) {
      toast.error("Product name is required.")
      return
    }



    setLoading(true)
    try {
      if (isSalesExec) {
        // Sales Executives: directly populate the quotation line without touching the product catalog
        const unitPrice = parseFloat(price) || 0.0
        const tempProduct: Product = {
          id: `custom-${Date.now()}`,
          productCode: code || "CUSTOM",
          productName: name,
          unitPrice,
          interiorPrice: unitPrice,
          dealerPrice: unitPrice,
          projectPrice: unitPrice,
          specialPrice: unitPrice,
          specifications: specifications || null,
          imageUrl: base64Image || null,
        }
        toast.success("Custom item added to quotation!")
        onSuccess(tempProduct)
      } else {
        // Managers/Admins: save to the product master catalog then populate the line
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName: name,
            productCode: code || undefined,
            categoryName: categoryName || "General",
            unitPrice: parseFloat(price) || 0.0,
            description: description || undefined,
            specifications: specifications || undefined,
            warranty,
            imageUrl: base64Image || undefined,
          }),
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
          projectPrice: created.projectPrice,
          specialPrice: created.specialPrice,
          specifications: created.specifications || "",
          imageUrl: created.imageUrl || null,
        })
      }

      // Reset form
      setName("")
      setCode("")
      setCategoryName("Chairs")
      setPrice("")
      setWarranty("5 Years")
      setDescription("")
      setSpecifications("")
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
              Add Custom Product
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {isSalesExec
                ? "Add a custom line item directly to this quotation."
                : "Add a brand new item to the master catalog and use it in this quotation instantly."}
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
              <label className="text-xs font-bold">Product Name / Title <span className="text-destructive">*</span></label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="E.g., High-Back Ergonomic Leather Executive Chair"
                required 
              />
            </div>

            {/* Category & SKU — only relevant for catalog saves (managers/admins) */}
            {!isSalesExec && (
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
                  <label className="text-xs font-bold">Category <span className="text-destructive">*</span></label>
                  <Input 
                    list="quick-add-categories-list"
                    value={categoryName} 
                    onChange={(e) => setCategoryName(e.target.value)} 
                    placeholder="E.g., Chairs, Desks"
                    required 
                  />
                  <datalist id="quick-add-categories-list">
                    {categoriesList.map((cat) => (
                      <option key={cat.id || cat.name} value={cat.name} />
                    ))}
                  </datalist>
                </div>
              </div>
            )}

            <div className={`grid gap-4 ${isSalesExec ? "grid-cols-1" : "grid-cols-2"}`}>
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

              {!isSalesExec && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Warranty Period</label>
                  <Input 
                    value={warranty} 
                    onChange={(e) => setWarranty(e.target.value)} 
                    placeholder="E.g., 5 Years" 
                  />
                </div>
              )}
            </div>

            {/* Product Description field for all users */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold flex justify-between">
                <span>Product Description</span>
                <span className="text-[10px] text-muted-foreground">
                  {description.length} chars
                </span>
              </label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a description for this product..."
              />
            </div>

            {/* Specifications field for all users */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Specifications</label>
              <RichTextEditor
                value={specifications}
                onChange={(val) => setSpecifications(val)}
                placeholder="Material: Leather\nColor: Black"
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
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground block">
                    Upload PNG or JPG image for this item.
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
            <Button type="button" variant="outline" onClick={onClose} disabled={loading || uploadingImage}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading || uploadingImage}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
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
