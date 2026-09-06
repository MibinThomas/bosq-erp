"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Upload, Download, Plus, Search, Trash2, Edit, AlertCircle, FileSpreadsheet, PackageOpen, LayoutGrid, List, CheckCircle2, MoreVertical, X, Filter, FolderPlus, Tag, Boxes, LayoutDashboard, Copy, MoreHorizontal, Pencil, SlidersHorizontal
} from "lucide-react"
import { usePermissions } from "@/components/providers/PermissionsProvider"
import { useRouter } from "next/navigation"
import { ProductDetailsModal } from "@/components/products/product-details-modal"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BulkUploadModal } from "@/components/products/bulk-upload-modal"
import { EditProductModal } from "@/components/products/edit-product-modal"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, ShoppingCart, Package, Sparkles, Loader2, ChevronRight, UserPlus, Layers, Eye, Camera } from "lucide-react"
import { VariantDrawerModal } from "@/components/products/variant-drawer-modal"

interface Product {
  id: string
  productCode: string
  productName: string
  unitPrice: number
  costPrice: number
  interiorPrice?: number
  dealerPrice?: number
  projectPrice?: number
  specialPrice?: number
  warranty: string | null
  availableColors: string | null
  dimensions: string | null
  specifications: string | null
  description?: string | null
  status: string
  imageUrl: string | null
  imageUrls?: string[] | null
  stock: number
  isMaster?: boolean
  parentProductId?: string | null
  modelCode?: string | null
  modelName?: string | null
  variantAttributes?: any
  category: {
    name: string
  }
  variants?: Product[]
}

export default function ProductsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const isSuperAdmin = userRole === "SUPER_ADMIN"
  const { hasPermission } = usePermissions()

  const canCreateProduct = hasPermission("PRODUCTS", "create")
  const canEditProduct = hasPermission("PRODUCTS", "edit")
  const canDeleteProduct = hasPermission("PRODUCTS", "delete")
  const canBulkUploadProduct = hasPermission("PRODUCTS", "uploadFiles")
  const canManageCategory = hasPermission("PRODUCTS", "manage")
  const hasQuoteAccess = hasPermission("PRODUCTS", "share")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [sortBy, setSortBy] = useState<string>("productCode")
  const [selectedMasterForVariants, setSelectedMasterForVariants] = useState<Product | null>(null)
  const [selectedVariantMap, setSelectedVariantMap] = useState<Record<string, string>>({})
  const [expandedTableRows, setExpandedTableRows] = useState<Record<string, boolean>>({})
  const [uploadingCardImgId, setUploadingCardImgId] = useState<string | null>(null)

  const handleUploadCardImage = async (productId: string, file: File) => {
    setUploadingCardImgId(productId)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload?type=products", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to upload image")

      const patchRes = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: data.url }),
      })

      if (!patchRes.ok) throw new Error("Failed to update product image")

      toast.success("Product image updated successfully!")
      fetchProducts()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to upload image")
    } finally {
      setUploadingCardImgId(null)
    }
  }

  // Inline Stock Edit states
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [draftStockVal, setDraftStockVal] = useState<number>(0)
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null)

  const handleSaveStock = async (productId: string, newStock: number) => {
    try {
      setUpdatingStockId(productId)
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      })

      if (!res.ok) throw new Error("Failed to update stock")
      
      const updated = await res.json()
      
      // Update local state
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: updated.stock } : p))
      toast.success(`Stock level updated to ${updated.stock} successfully!`)
      setEditingStockId(null)
    } catch (err) {
      console.error(err)
      toast.error("Failed to update stock. Please try again.")
    } finally {
      setUpdatingStockId(null)
    }
  }
  const [selectedCategory, setSelectedCategory] = useState("")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string; description: string | null; _count?: { products: number } }[]>([])
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDesc, setNewCategoryDesc] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; description: string } | null>(null)
  const [updatingCategory, setUpdatingCategory] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)

  // Attribute Management States
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false)
  const [attributesData, setAttributesData] = useState<Record<string, string[]>>({
    legTypes: [],
    tableTopFinishes: [],
    dimensions: [],
    chairTypes: [],
    finishMaterials: [],
    storageOptions: [],
    warranties: [],
  })
  const [attributesLoading, setAttributesLoading] = useState(false)
  const [activeAttrTab, setActiveAttrTab] = useState<string>("legTypes")
  const [newAttrValue, setNewAttrValue] = useState("")
  const [addingAttr, setAddingAttr] = useState(false)
  const [editingAttrObj, setEditingAttrObj] = useState<{ type: string; oldVal: string; newVal: string } | null>(null)
  const [updatingAttr, setUpdatingAttr] = useState(false)
  const [deletingAttrVal, setDeletingAttrVal] = useState<string | null>(null)

  const fetchAttributes = async () => {
    setAttributesLoading(true)
    try {
      const res = await fetch("/api/products/attributes")
      if (res.ok) {
        const data = await res.json()
        if (data.attributes) setAttributesData(data.attributes)
      }
    } catch (err) {
      console.error("Failed to load attributes:", err)
    } finally {
      setAttributesLoading(false)
    }
  }

  useEffect(() => {
    if (isAttributeModalOpen) {
      fetchAttributes()
    }
  }, [isAttributeModalOpen])

  const handleUpdateCategory = async (id: string, name: string, description: string) => {
    setUpdatingCategory(true)
    try {
      const res = await fetch(`/api/products/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update category")
      toast.success(`Category updated to "${data.name}"`)
      setEditingCategory(null)
      fetchCategories()
    } catch (err: any) {
      toast.error(err.message || "Failed to update category")
    } finally {
      setUpdatingCategory(false)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"? Products in this category will be re-assigned to General.`)) return
    setDeletingCatId(id)
    try {
      const res = await fetch(`/api/products/categories/${id}`, {
        method: "DELETE"
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete category")
      toast.success(`Category "${name}" deleted!`)
      fetchCategories()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category")
    } finally {
      setDeletingCatId(null)
    }
  }

  const handleAddAttribute = async (type: string, value: string) => {
    if (!value.trim()) return
    setAddingAttr(true)
    try {
      const res = await fetch("/api/products/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributeType: type, value: value.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add attribute")
      toast.success(`Attribute "${value.trim()}" added successfully!`)
      setNewAttrValue("")
      fetchAttributes()
    } catch (err: any) {
      toast.error(err.message || "Failed to add attribute")
    } finally {
      setAddingAttr(false)
    }
  }

  const handleUpdateAttribute = async (type: string, oldValue: string, newValue: string) => {
    if (!newValue.trim()) return
    setUpdatingAttr(true)
    try {
      const res = await fetch("/api/products/attributes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributeType: type, oldValue, newValue: newValue.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update attribute")
      toast.success(`Attribute updated to "${newValue.trim()}"`)
      setEditingAttrObj(null)
      fetchAttributes()
    } catch (err: any) {
      toast.error(err.message || "Failed to update attribute")
    } finally {
      setUpdatingAttr(false)
    }
  }

  const handleDeleteAttribute = async (type: string, value: string) => {
    if (!confirm(`Are you sure you want to delete attribute "${value}"?`)) return
    setDeletingAttrVal(value)
    try {
      const res = await fetch(`/api/products/attributes?attributeType=${type}&value=${encodeURIComponent(value)}`, {
        method: "DELETE"
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete attribute")
      toast.success(`Attribute "${value}" deleted!`)
      fetchAttributes()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete attribute")
    } finally {
      setDeletingAttrVal(null)
    }
  }

  // Details Modal States
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Cart States
  const [quoteCart, setQuoteCart] = useState<{ product: Product; quantity: number }[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [isClientComboboxOpen, setIsClientComboboxOpen] = useState(false)
  
  // New Client Form inputs
  const [newClientName, setNewClientName] = useState("")
  const [newClientContact, setNewClientContact] = useState("")
  const [newClientPhone, setNewClientPhone] = useState("")
  const [newClientEmail, setNewClientEmail] = useState("")
  const [newClientType, setNewClientType] = useState("Interior")
  const [newClientAddress, setNewClientAddress] = useState("")
  const [newClientTrn, setNewClientTrn] = useState("")
  const [newClientNotes, setNewClientNotes] = useState("")
  const [clientSubmitting, setClientSubmitting] = useState(false)

  // Access Request States
  const [requestAccessClient, setRequestAccessClient] = useState<{ id: string; name: string } | null>(null)
  const [requestNotes, setRequestNotes] = useState("")
  const [requestingAccess, setRequestingAccess] = useState(false)

  const handleRequestAccess = async (clientId: string, clientName: string, notes?: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || "Requested access to client via products page." })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to request access")
      }

      toast.success(`Access request submitted for "${clientName}"! Admin will be notified.`)
      
      // Refresh clients list
      const clientsRes = await fetch("/api/clients?all=true")
      if (clientsRes.ok) {
        const data = await clientsRes.json()
        setClients(data)
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to request access. Please try again.")
      throw error
    }
  }

  const handleRequestAccessSubmit = async () => {
    if (!requestAccessClient) return
    setRequestingAccess(true)
    try {
      await handleRequestAccess(requestAccessClient.id, requestAccessClient.name, requestNotes)
      setRequestAccessClient(null)
      setRequestNotes("")
    } catch (err) {
      // toast handled
    } finally {
      setRequestingAccess(false)
    }
  }

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch("/api/clients?all=true")
        if (res.ok) {
          const data = await res.json()
          setClients(data)
        }
      } catch (err) {
        console.error("Failed to load clients:", err)
      }
    }
    if (hasQuoteAccess) {
      loadClients()
    }
  }, [userRole, hasQuoteAccess])

  useEffect(() => {
    const cached = localStorage.getItem("quoteCart")
    if (cached) {
      try {
        setQuoteCart(JSON.parse(cached))
      } catch (err) {
        console.error("Failed to parse cached cart:", err)
      }
    }
  }, [])

  const saveCartToStorage = (updatedCart: { product: Product; quantity: number }[]) => {
    setQuoteCart(updatedCart)
    localStorage.setItem("quoteCart", JSON.stringify(updatedCart))
  }

  const addToQuoteCart = (product: Product) => {
    const existingIndex = quoteCart.findIndex(item => item.product.id === product.id)
    let updatedCart = []
    if (existingIndex > -1) {
      updatedCart = [...quoteCart]
      updatedCart[existingIndex].quantity += 1
    } else {
      updatedCart = [...quoteCart, { product, quantity: 1 }]
    }
    saveCartToStorage(updatedCart)
    toast.success(`Added "${product.productName}" to Quote Cart!`)
  }

  const addToQuoteCartWithQuantity = (product: Product, quantity: number) => {
    const qty = Math.max(1, quantity)
    const existingIndex = quoteCart.findIndex(item => item.product.id === product.id)
    let updatedCart = []
    if (existingIndex > -1) {
      updatedCart = [...quoteCart]
      updatedCart[existingIndex].quantity += qty
    } else {
      updatedCart = [...quoteCart, { product, quantity: qty }]
    }
    saveCartToStorage(updatedCart)
    toast.success(`Added ${qty}x "${product.productName}" to Quote Cart!`)
    setIsDetailOpen(false)
  }

  const updateQuantity = (productId: string, quantity: number) => {
    const newQty = Math.max(1, quantity)
    const updatedCart = quoteCart.map(item => 
      item.product.id === productId ? { ...item, quantity: newQty } : item
    )
    saveCartToStorage(updatedCart)
  }

  const removeFromQuoteCart = (productId: string) => {
    const updatedCart = quoteCart.filter(item => item.product.id !== productId)
    saveCartToStorage(updatedCart)
    toast.success("Item removed from cart.")
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClientName.trim()) {
      toast.error("Company name is required.")
      return
    }

    setClientSubmitting(true)
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: newClientName.trim(),
          contactPerson: newClientContact.trim() || undefined,
          phone: newClientPhone.trim() || undefined,
          email: newClientEmail.trim() || undefined,
          clientType: newClientType,
          address: newClientAddress.trim() || undefined,
          trn: newClientTrn.trim() || undefined,
          notes: newClientNotes.trim() || undefined,
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create client")
      }

      toast.success("New client registered successfully!")
      
      // Refresh clients list
      const clientsRes = await fetch("/api/clients")
      if (clientsRes.ok) {
        const refreshedClients = await clientsRes.json()
        setClients(refreshedClients)
      }
      
      // Auto-select the newly created client
      setSelectedClientId(data.id)
      
      // Reset client inputs
      setNewClientName("")
      setNewClientContact("")
      setNewClientPhone("")
      setNewClientEmail("")
      setNewClientType("Interior")
      setNewClientAddress("")
      setNewClientTrn("")
      setNewClientNotes("")
      setIsCreatingClient(false)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to register client.")
    } finally {
      setClientSubmitting(false)
    }
  }

  const handleCreateQuotation = () => {
    if (!selectedClientId) {
      toast.error("Please select a client before creating a quotation.")
      return
    }
    if (quoteCart.length === 0) {
      toast.error("Your quote cart is empty.")
      return
    }

    const selectedClient = clients.find(c => c.id === selectedClientId)
    if (!selectedClient) {
      toast.error("Selected client not found.")
      return
    }

    if (selectedClient.status && selectedClient.status !== "Approved") {
      const errorMsg = selectedClient.status === "Pending Approval"
        ? "This client is pending approval. Please contact Admin/Manager before creating quotation."
        : "This client has been rejected. Please contact Admin/Manager before creating quotation."
      toast.error(errorMsg)
      return
    }

    // Determine segment & pricing segment mapping
    const clientType = selectedClient.clientType || "Project"
    // Valid values for Quotation Form Segment: "Interior", "Dealer", "Project", "Special"
    let segment: "Interior" | "Dealer" | "Project" | "Special" = "Project"
    if (clientType === "Interior" || clientType === "Interior Designer") segment = "Interior"
    else if (clientType === "Dealer") segment = "Dealer"
    else if (clientType === "Special" || clientType === "Online / Ecommerce") segment = "Special"

    const quotationPayload = {
      clientId: selectedClientId,
      customerSegment: segment,
      items: quoteCart.map(item => {
        const prod = item.product
        // Dynamic Pricing Segment Mapping
        let rate = prod.unitPrice
        if (segment === "Interior") rate = prod.interiorPrice ?? prod.unitPrice
        else if (segment === "Dealer") rate = prod.dealerPrice ?? prod.unitPrice
        else if (segment === "Project") rate = prod.projectPrice ?? prod.unitPrice
        else if (segment === "Special") rate = prod.specialPrice ?? prod.unitPrice

        return {
          productId: prod.id,
          description: prod.productName,
          specifications: prod.specifications || "",
          quantity: item.quantity,
          basePrice: rate,
          unitPrice: rate,
          discount: 0,
          margin: 0,
          customImageUrl: prod.imageUrl || "",
          productDescription: prod.description || ""
        }
      })
    }

    localStorage.setItem("quoteCartItems", JSON.stringify(quotationPayload))
    
    // Clear cart since it is compiled
    setQuoteCart([])
    localStorage.removeItem("quoteCart")
    
    toast.success("Redirecting to quotation builder...")
    // Navigate to /quotations/new
    router.push("/quotations/new")
  }

  async function fetchProducts() {
    try {
      setLoading(true)
      const res = await fetch("/api/products?grouped=true")
      if (!res.ok) throw new Error("Failed to fetch products")
      const data = await res.json()
      setProducts(data)
      setSelectedIds([]) // Reset selection on fresh fetch
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Failed to load products. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected product(s)?`)) return
    
    try {
      setDeleting(true)
      const res = await fetch("/api/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      })
      if (!res.ok) throw new Error("Bulk delete failed")
      const data = await res.json()
      toast.success(`Successfully deleted ${data.count} product(s)!`)
      fetchProducts()
    } catch (error) {
      console.error("Error bulk deleting products:", error)
      toast.error("Failed to delete products. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/products/categories")
      if (res.ok) {
        const data = await res.json()
        setCategoriesList(data)
      }
    } catch (err) {
      console.error("Failed to load categories:", err)
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  // Filter products dynamically across master & variants
  const filteredProducts = products.filter((product) => {
    const term = searchTerm.toLowerCase()
    const matchesVariants = product.variants?.some(v => 
      v.productName.toLowerCase().includes(term) ||
      v.productCode.toLowerCase().includes(term) ||
      (v.availableColors && v.availableColors.toLowerCase().includes(term)) ||
      (v.modelName && v.modelName.toLowerCase().includes(term))
    )
    const matchesSearch = (
      product.productName.toLowerCase().includes(term) ||
      product.productCode.toLowerCase().includes(term) ||
      (product.category?.name && product.category.name.toLowerCase().includes(term)) ||
      Boolean(matchesVariants)
    )
    const matchesCategory = selectedCategory ? product.category?.name === selectedCategory : true
    return matchesSearch && matchesCategory
  })

  // Sort products dynamically
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "stock-desc") {
      return b.stock - a.stock
    }
    if (sortBy === "stock-asc") {
      return a.stock - b.stock
    }
    if (sortBy === "productName") {
      return a.productName.localeCompare(b.productName)
    }
    if (sortBy === "unitPrice-desc") {
      return b.unitPrice - a.unitPrice
    }
    if (sortBy === "unitPrice-asc") {
      return a.unitPrice - b.unitPrice
    }
    return a.productCode.localeCompare(b.productCode)
  })



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Master</h1>
          <p className="text-muted-foreground">
            Manage your office furniture catalog.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Quote Cart Button */}
          {hasQuoteAccess && (
            <Button
              variant="outline"
              onClick={() => setIsCartOpen(true)}
              className="border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-foreground cursor-pointer flex items-center gap-2 relative h-10 px-4 rounded-xl"
            >
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="font-bold text-xs uppercase tracking-wider">Quote Cart</span>
              {quoteCart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-extrabold h-5 w-5 rounded-full flex items-center justify-center animate-in scale-in duration-200 shadow shadow-primary/30">
                  {quoteCart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </Button>
          )}

          {canManageCategory && (
            <Button 
              variant="outline" 
              onClick={() => setIsCategoryModalOpen(true)}
              className="border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-foreground cursor-pointer flex items-center gap-2"
            >
              <FolderPlus className="h-4 w-4 text-primary" />
              Manage Categories
            </Button>
          )}
          {(isSuperAdmin || canManageCategory) && (
            <Button 
              variant="outline" 
              onClick={() => setIsAttributeModalOpen(true)}
              className="border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-foreground cursor-pointer flex items-center gap-2"
            >
              <Tag className="h-4 w-4 text-primary" />
              Manage Attributes
            </Button>
          )}
          {canBulkUploadProduct && (
            <Button 
              variant="outline" 
              onClick={() => setIsBulkOpen(true)}
              className="border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-foreground cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              Bulk Upload
            </Button>
          )}
          {canCreateProduct && (
            <Link href="/products/new">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex items-center w-full max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3" />
            <Input
              placeholder="Search products by code, name, or category..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm cursor-pointer hover:bg-muted/40 transition-colors max-w-[200px]"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm cursor-pointer hover:bg-muted/40 transition-colors max-w-[200px]"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="productCode">Sort by Code</option>
            <option value="productName">Sort by Name</option>
            <option value="stock-desc">Stock: High to Low</option>
            <option value="stock-asc">Stock: Low to High</option>
            <option value="unitPrice-desc">Price: High to Low</option>
            <option value="unitPrice-asc">Price: Low to High</option>
          </select>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 shrink-0 self-end md:self-auto">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8 px-3 rounded-md cursor-pointer text-xs"
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Cards Grid
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-8 px-3 rounded-md cursor-pointer text-xs"
          >
            <List className="h-4 w-4 mr-1.5" />
            List Table
          </Button>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 border rounded-xl bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 border rounded-xl bg-card">
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || selectedCategory ? "Try searching with a different filter" : "Click 'Add Product' to create your first item"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {sortedProducts.map((product) => {
              const isMasterModel = Boolean(product.variants && product.variants.length > 0)
              const variantList = product.variants || []
              
              // Active variant selected from dropdown on card, defaulting to first variant
              const activeVariantId = selectedVariantMap[product.id] || (variantList.length > 0 ? variantList[0].id : null)
              const activeVariant = variantList.find(v => v.id === activeVariantId) || variantList[0] || product

              // Min and Max prices across variants
              const prices = isMasterModel ? variantList.map(v => v.projectPrice || v.unitPrice || 0).filter(p => p > 0) : [product.unitPrice || 0]
              const minPrice = prices.length > 0 ? Math.min(...prices) : product.unitPrice || 0
              const maxPrice = prices.length > 0 ? Math.max(...prices) : product.unitPrice || 0
              const priceRangeDisplay = minPrice === maxPrice
                ? `AED ${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `AED ${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} - ${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`

              // Active display properties
              const activePrice = activeVariant?.unitPrice ?? product.unitPrice
              const activePriceDisplay = `AED ${(activePrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              const activeStock = activeVariant?.stock ?? product.stock ?? 0
              const activeImage = activeVariant?.imageUrl || product.imageUrl
              const activeCode = activeVariant?.productCode || product.productCode

              // Total stock across variants
              const totalVariantStock = isMasterModel ? variantList.reduce((sum, v) => sum + (v.stock || 0), 0) : (product.stock || 0)

              // Distinct sub-models list (e.g. High Back, Mid Back, Low Back)
              const subModelNames = isMasterModel ? Array.from(new Set(variantList.map(v => v.modelName).filter(Boolean))) : []

              return (
                <div 
                  key={product.id} 
                  className={`relative border rounded-2xl bg-card text-card-foreground shadow-sm hover:shadow-xl hover:border-primary/30 transition-all flex flex-col group overflow-hidden ${
                    selectedIds.includes(product.id) ? "border-primary bg-primary/[0.02]" : ""
                  }`}
                >
                  {/* Checkbox Overlay */}
                  {canDeleteProduct && (
                    <div className="absolute top-3 left-3 z-10 bg-white/85 dark:bg-black/75 p-1.5 rounded-lg border shadow-sm transition-opacity opacity-100 sm:opacity-0 group-hover:opacity-100 flex items-center justify-center">
                      <input 
                        type="checkbox"
                        className="rounded border-gray-350 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        checked={selectedIds.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, product.id])
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== product.id))
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Card Badge: Master Model status or Variation Count */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                    {isMasterModel ? (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-extrabold text-xs shadow-sm flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {variantList.length} Variations
                      </Badge>
                    ) : (
                      <Badge variant={product.status === "ACTIVE" ? "default" : "destructive"} className="shadow-sm">
                        {product.status}
                      </Badge>
                    )}
                  </div>

                  {/* Product / Master Image */}
                  <div 
                    className="h-48 w-full bg-muted/30 flex items-center justify-center overflow-hidden relative border-b p-4 cursor-pointer hover:bg-muted/40 transition-colors group/cardimg"
                    onClick={() => {
                      if (isMasterModel) {
                        setSelectedMasterForVariants(product)
                      } else {
                        setSelectedDetailProduct(product)
                        setIsDetailOpen(true)
                      }
                    }}
                    title={isMasterModel ? "Click to view all variations" : "Click to view product details"}
                  >
                    {uploadingCardImgId === activeVariant?.id ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 text-primary animate-pulse">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs font-bold">Uploading Photo...</span>
                      </div>
                    ) : (
                      <>
                        {activeImage ? (
                          <img 
                            src={activeImage.startsWith("http") || activeImage.startsWith("/") ? activeImage : `/${activeImage}`} 
                            alt={product.productName} 
                            className="object-contain max-h-full max-w-full transition-transform duration-300 group-hover:scale-105" 
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                            <Package className="h-10 w-10 stroke-[1.5]" />
                            <span className="text-[10px] uppercase tracking-wider font-semibold">No Image</span>
                          </div>
                        )}

                        {/* Quick Camera Upload Overlay */}
                        {canEditProduct && (
                          <label 
                            className="absolute top-2 left-2 z-20 bg-black/70 hover:bg-primary text-white p-1.5 rounded-xl cursor-pointer transition-all opacity-0 group-hover/cardimg:opacity-100 flex items-center gap-1 text-[10px] font-bold shadow-md"
                            onClick={(e) => e.stopPropagation()}
                            title="Upload/change photo for this variation"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            <span>{activeImage ? "Edit Photo" : "Add Photo"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file && activeVariant?.id) {
                                  handleUploadCardImage(activeVariant.id, file)
                                }
                              }}
                            />
                          </label>
                        )}
                      </>
                    )}
                  </div>

                  {/* Card Info */}
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase bg-secondary/80 px-2 py-0.5 rounded border">
                          {activeCode}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          activeStock >= 5
                            ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                            : activeStock > 0
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                        }`}>
                          {activeStock > 0 ? `${activeStock} Stock` : "Out of Stock"}
                        </span>
                      </div>

                      <h3 className="font-bold text-base mt-2 line-clamp-1 group-hover:text-primary transition-colors">
                        {product.productName}
                      </h3>
                      
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        Category: <span className="text-foreground">{product.category.name}</span>
                      </p>

                      {subModelNames.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1.5">
                          {subModelNames.map(sm => (
                            <Badge key={sm} variant="outline" className="text-[9px] py-0 px-1.5 font-medium">
                              {sm}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Interactive Dropdown Selector directly on Card */}
                    {isMasterModel && (
                      <div className="space-y-1 bg-muted/30 p-2.5 rounded-xl border border-muted-foreground/15">
                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
                          <span>Select Variation:</span>
                          <span className="text-primary font-extrabold">{variantList.length} Options</span>
                        </div>
                        <select
                          className="w-full h-8 text-xs rounded-lg border border-input bg-background px-2.5 font-semibold text-foreground cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none truncate shadow-sm"
                          value={activeVariant?.id}
                          onChange={(e) => {
                            e.stopPropagation()
                            setSelectedVariantMap(prev => ({ ...prev, [product.id]: e.target.value }))
                          }}
                        >
                          {variantList.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.modelName ? `${v.modelName} - ` : ''}{v.availableColors || v.productName} (AED {v.unitPrice.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="h-px bg-border my-1" />

                    <div className="flex items-end justify-between mt-auto pt-1 border-t">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground/80 uppercase">
                          {isMasterModel ? "Selected Price" : "Unit Price"}
                        </p>
                        <p className="text-base font-extrabold text-primary font-mono mt-0.5">
                          {activePriceDisplay}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isMasterModel && (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedMasterForVariants(product)}
                            className="border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-primary text-xs font-bold shrink-0 cursor-pointer h-8 rounded-xl px-2.5 flex items-center gap-1 shadow-sm"
                            title="View all variations side by side"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            All
                          </Button>
                        )}
                        {hasQuoteAccess && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              addToQuoteCart(activeVariant)
                            }}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs shrink-0 cursor-pointer h-8 rounded-xl px-3 flex items-center gap-1 font-bold shadow-sm"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add to Quote
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <div className="border rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm min-w-[800px]">
              <Table>
                <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-12">
                    {canDeleteProduct && (
                      <input 
                        type="checkbox"
                        className="rounded border-gray-350 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredProducts.map(p => p.id))
                          } else {
                            setSelectedIds([])
                          }
                        }}
                      />
                    )}
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Product Series</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Variations</TableHead>
                  <TableHead className="text-right">Price Range (AED)</TableHead>
                  <TableHead className="text-center">Total Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.map((product) => {
                  const isMasterModel = Boolean(product.variants && product.variants.length > 0)
                  const variantList = product.variants || []
                  const isExpanded = Boolean(expandedTableRows[product.id])

                  const prices = isMasterModel ? variantList.map(v => v.projectPrice || v.unitPrice || 0).filter(p => p > 0) : [product.unitPrice || 0]
                  const minPrice = prices.length > 0 ? Math.min(...prices) : product.unitPrice || 0
                  const maxPrice = prices.length > 0 ? Math.max(...prices) : product.unitPrice || 0
                  const priceRangeDisplay = minPrice === maxPrice
                    ? `AED ${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `AED ${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} - ${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  
                  const totalVariantStock = isMasterModel ? variantList.reduce((sum, v) => sum + (v.stock || 0), 0) : (product.stock || 0)

                  return (
                    <>
                      <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="w-10">
                          {isMasterModel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 cursor-pointer"
                              onClick={() => setExpandedTableRows(prev => ({ ...prev, [product.id]: !prev[product.id] }))}
                            >
                              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-90 text-primary" : ""}`} />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="w-12">
                          {canDeleteProduct && (
                            <input 
                              type="checkbox"
                              className="rounded border-gray-350 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              checked={selectedIds.includes(product.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds([...selectedIds, product.id])
                                } else {
                                  setSelectedIds(selectedIds.filter(id => id !== product.id))
                                }
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-medium text-primary">{product.productCode}</TableCell>
                        <TableCell className="font-bold text-base">{product.productName}</TableCell>
                        <TableCell>{product.category.name}</TableCell>
                        <TableCell>
                          {isMasterModel ? (
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold">
                              {variantList.length} Variants
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Single Item</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          {priceRangeDisplay}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          {totalVariantStock}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.status === "ACTIVE" ? "default" : "destructive"}>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-2">
                          {isMasterModel && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMasterForVariants(product)}
                              className="text-xs font-bold border-primary/20 text-primary hover:bg-primary/10"
                            >
                              View Variations
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expandable Sub-table for Master Model Variants */}
                      {isExpanded && isMasterModel && (
                        <TableRow key={`${product.id}-variants`} className="bg-muted/15 border-y">
                          <TableCell colSpan={10} className="p-4">
                            <div className="bg-card border rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                                  <Layers className="h-4 w-4 text-primary" />
                                  Variations under {product.productName} ({variantList.length} items)
                                </h4>
                              </div>
                              <Table>
                                <TableHeader className="bg-muted/40">
                                  <TableRow className="text-xs">
                                    <TableHead>SKU Code</TableHead>
                                    <TableHead>Model / Title</TableHead>
                                    <TableHead>Color</TableHead>
                                    <TableHead className="text-right">Price (AED)</TableHead>
                                    <TableHead className="text-center">Stock</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {variantList.map(v => (
                                    <TableRow key={v.id} className="text-xs hover:bg-muted/30">
                                      <TableCell className="font-mono font-bold text-primary">{v.productCode}</TableCell>
                                      <TableCell className="font-semibold">{v.productName}</TableCell>
                                      <TableCell>{v.availableColors || "-"}</TableCell>
                                      <TableCell className="text-right font-mono font-bold">AED {v.unitPrice.toFixed(2)}</TableCell>
                                      <TableCell className="text-center font-mono font-bold">{v.stock}</TableCell>
                                      <TableCell className="text-right">
                                        {hasQuoteAccess && (
                                          <Button
                                            size="sm"
                                            onClick={() => addToQuoteCart(v)}
                                            className="h-7 text-[11px] font-bold px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                                          >
                                            + Add to Quote
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>

      <BulkUploadModal 
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={fetchProducts}
      />

      {/* Manage Categories Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-card rounded-2xl border shadow-2xl flex flex-col p-6 space-y-5 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <FolderPlus className="h-5 w-5 text-primary" />
                  Product Categories Manager
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Create, update, rename, or delete catalog categories.
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setIsCategoryModalOpen(false)
                  setEditingCategory(null)
                  setNewCategoryName("")
                  setNewCategoryDesc("")
                }} 
                className="rounded-full h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Create New Category Form */}
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
                  fetchCategories()
                } catch (err: any) {
                  toast.error(err.message || "Failed to create category.")
                } finally {
                  setCreatingCategory(false)
                }
              }} 
              className="bg-muted/30 p-4 rounded-xl border space-y-3 shrink-0"
            >
              <span className="text-xs font-bold text-foreground block">Add New Category</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)} 
                  placeholder="Category Name (e.g. Acoustic Pods)" 
                  className="h-9 text-xs bg-background"
                  required
                />
                <Input 
                  value={newCategoryDesc} 
                  onChange={(e) => setNewCategoryDesc(e.target.value)} 
                  placeholder="Description (Optional)" 
                  className="h-9 text-xs bg-background"
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-8 cursor-pointer" 
                  disabled={creatingCategory}
                >
                  {creatingCategory ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Category
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Existing Categories Table */}
            <div className="flex-1 overflow-y-auto min-h-[200px] border rounded-xl bg-card">
              <Table>
                <TableHeader className="bg-muted/50 text-xs font-semibold sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead className="w-1/3">Category Name</TableHead>
                    <TableHead className="w-1/3">Description</TableHead>
                    <TableHead className="text-center w-24">Products</TableHead>
                    <TableHead className="text-right w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {categoriesList.map((cat) => {
                    const isEditingThis = editingCategory?.id === cat.id

                    return (
                      <TableRow key={cat.id} className="hover:bg-muted/20">
                        {isEditingThis ? (
                          <>
                            <TableCell>
                              <Input 
                                value={editingCategory.name}
                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                className="h-8 text-xs font-semibold"
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                value={editingCategory.description}
                                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {cat._count?.products || 0}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                                  onClick={() => handleUpdateCategory(cat.id, editingCategory.name, editingCategory.description)}
                                  disabled={updatingCategory}
                                  title="Save Changes"
                                >
                                  {updatingCategory ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-muted-foreground"
                                  onClick={() => setEditingCategory(null)}
                                  title="Cancel"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-semibold text-foreground">{cat.name}</TableCell>
                            <TableCell className="text-muted-foreground">{cat.description || "—"}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                {cat._count?.products || 0} Products
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                  onClick={() => setEditingCategory({ id: cat.id, name: cat.name, description: cat.description || "" })}
                                  title="Edit Category"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                  disabled={deletingCatId === cat.id}
                                  title="Delete Category"
                                >
                                  {deletingCatId === cat.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end pt-2 border-t shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsCategoryModalOpen(false)
                  setEditingCategory(null)
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Product Attributes Modal */}
      {isAttributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-card rounded-2xl border shadow-2xl flex flex-col p-6 space-y-5 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Tag className="h-5 w-5 text-primary" />
                  Product Attributes & Configurations Manager
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage leg types, table top finishes, dimensions, chair types, materials, storage options, and warranties.
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setIsAttributeModalOpen(false)
                  setEditingAttrObj(null)
                  setNewAttrValue("")
                }} 
                className="rounded-full h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Attribute Category Tabs */}
            <div className="flex gap-1 overflow-x-auto border-b pb-2 shrink-0 no-scrollbar">
              {[
                { key: "legTypes", label: "Leg Types", icon: "🦵" },
                { key: "tableTopFinishes", label: "Table Tops", icon: "🪵" },
                { key: "dimensions", label: "Dimensions", icon: "📐" },
                { key: "chairTypes", label: "Chair Types", icon: "🪑" },
                { key: "finishMaterials", label: "Finish Materials", icon: "🎨" },
                { key: "storageOptions", label: "Storage & Accessories", icon: "🗄️" },
                { key: "warranties", label: "Warranties", icon: "🛡️" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveAttrTab(tab.key)
                    setEditingAttrObj(null)
                    setNewAttrValue("")
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap",
                    activeAttrTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <Badge variant="secondary" className="text-[9px] py-0 px-1 ml-1 bg-background/50 text-current">
                    {(attributesData[tab.key] || []).length}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Add Attribute Value Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                handleAddAttribute(activeAttrTab, newAttrValue)
              }} 
              className="bg-muted/30 p-4 rounded-xl border flex items-center gap-3 shrink-0"
            >
              <div className="flex-1">
                <Input 
                  value={newAttrValue} 
                  onChange={(e) => setNewAttrValue(e.target.value)} 
                  placeholder={`Add new option to ${activeAttrTab}...`} 
                  className="h-9 text-xs bg-background"
                  required
                />
              </div>
              <Button 
                type="submit" 
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-9 px-4 cursor-pointer shrink-0" 
                disabled={addingAttr}
              >
                {addingAttr ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Option
                  </>
                )}
              </Button>
            </form>

            {/* Values Table */}
            <div className="flex-1 overflow-y-auto min-h-[220px] border rounded-xl bg-card p-3">
              {attributesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (attributesData[activeAttrTab] || []).length === 0 ? (
                <div className="text-center py-16 text-xs text-muted-foreground">
                  No configured options found for this attribute. Add your first option above.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(attributesData[activeAttrTab] || []).map((val) => {
                    const isEditingThis = editingAttrObj?.type === activeAttrTab && editingAttrObj?.oldVal === val

                    return (
                      <div 
                        key={val} 
                        className="flex items-center justify-between p-2.5 rounded-lg border bg-background hover:border-primary/30 transition-all text-xs"
                      >
                        {isEditingThis ? (
                          <div className="flex items-center gap-2 w-full">
                            <Input 
                              value={editingAttrObj.newVal}
                              onChange={(e) => setEditingAttrObj({ ...editingAttrObj, newVal: e.target.value })}
                              className="h-8 text-xs flex-1 font-semibold"
                              autoFocus
                            />
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 shrink-0 cursor-pointer"
                              onClick={() => handleUpdateAttribute(activeAttrTab, val, editingAttrObj.newVal)}
                              disabled={updatingAttr}
                              title="Save Attribute"
                            >
                              {updatingAttr ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-muted-foreground shrink-0 cursor-pointer"
                              onClick={() => setEditingAttrObj(null)}
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="font-semibold text-foreground truncate pr-2">{val}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => setEditingAttrObj({ type: activeAttrTab, oldVal: val, newVal: val })}
                                title="Edit / Rename Option"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                                onClick={() => handleDeleteAttribute(activeAttrTab, val)}
                                disabled={deletingAttrVal === val}
                                title="Delete Option"
                              >
                                {deletingAttrVal === val ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsAttributeModalOpen(false)
                  setEditingAttrObj(null)
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <EditProductModal
        product={editingProduct}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false)
          setEditingProduct(null)
        }}
        onSuccess={fetchProducts}
        userRole={userRole}
      />

      {/* Quote Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsCartOpen(false)}
          />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-card border-l border-border/80 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
              
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border/60 bg-muted/10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Quote Compilation Cart</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Collect items and assign client pricing</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)} className="rounded-full h-8 w-8 hover:bg-muted">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Product List */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider animate-pulse">Selected Items ({quoteCart.length})</h4>
                  {quoteCart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-2xl bg-muted/10 text-muted-foreground">
                      <ShoppingCart className="h-8 w-8 stroke-[1.5] text-muted-foreground/50 mb-2 animate-bounce" />
                      <span className="text-xs font-medium">Your cart is empty</span>
                      <p className="text-[10px] text-center max-w-[200px] mt-1 text-muted-foreground/60">Browse catalog and click "+ Add to Quote" on any product.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quoteCart.map((item) => {
                        const prod = item.product
                        // Determine Price dynamically based on client type segment
                        const selectedClient = clients.find(c => c.id === selectedClientId)
                        let priceSegment = "Project"
                        if (selectedClient) {
                          const cType = selectedClient.clientType || "Project"
                          if (cType === "Interior" || cType === "Interior Designer") priceSegment = "Interior"
                          else if (cType === "Dealer") priceSegment = "Dealer"
                          else if (cType === "Special" || cType === "Online / Ecommerce") priceSegment = "Special"
                        }
                        
                        let price = prod.unitPrice
                        if (priceSegment === "Interior") price = prod.interiorPrice ?? prod.unitPrice
                        else if (priceSegment === "Dealer") price = prod.dealerPrice ?? prod.unitPrice
                        else if (priceSegment === "Special") price = prod.specialPrice ?? prod.unitPrice

                        return (
                          <div key={prod.id} className="flex gap-4 p-3 border rounded-xl bg-muted/10 hover:bg-muted/20 transition-all items-start group">
                            <div className="h-12 w-12 border rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                              {prod.imageUrl ? (
                                <img src={prod.imageUrl} alt={prod.productName} className="object-contain h-full w-full" />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] font-mono text-muted-foreground uppercase bg-secondary/80 px-1.5 py-0.2 rounded border">
                                {prod.productCode}
                              </span>
                              <h5 className="font-semibold text-xs mt-1 text-foreground truncate" title={prod.productName}>
                                {prod.productName}
                              </h5>
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                {prod.dimensions || "Standard"} • {prod.warranty || "5 Years"}
                              </p>
                              
                              {/* Quantity & Actions */}
                              <div className="flex items-center justify-between mt-2.5">
                                <div className="flex items-center border rounded-lg overflow-hidden bg-background">
                                  <button 
                                    type="button" 
                                    onClick={() => updateQuantity(prod.id, item.quantity - 1)}
                                    className="px-2 py-1 text-xs hover:bg-muted font-bold text-muted-foreground transition-colors border-r"
                                  >
                                    -
                                  </button>
                                  <input 
                                    type="number" 
                                    value={item.quantity}
                                    onChange={(e) => updateQuantity(prod.id, parseInt(e.target.value) || 1)}
                                    className="w-10 text-center text-xs bg-transparent border-0 focus:ring-0 font-semibold font-mono"
                                  />
                                  <button 
                                    type="button" 
                                    onClick={() => updateQuantity(prod.id, item.quantity + 1)}
                                    className="px-2 py-1 text-xs hover:bg-muted font-bold text-muted-foreground transition-colors border-l"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="text-xs font-bold text-primary font-mono">
                                  AED {(price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeFromQuoteCart(prod.id)}
                              className="h-6 w-6 text-muted-foreground hover:text-red-500 rounded-full hover:bg-red-500/10 shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Client Assignment Section */}
                <div className="border-t border-border/60 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Client Assignment</h4>
                    <Button 
                      variant="link" 
                      onClick={() => setIsCreatingClient(!isCreatingClient)}
                      className="text-xs text-primary p-0 h-auto font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {isCreatingClient ? "Cancel" : "+ Add New Client"}
                    </Button>
                  </div>

                  {/* Inline Client creation form */}
                  {isCreatingClient ? (
                    <form onSubmit={handleCreateClient} className="p-4 border border-primary/20 bg-primary/[0.01] rounded-2xl space-y-3 animate-in slide-in-from-top duration-300">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
                        <Sparkles className="h-4 w-4" />
                        <span>Register New Client</span>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Company Name *</label>
                        <Input 
                          placeholder="e.g. Design Studio LLC" 
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          className="h-8 text-xs rounded-lg"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Contact Person</label>
                          <Input 
                            placeholder="e.g. Sarah Smith" 
                            value={newClientContact}
                            onChange={(e) => setNewClientContact(e.target.value)}
                            className="h-8 text-xs rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Client Type</label>
                          <select
                            className="w-full h-8 rounded-lg border bg-background px-2.5 py-1 text-xs shadow-sm cursor-pointer"
                            value={newClientType}
                            onChange={(e) => setNewClientType(e.target.value)}
                          >
                            <option value="Interior">Interior Designer</option>
                            <option value="Dealer">Dealer</option>
                            <option value="Project">Direct Client</option>
                            <option value="Special">Online ecommerce</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Phone Number</label>
                          <Input 
                            placeholder="e.g. +97150..." 
                            value={newClientPhone}
                            onChange={(e) => setNewClientPhone(e.target.value)}
                            className="h-8 text-xs rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</label>
                          <Input 
                            type="email"
                            placeholder="e.g. contact@..." 
                            value={newClientEmail}
                            onChange={(e) => setNewClientEmail(e.target.value)}
                            className="h-8 text-xs rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">TRN (Optional)</label>
                        <Input 
                          placeholder="e.g. 100..." 
                          value={newClientTrn}
                          onChange={(e) => setNewClientTrn(e.target.value)}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={clientSubmitting}
                        className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-lg mt-2 font-bold cursor-pointer"
                      >
                        {clientSubmitting ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                            Registering Client...
                          </>
                        ) : (
                          "Register & Select Client"
                        )}
                      </Button>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      <Popover open={isClientComboboxOpen} onOpenChange={setIsClientComboboxOpen}>
                        <PopoverTrigger 
                          className="flex items-center w-full h-10 rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm justify-between font-normal hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                          aria-expanded={isClientComboboxOpen}
                        >
                          {selectedClientId
                            ? (() => {
                                const c = clients.find((client) => client.id === selectedClientId)
                                return c ? `${c.companyName} (${c.clientType || "Project"})` : "-- Choose Assigned Client --"
                              })()
                            : "-- Choose Assigned Client --"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command filter={(value, search) => {
                            if (value.toLowerCase().includes(search.toLowerCase())) return 1
                            return 0
                          }}>
                            <CommandInput placeholder="Search clients..." className="h-9 text-xs" />
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              <CommandEmpty>
                                <div className="p-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                                  <p>No clients found.</p>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-xs h-8"
                                    onClick={() => {
                                      setIsClientComboboxOpen(false)
                                      setIsCreatingClient(true)
                                    }}
                                  >
                                    + Create New Client
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                {clients
                                  .filter((client) => client.status === "Approved")
                                  .map((client) => {
                                    const isExcludedFromAssignmentCheck = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(userRole)
                                    const isUserAssigned = client.isAssigned
                                    const canSelect = isUserAssigned || isExcludedFromAssignmentCheck

                                    const activeReq = client.accessRequests?.[0]
                                    const isRequested = activeReq?.status === "Requested"
                                    const isRejected = activeReq?.status === "Rejected"

                                    const statusText = canSelect
                                      ? (isUserAssigned ? "Assigned to You" : "Assigned")
                                      : (() => {
                                          if (isRequested) return "Access Requested"
                                          if (isRejected) return "Request Rejected"
                                          return "Not Assigned"
                                        })()

                                    const isSelected = selectedClientId === client.id

                                    return (
                                      <CommandItem
                                        key={client.id}
                                        value={client.companyName}
                                        onSelect={() => {
                                          if (!canSelect) return
                                          setSelectedClientId(client.id === selectedClientId ? "" : client.id)
                                          setIsClientComboboxOpen(false)
                                        }}
                                        className={cn(
                                          "flex flex-col items-start p-2 border-b last:border-b-0 border-muted/50 aria-selected:bg-muted/40 cursor-pointer",
                                          !canSelect && "opacity-75 cursor-default"
                                        )}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <div className="flex items-center gap-2">
                                            <Check
                                              className={cn(
                                                "h-4 w-4 text-primary",
                                                isSelected ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <span className="font-medium text-sm">{client.companyName}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            {canSelect ? (
                                              isUserAssigned && (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-250 text-[10px] py-0 px-1.5 font-normal">
                                                  Assigned
                                                </Badge>
                                              )
                                            ) : (
                                              <>
                                                {isRequested && (
                                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-250 text-[10px] py-0 px-1.5 font-normal">
                                                    Requested
                                                  </Badge>
                                                )}
                                                {isRejected && (
                                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] py-0 px-1.5 font-normal">
                                                    Rejected
                                                  </Badge>
                                                )}
                                                {!isRequested && !isRejected && (
                                                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] py-0 px-1.5 font-normal">
                                                    Unassigned
                                                  </Badge>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        <div className="text-[11px] text-muted-foreground ml-6 mt-0.5 flex items-center gap-1">
                                          <span>{client.clientType || "Project"}</span>
                                          <span>·</span>
                                          <span>{statusText}</span>
                                        </div>

                                        {!canSelect && (() => {
                                          if (isRequested) {
                                            return (
                                              <div className="mt-2 ml-6 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                                   onClick={(e) => e.stopPropagation()}
                                              >
                                                <div className="flex items-start gap-1">
                                                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                  <span>Access request is pending approval.</span>
                                                </div>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="outline"
                                                  disabled
                                                  className="text-[10px] h-7 px-2 border-amber-200 bg-amber-100 text-amber-600 dark:bg-amber-950/40 shrink-0 self-end sm:self-auto opacity-75 cursor-not-allowed"
                                                >
                                                  Requested
                                                </Button>
                                              </div>
                                            )
                                          }

                                          if (isRejected) {
                                            const isRequestAgainAllowed = client.allowRequestAgain !== false
                                            return (
                                              <div className="mt-2 ml-6 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-[11px] text-red-850 dark:text-red-300 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                                   onClick={(e) => e.stopPropagation()}
                                              >
                                                <div className="flex items-start gap-1">
                                                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                  <span>Access request rejected{activeReq.rejectionReason ? `: ${activeReq.rejectionReason}` : "."}</span>
                                                </div>
                                                {isRequestAgainAllowed && (
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-[10px] h-7 px-2 border-red-300 hover:bg-red-100 dark:hover:bg-red-950 text-red-900 dark:text-red-200 shrink-0 self-end sm:self-auto cursor-pointer"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      setRequestAccessClient({ id: client.id, name: client.companyName })
                                                      setRequestNotes("")
                                                    }}
                                                  >
                                                    Request Again
                                                  </Button>
                                                )}
                                              </div>
                                            )
                                          }

                                          return (
                                            <div className="mt-2 ml-6 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                                 onClick={(e) => e.stopPropagation()}
                                            >
                                              <div className="flex items-start gap-1">
                                                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                <span>You cannot select this client unless access is requested and approved.</span>
                                              </div>
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="text-[10px] h-7 px-2 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-900 dark:text-amber-200 shrink-0 self-end sm:self-auto cursor-pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setRequestAccessClient({ id: client.id, name: client.companyName })
                                                  setRequestNotes("")
                                                }}
                                              >
                                                Request Access
                                              </Button>
                                            </div>
                                          )
                                        })()}
                                      </CommandItem>
                                    )
                                  })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {selectedClientId && (() => {
                        const sel = clients.find(c => c.id === selectedClientId)
                        if (!sel) return null
                        const type = sel.clientType || "Project"
                        let explanation = "Standard general rates applied."
                        if (type === "Interior" || type === "Interior Designer") explanation = "IDC Special Interior Designer wholesale rates applied."
                        else if (type === "Dealer") explanation = "Dealer wholesale pricing tier applied."
                        else if (type === "Special") explanation = "Online ecommerce pricing segment applied."

                        return (
                          <div className="p-3 border border-primary/10 bg-primary/5 rounded-xl text-[10px] leading-relaxed text-primary">
                            <span className="font-bold uppercase tracking-wider block mb-0.5">Applied pricing tier: {type}</span>
                            {explanation}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              {quoteCart.length > 0 && (
                <div className="p-6 border-t border-border/60 bg-muted/10 space-y-4 shrink-0">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-muted-foreground">Estimated Total Value:</span>
                    <span className="text-lg font-bold font-mono text-primary">
                      AED {quoteCart.reduce((sum, item) => {
                        const prod = item.product
                        const selectedClient = clients.find(c => c.id === selectedClientId)
                        let priceSegment = "Project"
                        if (selectedClient) {
                          const cType = selectedClient.clientType || "Project"
                          if (cType === "Interior" || cType === "Interior Designer") priceSegment = "Interior"
                          else if (cType === "Dealer") priceSegment = "Dealer"
                          else if (cType === "Special" || cType === "Online / Ecommerce") priceSegment = "Special"
                        }
                        
                        let price = prod.unitPrice
                        if (priceSegment === "Interior") price = prod.interiorPrice ?? prod.unitPrice
                        else if (priceSegment === "Dealer") price = prod.dealerPrice ?? prod.unitPrice
                        else if (priceSegment === "Special") price = prod.specialPrice ?? prod.unitPrice

                        return sum + (price * item.quantity)
                      }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <Button 
                    type="button"
                    onClick={handleCreateQuotation}
                    disabled={!selectedClientId}
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground h-11 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Create Quotation</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <EditProductModal
        product={editingProduct}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false)
          setEditingProduct(null)
        }}
        onSuccess={fetchProducts}
      />

      <ProductDetailsModal
        product={selectedDetailProduct}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedDetailProduct(null)
        }}
        onAddToQuote={addToQuoteCartWithQuantity}
        userRole={userRole}
        clients={clients}
        selectedClientId={selectedClientId}
        canCreateQuotation={hasQuoteAccess}
      />

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && canDeleteProduct && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card text-card-foreground border shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom duration-300">
          <span className="text-sm font-semibold text-primary">
            {selectedIds.length} {selectedIds.length === 1 ? "product" : "products"} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs hover:bg-secondary rounded-full h-8 cursor-pointer"
              onClick={() => setSelectedIds([])}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-full h-8 flex items-center gap-1.5 cursor-pointer shadow-sm"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  Delete Selected
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      {/* Request Access Note Dialog */}
      <Dialog open={requestAccessClient !== null} onOpenChange={(open) => !open && setRequestAccessClient(null)}>
        <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
              <UserPlus className="h-5 w-5 text-orange-500" />
              Request Client Access
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Provide an optional note to justify your request for "{requestAccessClient?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Optional Note</label>
              <Textarea
                placeholder="e.g., Client wants to place a new quotation for chairs..."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                rows={3}
                className="bg-slate-900 border-slate-800 text-xs text-white"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRequestAccessClient(null)
                setRequestNotes("")
              }}
              className="text-xs h-9 text-slate-400 hover:text-white"
              disabled={requestingAccess}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleRequestAccessSubmit}
              disabled={requestingAccess}
              className="text-xs h-9 font-medium bg-orange-600 hover:bg-orange-500 text-white border-0"
            >
              {requestingAccess ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interactive Variant Drawer Modal */}
      <VariantDrawerModal
        masterProduct={selectedMasterForVariants as any}
        isOpen={Boolean(selectedMasterForVariants)}
        onClose={() => setSelectedMasterForVariants(null)}
        onAddToCart={(variant) => {
          addToQuoteCart(variant as any)
        }}
        onSaveStock={handleSaveStock}
        onImageUploaded={fetchProducts}
        canEditProduct={canEditProduct}
        hasQuoteAccess={hasQuoteAccess}
      />
    </div>
  )
}
