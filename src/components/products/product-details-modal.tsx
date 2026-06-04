"use client"

import React, { useState, useEffect } from "react"
import { X, ShoppingCart, Plus, Minus, Package, BadgeCheck, ShieldAlert, Sparkles, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import parse from "html-react-parser"

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
  shortDescription: string | null
  description?: string | null
  status: string
  imageUrl: string | null
  category: {
    name: string
  }
}

interface ProductDetailsModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToQuote: (product: Product, quantity: number) => void
  userRole?: string
  clients?: any[]
  selectedClientId?: string
}

export function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  onAddToQuote,
  userRole,
  clients,
  selectedClientId,
}: ProductDetailsModalProps) {
  const [quantity, setQuantity] = useState<number>(1)

  // Prevent background scrolling when details modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Reset quantity when modal opens for a new product
  useEffect(() => {
    if (isOpen) {
      setQuantity(1)
    }
  }, [isOpen, product])

  if (!isOpen || !product) return null

  // Pricing Segment Dynamic Resolution
  const selectedClient = clients?.find((c) => c.id === selectedClientId)
  let segment = "Direct"
  if (selectedClient) {
    const cType = selectedClient.clientType || "Direct"
    if (cType === "Interior" || cType === "Interior Designer") segment = "Interior"
    else if (cType === "Dealer") segment = "Dealer"
    else if (cType === "Online" || cType === "Online / Ecommerce") segment = "Online"
  }

  // Calculate pricing segment unit values
  let applicablePrice = product.unitPrice
  if (segment === "Interior") applicablePrice = product.interiorPrice ?? product.unitPrice
  else if (segment === "Dealer") applicablePrice = product.dealerPrice ?? product.unitPrice
  else if (segment === "Direct") applicablePrice = product.directPrice ?? product.unitPrice
  else if (segment === "Online") applicablePrice = product.onlinePrice ?? product.unitPrice

  const hasQuoteAccess = userRole === "SALES_EXECUTIVE" || userRole === "ADMIN" || userRole === "SALES_MANAGER"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-card rounded-3xl border border-border/80 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header close button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="absolute top-4 right-4 rounded-full h-9 w-9 bg-card/60 hover:bg-muted border shadow-sm z-30"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Modal Scroll Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:h-[75vh]">
            
            {/* Left side: Image container (Desktop 5 col) */}
            <div className="md:col-span-5 bg-muted/20 border-b md:border-b-0 md:border-r border-border/60 flex items-center justify-center relative p-6 h-64 md:h-full select-none shrink-0 overflow-hidden">
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase bg-secondary/90 border px-2 py-0.5 rounded-lg font-bold shadow-sm">
                  {product.productCode}
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg border shadow-sm ${
                  product.status === "ACTIVE" 
                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                }`}>
                  {product.status}
                </span>
              </div>

              {product.imageUrl ? (
                <div className="h-full w-full flex items-center justify-center p-4">
                  <img 
                    src={product.imageUrl} 
                    alt={product.productName} 
                    className="object-contain max-h-full max-w-full rounded-2xl transition-transform duration-500 hover:scale-105 filter drop-shadow-md"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Package className="h-16 w-16 stroke-[1.2] text-muted-foreground/40" />
                  <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">No Image</span>
                </div>
              )}
            </div>

            {/* Right side: Detailed info (Desktop 7 col) */}
            <div className="md:col-span-7 p-6 md:p-8 flex flex-col h-full justify-between overflow-y-auto">
              
              {/* Product Info details */}
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-primary font-mono">
                    {product.category.name}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-1.5 line-clamp-2">
                    {product.productName}
                  </h2>
                </div>

                <div className="h-px bg-border/60" />

                {/* Attributes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border bg-muted/10 rounded-2xl">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Warranty Period</span>
                    <span className="text-xs font-semibold text-foreground block mt-1.5 truncate">
                      {product.warranty || "5 Years"}
                    </span>
                  </div>
                </div>

                {/* Technical Specifications */}
                {product.specifications && (
                  <div className="space-y-2 bg-muted/5 p-4 border rounded-2xl">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                      Technical Specifications
                    </span>
                    <div className="text-xs leading-relaxed text-foreground/80 space-y-2 mt-3 prose prose-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                      {parse(product.specifications)}
                    </div>
                  </div>
                )}

                {/* Description */}
                {product.description && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Product Description</span>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Dynamic pricing mapping display */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Product Pricing (AED)</span>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-primary/[0.02] border border-primary/10 rounded-2xl shadow-inner">
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">Base Price</span>
                      <span className="text-sm font-bold font-mono text-muted-foreground block mt-0.5">
                        AED {product.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {selectedClientId && (
                      <div className="sm:border-l sm:pl-4 flex-1">
                        <span className="text-[9px] font-bold text-primary uppercase block">Client Applicable Rate ({segment})</span>
                        <span className="text-xl font-extrabold font-mono text-primary block mt-0.5">
                          AED {applicablePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] text-primary/80 font-medium block mt-0.5">
                          ✨ Price segment adjusted automatically for {selectedClient?.companyName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Action Cart Controls */}
              {hasQuoteAccess && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-6 border-t mt-6 shrink-0 bg-card">
                  <div className="flex items-center justify-between sm:justify-start gap-3 border rounded-xl overflow-hidden bg-muted/20 px-2 py-1.5 h-11 self-start sm:self-auto shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground px-2">Quantity</span>
                    <div className="flex items-center border rounded-lg bg-background overflow-hidden h-8">
                      <button 
                        type="button" 
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="px-2.5 hover:bg-muted font-bold text-muted-foreground transition-colors border-r text-sm"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input 
                        type="number" 
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-10 text-center text-xs bg-transparent border-0 focus:ring-0 font-semibold font-mono"
                      />
                      <button 
                        type="button" 
                        onClick={() => setQuantity(q => q + 1)}
                        className="px-2.5 hover:bg-muted font-bold text-muted-foreground transition-colors border-l text-sm"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row items-stretch gap-2.5">
                    <Button 
                      type="button" 
                      onClick={() => onAddToQuote(product, quantity)}
                      className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground h-11 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>Add {quantity > 1 ? `${quantity} Items` : "to Quote"}</span>
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
