"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Plus, Search, MoreHorizontal, Loader2, Package, Sparkles, LayoutGrid, List, Edit } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export default function ProductsPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER"

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

  useEffect(() => {
    fetchProducts()
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

  // Extract unique categories dynamically
  const categories = Array.from(new Set(products.map((p) => p.category.name)))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Master</h1>
          <p className="text-muted-foreground">
            Manage your office furniture catalog.
          </p>
        </div>
        {isManagerOrAdmin && (
          <div className="flex items-center gap-3">
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
          </div>
        )}
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
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
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
                <div className="h-48 w-full bg-muted/30 flex items-center justify-center overflow-hidden relative border-b p-4">
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
                    
                    {/* Card Actions Button */}
                    {isManagerOrAdmin && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingProduct(product)
                          setIsEditOpen(true)
                        }}
                        className="border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-primary text-xs shrink-0 cursor-pointer h-8 rounded-full"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Update Item
                      </Button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm">
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
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 hover:bg-muted inline-flex items-center justify-center rounded-md cursor-pointer text-muted-foreground hover:text-foreground">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => toast.info("Details page coming soon")}>
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
        )}
      </div>

      <BulkUploadModal 
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={fetchProducts}
      />

      <EditProductModal
        product={editingProduct}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false)
          setEditingProduct(null)
        }}
        onSuccess={fetchProducts}
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
