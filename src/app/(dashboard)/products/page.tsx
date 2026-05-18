"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, MoreHorizontal, Loader2, Package, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BulkUploadModal } from "@/components/products/bulk-upload-modal"
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
  warranty: string | null
  availableColors: string | null
  dimensions: string | null
  status: string
  category: {
    name: string
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isBulkOpen, setIsBulkOpen] = useState(false)

  async function fetchProducts() {
    try {
      setLoading(true)
      const res = await fetch("/api/products")
      if (!res.ok) throw new Error("Failed to fetch products")
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Failed to load products. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Filter products dynamically
  const filteredProducts = products.filter((product) => {
    const term = searchTerm.toLowerCase()
    return (
      product.productName.toLowerCase().includes(term) ||
      product.productCode.toLowerCase().includes(term) ||
      product.category.name.toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Master</h1>
          <p className="text-muted-foreground">
            Manage your office furniture catalog.
          </p>
        </div>
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
      </div>

      <div className="flex items-center justify-between">
        <div className="relative flex items-center w-full max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3" />
          <Input
            placeholder="Search products by code, name, or category..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "Try searching with a different term" : "Click 'Add Product' to create your first item"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
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
                  <TableCell className="font-mono font-medium text-primary">{product.productCode}</TableCell>
                  <TableCell className="font-semibold">{product.productName}</TableCell>
                  <TableCell>{product.category.name}</TableCell>
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
                        <DropdownMenuItem onClick={() => toast.info("Editing products coming soon")}>
                          Edit product
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <BulkUploadModal 
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={fetchProducts}
      />
    </div>
  )
}
