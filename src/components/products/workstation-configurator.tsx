"use client"

import React, { useState, useEffect, useMemo } from "react"
import { 
  SlidersHorizontal, 
  Check, 
  Plus,
  AlertTriangle, 
  Package, 
  Sparkles, 
  Loader2, 
  Layers, 
  CheckCircle2, 
  XCircle,
  Tag,
  Maximize2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface WorkstationModel {
  modelName: string
  categoryId: string
  categoryName: string
  legTypes: string[]
  tableTopFinishes: string[]
  dimensions: string[]
  storageOptions: string[]
  finishMaterials: string[]
  combinations: Array<{
    id: string
    sku: string
    productName: string
    legType: string | null
    tableTopFinish: string | null
    dimensions: string | null
    storageOptions: string | null
    finishMaterial: string | null
  }>
}

interface WorkstationConfiguratorProps {
  watchSegment?: string
  onSelectVariant: (product: any) => void
  onCancel?: () => void
}

export function WorkstationConfigurator({
  watchSegment = "Project",
  onSelectVariant,
  onCancel,
}: WorkstationConfiguratorProps) {
  const [models, setModels] = useState<WorkstationModel[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [selectedModelName, setSelectedModelName] = useState<string>("")

  // Attribute selections
  const [selectedLegType, setSelectedLegType] = useState<string>("")
  const [selectedTableTop, setSelectedTableTop] = useState<string>("")
  const [selectedDimension, setSelectedDimension] = useState<string>("")
  const [selectedStorage, setSelectedStorage] = useState<string>("")
  const [selectedFinish, setSelectedFinish] = useState<string>("")

  // Matched Variant state
  const [fetchingVariant, setFetchingVariant] = useState(false)
  const [matchedProduct, setMatchedProduct] = useState<any>(null)

  // Fetch workstation metadata
  useEffect(() => {
    let isMounted = true
    setLoadingModels(true)
    fetch("/api/products/configurator")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.models)) {
          setModels(data.models)
          if (data.models.length > 0) {
            const firstModel = data.models[0]
            setSelectedModelName(firstModel.modelName)
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load workstation models:", err)
        toast.error("Failed to load workstation product models")
      })
      .finally(() => {
        if (isMounted) setLoadingModels(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Active Model object
  const activeModel = useMemo(() => {
    return models.find((m) => m.modelName === selectedModelName) || null
  }, [models, selectedModelName])

  // Reset/Initialize attributes when active model changes
  useEffect(() => {
    if (activeModel) {
      const firstLeg = activeModel.legTypes[0] || ""
      const firstTop = activeModel.tableTopFinishes[0] || ""
      const firstDim = activeModel.dimensions[0] || ""
      const firstStore = activeModel.storageOptions[0] || ""
      const firstFinish = activeModel.finishMaterials[0] || ""

      setSelectedLegType(firstLeg)
      setSelectedTableTop(firstTop)
      setSelectedDimension(firstDim)
      setSelectedStorage(firstStore)
      setSelectedFinish(firstFinish)
    }
  }, [activeModel])

  // Compute available combinations for active model
  const availableCombinations = useMemo(() => {
    if (!activeModel) return []
    return activeModel.combinations
  }, [activeModel])

  // Compute valid options for Table Top based on selected Leg Type
  const validTableTops = useMemo(() => {
    if (!activeModel) return []
    if (!selectedLegType) return activeModel.tableTopFinishes
    const validSet = new Set<string>()
    availableCombinations.forEach((c) => {
      if (!c.legType || c.legType === selectedLegType) {
        if (c.tableTopFinish) validSet.add(c.tableTopFinish)
      }
    })
    return Array.from(validSet).sort()
  }, [activeModel, selectedLegType, availableCombinations])

  // Auto-adjust selectedTableTop if current selection is invalid
  useEffect(() => {
    if (activeModel && validTableTops.length > 0 && selectedTableTop && !validTableTops.includes(selectedTableTop)) {
      setSelectedTableTop(validTableTops[0])
    }
  }, [activeModel, validTableTops, selectedTableTop])

  // Compute valid options for Dimensions based on selected Leg Type & Table Top
  const validDimensions = useMemo(() => {
    if (!activeModel) return []
    const validSet = new Set<string>()
    availableCombinations.forEach((c) => {
      const matchLeg = !selectedLegType || !c.legType || c.legType === selectedLegType
      const matchTop = !selectedTableTop || !c.tableTopFinish || c.tableTopFinish === selectedTableTop
      if (matchLeg && matchTop && c.dimensions) {
        validSet.add(c.dimensions)
      }
    })
    return Array.from(validSet).sort()
  }, [activeModel, selectedLegType, selectedTableTop, availableCombinations])

  // Auto-adjust selectedDimension if current selection is invalid
  useEffect(() => {
    if (activeModel && validDimensions.length > 0 && selectedDimension && !validDimensions.includes(selectedDimension)) {
      setSelectedDimension(validDimensions[0])
    }
  }, [activeModel, validDimensions, selectedDimension])

  // Locate matching combination in local matrix
  const matchedCombination = useMemo(() => {
    if (!activeModel || availableCombinations.length === 0) return null
    return (
      availableCombinations.find((c) => {
        const matchLeg = !selectedLegType || c.legType === selectedLegType
        const matchTop = !selectedTableTop || c.tableTopFinish === selectedTableTop
        const matchDim = !selectedDimension || c.dimensions === selectedDimension
        const matchStore = !selectedStorage || c.storageOptions === selectedStorage
        const matchFinish = !selectedFinish || c.finishMaterial === selectedFinish
        return matchLeg && matchTop && matchDim && matchStore && matchFinish
      }) || null
    )
  }, [
    activeModel,
    availableCombinations,
    selectedLegType,
    selectedTableTop,
    selectedDimension,
    selectedStorage,
    selectedFinish,
  ])

  // Fetch full details of matched variant SKU
  useEffect(() => {
    if (!matchedCombination) {
      setMatchedProduct(null)
      return
    }

    let isMounted = true
    setFetchingVariant(true)

    fetch("/api/products/configurator/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variantId: matchedCombination.id,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.product) {
          setMatchedProduct(data.product)
        }
      })
      .catch((err) => {
        console.error("Failed to fetch variant details:", err)
      })
      .finally(() => {
        if (isMounted) setFetchingVariant(false)
      })

    return () => {
      isMounted = false
    }
  }, [matchedCombination])

  // Resolved Price for segment
  const resolvedPrice = useMemo(() => {
    if (!matchedProduct) return 0
    if (watchSegment === "Interior") return matchedProduct.interiorPrice ?? matchedProduct.unitPrice
    if (watchSegment === "Dealer") return matchedProduct.dealerPrice ?? matchedProduct.unitPrice
    if (watchSegment === "Project") return matchedProduct.projectPrice ?? matchedProduct.unitPrice
    if (watchSegment === "Special") return matchedProduct.specialPrice ?? matchedProduct.unitPrice
    return matchedProduct.unitPrice || 0
  }, [matchedProduct, watchSegment])

  if (loadingModels) {
    return (
      <div className="p-8 text-center space-y-3 bg-card border rounded-xl shadow-2xs">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-xs text-muted-foreground font-medium">Loading Workstation Configurator...</p>
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className="p-6 text-center space-y-2 bg-card border rounded-xl">
        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
        <h4 className="text-sm font-bold text-foreground">No Workstation Models Found</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          No workstation product models with configurable attributes exist in the product catalog.
        </p>
      </div>
    )
  }

  return (
    <Card className="border border-primary/30 bg-card shadow-md rounded-xl overflow-hidden animate-in fade-in duration-200">
      {/* Header Bar */}
      <CardHeader className="bg-primary/5 border-b py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Workstation Attribute Configurator
        </CardTitle>
        <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold bg-background">
          Segment: {watchSegment}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Step 1: Model Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            Step 1: Select Workstation Model
          </label>
          <Select value={selectedModelName} onValueChange={(val) => setSelectedModelName(val || "")}>
            <SelectTrigger className="h-10 text-xs sm:text-sm font-medium bg-background border-border/80">
              <SelectValue placeholder="Select Workstation Model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.modelName} value={m.modelName} className="text-xs font-medium cursor-pointer">
                  {m.modelName} <span className="text-[10px] text-muted-foreground">({m.categoryName})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 2: Attribute Dropdowns & Live Validation Grid */}
        {activeModel && (
          <div className="space-y-3 pt-1 border-t border-border/60">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Step 2: Configure Attributes
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Leg Type Selector */}
              {activeModel.legTypes.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Leg Type</span>
                  <Select value={selectedLegType} onValueChange={(val) => setSelectedLegType(val || "")}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Select Leg Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeModel.legTypes.map((leg) => (
                        <SelectItem key={leg} value={leg} className="text-xs">
                          {leg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Table Top Finish Selector */}
              {activeModel.tableTopFinishes.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Table Top Finish</span>
                  <Select value={selectedTableTop} onValueChange={(val) => setSelectedTableTop(val || "")}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Select Table Top" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeModel.tableTopFinishes.map((top) => {
                        const isAvailable = validTableTops.includes(top)
                        return (
                          <SelectItem
                            key={top}
                            value={top}
                            disabled={!isAvailable}
                            className={cn("text-xs", !isAvailable && "opacity-40 italic")}
                          >
                            {top} {!isAvailable && "(N/A)"}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Dimensions Selector */}
              {activeModel.dimensions.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Dimension</span>
                  <Select value={selectedDimension} onValueChange={(val) => setSelectedDimension(val || "")}>
                    <SelectTrigger className="h-9 text-xs bg-background font-mono">
                      <SelectValue placeholder="Select Dimension" />
                    </SelectTrigger>
                    <SelectContent font-mono>
                      {activeModel.dimensions.map((dim) => {
                        const isAvailable = validDimensions.includes(dim)
                        return (
                          <SelectItem
                            key={dim}
                            value={dim}
                            disabled={!isAvailable}
                            className={cn("text-xs font-mono", !isAvailable && "opacity-40 italic")}
                          >
                            {dim} {!isAvailable && "(N/A)"}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Storage Options Selector (Optional) */}
              {activeModel.storageOptions.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Storage Options</span>
                  <Select value={selectedStorage} onValueChange={(val) => setSelectedStorage(val || "")}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Select Storage" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeModel.storageOptions.map((st) => (
                        <SelectItem key={st} value={st} className="text-xs">
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Finish Material Selector (Optional) */}
              {activeModel.finishMaterials.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Finish Material</span>
                  <Select value={selectedFinish} onValueChange={(val) => setSelectedFinish(val || "")}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Select Finish" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeModel.finishMaterials.map((fm) => (
                        <SelectItem key={fm} value={fm} className="text-xs">
                          {fm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Preview Card */}
        <div className="pt-2">
          {!matchedCombination ? (
            <div className="p-4 border border-dashed rounded-xl bg-amber-500/10 border-amber-500/40 text-center space-y-1">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mx-auto" />
              <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300">Combination Not Available</h5>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                No active variant SKU matches this exact combination of attributes. Please select a valid combination above.
              </p>
            </div>
          ) : fetchingVariant ? (
            <div className="p-6 border rounded-xl bg-muted/20 text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Loading variant details...</p>
            </div>
          ) : matchedProduct ? (
            <div className="p-4 border rounded-xl bg-muted/20 space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* Image Preview */}
                <div className="h-24 w-24 shrink-0 border rounded-lg overflow-hidden bg-card shadow-2xs flex items-center justify-center">
                  {matchedProduct.imageUrl ? (
                    <img
                      src={matchedProduct.imageUrl}
                      alt={matchedProduct.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-[10px] text-muted-foreground text-center px-2">No Image</div>
                  )}
                </div>

                {/* Details Stack */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-foreground line-clamp-1">
                      {matchedProduct.productName}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px] font-bold bg-background">
                      SKU: {matchedProduct.productCode}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {matchedProduct.dimensions && (
                      <span className="font-mono bg-background border px-1.5 py-0.5 rounded text-[10px]">
                        Dim: {matchedProduct.dimensions}
                      </span>
                    )}
                    {matchedProduct.stock !== undefined && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] font-semibold py-0",
                          matchedProduct.stock > 0
                            ? "bg-green-500/10 text-green-700 border-green-200"
                            : "bg-red-500/10 text-red-700 border-red-200"
                        )}
                      >
                        {matchedProduct.stock > 0 ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {matchedProduct.stock > 0 ? `In Stock (${matchedProduct.stock} units)` : "Out of Stock"}
                      </Badge>
                    )}
                  </div>

                  {matchedProduct.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {matchedProduct.description}
                    </p>
                  )}

                  <div className="text-sm font-black text-primary pt-1">
                    {watchSegment} Price: AED {resolvedPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>

      {/* Footer Actions */}
      <CardFooter className="bg-muted/30 border-t py-3 px-4 flex items-center justify-between gap-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} className="text-xs h-9 cursor-pointer">
            Cancel
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={!matchedProduct}
          onClick={() => {
            if (matchedProduct) {
              onSelectVariant(matchedProduct)
              toast.success(`Added configured product "${matchedProduct.productCode}" to quotation!`)
            }
          }}
          className="ml-auto text-xs h-9 px-5 font-bold flex items-center gap-1.5 cursor-pointer shadow-md bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span>Add to Quotation</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
