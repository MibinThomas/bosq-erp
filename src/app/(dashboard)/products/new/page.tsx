"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Package, 
  Tag, 
  Calculator, 
  Info, 
  Image as ImageIcon, 
  Briefcase, 
  Settings2, 
  ShieldCheck, 
  Palette, 
  Grid, 
  Plus, 
  X, 
  Layers,
  Armchair,
  Building2,
  Box,
  Sparkles,
  SlidersHorizontal,
  Eye,
  CheckCircle2,
  Ruler,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import RichTextEditor from "@/components/ui/rich-text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ImageUploader } from "@/components/products/ImageUploader"
import { VariantMatrixBuilder, GeneratedVariant } from "@/components/products/variant-matrix-builder"
import { cn } from "@/lib/utils"

export default function NewProductPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role

  const [saving, setSaving] = useState(false)
  const [margins, setMargins] = useState({ dealer: 15, interior: 30, direct: 50, online: 75 })
  const [manualOverride, setManualOverride] = useState(false)
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string; description: string | null }[]>([])
  const [configuredVariants, setConfiguredVariants] = useState<GeneratedVariant[]>([])
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDesc, setNewCategoryDesc] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)

  const [checkingPermission, setCheckingPermission] = useState(true)
  const [canManageCategory, setCanManageCategory] = useState(false)

  // Dynamic Custom Key-Value Attributes List state
  const [customAttributesList, setCustomAttributesList] = useState<Array<{ id: string; key: string; value: string }>>([])
  const [newAttrKey, setNewAttrKey] = useState("")
  const [newAttrVal, setNewAttrVal] = useState("")

  const [formData, setFormData] = useState({
    productCode: "",
    productName: "",
    categoryName: "Chairs",
    description: "",
    specifications: "",
    costPrice: "",
    unitPrice: "",
    interiorPrice: "",
    dealerPrice: "",
    projectPrice: "",
    specialPrice: "",
    warranty: "3 Years",
    stock: "10",
    
    chairType: "",
    availableColors: "",
    tableTopFinish: "",
    legType: "",
    storageOptions: "",
    finishMaterial: "",
    
    imageUrls: [] as string[]
  })

  // Fetch categories list
  async function fetchCategories(selectNewName?: string) {
    try {
      const res = await fetch("/api/products/categories")
      if (res.ok) {
        const data = await res.json()
        setCategoriesList(data)
        if (selectNewName) {
          setFormData(prev => ({ ...prev, categoryName: selectNewName }))
        } else if (data.length > 0 && !formData.categoryName) {
          setFormData(prev => ({ ...prev, categoryName: data[0].name }))
        }
      }
    } catch (err) {
      console.error("Failed to load categories:", err)
    }
  }

  // Fetch margins and categories on mount, plus check permissions
  useEffect(() => {
    fetch("/api/settings/pricing")
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setMargins(data)
        }
      })
      .catch(console.error)
    fetchCategories()

    // Check permissions
    fetch("/api/users/me/permissions")
      .then(res => res.json())
      .then(data => {
        const role = (session?.user as any)?.role || ""
        const isSuperAdmin = role === "SUPER_ADMIN"
        
        if (data && data.permissions) {
          const prodPerms = data.permissions.PRODUCTS || {}
          const allowedCreate = isSuperAdmin || prodPerms.create === true || (prodPerms.create === undefined && ["ADMIN", "SALES_MANAGER", "MANAGER"].includes(role))
          const allowedManage = isSuperAdmin || prodPerms.manage === true || (prodPerms.manage === undefined && ["ADMIN", "SALES_MANAGER", "MANAGER"].includes(role))
          
          setCanManageCategory(allowedManage)
          if (!allowedCreate) {
            router.push("/403")
          } else {
            setCheckingPermission(false)
          }
        } else {
          const allowedCreate = isSuperAdmin || ["ADMIN", "SALES_MANAGER", "MANAGER"].includes(role)
          const allowedManage = isSuperAdmin || ["ADMIN", "SALES_MANAGER", "MANAGER"].includes(role)
          
          setCanManageCategory(allowedManage)
          if (!allowedCreate) {
            router.push("/403")
          } else {
            setCheckingPermission(false)
          }
        }
      })
      .catch(err => {
        console.error("Failed to load permissions", err)
        const role = (session?.user as any)?.role || ""
        const isSuperAdmin = role === "SUPER_ADMIN"
        const allowedCreate = isSuperAdmin || ["ADMIN", "SALES_MANAGER", "MANAGER"].includes(role)
        const allowedManage = isSuperAdmin || ["ADMIN", "SALES_MANAGER", "MANAGER"].includes(role)
        
        setCanManageCategory(allowedManage)
        if (!allowedCreate) {
          router.push("/403")
        } else {
          setCheckingPermission(false)
        }
      })
  }, [session, router])

  // Category identification helpers
  const categoryLower = (formData.categoryName || "").toLowerCase()
  const isChairCategory = categoryLower.includes("chair") || categoryLower.includes("seating")
  const isWorkstationCategory = categoryLower.includes("workstation") || categoryLower.includes("desk") || categoryLower.includes("table")
  const isStorageCategory = categoryLower.includes("storage") || categoryLower.includes("cabinet") || categoryLower.includes("pedestal")
  const isAccessoryCategory = categoryLower.includes("accessory") || categoryLower.includes("accessories")

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
      projectPrice: direct,
      specialPrice: online,
      unitPrice: direct
    }))
  }

  // Recalculate segment prices when manualOverride is toggled off
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
          projectPrice: direct,
          specialPrice: online,
          unitPrice: direct
        }))
      }
    }
  }, [manualOverride, margins])

  // Custom attributes management helpers
  const handleAddCustomAttribute = () => {
    if (!newAttrKey.trim() || !newAttrVal.trim()) {
      toast.error("Both attribute name and value option are required.")
      return
    }
    setCustomAttributesList(prev => [
      ...prev,
      { id: String(Date.now()), key: newAttrKey.trim(), value: newAttrVal.trim() }
    ])
    setNewAttrKey("")
    setNewAttrVal("")
  }

  const handleRemoveCustomAttribute = (id: string) => {
    setCustomAttributesList(prev => prev.filter(item => item.id !== id))
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.productName.trim()) {
      toast.error("Product name is required")
      return
    }

    if (!formData.costPrice.trim() || isNaN(parseFloat(formData.costPrice))) {
      toast.error("Valid cost price is required")
      return
    }

    // Build variantAttributes object
    const variantAttributesObj: Record<string, string> = {}
    customAttributesList.forEach(item => {
      if (item.key && item.value) {
        variantAttributesObj[item.key] = item.value
      }
    })

    setSaving(true)
    try {
      const payload = {
        ...formData,
        imageUrl: formData.imageUrls.length > 0 ? formData.imageUrls[0] : undefined,
        stock: parseInt(formData.stock, 10) || 0,
        isMaster: configuredVariants.length > 0,
        variantAttributes: Object.keys(variantAttributesObj).length > 0 ? variantAttributesObj : undefined,
        variants: configuredVariants,
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
      toast.success(
        configuredVariants.length > 0
          ? `Master Product "${newProduct.productName}" with ${configuredVariants.length} variants created successfully!`
          : `Product "${newProduct.productName}" created successfully!`
      )
      router.push("/products")
    } catch (error: any) {
      console.error("Error creating product:", error)
      toast.error(error.message || "Failed to create product. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const descLen = (formData.description || "").length

  // Helper icon for category tile
  const getCategoryTileIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes("chair") || lower.includes("seating")) return <Armchair className="h-5 w-5" />
    if (lower.includes("workstation") || lower.includes("desk") || lower.includes("table")) return <Building2 className="h-5 w-5" />
    if (lower.includes("storage") || lower.includes("cabinet") || lower.includes("pedestal")) return <Box className="h-5 w-5" />
    if (lower.includes("accessory") || lower.includes("accessories")) return <Tag className="h-5 w-5" />
    return <Layers className="h-5 w-5" />
  }

  if (checkingPermission) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        <p className="text-sm text-muted-foreground font-medium">Loading Product Manager...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs">
        <div className="flex items-center space-x-4">
          <Link href="/products">
            <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-border/70 hover:bg-muted">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Add New Product
              </h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30">
                Category Driven
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a new category-driven catalog item with dynamic customization attributes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push("/products")} className="rounded-xl">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={saving} 
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl min-w-36 shadow-sm flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Product</span>
          </Button>
        </div>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Main Form Sections (8/12 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 1. Category Selector */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Grid className="h-4 w-4 text-orange-500" />
                Select Product Category
              </label>
              <span className="text-[11px] text-muted-foreground italic">
                Controls dynamic attributes & configurator rules
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categoriesList.map(cat => {
                const isSelected = formData.categoryName === cat.name
                return (
                  <div 
                    key={cat.id} 
                    onClick={() => setFormData(prev => ({ ...prev, categoryName: cat.name }))}
                    className={cn(
                      "cursor-pointer border rounded-xl p-3.5 flex flex-col items-center justify-center text-center transition-all group relative overflow-hidden",
                      isSelected 
                        ? "border-orange-500 bg-orange-500/5 shadow-xs ring-1 ring-orange-500/30" 
                        : "border-border/70 hover:border-orange-500/40 hover:bg-muted/40"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg mb-2 transition-colors", isSelected ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" : "bg-muted text-muted-foreground group-hover:text-foreground")}>
                      {getCategoryTileIcon(cat.name)}
                    </div>
                    <span className={cn("font-bold text-xs truncate w-full", isSelected ? "text-orange-600 dark:text-orange-400" : "text-foreground")}>
                      {cat.name}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="h-3.5 w-3.5 absolute top-2 right-2 text-orange-600 dark:text-orange-400" />
                    )}
                  </div>
                )
              })}
              
              {canManageCategory && (
                <div 
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="cursor-pointer border border-dashed border-orange-500/40 hover:border-orange-500 rounded-xl p-3.5 flex flex-col items-center justify-center text-center hover:bg-orange-500/5 transition-all text-orange-600 dark:text-orange-400 group"
                >
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 mb-1">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-xs">+ Add Category</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Basic Information */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-6">
            <h2 className="text-base font-bold border-b pb-4 flex items-center gap-2 text-foreground">
              <Info className="h-4 w-4 text-orange-500" /> Basic Product Identification
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <span>Product Name</span> <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="e.g. EAGLE High Back Ergonomic Mesh Chair"
                  value={formData.productName}
                  onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                  className="h-10 text-sm font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Product Code / SKU
                </label>
                <Input
                  placeholder="Auto-generated if empty"
                  value={formData.productCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, productCode: e.target.value }))}
                  className="h-10 text-xs font-mono"
                />
              </div>

              <div className="space-y-2 md:col-span-3 relative">
                <div className="flex justify-between items-end mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Product Description
                  </label>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {descLen} chars
                  </span>
                </div>
                <Textarea
                  placeholder="Enter a comprehensive description for this product range..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Category-Specific Customization Attributes */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                <Settings2 className="h-4 w-4 text-orange-500" />
                Category Customization Attributes ({formData.categoryName})
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono uppercase bg-muted">
                Configurator Specs
              </Badge>
            </div>

            {/* Standard Category Form Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isChairCategory && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Armchair className="h-3.5 w-3.5 text-muted-foreground" /> Chair / Backrest Type
                    </label>
                    <Select value={formData.chairType} onValueChange={(val) => setFormData(prev => ({ ...prev, chairType: val || "" }))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select backrest / type" />
                      </SelectTrigger>
                      <SelectContent>
                        {["High Back", "Mid Back", "Low Back", "Executive Chair", "Visitor Chair", "Meeting Chair", "Lounge Chair"].map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" /> Available Seat Color(s)
                    </label>
                    <Input
                      placeholder="e.g. Black, Grey, Tan Brown, Cream"
                      value={formData.availableColors}
                      onChange={(e) => setFormData(prev => ({ ...prev, availableColors: e.target.value }))}
                      className="h-9 text-xs"
                    />
                  </div>
                </>
              )}

              {isWorkstationCategory && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Grid className="h-3.5 w-3.5 text-muted-foreground" /> Table Top Finish
                    </label>
                    <Select value={formData.tableTopFinish} onValueChange={(val) => setFormData(prev => ({ ...prev, tableTopFinish: val || "" }))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select top finish" />
                      </SelectTrigger>
                      <SelectContent>
                        {["White", "Beech Wood", "Walnut Wood", "Black Finish", "Natural Oak", "Custom Laminate"].map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" /> Leg Frame Type
                    </label>
                    <Select value={formData.legType} onValueChange={(val) => setFormData(prev => ({ ...prev, legType: val || "" }))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select leg frame" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Black Loop Leg", "White Loop Leg", "Silver Frame", "Timber Legs", "Height Adjustable"].map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Box className="h-3.5 w-3.5 text-muted-foreground" /> Workstation Storage Unit
                    </label>
                    <Select value={formData.storageOptions} onValueChange={(val) => setFormData(prev => ({ ...prev, storageOptions: val || "" }))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select storage unit option" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Without Pedestal", "3 Drawer Mobile Pedestal", "Single Drawer Floating", "Double Drawer Unit"].map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {isStorageCategory && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" /> Storage Finish Color
                    </label>
                    <Input
                      placeholder="e.g. White, Black, Walnut"
                      value={formData.availableColors}
                      onChange={(e) => setFormData(prev => ({ ...prev, availableColors: e.target.value }))}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Box className="h-3.5 w-3.5 text-muted-foreground" /> Storage Unit Type
                    </label>
                    <Input
                      placeholder="e.g. Mobile Pedestal, Credenza"
                      value={formData.storageOptions}
                      onChange={(e) => setFormData(prev => ({ ...prev, storageOptions: e.target.value }))}
                      className="h-9 text-xs"
                    />
                  </div>
                </>
              )}

              {/* Shared Standard Material & Warranty */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" /> Primary Material
                </label>
                <Input
                  placeholder="e.g. Breathable Mesh, Italian Leather, Laminate"
                  value={formData.finishMaterial}
                  onChange={(e) => setFormData(prev => ({ ...prev, finishMaterial: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Warranty Period
                </label>
                <Select value={formData.warranty} onValueChange={(val) => setFormData(prev => ({ ...prev, warranty: val || "" }))}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Warranty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 Year">1 Year Warranty</SelectItem>
                    <SelectItem value="2 Years">2 Years Warranty</SelectItem>
                    <SelectItem value="3 Years">3 Years Warranty</SelectItem>
                    <SelectItem value="5 Years">5 Years Warranty</SelectItem>
                    <SelectItem value="10 Years">10 Years Warranty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Admin Dynamic Custom Attribute Builder */}
            <div className="pt-4 border-t border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500" /> Admin Custom Attributes Builder
                </label>
                <span className="text-[10px] text-muted-foreground">
                  Define additional customizable attributes for Product Configurator
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Attribute Name (e.g. Headrest Color, Lock Type)"
                  value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
                <Input
                  placeholder="Option Values (e.g. Black, Grey)"
                  value={newAttrVal}
                  onChange={(e) => setNewAttrVal(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleAddCustomAttribute}
                  className="h-8 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Attribute
                </Button>
              </div>

              {customAttributesList.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {customAttributesList.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{item.key}:</span>
                        <span className="font-mono text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">{item.value}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCustomAttribute(item.id)}
                        className="h-6 w-6 text-rose-500 hover:bg-rose-500/10 rounded-md"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Configurable Variants Matrix Configurator */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-6">
            <h2 className="text-base font-bold border-b pb-4 flex items-center gap-2 text-foreground">
              <Layers className="h-4 w-4 text-orange-500" /> Master Model & Configurable Variations Generator
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Define sub-models and color/finish combinations to generate all product variants automatically under this master model.
            </p>
            <VariantMatrixBuilder
              masterName={formData.productName}
              categoryName={formData.categoryName}
              baseCostPrice={parseFloat(formData.costPrice) || 0}
              margins={margins}
              onChangeVariants={(vars) => setConfiguredVariants(vars)}
            />
          </div>

          {/* 5. Technical Specifications */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold border-b pb-4 flex items-center gap-2 text-foreground">
              <Briefcase className="h-4 w-4 text-orange-500" /> Detailed Technical Specifications
            </h2>
            <p className="text-xs text-muted-foreground">
              Provide formatted bullet points, dimensions, material descriptions, and compliance specs.
            </p>
            <RichTextEditor
              placeholder="Product Dimensions, ergonomics specifications, compliance certificates, warranty terms..."
              value={formData.specifications}
              onChange={(val) => setFormData(prev => ({ ...prev, specifications: val }))}
            />
          </div>

        </div>

        {/* RIGHT COLUMN: Images, Pricing Engine & Live Configurator Preview (4/12 cols) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Images Upload Box */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold border-b pb-4 flex items-center gap-2 text-foreground">
              <ImageIcon className="h-4 w-4 text-orange-500" /> Product Catalog Images
            </h2>
            <ImageUploader 
              images={formData.imageUrls}
              onChange={(urls) => setFormData(prev => ({ ...prev, imageUrls: urls }))}
            />
          </div>

          {/* Pricing Engine & Segment Breakdown */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                <Calculator className="h-4 w-4 text-orange-500" /> Pricing Engine
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
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Cost Price (AED)</span> <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs font-bold">AED</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-12 h-11 text-base font-extrabold font-mono bg-orange-500/5 border-orange-500/30"
                    value={formData.costPrice}
                    onChange={handleCostPriceChange}
                    required
                  />
                </div>
                {!manualOverride && (
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1 mt-1.5">
                    <ShieldCheck className="h-3 w-3" /> Auto-calculating segment margin prices
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Customer Segment Prices
                </label>
                
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Dealer Price</label>
                    <Input
                      type="number"
                      value={formData.dealerPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, dealerPrice: e.target.value }))}
                      disabled={!manualOverride}
                      className={cn("font-mono text-xs font-bold", !manualOverride && "bg-muted")}
                    />
                    {!manualOverride && <p className="text-[9px] text-muted-foreground text-right">Margin: {margins.dealer}%</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Interior Price</label>
                    <Input
                      type="number"
                      value={formData.interiorPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, interiorPrice: e.target.value }))}
                      disabled={!manualOverride}
                      className={cn("font-mono text-xs font-bold", !manualOverride && "bg-muted")}
                    />
                    {!manualOverride && <p className="text-[9px] text-muted-foreground text-right">Margin: {margins.interior}%</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Direct / Project</label>
                    <Input
                      type="number"
                      value={formData.projectPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, projectPrice: e.target.value }))}
                      disabled={!manualOverride}
                      className={cn("font-mono text-xs font-bold", !manualOverride && "bg-muted")}
                    />
                    {!manualOverride && <p className="text-[9px] text-muted-foreground text-right">Margin: {margins.direct}%</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Special / Online</label>
                    <Input
                      type="number"
                      value={formData.specialPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, specialPrice: e.target.value }))}
                      disabled={!manualOverride}
                      className={cn("font-mono text-xs font-bold", !manualOverride && "bg-muted")}
                    />
                    {!manualOverride && <p className="text-[9px] text-muted-foreground text-right">Margin: {margins.online}%</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configurator Live Preview Card */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-orange-500" /> Configurator Card Preview
              </span>
              <Badge variant="outline" className="text-[9px] font-bold bg-orange-500/10 text-orange-600 border-orange-500/30">
                Live Preview
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3">
              <div className="h-32 w-full rounded-lg bg-background border border-border/60 overflow-hidden flex items-center justify-center relative">
                {formData.imageUrls.length > 0 ? (
                  <img src={formData.imageUrls[0]} alt="Product" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>

              <div>
                <h4 className="font-bold text-sm text-foreground truncate">
                  {formData.productName || "Product Title"}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[9px] font-mono font-bold">
                    {formData.categoryName}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    SKU: {formData.productCode || "AUTO-SKU"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Selling Price:</span>
                <span className="text-sm font-extrabold font-mono text-orange-600 dark:text-orange-400">
                  AED {parseFloat(formData.projectPrice || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Inline Create Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-card rounded-2xl border shadow-2xl flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Plus className="h-5 w-5 text-orange-500" />
                  Create Product Category
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add a new dynamic category for the Product Configurator.
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setIsCategoryModalOpen(false)
                  setNewCategoryName("")
                  setNewCategoryDesc("")
                }} 
                className="rounded-full h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault()
                if (!newCategoryName.trim()) {
                  toast.error("Category name is required.")
                  return
                }
                setCreatingCategory(true)
                try {
                  const res = await fetch("/api/products/categories", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: newCategoryName.trim(),
                      description: newCategoryDesc.trim() || undefined,
                    })
                  })
                  const data = await res.json()
                  if (!res.ok) {
                    throw new Error(data.error || "Failed to create category")
                  }
                  toast.success(`Category "${data.name}" created successfully!`)
                  setNewCategoryName("")
                  setNewCategoryDesc("")
                  setIsCategoryModalOpen(false)
                  fetchCategories(data.name)
                } catch (err: any) {
                  toast.error(err.message || "Failed to create category.")
                } finally {
                  setCreatingCategory(false)
                }
              }} 
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Category Name *</label>
                <Input 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)} 
                  placeholder="E.g. Storage Solutions, Accessories, Acoustic Pods" 
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Description</label>
                <Textarea 
                  value={newCategoryDesc} 
                  onChange={(e) => setNewCategoryDesc(e.target.value)} 
                  placeholder="Optional brief description..." 
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsCategoryModalOpen(false)
                    setNewCategoryName("")
                    setNewCategoryDesc("")
                  }} 
                  disabled={creatingCategory}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl" 
                  disabled={creatingCategory}
                >
                  {creatingCategory ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Category"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
