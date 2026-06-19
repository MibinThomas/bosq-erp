"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Plus, Search, MoreHorizontal, Loader2, Package, Sparkles, LayoutGrid, List, Edit, ShoppingCart, Trash2, X, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { ProductDetailsModal } from "@/components/products/product-details-modal"

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
import { Check, ChevronsUpDown } from "lucide-react"

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
  description?: string | null
  status: string
  imageUrl: string | null
  category: {
    name: string
  }
}

export default function ProductsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const isManagerOrAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "SALES_MANAGER"

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string; description: string | null }[]>([])
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDesc, setNewCategoryDesc] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)

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

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch("/api/clients")
        if (res.ok) {
          const data = await res.json()
          setClients(data)
        }
      } catch (err) {
        console.error("Failed to load clients:", err)
      }
    }
    if (userRole === "SALES_EXECUTIVE" || userRole === "DESIGN_CONSULTANT" || isManagerOrAdmin) {
      loadClients()
    }
  }, [userRole, isManagerOrAdmin])

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
    const clientType = selectedClient.clientType || "Direct"
    // Valid values for Quotation Form Segment: "Interior", "Dealer", "Direct", "Online"
    let segment: "Interior" | "Dealer" | "Direct" | "Online" = "Direct"
    if (clientType === "Interior" || clientType === "Interior Designer") segment = "Interior"
    else if (clientType === "Dealer") segment = "Dealer"
    else if (clientType === "Online" || clientType === "Online / Ecommerce") segment = "Online"

    const quotationPayload = {
      clientId: selectedClientId,
      customerSegment: segment,
      items: quoteCart.map(item => {
        const prod = item.product
        // Dynamic Pricing Segment Mapping
        let rate = prod.unitPrice
        if (segment === "Interior") rate = prod.interiorPrice ?? prod.unitPrice
        else if (segment === "Dealer") rate = prod.dealerPrice ?? prod.unitPrice
        else if (segment === "Direct") rate = prod.directPrice ?? prod.unitPrice
        else if (segment === "Online") rate = prod.onlinePrice ?? prod.unitPrice

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
      const res = await fetch("/api/products")
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

  // Filter products dynamically
  const filteredProducts = products.filter((product) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch = (
      product.productName.toLowerCase().includes(term) ||
      product.productCode.toLowerCase().includes(term) ||
      product.category.name.toLowerCase().includes(term)
    )
    const matchesCategory = selectedCategory ? product.category.name === selectedCategory : true
    return matchesSearch && matchesCategory
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
          {(userRole === "SALES_EXECUTIVE" || userRole === "DESIGN_CONSULTANT" || isManagerOrAdmin) && (
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

          {isManagerOrAdmin && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsCategoryModalOpen(true)}
                className="border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-foreground cursor-pointer flex items-center gap-2"
              >
                <Plus className="h-4 w-4 text-primary" />
                Add Category
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsBulkOpen(true)}
                className="border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-foreground cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                Bulk Upload
              </Button>
              <Link href="/products/new">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </Link>
            </>
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
            {filteredProducts.map((product) => (
              <div 
                key={product.id} 
                className={`relative border rounded-2xl bg-card text-card-foreground shadow-sm hover:shadow-xl hover:border-primary/30 transition-all flex flex-col group overflow-hidden ${
                  selectedIds.includes(product.id) ? "border-primary bg-primary/[0.02]" : ""
                }`}
              >
                {/* Checkbox Overlay */}
                {isManagerOrAdmin && (
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

                {/* Card Status Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <Badge variant={product.status === "ACTIVE" ? "default" : "destructive"} className="shadow-sm">
                    {product.status}
                  </Badge>
                </div>

                {/* Product Image */}
                <div 
                  className="h-48 w-full bg-muted/30 flex items-center justify-center overflow-hidden relative border-b p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => {
                    setSelectedDetailProduct(product)
                    setIsDetailOpen(true)
                  }}
                  title="Click to view product details"
                >
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.productName} 
                      className="object-contain max-h-full max-w-full transition-transform duration-300 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                      <Package className="h-10 w-10 stroke-[1.5]" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold">No Image</span>
                    </div>
                  )}
                </div>

                {/* Card Info */}
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase bg-secondary/80 px-2 py-0.5 rounded border">
                      {product.productCode}
                    </span>
                    <h3 className="font-bold text-base mt-2 line-clamp-1 group-hover:text-primary transition-colors">
                      {product.productName}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      Category: <span className="text-foreground">{product.category.name}</span>
                    </p>
                  </div>

                  <div className="h-px bg-border my-1" />

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <p className="font-bold text-[10px] text-muted-foreground/80 uppercase">Warranty</p>
                      <p className="text-foreground mt-0.5">{product.warranty || "5 Years"}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[10px] text-muted-foreground/80 uppercase">Dimensions</p>
                      <p className="text-foreground mt-0.5 line-clamp-1">{product.dimensions || "Standard"}</p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mt-2 pt-2 border-t">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground/80 uppercase">Unit Price</p>
                      <p className="text-lg font-extrabold text-primary font-mono mt-0.5">
                        AED {product.unitPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {isManagerOrAdmin && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingProduct(product)
                            setIsEditOpen(true)
                          }}
                          className="border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-primary text-xs shrink-0 cursor-pointer h-8 rounded-full px-3"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      
                      {/* Add to Quote Button */}
                      {(userRole === "SALES_EXECUTIVE" || userRole === "DESIGN_CONSULTANT" || isManagerOrAdmin) && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation()
                            addToQuoteCart(product)
                          }}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs shrink-0 cursor-pointer h-8 rounded-full px-4 flex items-center gap-1 font-bold shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add to Quote
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <div className="border rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm min-w-[800px]">
              <Table>
                <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12">
                    {isManagerOrAdmin && (
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
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Specifications</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead>Warranty</TableHead>
                  <TableHead className="text-right">Unit Price (AED)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="w-12">
                      {isManagerOrAdmin && (
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
                    <TableCell className="font-semibold">{product.productName}</TableCell>
                    <TableCell>{product.category.name}</TableCell>
                    <TableCell className="max-w-[250px] truncate text-muted-foreground" title={product.specifications || undefined}>
                      {product.specifications || "-"}
                    </TableCell>
                    <TableCell>{product.dimensions || "-"}</TableCell>
                    <TableCell>{product.warranty || "-"}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {product.unitPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status === "ACTIVE" ? "default" : "destructive"}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      {(userRole === "SALES_EXECUTIVE" || userRole === "DESIGN_CONSULTANT" || isManagerOrAdmin) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => addToQuoteCart(product)}
                          className="h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary rounded-full cursor-pointer shrink-0"
                          title="Add to quote cart"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 hover:bg-muted inline-flex items-center justify-center rounded-md cursor-pointer text-muted-foreground hover:text-foreground">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setSelectedDetailProduct(product)
                            setIsDetailOpen(true)
                          }}>
                            View details
                          </DropdownMenuItem>
                          {isManagerOrAdmin && (
                            <DropdownMenuItem onClick={() => {
                              setEditingProduct(product)
                              setIsEditOpen(true)
                            }}>
                              Edit product
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* Create Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-card rounded-2xl border shadow-2xl flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Plus className="h-5 w-5 text-primary" />
                  Create Product Category
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Add a new dynamic category to classify catalog products.
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
                  fetchCategories()
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
                  placeholder="E.g., Acoustic Pods" 
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Description</label>
                <Textarea 
                  value={newCategoryDesc} 
                  onChange={(e) => setNewCategoryDesc(e.target.value)} 
                  placeholder="Optional brief description of this product range..." 
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsCategoryModalOpen(false)
                    setNewCategoryName("")
                    setNewCategoryDesc("")
                  }} 
                  disabled={creatingCategory}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold" 
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
                        let priceSegment = "Direct"
                        if (selectedClient) {
                          const cType = selectedClient.clientType || "Direct"
                          if (cType === "Interior" || cType === "Interior Designer") priceSegment = "Interior"
                          else if (cType === "Dealer") priceSegment = "Dealer"
                          else if (cType === "Online" || cType === "Online / Ecommerce") priceSegment = "Online"
                        }
                        
                        let price = prod.unitPrice
                        if (priceSegment === "Interior") price = prod.interiorPrice ?? prod.unitPrice
                        else if (priceSegment === "Dealer") price = prod.dealerPrice ?? prod.unitPrice
                        else if (priceSegment === "Online") price = prod.onlinePrice ?? prod.unitPrice

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
                            <option value="Direct">Direct Client</option>
                            <option value="Online">Online ecommerce</option>
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
                                return c ? `${c.companyName} (${c.clientType || "Direct"})` : "-- Choose Assigned Client --"
                              })()
                            : "-- Choose Assigned Client --"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command>
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
                                {clients.map((c) => (
                                  <CommandItem
                                    key={c.id}
                                    value={`${c.companyName} ${c.clientType} ${c.status}`}
                                    onSelect={() => {
                                      if (c.status && c.status !== "Approved") return;
                                      setSelectedClientId(c.id === selectedClientId ? "" : c.id)
                                      setIsClientComboboxOpen(false)
                                    }}
                                    disabled={c.status && c.status !== "Approved"}
                                    className={`text-xs ${c.status && c.status !== "Approved" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                  >
                                    <Check
                                      className={`mr-2 h-3.5 w-3.5 ${
                                        selectedClientId === c.id ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {c.companyName} ({c.clientType || "Direct"}){c.status && c.status !== "Approved" ? ` [${c.status}]` : ""}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {selectedClientId && (() => {
                        const sel = clients.find(c => c.id === selectedClientId)
                        if (!sel) return null
                        const type = sel.clientType || "Direct"
                        let explanation = "Standard general rates applied."
                        if (type === "Interior" || type === "Interior Designer") explanation = "IDC Special Interior Designer wholesale rates applied."
                        else if (type === "Dealer") explanation = "Dealer wholesale pricing tier applied."
                        else if (type === "Online") explanation = "Online ecommerce pricing segment applied."

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
                        let priceSegment = "Direct"
                        if (selectedClient) {
                          const cType = selectedClient.clientType || "Direct"
                          if (cType === "Interior" || cType === "Interior Designer") priceSegment = "Interior"
                          else if (cType === "Dealer") priceSegment = "Dealer"
                          else if (cType === "Online" || cType === "Online / Ecommerce") priceSegment = "Online"
                        }
                        
                        let price = prod.unitPrice
                        if (priceSegment === "Interior") price = prod.interiorPrice ?? prod.unitPrice
                        else if (priceSegment === "Dealer") price = prod.dealerPrice ?? prod.unitPrice
                        else if (priceSegment === "Online") price = prod.onlinePrice ?? prod.unitPrice

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
      />

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
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
    </div>
  )
}
