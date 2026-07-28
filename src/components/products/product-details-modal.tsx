"use client"

import React, { useState, useEffect } from "react"
import { X, ShoppingCart, Plus, Minus, Package, ShieldCheck, Wrench, Palette, Target, ZoomIn, ChevronLeft, ChevronRight, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  canCreateQuotation?: boolean
}

export function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  onAddToQuote,
  userRole,
  clients,
  selectedClientId,
  canCreateQuotation,
}: ProductDetailsModalProps) {
  const [quantity, setQuantity] = useState<number>(1)
  const [activeImgIndex, setActiveImgIndex] = useState<number>(0)
  const [isZoomed, setIsZoomed] = useState<boolean>(false)
  const [isAdded, setIsAdded] = useState<boolean>(false)

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

  // Reset local state when modal opens for a new product
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1)
      setActiveImgIndex(0)
      setIsZoomed(false)
      setIsAdded(false)
    }
  }, [isOpen, product])

  if (!isOpen || !product) return null

  // Image Gallery Initialization
  const galleryImages = (product.imageUrls && product.imageUrls.length > 0)
    ? product.imageUrls
    : (product.imageUrl ? [product.imageUrl] : []);

  // Pricing Segment Dynamic Resolution
  const selectedClient = clients?.find((c) => c.id === selectedClientId)
  let segment = "Project"
  if (selectedClient) {
    const cType = selectedClient.clientType || "Project"
    if (cType === "Interior" || cType === "Interior Designer") segment = "Interior"
    else if (cType === "Dealer") segment = "Dealer"
    else if (cType === "Special" || cType === "Online / Ecommerce") segment = "Special"
  }

  // Calculate pricing segment unit values
  let applicablePrice = product.unitPrice
  if (segment === "Interior") applicablePrice = product.interiorPrice ?? product.unitPrice
  else if (segment === "Dealer") applicablePrice = product.dealerPrice ?? product.unitPrice
  else if (segment === "Project") applicablePrice = product.projectPrice ?? product.unitPrice
  else if (segment === "Special") applicablePrice = product.specialPrice ?? product.unitPrice

  const hasQuoteAccess = canCreateQuotation !== undefined
    ? canCreateQuotation
    : (userRole === "SALES_EXECUTIVE" || userRole === "DESIGN_CONSULTANT" || userRole === "ADMIN" || userRole === "SALES_MANAGER" || userRole === "MANAGER" || userRole === "SUPER_ADMIN")

  // HTML Spec Parser Helper
  const sanitizeHtmlToText = (html: string) => {
    if (!html) return "";
    let text = html;
    text = text.replace(/style="[^"]*"/gi, '');
    text = text.replace(/style='[^']*'/gi, '');
    text = text.replace(/size="[^"]*"/gi, '');
    text = text.replace(/color="[^"]*"/gi, '');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<li>/gi, '\n• ');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    return text.trim();
  }

  const parseSpecifications = (specs: string | null | undefined) => {
    if (!specs) return [];
    const rawText = sanitizeHtmlToText(specs);
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line !== "");
    const parsedSpecs: { key?: string; value: string }[] = [];

    lines.forEach((line) => {
      if (/^product\s+specifications$/i.test(line)) {
        return;
      }

      if (line.includes(",") && line.includes(":")) {
        const parts = line.split(',');
        let currentSpec: { key?: string; value: string } | null = null;
        
        parts.forEach((part) => {
          const trimmed = part.trim();
          if (trimmed.includes(":")) {
            const colonIndex = trimmed.indexOf(":");
            const key = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();
            
            if (currentSpec) {
              parsedSpecs.push(currentSpec);
            }
            currentSpec = { key, value };
          } else {
            if (currentSpec) {
              currentSpec.value += ", " + trimmed;
            } else {
              parsedSpecs.push({ value: trimmed });
            }
          }
        });
        if (currentSpec) {
          parsedSpecs.push(currentSpec);
        }
      } else {
        if (line.includes(":")) {
          const colonIndex = line.indexOf(":");
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          parsedSpecs.push({ key, value });
        } else {
          parsedSpecs.push({ value: line });
        }
      }
    });

    return parsedSpecs.filter(spec => {
      const val = spec.value.trim().toLowerCase();
      if (!val || val === "-" || val === "not specified" || val === "none") {
        return false;
      }
      return true;
    });
  }

  const specsList = parseSpecifications(product.specifications);

  // Dynamic Highlights Summarization
  const warrantyHighlight = product.warranty || specsList.find(s => s.key?.toLowerCase().includes("warranty"))?.value || "5 Years"
  const bestForHighlight = specsList.find(s => s.key?.toLowerCase().includes("recommended usage") || s.key?.toLowerCase().includes("best for"))?.value || (product.category.name.toLowerCase().includes("chair") ? "Executive Use" : "Corporate")
  const assemblyHighlight = specsList.find(s => s.key?.toLowerCase().includes("assembly"))?.value || "Not Required"
  const colorHighlight = product.availableColors || specsList.find(s => s.key?.toLowerCase().includes("color") || s.key?.toLowerCase().includes("finish"))?.value || "Tan Brown"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-card rounded-3xl border border-border/80 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header Close Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="absolute top-4 right-4 rounded-full h-9 w-9 bg-card/60 hover:bg-muted border shadow-sm z-30"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Modal Scroll Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left side: Gallery (5 cols) */}
            <div className="md:col-span-5 flex flex-col gap-4 select-none">
              
              {/* Main Image Box */}
              <div className="relative border border-slate-100 bg-slate-50/50 rounded-2xl h-80 md:h-[400px] flex items-center justify-center overflow-hidden group">
                
                {/* Product Badges */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-slate-500 bg-white/95 border px-2 py-0.5 rounded-lg font-bold shadow-sm">
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

                {/* Gallery Progress Badge */}
                {galleryImages.length > 1 && (
                  <div className="absolute bottom-4 right-4 z-10 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md font-medium">
                    {activeImgIndex + 1} / {galleryImages.length}
                  </div>
                )}

                {/* Hover Click-Zoom Trigger */}
                {galleryImages.length > 0 && (
                  <button 
                    onClick={() => setIsZoomed(true)} 
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-white text-slate-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                    title="Zoom Image"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                )}

                {/* Primary Display Image */}
                {galleryImages.length > 0 ? (
                  <img 
                    src={galleryImages[activeImgIndex]} 
                    alt={product.productName} 
                    className="object-contain max-h-full max-w-full p-6 transition-transform duration-500 hover:scale-105 filter drop-shadow-md cursor-zoom-in"
                    onClick={() => setIsZoomed(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-16 w-16 stroke-[1.2] text-muted-foreground/40" />
                    <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">No Image</span>
                  </div>
                )}

                {/* Next/Prev Navigation Buttons */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImgIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length)}
                      className="absolute left-2 p-1.5 rounded-full bg-white/70 hover:bg-white border shadow-sm text-slate-700 hover:text-slate-900 transition-colors z-10 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setActiveImgIndex(prev => (prev + 1) % galleryImages.length)}
                      className="absolute right-2 p-1.5 rounded-full bg-white/70 hover:bg-white border shadow-sm text-slate-700 hover:text-slate-900 transition-colors z-10 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}

              </div>

              {/* Interactive Thumbnail Carousel */}
              {galleryImages.length > 1 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImgIndex(idx)}
                      className={`w-16 h-16 border rounded-xl overflow-hidden bg-slate-50/50 p-1 flex items-center justify-center transition-all cursor-pointer ${
                        idx === activeImgIndex ? 'border-[#F17423] ring-1 ring-[#F17423]/50' : 'border-slate-100 hover:border-slate-355'
                      }`}
                    >
                      <img src={img} alt={`thumbnail-${idx}`} className="object-contain max-h-full max-w-full" />
                    </button>
                  ))}
                </div>
              )}

            </div>

            {/* Right side: Detailed Information (7 cols) */}
            <div className="md:col-span-7 flex flex-col gap-6">
              
              {/* Product Metadata Title */}
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#F17423] font-mono">
                  {product.category.name}
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                  {product.productName}
                </h2>
              </div>

              {/* Dynamic Highlights Section */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 border border-slate-100 rounded-2xl bg-slate-50/40 flex flex-col items-center text-center">
                  <ShieldCheck className="h-5 w-5 text-[#F17423] mb-1" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Warranty</span>
                  <span className="text-xs font-semibold text-slate-800 mt-1 block">
                    {warrantyHighlight}
                  </span>
                </div>

                <div className="p-3 border border-slate-100 rounded-2xl bg-slate-50/40 flex flex-col items-center text-center">
                  <Target className="h-5 w-5 text-[#F17423] mb-1" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Best For</span>
                  <span className="text-xs font-semibold text-slate-800 mt-1 block truncate w-full" title={bestForHighlight}>
                    {bestForHighlight}
                  </span>
                </div>

                <div className="p-3 border border-slate-100 rounded-2xl bg-slate-50/40 flex flex-col items-center text-center">
                  <Wrench className="h-5 w-5 text-[#F17423] mb-1" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Assembly</span>
                  <span className="text-xs font-semibold text-slate-800 mt-1 block">
                    {assemblyHighlight}
                  </span>
                </div>

                <div className="p-3 border border-slate-100 rounded-2xl bg-slate-50/40 flex flex-col items-center text-center">
                  <Palette className="h-5 w-5 text-[#F17423] mb-1" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Color</span>
                  <span className="text-xs font-semibold text-slate-800 mt-1 block truncate w-full" title={colorHighlight}>
                    {colorHighlight}
                  </span>
                </div>
              </div>

              {/* Dedicated Pricing Panel */}
              <div className="p-4 border border-slate-100 bg-slate-50/30 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pricing</span>
                
                <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Base Price</span>
                    <span className="text-base font-bold font-mono text-slate-500 block mt-0.5">
                      AED {product.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Stock Status</span>
                    <span className={`text-xs font-bold block mt-1 px-2.5 py-0.5 rounded-full ${
                      (product.stock ?? 0) >= 5
                        ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 w-fit"
                        : (product.stock ?? 0) > 0
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 w-fit"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 w-fit"
                    }`}>
                      {(product.stock ?? 0) >= 5
                        ? `In Stock (${product.stock} items)`
                        : (product.stock ?? 0) > 0
                        ? `Low Stock (${product.stock} remaining)`
                        : "Out of Stock"}
                    </span>
                  </div>

                  {selectedClientId && (
                    <div className="sm:border-l sm:pl-6 flex-1">
                      <span className="text-[10px] font-bold text-[#F17423] uppercase block">Client Applicable Rate</span>
                      <span className="text-2xl font-extrabold font-mono text-[#F17423] block mt-0.5">
                        AED {applicablePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium block mt-1">
                        ✨ Adjusted automatically for {selectedClient?.companyName} ({segment})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Description */}
              {product.description && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Product Description</span>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Structured Technical Specifications Table */}
              {specsList.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Technical Specifications</span>
                  <div className="border border-slate-100 rounded-xl overflow-hidden mt-1">
                    <table className="w-full text-xs text-left border-collapse">
                      <tbody>
                        {specsList.map((spec, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 font-bold text-slate-700 bg-slate-50/30 w-1/3 border-r border-slate-100 leading-normal">{spec.key || "Specification"}</td>
                            <td className="p-3 text-slate-600 leading-normal">{spec.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Always-Visible Fixed Bottom Actions Bar */}
        <div className="border-t border-slate-100 p-4 bg-card shrink-0 z-20 flex flex-wrap items-center justify-end gap-4">
          
          {/* Right Side: Quantity Selector & Add to Quote */}
          {hasQuoteAccess && (
            <div className="flex items-center gap-3">
              
              {/* Quantity Selector */}
              <div className="flex items-center border rounded-xl overflow-hidden bg-slate-50/50 px-2 py-1 h-11">
                <span className="text-xs font-semibold text-slate-400 px-2">Qty</span>
                <div className="flex items-center border rounded-lg bg-background overflow-hidden h-8">
                  <button 
                    type="button" 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="px-2.5 hover:bg-muted font-bold text-slate-500 transition-colors border-r text-sm cursor-pointer"
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
                    className="px-2.5 hover:bg-muted font-bold text-slate-500 transition-colors border-l text-sm cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Add to Quote Primary Button */}
              <Button 
                type="button" 
                onClick={() => {
                  onAddToQuote(product, quantity);
                  setIsAdded(true);
                }}
                className={`h-11 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all px-8 cursor-pointer ${
                  isAdded 
                    ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20" 
                    : "bg-[#F17423] hover:bg-[#F17423]/90 text-white shadow-[#F17423]/25"
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                <span>{isAdded ? "✓ Added to Quote" : `Add to Quote`}</span>
              </Button>

            </div>
          )}

        </div>

        {/* Zoom Lightbox Modal Overlay */}
        {isZoomed && galleryImages.length > 0 && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
            onClick={() => setIsZoomed(false)}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsZoomed(false)} 
              className="absolute top-4 right-4 rounded-full h-10 w-10 bg-white/10 hover:bg-white/20 text-white border-0 z-55 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="relative max-w-full max-h-[85vh] flex items-center justify-center">
              <img 
                src={galleryImages[activeImgIndex]} 
                alt={product.productName} 
                className="object-contain max-h-[80vh] max-w-full rounded-lg"
              />
            </div>
            <div className="text-white text-xs font-semibold mt-4 bg-white/10 px-3 py-1 rounded-full">
              {product.productName} ({activeImgIndex + 1} of {galleryImages.length})
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
