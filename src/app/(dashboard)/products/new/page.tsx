"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft, Loader2, Save, Package, Tag, Calculator, Info, Image as ImageIcon, Briefcase, Settings2, ShieldCheck, Palette, Grid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import RichTextEditor from "@/components/ui/rich-text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { ImageUploader } from "@/components/products/ImageUploader"

export default function NewProductPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role

  const [saving, setSaving] = useState(false)
  const [margins, setMargins] = useState({ dealer: 15, interior: 30, direct: 50, online: 75 })
  const [manualOverride, setManualOverride] = useState(false)

  // Fetch margins on mount
  useEffect(() => {
    fetch("/api/settings/pricing")
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setMargins(data)
        }
      })
      .catch(console.error)
  }, [])

  const [formData, setFormData] = useState({
    productCode: "",
    productName: "",
    categoryName: "Chair",
    shortDescription: "",
    specifications: "",
    costPrice: "",
    unitPrice: "", // This will map to directPrice initially
    interiorPrice: "",
    dealerPrice: "",
    directPrice: "",
    onlinePrice: "",
    warranty: "5 Years",
    
    chairType: "",
    availableColors: "",
    tableTopFinish: "",
    legType: "",
    storageOptions: "",
    finishMaterial: "",
    
    imageUrls: [] as string[]
  })

  // Handle cost price change & auto-calculate margins
  const handleCostPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const costStr = e.target.value
    const cost = parseFloat(costStr)
    
    if (manualOverride || isNaN(cost) || cost <= 0) {
      setFormData(prev => ({ ...prev, costPrice: costStr }))
      return
    }

    // Price = Cost / (1 - Margin)
    const dealer = (cost / (1 - margins.dealer / 100)).toFixed(2)
    const interior = (cost / (1 - margins.interior / 100)).toFixed(2)
    const direct = (cost / (1 - margins.direct / 100)).toFixed(2)
    const online = (cost / (1 - margins.online / 100)).toFixed(2)

    setFormData(prev => ({
      ...prev,
      costPrice: costStr,
      dealerPrice: dealer,
      interiorPrice: interior,
      directPrice: direct,
      onlinePrice: online,
      unitPrice: direct
    }))
  }

  // Effect to recalculate if manualOverride is toggled off
  useEffect(() => {
    if (!manualOverride && formData.costPrice) {
      const cost = parseFloat(formData.costPrice)
      if (!isNaN(cost) && cost > 0) {
        const dealer = (cost / (1 - margins.dealer / 100)).toFixed(2)
        const interior = (cost / (1 - margins.interior / 100)).toFixed(2)
        const direct = (cost / (1 - margins.direct / 100)).toFixed(2)
        const online = (cost / (1 - margins.online / 100)).toFixed(2)

        setFormData(prev => ({
          ...prev,
          dealerPrice: dealer,
          interiorPrice: interior,
          directPrice: direct,
          onlinePrice: online,
          unitPrice: direct
        }))
      }
    }
  }, [manualOverride, margins])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.productName.trim()) {
      toast.error("Product name is required")
      return
    }
    
    if (formData.shortDescription.length > 0 && (formData.shortDescription.length < 145 || formData.shortDescription.length > 260)) {
      toast.error("Short description must be between 145 and 260 characters.")
      return
    }

    if (!formData.costPrice.trim() || isNaN(parseFloat(formData.costPrice))) {
      toast.error("Valid cost price is required")
      return
    }

    if (formData.categoryName === "Chair") {
      if (!formData.chairType) return toast.error("Chair Type is required")
      if (!formData.availableColors) return toast.error("Available Color(s) is required")
    }

    if (formData.categoryName === "Workstation") {
      if (!formData.tableTopFinish) return toast.error("Table Top Finish is required")
      if (!formData.legType) return toast.error("Leg Type is required")
      if (!formData.storageOptions) return toast.error("Storage Options are required")
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        imageUrl: formData.imageUrls.length > 0 ? formData.imageUrls[0] : undefined,
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

  const descLen = formData.shortDescription.length

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/products">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
            <p className="text-muted-foreground">
              Create a new premium catalog item
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push("/products")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-primary/90 min-w-32">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Product Information */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Category Selector */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col space-y-4">
              <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Grid className="h-4 w-4 text-primary" />
                Select Product Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {["Chair", "Workstation", "Other Furniture / Accessories"].map(cat => (
                  <div 
                    key={cat} 
                    onClick={() => setFormData(prev => ({ ...prev, categoryName: cat }))}
                    className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all ${formData.categoryName === cat ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" : "hover:border-primary/50 hover:bg-muted/50"}`}
                  >
                    <span className={`font-semibold ${formData.categoryName === cat ? "text-primary" : "text-muted-foreground"}`}>
                      {cat}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold border-b pb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" /> Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Executive Mesh Chair"
                  value={formData.productName}
                  onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Product Code (Optional)
                </label>
                <Input
                  placeholder="Leave blank to auto-generate"
                  value={formData.productCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, productCode: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2 relative">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Short Description <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${descLen < 145 || descLen > 260 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                    {descLen} / 260 chars (Min: 145)
                  </span>
                </div>
                <Textarea
                  placeholder="Premium ergonomic chair designed for ultimate comfort and durability..."
                  rows={3}
                  value={formData.shortDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                  className={descLen > 0 && (descLen < 145 || descLen > 260) ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Used in product cards and SEO. Keep it engaging and concise.
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Category Specifications */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold border-b pb-4 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" /> {formData.categoryName} Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* CHAIR FIELDS */}
              {formData.categoryName === "Chair" && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Chair Type <span className="text-red-500">*</span>
                    </label>
                    <Select value={formData.chairType} onValueChange={(val) => setFormData(prev => ({ ...prev, chairType: val || "" }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Executive Chair", "Ergonomic Chair", "Visitor Chair", "Training Chair", "Lounge Chair", "Meeting Chair", "Gaming Chair", "High Back", "Mid Back", "Low Back"].map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Available Color(s) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Black, Grey, Beige"
                      value={formData.availableColors}
                      onChange={(e) => setFormData(prev => ({ ...prev, availableColors: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {/* WORKSTATION FIELDS */}
              {formData.categoryName === "Workstation" && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Table Top Finish <span className="text-red-500">*</span>
                    </label>
                    <Select value={formData.tableTopFinish} onValueChange={(val) => setFormData(prev => ({ ...prev, tableTopFinish: val || "" }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select finish" />
                      </SelectTrigger>
                      <SelectContent>
                        {["White", "Beech", "Walnut", "Black", "Oak", "Custom Finish"].map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Leg Type <span className="text-red-500">*</span>
                    </label>
                    <Select value={formData.legType} onValueChange={(val) => setFormData(prev => ({ ...prev, legType: val || "" }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leg type" />
                      </SelectTrigger>
                      <SelectContent>
                        {["White Leg", "Black Leg", "Mild Steel Frame", "Height Adjustable", "Premium Leg"].map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Storage Options <span className="text-red-500">*</span>
                    </label>
                    <Select value={formData.storageOptions} onValueChange={(val) => setFormData(prev => ({ ...prev, storageOptions: val || "" }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select storage option" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Without Pedestal", "3 Drawer Pedestal", "Single Drawer Floating", "Double Drawer Floating"].map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* OTHER CATEGORY FIELDS */}
              {formData.categoryName === "Other Furniture / Accessories" && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Finish / Material
                    </label>
                    <Input
                      placeholder="e.g. Wood, Steel, Fabric"
                      value={formData.finishMaterial}
                      onChange={(e) => setFormData(prev => ({ ...prev, finishMaterial: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Color
                    </label>
                    <Input
                      placeholder="e.g. White"
                      value={formData.availableColors}
                      onChange={(e) => setFormData(prev => ({ ...prev, availableColors: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {/* SHARED WARRANTY */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Warranty <span className="text-red-500">*</span>
                </label>
                <Select value={formData.warranty} onValueChange={(val) => setFormData(prev => ({ ...prev, warranty: val || "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Warranty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 Year">1 Year</SelectItem>
                    <SelectItem value="2 Years">2 Years</SelectItem>
                    <SelectItem value="3 Years">3 Years</SelectItem>
                    <SelectItem value="5 Years">5 Years</SelectItem>
                    <SelectItem value="10 Years">10 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>

          {/* Technical Specifications */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold border-b pb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" /> Technical Specifications
            </h2>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-4">
                Provide rich formatting for dimensions, materials, finishes, and additional specs. Use bold and bullets.
              </p>
              <RichTextEditor
                placeholder="Product Dimensions, detailed features, technical specifications..."
                value={formData.specifications}
                onChange={(val) => setFormData(prev => ({ ...prev, specifications: val }))}
              />
            </div>
          </div>

        </div>

        {/* Right Column: Images & Pricing */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Images */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold border-b pb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" /> Images
            </h2>
            <ImageUploader 
              images={formData.imageUrls}
              onChange={(urls) => setFormData(prev => ({ ...prev, imageUrls: urls }))}
            />
          </div>

          {/* Pricing Configurator */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" /> Pricing
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Manual Override</label>
                <Switch 
                  checked={manualOverride}
                  onCheckedChange={setManualOverride}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2 relative">
                <label className="text-sm font-bold text-foreground">
                  Cost Price (AED) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">AED</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-11 h-12 text-lg font-semibold bg-primary/5 border-primary/20"
                    value={formData.costPrice}
                    onChange={handleCostPriceChange}
                    required
                  />
                </div>
                {!manualOverride && (
                  <p className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1 mt-2">
                    <ShieldCheck className="h-3 w-3" /> Auto-calculating segment prices
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-border/40">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Calculated Segment Prices</label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Dealer Price</label>
                    <Input
                      type="number"
                      value={formData.dealerPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, dealerPrice: e.target.value }))}
                      disabled={!manualOverride}
                      className={!manualOverride ? "bg-muted font-medium" : "font-medium"}
                    />
                    {!manualOverride && <p className="text-[9px] text-muted-foreground mt-1 text-right">Margin: {margins.dealer}%</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Interior Price</label>
                    <Input
                      type="number"
                      value={formData.interiorPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, interiorPrice: e.target.value }))}
                      disabled={!manualOverride}
                      className={!manualOverride ? "bg-muted font-medium" : "font-medium"}
                    />
                    {!manualOverride && <p className="text-[9px] text-muted-foreground mt-1 text-right">Margin: {margins.interior}%</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Direct Price</label>
                    <Input
                      type="number"
                      value={formData.directPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, directPrice: e.target.value }))}
                      disabled={!manualOverride}
                      className={!manualOverride ? "bg-muted font-medium" : "font-medium"}
                    />
                    {!manualOverride && <p className="text-[9px] text-muted-foreground mt-1 text-right">Margin: {margins.direct}%</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Online Price</label>
                    <Input
                      type="number"
                      value={formData.onlinePrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, onlinePrice: e.target.value }))}
                      disabled={!manualOverride}
                      className={!manualOverride ? "bg-muted font-medium" : "font-medium"}
                    />
                    {!manualOverride && <p className="text-[9px] text-muted-foreground mt-1 text-right">Margin: {margins.online}%</p>}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
