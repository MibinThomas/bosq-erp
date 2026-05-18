import Link from "next/link"
import { Plus, Search, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

const products = [
  {
    id: "P-1001",
    code: "WS-01",
    name: "Linear Workstation for 4",
    category: "Workstations",
    unitPrice: 2450.00,
    stockStatus: "In Stock",
  },
  {
    id: "P-1002",
    code: "ED-05",
    name: "Executive Desk L-Shape",
    category: "Executive desks",
    unitPrice: 4200.00,
    stockStatus: "Low Stock",
  },
  {
    id: "P-1003",
    code: "EC-12",
    name: "Ergonomic Mesh Chair",
    category: "Ergonomic chairs",
    unitPrice: 850.00,
    stockStatus: "Out of Stock",
  },
]

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Master</h1>
          <p className="text-muted-foreground">
            Manage your office furniture catalog.
          </p>
        </div>
        <Link href="/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 w-full max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute ml-3" />
          <Input placeholder="Search products..." className="pl-9" />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Unit Price (AED)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.code}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell className="text-right font-medium">
                  {product.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      product.stockStatus === 'In Stock' 
                        ? 'default' 
                        : product.stockStatus === 'Low Stock' 
                          ? 'secondary' 
                          : 'destructive'
                    }
                  >
                    {product.stockStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>View details</DropdownMenuItem>
                      <DropdownMenuItem>Edit product</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
