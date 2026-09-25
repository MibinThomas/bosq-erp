"use client"

import React, { useState, useEffect, useMemo } from "react"
import { 
  SlidersHorizontal, 
  Check, 
  Plus,
  AlertTriangle, 
  Package, 
  Loader2, 
  Layers, 
  CheckCircle2, 
  XCircle,
  Tag,
  Palette,
  Armchair,
  ShieldCheck,
  Ruler,
  Box,
  RotateCcw,
  Building2,
  Copy,
  Edit3,
  Grid,
  LayoutGrid,
  ChevronsUpDown,
  SearchX,
  Sparkles,
  Filter,
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { toast } from "sonner"
import { cn, safeCopyToClipboard, formatImageUrl } from "@/lib/utils"

export interface ConfiguratorCategory {
  id: string
  name: string
  modelCount: number
}

export const MAIN_CONFIGURATOR_CATEGORIES = [
  { id: "ALL", name: "Select Category", subLabel: "All Categories", matchKeys: [] },
  { id: "Chair", name: "Chair", subLabel: "Chairs & Seating", matchKeys: ["chair", "seating", "executive chair", "ergonomic chair", "task chair"] },
  { id: "Workstations", name: "Workstations", subLabel: "Desks & Tables", matchKeys: ["workstation", "desk", "table", "height adjustable", "conference"] },
  { id: "Storage", name: "Storage", subLabel: "Storage Solutions", matchKeys: ["storage", "cabinet", "pedestal", "locker", "credenza"] },
  { id: "Accessories", name: "Accessories", subLabel: "Add-ons & Power", matchKeys: ["accessory", "accessories", "monitor arm", "cable"] },
  { id: "Others", name: "Others", subLabel: "Other Products", matchKeys: ["other", "general"] },
]

export interface WorkstationModel {
  seriesName?: string
  modelName: string
  categoryId: string
  categoryName: string
  attributes?: Record<string, string[]>
  colors: string[]
  chairTypes: string[]
  legTypes: string[]
  tableTopFinishes: string[]
  dimensions: string[]
  storageOptions: string[]
  finishMaterials: string[]
  warranties: string[]
  combinations: Array<{
    id: string
    sku: string
    productName: string
    attributes?: Record<string, string>
    color: string | null
    chairType: string | null
    legType: string | null
    tableTopFinish: string | null
    dimensions: string | null
    storageOptions: string | null
    finishMaterial: string | null
    warranty: string | null
  }>
}

interface WorkstationConfiguratorProps {
  watchSegment?: string
  onSelectVariant: (product: any) => void
  onCancel?: () => void
}

export interface ConfiguratorDropdownOption {
  value: string
  label: string
  subLabel?: string
  group?: string
  icon?: React.ReactNode
}

interface ConfiguratorDropdownProps {
  options: (ConfiguratorDropdownOption | string)[]
  value: string
  onValueChange: (val: string) => void
  placeholder?: string
  searchPlaceholder?: string
  icon?: React.ReactNode
  badgeCount?: number
  isMono?: boolean
  className?: string
  disabled?: boolean
}

export function ConfiguratorDropdown({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search options...",
  icon,
  badgeCount,
  isMono = false,
  className,
  disabled = false,
}: ConfiguratorDropdownProps) {
  const [open, setOpen] = useState(false)

  const normalizedOptions: ConfiguratorDropdownOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt }
      }
      return opt
    })
  }, [options])

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value) || null
  }, [normalizedOptions, value])

  const groups = useMemo(() => {
    const map = new Map<string, ConfiguratorDropdownOption[]>()
    let hasGroups = false
    normalizedOptions.forEach((opt) => {
      if (opt.group) {
        hasGroups = true
        const groupName = opt.group
        if (!map.has(groupName)) map.set(groupName, [])
        map.get(groupName)!.push(opt)
      } else {
        const defaultGroup = "Options"
        if (!map.has(defaultGroup)) map.set(defaultGroup, [])
        map.get(defaultGroup)!.push(opt)
      }
    })
    return { map, hasGroups }
  }, [normalizedOptions])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "w-full h-9 px-3 text-xs font-medium rounded-lg border bg-background border-border/80 shadow-2xs hover:border-orange-500/50 hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-orange-500 flex items-center justify-between gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          isMono && "font-mono",
          className
        )}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
          {selectedOption ? (
            <div className="flex items-center gap-1.5 truncate min-w-0">
              <span className="truncate text-foreground font-semibold">{selectedOption.label}</span>
              {selectedOption.subLabel && (
                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.2 rounded truncate shrink-0">
                  {selectedOption.subLabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground font-normal truncate">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {badgeCount !== undefined && badgeCount > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-medium">
              {badgeCount}
            </span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60" />
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] min-w-[220px] max-w-[400px] p-0 rounded-xl shadow-xl border border-border bg-card text-card-foreground z-[65]"
      >
        <Command
          filter={(val, search) => {
            if (val.toLowerCase().includes(search.toLowerCase())) return 1
            return 0
          }}
        >
          {normalizedOptions.length > 4 && (
            <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs px-3" />
          )}
          <CommandList className="max-h-60 overflow-y-auto p-1 space-y-0.5 no-scrollbar">
            <CommandEmpty className="p-3 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1">
              <SearchX className="h-4 w-4 text-muted-foreground/60" />
              <span>No matching options</span>
            </CommandEmpty>

            {groups.hasGroups ? (
              Array.from(groups.map.entries()).map(([groupName, groupOpts]) => (
                <CommandGroup
                  key={groupName}
                  heading={`${groupName} (${groupOpts.length})`}
                  className="[&_[data-slot=command-group-heading]]:text-[10px] [&_[data-slot=command-group-heading]]:font-semibold [&_[data-slot=command-group-heading]]:uppercase [&_[data-slot=command-group-heading]]:tracking-wider [&_[data-slot=command-group-heading]]:text-muted-foreground [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:py-1"
                >
                  {groupOpts.map((opt) => {
                    const isSelected = opt.value === value
                    return (
                      <CommandItem
                        key={opt.value}
                        value={`${groupName} ${opt.label} ${opt.subLabel || ''} ${opt.value}`}
                        onSelect={() => {
                          onValueChange(opt.value)
                          setOpen(false)
                        }}
                        className={cn(
                          "px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer my-0.5",
                          isSelected
                            ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                          <span className={cn("truncate", isMono && "font-mono")}>{opt.label}</span>
                          {opt.subLabel && (
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.2 rounded truncate">
                              {opt.subLabel}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-orange-400 font-bold" />}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))
            ) : (
              <CommandGroup>
                {normalizedOptions.map((opt) => {
                  const isSelected = opt.value === value
                  return (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.subLabel || ''} ${opt.value}`}
                      onSelect={() => {
                        onValueChange(opt.value)
                        setOpen(false)
                      }}
                      className={cn(
                        "px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer my-0.5",
                        isSelected
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <span className={cn("truncate", isMono && "font-mono")}>{opt.label}</span>
                        {opt.subLabel && (
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.2 rounded truncate">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-orange-400 font-bold" />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Icon helper for dynamic attribute labels
const getAttributeIcon = (name: string) => {
  const lower = name.toLowerCase()
  if (lower.includes("color") || lower.includes("finish")) return <Palette className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("dimension") || lower.includes("size")) return <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("leg") || lower.includes("base") || lower.includes("frame")) return <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("chair") || lower.includes("back") || lower.includes("seat") || lower.includes("arm") || lower.includes("headrest")) return <Armchair className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("top") || lower.includes("surface") || lower.includes("table")) return <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("storage") || lower.includes("drawer") || lower.includes("pedestal") || lower.includes("lock") || lower.includes("handle")) return <Box className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("warranty")) return <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
  if (lower.includes("material") || lower.includes("upholstery") || lower.includes("fabric")) return <Tag className="h-3.5 w-3.5 text-muted-foreground" />
  return <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
}

export function WorkstationConfigurator({
  watchSegment = "Project",
  onSelectVariant,
  onCancel,
}: WorkstationConfiguratorProps) {
  const [categories, setCategories] = useState<ConfiguratorCategory[]>([])
  const [models, setModels] = useState<WorkstationModel[]>([])
  const [loadingModels, setLoadingModels] = useState(true)

  // Category Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [selectedSeries, setSelectedSeries] = useState<string>("")
  const [selectedModelName, setSelectedModelName] = useState<string>("")

  // Dynamic Selected Attributes State Map: { [attributeName]: selectedValue }
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string>>({})
  // Dynamic Custom Input Toggles: { [attributeName]: boolean }
  const [customInputModes, setCustomInputModes] = useState<Record<string, boolean>>({})

  // Matched Variant state from API
  const [fetchingVariant, setFetchingVariant] = useState(false)
  const [matchedProduct, setMatchedProduct] = useState<any>(null)
  const [copiedSku, setCopiedSku] = useState(false)

  // Fetch product configurator metadata
  useEffect(() => {
    let isMounted = true
    setLoadingModels(true)
    fetch("/api/products/configurator")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          if (Array.isArray(data.categories)) {
            setCategories(data.categories)
          }
          if (Array.isArray(data.models)) {
            setModels(data.models)
            if (data.models.length > 0) {
              const firstSeries = data.models[0].seriesName || data.models[0].categoryName || "General Catalog"
              setSelectedSeries(firstSeries)
              setSelectedModelName(data.models[0].modelName)
            }
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load product models:", err)
        toast.error("Failed to load product models for configurator")
      })
      .finally(() => {
        if (isMounted) setLoadingModels(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Models filtered by selected Category
  const categoryFilteredModels = useMemo(() => {
    if (!selectedCategory || selectedCategory === "ALL") return models

    const mainCat = MAIN_CONFIGURATOR_CATEGORIES.find((c) => c.id === selectedCategory || c.name === selectedCategory)

    return models.filter((m) => {
      // Direct ID or Exact Name Match
      if (m.categoryId === selectedCategory || m.categoryName.toLowerCase() === selectedCategory.toLowerCase()) {
        return true
      }
      // Main Category Match Keys
      if (mainCat && mainCat.matchKeys.length > 0) {
        const catLower = (m.categoryName || "").toLowerCase()
        const modelLower = (m.modelName || "").toLowerCase()
        return mainCat.matchKeys.some((k) => catLower.includes(k) || modelLower.includes(k))
      }
      return false
    })
  }, [models, selectedCategory])

  // Derived Series List (Level 1) within selected category
  const seriesList = useMemo(() => {
    const set = new Set<string>()
    categoryFilteredModels.forEach((m) => {
      set.add(m.seriesName || m.categoryName || "General Catalog")
    })
    return Array.from(set).sort()
  }, [categoryFilteredModels])

  // Sub-Products available under selected Series (Level 2)
  const availableSubProducts = useMemo(() => {
    if (!selectedSeries) return categoryFilteredModels
    const filtered = categoryFilteredModels.filter(
      (m) => (m.seriesName || m.categoryName || "General Catalog") === selectedSeries
    )
    return filtered.length > 0 ? filtered : categoryFilteredModels
  }, [categoryFilteredModels, selectedSeries])

  // Active Sub-Product Model object
  const activeModel = useMemo(() => {
    if (availableSubProducts.length === 0) return null
    if (!selectedModelName) return availableSubProducts[0]
    return (
      availableSubProducts.find((m) => m.modelName === selectedModelName) ||
      availableSubProducts[0]
    )
  }, [availableSubProducts, selectedModelName])

  // Dynamic attributes dictionary for active model
  const activeModelAttributes = useMemo(() => {
    if (!activeModel || !activeModel.attributes) return {}
    return activeModel.attributes
  }, [activeModel])

  const activeAttributeKeys = useMemo(() => {
    return Object.keys(activeModelAttributes)
  }, [activeModelAttributes])

  // Handle Category Pill Change
  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId)
    const filtered = catId === "ALL"
      ? models
      : models.filter((m) => m.categoryId === catId || m.categoryName.toLowerCase() === catId.toLowerCase())
    
    if (filtered.length > 0) {
      const firstSeries = filtered[0].seriesName || filtered[0].categoryName || "General Catalog"
      setSelectedSeries(firstSeries)
      setSelectedModelName(filtered[0].modelName)
    } else {
      setSelectedSeries("")
      setSelectedModelName("")
    }
  }

  // Handle Main Series change
  const handleSeriesChange = (val: string) => {
    const newSeries = val || ""
    setSelectedSeries(newSeries)
    const subs = categoryFilteredModels.filter(
      (m) => (m.seriesName || m.categoryName || "General Catalog") === newSeries
    )
    if (subs.length > 0) {
      setSelectedModelName(subs[0].modelName)
    } else {
      setSelectedModelName("")
    }
  }

  // Handle Sub-Product model change
  const handleModelChange = (val: string) => {
    setSelectedModelName(val || "")
  }

  // Reset attributes to default options when model changes
  const resetToDefaults = () => {
    setCustomInputModes({})
    if (activeModel && activeModel.attributes) {
      const initialMap: Record<string, string> = {}
      for (const [attrKey, opts] of Object.entries(activeModel.attributes)) {
        if (opts.length > 0) {
          initialMap[attrKey] = opts[0]
        }
      }
      setSelectedAttributeValues(initialMap)
    } else {
      setSelectedAttributeValues({})
    }
  }

  useEffect(() => {
    resetToDefaults()
  }, [activeModel?.modelName])

  // Helper to filter valid combinations excluding target attribute for dynamic option updating
  const getValidCombinationsExcluding = (targetAttr: string) => {
    if (!activeModel) return []
    return activeModel.combinations.filter((c) => {
      for (const [attrKey, selectedVal] of Object.entries(selectedAttributeValues)) {
        if (attrKey === targetAttr) continue
        if (customInputModes[attrKey]) continue
        if (!selectedVal) continue

        // Check combination's attribute map or fallback fields
        const cVal = c.attributes?.[attrKey] || (c as any)[attrKey]
        if (cVal && cVal !== selectedVal) return false
      }
      return true
    })
  }

  // Compute dynamic options for a specific attribute key
  const getDynamicOptionsForAttribute = (attrKey: string, presetOpts: string[]) => {
    if (!activeModel) return presetOpts
    const validCombs = getValidCombinationsExcluding(attrKey)
    const set = new Set<string>()
    validCombs.forEach((c) => {
      const val = c.attributes?.[attrKey] || (c as any)[attrKey]
      if (val) set.add(val)
    })
    const res = Array.from(set).sort()
    return res.length > 0 ? res : presetOpts
  }

  // Handle single attribute selection
  const handleAttributeChange = (attrKey: string, value: string) => {
    setSelectedAttributeValues((prev) => ({
      ...prev,
      [attrKey]: value,
    }))
  }

  // Handle custom mode toggle for attribute
  const toggleCustomMode = (attrKey: string) => {
    setCustomInputModes((prev) => ({
      ...prev,
      [attrKey]: !prev[attrKey],
    }))
  }

  // Dropdown options for Category, Series and Model
  const categoryDropdownOptions = useMemo(() => {
    return MAIN_CONFIGURATOR_CATEGORIES.map((cat) => {
      const isAll = cat.id === "ALL"
      let count = models.length
      if (!isAll) {
        count = models.filter((m) => {
          if (m.categoryId === cat.id || m.categoryName.toLowerCase() === cat.name.toLowerCase()) return true
          const catLower = (m.categoryName || "").toLowerCase()
          const modelLower = (m.modelName || "").toLowerCase()
          return cat.matchKeys.some((k) => catLower.includes(k) || modelLower.includes(k))
        }).length
      }

      return {
        value: cat.id,
        label: cat.name,
        subLabel: `${count} models`,
        icon: isAll ? <Layers className="h-3.5 w-3.5 text-orange-500" /> : <Tag className="h-3.5 w-3.5 text-muted-foreground" />,
      }
    })
  }, [models])

  const seriesDropdownOptions = useMemo(() => {
    return seriesList.map((s) => ({
      value: s,
      label: s,
    }))
  }, [seriesList])

  const subProductDropdownOptions = useMemo(() => {
    return availableSubProducts.map((m) => ({
      value: m.modelName,
      label: m.modelName,
      subLabel: m.categoryName,
      group: m.categoryName || "Catalog",
    }))
  }, [availableSubProducts])

  // Locate matching combination in local matrix
  const matchedCombination = useMemo(() => {
    if (!activeModel || activeModel.combinations.length === 0) return null
    return (
      activeModel.combinations.find((c) => {
        for (const [attrKey, selectedVal] of Object.entries(selectedAttributeValues)) {
          if (customInputModes[attrKey]) continue
          if (!selectedVal) continue
          const cVal = c.attributes?.[attrKey] || (c as any)[attrKey]
          if (cVal && cVal !== selectedVal) return false
        }
        return true
      }) || activeModel.combinations[0] || null
    )
  }, [activeModel, selectedAttributeValues, customInputModes])

  // Fetch full details of matched variant SKU from API
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

  // Compute live active product payload (supporting custom attribute overrides)
  const activeProductPayload = useMemo(() => {
    if (!activeModel && !matchedProduct) return null

    const hasAnyCustom = Object.values(customInputModes).some(Boolean)

    const base = matchedProduct || {
      id: activeModel?.combinations[0]?.id || "custom-variant",
      productName: activeModel?.modelName || "Product",
      productCode: activeModel?.combinations[0]?.sku || "CUSTOM-SKU",
      unitPrice: 0,
      projectPrice: 0,
      dealerPrice: 0,
      interiorPrice: 0,
      specialPrice: 0,
      stock: 1,
    }

    // Build custom dynamic product title incorporating key active attributes
    let dynamicTitle = activeModel?.modelName || base.productName
    const colorAttr = selectedAttributeValues["Color / Finish"] || selectedAttributeValues["Seat Color"] || selectedAttributeValues["Table Top Color"] || selectedAttributeValues["Storage Finish Color"]
    const dimAttr = selectedAttributeValues["Dimension"] || selectedAttributeValues["Table Dimensions"] || selectedAttributeValues["Storage Dimensions"]

    if (dimAttr) dynamicTitle += ` ${dimAttr}`
    if (colorAttr) dynamicTitle += ` - ${colorAttr}`

    return {
      ...base,
      productName: hasAnyCustom ? dynamicTitle : base.productName,
      productCode: hasAnyCustom ? `${base.productCode || "SKU"}-CUSTOM` : base.productCode,
      configuredAttributes: selectedAttributeValues,
      dimensions: dimAttr || base.dimensions,
      availableColors: colorAttr || base.availableColors,
      isCustom: hasAnyCustom,
    }
  }, [matchedProduct, activeModel, selectedAttributeValues, customInputModes])

  // Resolved Price for segment
  const resolvedPrice = useMemo(() => {
    if (!activeProductPayload) return 0
    if (watchSegment === "Interior") return activeProductPayload.interiorPrice ?? activeProductPayload.unitPrice
    if (watchSegment === "Dealer") return activeProductPayload.dealerPrice ?? activeProductPayload.unitPrice
    if (watchSegment === "Project") return activeProductPayload.projectPrice ?? activeProductPayload.unitPrice
    if (watchSegment === "Special") return activeProductPayload.specialPrice ?? activeProductPayload.unitPrice
    return activeProductPayload.unitPrice || 0
  }, [activeProductPayload, watchSegment])

  const copyToClipboard = async (text: string) => {
    await safeCopyToClipboard(text)
    setCopiedSku(true)
    toast.success("SKU copied to clipboard!")
    setTimeout(() => setCopiedSku(false), 2000)
  }

  if (loadingModels) {
    return (
      <Card className="border border-border bg-card shadow-xs rounded-xl p-8 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">Loading Category Configurator Catalog</h4>
          <p className="text-xs text-muted-foreground">Fetching categories, series, and attribute matrices...</p>
        </div>
      </Card>
    )
  }

  if (models.length === 0) {
    return (
      <Card className="border border-border bg-card shadow-xs rounded-xl p-6 text-center space-y-2">
        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
        <h4 className="text-sm font-semibold text-foreground">No Catalog Models Found</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          No configurable product models exist in the catalog.
        </p>
      </Card>
    )
  }

  return (
    <Card className="border border-border bg-card shadow-xs rounded-xl overflow-hidden">
      {/* Category-Driven Header Bar */}
      <CardHeader className="bg-muted/30 border-b border-border/70 py-3 px-4 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              Category-Based Product Configurator
            </CardTitle>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {activeAttributeKeys.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
              className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
              title="Reset attributes to defaults"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          )}

          <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold bg-background text-foreground">
            Segment: {watchSegment}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* 2-Column Responsive Layout: Left Configurator Form (7 cols) + Right Dedicated Preview Panel (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: Configurator Inputs & Attributes (7/12 cols) */}
          <div className="lg:col-span-7 space-y-5">

            {/* Product Selection Box: Category -> Series -> Sub-Product Model */}
            <div className="space-y-3 bg-muted/20 border border-border/60 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="h-3 w-3 text-orange-500" /> Product Selection
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {categoryFilteredModels.length} models available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Category Dropdown Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground block">
                    Product Category
                  </label>
                  <ConfiguratorDropdown
                    options={categoryDropdownOptions}
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                    placeholder="Select Category"
                    searchPlaceholder="Search category..."
                    icon={<Tag className="h-3.5 w-3.5" />}
                  />
                </div>

                {/* 2. Main Series Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground block">
                    Product Series
                  </label>
                  <ConfiguratorDropdown
                    options={seriesDropdownOptions}
                    value={selectedSeries}
                    onValueChange={handleSeriesChange}
                    placeholder="Select Series"
                    searchPlaceholder="Search series..."
                    icon={<Building2 className="h-3.5 w-3.5" />}
                  />
                </div>

                {/* 3. Sub-Product / Model Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground block">
                    Sub-Product Model
                  </label>
                  <ConfiguratorDropdown
                    options={subProductDropdownOptions}
                    value={selectedModelName}
                    onValueChange={handleModelChange}
                    placeholder="Select Model"
                    searchPlaceholder="Search models..."
                    icon={<Package className="h-3.5 w-3.5" />}
                  />
                </div>
              </div>
            </div>

            {/* DYNAMIC ATTRIBUTE CONFIGURATION FORM */}
            {activeModel && (
              <>
                {activeAttributeKeys.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Specifications & Attributes
                      </span>
                      <span className="text-[10px] text-muted-foreground italic">
                        Tap &quot;Custom&quot; to type non-standard values
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {activeAttributeKeys.map((attrKey) => {
                        const presetOpts = activeModelAttributes[attrKey] || []
                        const dynamicOpts = getDynamicOptionsForAttribute(attrKey, presetOpts)
                        const isCustom = customInputModes[attrKey] || false
                        const currentVal = selectedAttributeValues[attrKey] || ""

                        return (
                          <div key={attrKey} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                                {getAttributeIcon(attrKey)}
                                <span className="truncate">{attrKey}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleCustomMode(attrKey)}
                                className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-1"
                              >
                                {isCustom ? <RotateCcw className="h-2.5 w-2.5" /> : <Edit3 className="h-2.5 w-2.5" />}
                                {isCustom ? "Preset List" : "Custom"}
                              </button>
                            </div>

                            {isCustom ? (
                              <Input
                                value={currentVal}
                                onChange={(e) => handleAttributeChange(attrKey, e.target.value)}
                                placeholder={`Custom ${attrKey}...`}
                                className="h-9 text-xs bg-background"
                              />
                            ) : (
                              <ConfiguratorDropdown
                                options={dynamicOpts}
                                value={currentVal}
                                onValueChange={(val) => handleAttributeChange(attrKey, val)}
                                placeholder={`Select ${attrKey}`}
                                searchPlaceholder={`Search ${attrKey}...`}
                                icon={getAttributeIcon(attrKey)}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  /* Clean Notification Box when Product Model has 0 Configurable Attributes */
                  <div className="p-4 border border-border/80 rounded-xl bg-muted/20 flex items-start space-x-3">
                    <Info className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-foreground">Standard Product Model</h5>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This selected product model has no customizable attribute fields. You can review specifications on the preview panel and add it directly to your quotation.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT COLUMN: Dedicated Product Preview Panel (5/12 cols) */}
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-border/80 pt-5 lg:pt-0 lg:pl-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-orange-500" /> Live Product Preview
              </span>
              {activeProductPayload?.isCustom && (
                <Badge variant="outline" className="text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30">
                  Custom Configured
                </Badge>
              )}
            </div>

            {fetchingVariant ? (
              <div className="p-8 border border-border/80 rounded-xl bg-muted/20 text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500 mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">Updating product preview...</p>
              </div>
            ) : activeProductPayload ? (
              <div className="space-y-4">
                {/* Image Preview Box */}
                <div className="h-44 w-full border border-border/80 rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center relative group shadow-2xs">
                  {activeProductPayload.imageUrl ? (
                    <img
                      src={formatImageUrl(activeProductPayload.imageUrl) || activeProductPayload.imageUrl}
                      alt={activeProductPayload.productName}
                      className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1.5 text-muted-foreground/60 p-4 text-center">
                      <Package className="h-10 w-10 stroke-1" />
                      <span className="text-xs font-medium">No Image Preview Available</span>
                    </div>
                  )}
                </div>

                {/* Product Title & Identifiers */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug">
                    {activeProductPayload.productName}
                  </h4>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <Badge
                      variant="outline"
                      onClick={() => copyToClipboard(activeProductPayload.productCode)}
                      className="font-mono text-[10px] font-bold bg-muted text-foreground border-border px-2 py-0.5 cursor-pointer hover:bg-muted/80 flex items-center gap-1"
                      title="Click to copy SKU"
                    >
                      <span>SKU: {activeProductPayload.productCode}</span>
                      {copiedSku ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Badge>

                    {activeProductPayload.stock !== undefined && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] font-bold py-0.5 px-2 flex items-center gap-1",
                          activeProductPayload.stock > 0
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                        )}
                      >
                        {activeProductPayload.stock > 0 ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                        ) : (
                          <XCircle className="h-3 w-3 shrink-0" />
                        )}
                        {activeProductPayload.stock > 0 ? `In Stock (${activeProductPayload.stock})` : "Out of Stock"}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Detailed Active Specifications List */}
                {Object.keys(selectedAttributeValues).length > 0 && (
                  <div className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block border-b border-border/40 pb-1">
                      Selected Specifications
                    </span>
                    <div className="space-y-1 text-xs">
                      {Object.entries(selectedAttributeValues).map(([attrKey, val]) => (
                        <div key={attrKey} className="flex justify-between items-center">
                          <span className="text-muted-foreground">{attrKey}:</span>
                          <span className="font-semibold text-foreground">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Display & Add CTA */}
                <div className="pt-2 space-y-3">
                  <div className="flex items-center justify-between border-t border-border/70 pt-3">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Unit Price ({watchSegment}):
                    </span>
                    <span className="text-lg font-extrabold font-mono text-orange-600 dark:text-orange-400">
                      AED {resolvedPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {onCancel && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                        className="text-xs h-9 cursor-pointer"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      disabled={!activeProductPayload}
                      onClick={() => {
                        if (activeProductPayload) {
                          onSelectVariant(activeProductPayload)
                          toast.success(`Added product "${activeProductPayload.productName}" to quotation!`)
                        }
                      }}
                      className="w-full text-xs h-10 font-bold bg-orange-600 hover:bg-orange-500 text-white cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add to Quotation</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
