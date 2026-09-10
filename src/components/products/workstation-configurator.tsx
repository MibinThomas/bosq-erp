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
  ChevronsUpDown,
  SearchX,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { toast } from "sonner"
import { cn, safeCopyToClipboard } from "@/lib/utils"

export interface WorkstationModel {
  seriesName?: string
  modelName: string
  categoryId: string
  categoryName: string
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

export function WorkstationConfigurator({
  watchSegment = "Project",
  onSelectVariant,
  onCancel,
}: WorkstationConfiguratorProps) {
  const [models, setModels] = useState<WorkstationModel[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [selectedSeries, setSelectedSeries] = useState<string>("")
  const [selectedModelName, setSelectedModelName] = useState<string>("")

  // Attribute selections
  const [selectedColor, setSelectedColor] = useState<string>("")
  const [selectedChairType, setSelectedChairType] = useState<string>("")
  const [selectedLegType, setSelectedLegType] = useState<string>("")
  const [selectedTableTop, setSelectedTableTop] = useState<string>("")
  const [selectedDimension, setSelectedDimension] = useState<string>("")
  const [selectedStorage, setSelectedStorage] = useState<string>("")
  const [selectedFinish, setSelectedFinish] = useState<string>("")
  const [selectedWarranty, setSelectedWarranty] = useState<string>("")

  // Inline Custom Input Mode toggles
  const [isCustomDimension, setIsCustomDimension] = useState<boolean>(false)
  const [isCustomColor, setIsCustomColor] = useState<boolean>(false)
  const [isCustomLegType, setIsCustomLegType] = useState<boolean>(false)
  const [isCustomTableTop, setIsCustomTableTop] = useState<boolean>(false)
  const [isCustomChairType, setIsCustomChairType] = useState<boolean>(false)
  const [isCustomStorage, setIsCustomStorage] = useState<boolean>(false)
  const [isCustomFinish, setIsCustomFinish] = useState<boolean>(false)
  const [isCustomWarranty, setIsCustomWarranty] = useState<boolean>(false)

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
        if (isMounted && data.success && Array.isArray(data.models)) {
          setModels(data.models)
          if (data.models.length > 0) {
            const firstSeries = data.models[0].seriesName || data.models[0].categoryName || "General Catalog"
            setSelectedSeries(firstSeries)
            const firstSub = data.models.find(
              (m: WorkstationModel) => (m.seriesName || m.categoryName || "General Catalog") === firstSeries
            )
            if (firstSub) {
              setSelectedModelName(firstSub.modelName)
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

  // Derived Series List (Level 1)
  const seriesList = useMemo(() => {
    const set = new Set<string>()
    models.forEach((m) => {
      set.add(m.seriesName || m.categoryName || "General Catalog")
    })
    return Array.from(set).sort()
  }, [models])

  // Sub-Products available under selected Series (Level 2)
  const availableSubProducts = useMemo(() => {
    if (!selectedSeries) return models
    return models.filter(
      (m) => (m.seriesName || m.categoryName || "General Catalog") === selectedSeries
    )
  }, [models, selectedSeries])

  // Active Sub-Product Model object
  const activeModel = useMemo(() => {
    if (!selectedModelName) return availableSubProducts[0] || models[0] || null
    return (
      availableSubProducts.find((m) => m.modelName === selectedModelName) ||
      availableSubProducts[0] ||
      null
    )
  }, [availableSubProducts, models, selectedModelName])

  // Handle Main Series change
  const handleSeriesChange = (val: string) => {
    const newSeries = val || ""
    setSelectedSeries(newSeries)
    const subs = models.filter(
      (m) => (m.seriesName || m.categoryName || "General Catalog") === newSeries
    )
    if (subs.length > 0) {
      setSelectedModelName(subs[0].modelName)
    } else {
      setSelectedModelName("")
    }
  }

  // Handle Sub-Product change
  const handleModelChange = (val: string) => {
    setSelectedModelName(val || "")
  }

  // Helper to filter valid combinations for dynamic attribute options
  const getValidCombinationsExcluding = (excludeField: string) => {
    if (!activeModel) return []
    return activeModel.combinations.filter((c) => {
      if (excludeField !== "color" && !isCustomColor && selectedColor && c.color && c.color !== selectedColor) return false
      if (excludeField !== "chairType" && !isCustomChairType && selectedChairType && c.chairType && c.chairType !== selectedChairType) return false
      if (excludeField !== "legType" && !isCustomLegType && selectedLegType && c.legType && c.legType !== selectedLegType) return false
      if (excludeField !== "tableTop" && !isCustomTableTop && selectedTableTop && c.tableTopFinish && c.tableTopFinish !== selectedTableTop) return false
      if (excludeField !== "dimension" && !isCustomDimension && selectedDimension && c.dimensions && c.dimensions !== selectedDimension) return false
      if (excludeField !== "storage" && !isCustomStorage && selectedStorage && c.storageOptions && c.storageOptions !== selectedStorage) return false
      if (excludeField !== "finish" && !isCustomFinish && selectedFinish && c.finishMaterial && c.finishMaterial !== selectedFinish) return false
      if (excludeField !== "warranty" && !isCustomWarranty && selectedWarranty && c.warranty && c.warranty !== selectedWarranty) return false
      return true
    })
  }

  // Dynamic available attribute options
  const availableColors = useMemo(() => {
    if (!activeModel) return []
    const combinations = getValidCombinationsExcluding("color")
    const set = new Set<string>()
    combinations.forEach((c) => { if (c.color) set.add(c.color) })
    const res = Array.from(set).sort()
    return res.length > 0 ? res : activeModel.colors
  }, [activeModel, selectedChairType, selectedLegType, selectedTableTop, selectedDimension, selectedStorage, selectedFinish, selectedWarranty, isCustomColor, isCustomChairType, isCustomLegType, isCustomTableTop, isCustomDimension, isCustomStorage, isCustomFinish, isCustomWarranty])

  const availableChairTypes = useMemo(() => {
    if (!activeModel) return []
    const combinations = getValidCombinationsExcluding("chairType")
    const set = new Set<string>()
    combinations.forEach((c) => { if (c.chairType) set.add(c.chairType) })
    const res = Array.from(set).sort()
    return res.length > 0 ? res : activeModel.chairTypes
  }, [activeModel, selectedColor, selectedLegType, selectedTableTop, selectedDimension, selectedStorage, selectedFinish, selectedWarranty, isCustomColor, isCustomChairType, isCustomLegType, isCustomTableTop, isCustomDimension, isCustomStorage, isCustomFinish, isCustomWarranty])

  const availableLegTypes = useMemo(() => {
    if (!activeModel) return []
    const combinations = getValidCombinationsExcluding("legType")
    const set = new Set<string>()
    combinations.forEach((c) => { if (c.legType) set.add(c.legType) })
    const res = Array.from(set).sort()
    return res.length > 0 ? res : activeModel.legTypes
  }, [activeModel, selectedColor, selectedChairType, selectedTableTop, selectedDimension, selectedStorage, selectedFinish, selectedWarranty, isCustomColor, isCustomChairType, isCustomLegType, isCustomTableTop, isCustomDimension, isCustomStorage, isCustomFinish, isCustomWarranty])

  const availableTableTopFinishes = useMemo(() => {
    if (!activeModel) return []
    const combinations = getValidCombinationsExcluding("tableTop")
    const set = new Set<string>()
    combinations.forEach((c) => { if (c.tableTopFinish) set.add(c.tableTopFinish) })
    const res = Array.from(set).sort()
    return res.length > 0 ? res : activeModel.tableTopFinishes
  }, [activeModel, selectedColor, selectedChairType, selectedLegType, selectedDimension, selectedStorage, selectedFinish, selectedWarranty, isCustomColor, isCustomChairType, isCustomLegType, isCustomTableTop, isCustomDimension, isCustomStorage, isCustomFinish, isCustomWarranty])

  const availableDimensions = useMemo(() => {
    if (!activeModel) return []
    const combinations = getValidCombinationsExcluding("dimension")
    const set = new Set<string>()
    combinations.forEach((c) => { if (c.dimensions) set.add(c.dimensions) })
    const res = Array.from(set).sort()
    return res.length > 0 ? res : activeModel.dimensions
  }, [activeModel, selectedColor, selectedChairType, selectedLegType, selectedTableTop, selectedStorage, selectedFinish, selectedWarranty, isCustomColor, isCustomChairType, isCustomLegType, isCustomTableTop, isCustomDimension, isCustomStorage, isCustomFinish, isCustomWarranty])

  const availableStorageOptions = useMemo(() => {
    if (!activeModel) return []
    const combinations = getValidCombinationsExcluding("storage")
    const set = new Set<string>()
    combinations.forEach((c) => { if (c.storageOptions) set.add(c.storageOptions) })
    const res = Array.from(set).sort()
    return res.length > 0 ? res : activeModel.storageOptions
  }, [activeModel, selectedColor, selectedChairType, selectedLegType, selectedTableTop, selectedDimension, selectedFinish, selectedWarranty, isCustomColor, isCustomChairType, isCustomLegType, isCustomTableTop, isCustomDimension, isCustomStorage, isCustomFinish, isCustomWarranty])

  const availableFinishMaterials = useMemo(() => {
    if (!activeModel) return []
    const combinations = getValidCombinationsExcluding("finish")
    const set = new Set<string>()
    combinations.forEach((c) => { if (c.finishMaterial) set.add(c.finishMaterial) })
    const res = Array.from(set).sort()
    return res.length > 0 ? res : activeModel.finishMaterials
  }, [activeModel, selectedColor, selectedChairType, selectedLegType, selectedTableTop, selectedDimension, selectedStorage, selectedWarranty, isCustomColor, isCustomChairType, isCustomLegType, isCustomTableTop, isCustomDimension, isCustomStorage, isCustomFinish, isCustomWarranty])

  const availableWarranties = useMemo(() => {
    if (!activeModel) return []
    const combinations = getValidCombinationsExcluding("warranty")
    const set = new Set<string>()
    combinations.forEach((c) => { if (c.warranty) set.add(c.warranty) })
    const res = Array.from(set).sort()
    return res.length > 0 ? res : activeModel.warranties
  }, [activeModel, selectedColor, selectedChairType, selectedLegType, selectedTableTop, selectedDimension, selectedStorage, selectedFinish, isCustomColor, isCustomChairType, isCustomLegType, isCustomTableTop, isCustomDimension, isCustomStorage, isCustomFinish, isCustomWarranty])

  // Options for Dropdowns
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
      group: m.categoryName || "Workstations",
    }))
  }, [availableSubProducts])

  // Reset to default attributes
  const resetToDefaults = () => {
    setIsCustomDimension(false)
    setIsCustomColor(false)
    setIsCustomLegType(false)
    setIsCustomTableTop(false)
    setIsCustomChairType(false)
    setIsCustomStorage(false)
    setIsCustomFinish(false)
    setIsCustomWarranty(false)

    if (activeModel) {
      setSelectedColor(activeModel.colors[0] || "")
      setSelectedChairType(activeModel.chairTypes[0] || "")
      setSelectedLegType(activeModel.legTypes[0] || "")
      setSelectedTableTop(activeModel.tableTopFinishes[0] || "")
      setSelectedDimension(activeModel.dimensions[0] || "")
      setSelectedStorage(activeModel.storageOptions[0] || "")
      setSelectedFinish(activeModel.finishMaterials[0] || "")
      setSelectedWarranty(activeModel.warranties[0] || "")
    }
  }

  useEffect(() => {
    resetToDefaults()
  }, [activeModel?.modelName])

  // Auto-adjust non-custom attributes if selection is invalid
  useEffect(() => {
    if (!isCustomColor && availableColors.length > 0 && (!selectedColor || !availableColors.includes(selectedColor))) {
      setSelectedColor(availableColors[0])
    }
  }, [availableColors, isCustomColor])

  useEffect(() => {
    if (!isCustomChairType && availableChairTypes.length > 0 && (!selectedChairType || !availableChairTypes.includes(selectedChairType))) {
      setSelectedChairType(availableChairTypes[0])
    }
  }, [availableChairTypes, isCustomChairType])

  useEffect(() => {
    if (!isCustomLegType && availableLegTypes.length > 0 && (!selectedLegType || !availableLegTypes.includes(selectedLegType))) {
      setSelectedLegType(availableLegTypes[0])
    }
  }, [availableLegTypes, isCustomLegType])

  useEffect(() => {
    if (!isCustomTableTop && availableTableTopFinishes.length > 0 && (!selectedTableTop || !availableTableTopFinishes.includes(selectedTableTop))) {
      setSelectedTableTop(availableTableTopFinishes[0])
    }
  }, [availableTableTopFinishes, isCustomTableTop])

  useEffect(() => {
    if (!isCustomDimension && availableDimensions.length > 0 && (!selectedDimension || !availableDimensions.includes(selectedDimension))) {
      setSelectedDimension(availableDimensions[0])
    }
  }, [availableDimensions, isCustomDimension])

  useEffect(() => {
    if (!isCustomStorage && availableStorageOptions.length > 0 && (!selectedStorage || !availableStorageOptions.includes(selectedStorage))) {
      setSelectedStorage(availableStorageOptions[0])
    }
  }, [availableStorageOptions, isCustomStorage])

  useEffect(() => {
    if (!isCustomFinish && availableFinishMaterials.length > 0 && (!selectedFinish || !availableFinishMaterials.includes(selectedFinish))) {
      setSelectedFinish(availableFinishMaterials[0])
    }
  }, [availableFinishMaterials, isCustomFinish])

  useEffect(() => {
    if (!isCustomWarranty && availableWarranties.length > 0 && (!selectedWarranty || !availableWarranties.includes(selectedWarranty))) {
      setSelectedWarranty(availableWarranties[0])
    }
  }, [availableWarranties, isCustomWarranty])

  // Compute available combinations for active model
  const availableCombinations = useMemo(() => {
    if (!activeModel) return []
    return activeModel.combinations
  }, [activeModel])

  // Locate matching combination in local matrix
  const matchedCombination = useMemo(() => {
    if (!activeModel || availableCombinations.length === 0) return null
    return (
      availableCombinations.find((c) => {
        const matchColor = isCustomColor || !selectedColor || !c.color || c.color === selectedColor
        const matchChair = isCustomChairType || !selectedChairType || !c.chairType || c.chairType === selectedChairType
        const matchLeg = isCustomLegType || !selectedLegType || !c.legType || c.legType === selectedLegType
        const matchTop = isCustomTableTop || !selectedTableTop || !c.tableTopFinish || c.tableTopFinish === selectedTableTop
        const matchDim = isCustomDimension || !selectedDimension || !c.dimensions || c.dimensions === selectedDimension
        const matchStore = isCustomStorage || !selectedStorage || !c.storageOptions || c.storageOptions === selectedStorage
        const matchFinish = isCustomFinish || !selectedFinish || !c.finishMaterial || c.finishMaterial === selectedFinish
        const matchWarranty = isCustomWarranty || !selectedWarranty || !c.warranty || c.warranty === selectedWarranty
        return matchColor && matchChair && matchLeg && matchTop && matchDim && matchStore && matchFinish && matchWarranty
      }) || availableCombinations[0] || null
    )
  }, [
    activeModel,
    availableCombinations,
    selectedColor,
    selectedChairType,
    selectedLegType,
    selectedTableTop,
    selectedDimension,
    selectedStorage,
    selectedFinish,
    selectedWarranty,
    isCustomDimension,
    isCustomColor,
    isCustomLegType,
    isCustomTableTop,
    isCustomChairType,
    isCustomStorage,
    isCustomFinish,
    isCustomWarranty,
  ])

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

    const hasAnyCustom = isCustomDimension || isCustomColor || isCustomLegType || isCustomTableTop || isCustomChairType || isCustomStorage || isCustomFinish || isCustomWarranty

    const base = matchedProduct || {
      id: activeModel?.combinations[0]?.id || "custom-variant",
      productName: activeModel?.modelName || "Workstation",
      productCode: activeModel?.combinations[0]?.sku || "CUSTOM-SKU",
      unitPrice: 0,
      projectPrice: 0,
      dealerPrice: 0,
      interiorPrice: 0,
      specialPrice: 0,
      stock: 1,
    }

    // Build custom dynamic product name incorporating active attributes
    let dynamicTitle = activeModel?.modelName || base.productName
    if (selectedDimension) dynamicTitle += ` ${selectedDimension}`
    if (selectedColor) dynamicTitle += ` - ${selectedColor}`

    return {
      ...base,
      productName: hasAnyCustom ? dynamicTitle : base.productName,
      productCode: hasAnyCustom ? `${base.productCode || "SKU"}-CUSTOM` : base.productCode,
      dimensions: selectedDimension,
      availableColors: selectedColor,
      chairType: selectedChairType,
      legType: selectedLegType,
      tableTopFinish: selectedTableTop,
      storageOptions: selectedStorage,
      finishMaterial: selectedFinish,
      warranty: selectedWarranty,
      isCustom: hasAnyCustom,
    }
  }, [
    matchedProduct,
    activeModel,
    selectedDimension,
    selectedColor,
    selectedChairType,
    selectedLegType,
    selectedTableTop,
    selectedStorage,
    selectedFinish,
    selectedWarranty,
    isCustomDimension,
    isCustomColor,
    isCustomLegType,
    isCustomTableTop,
    isCustomChairType,
    isCustomStorage,
    isCustomFinish,
    isCustomWarranty,
  ])

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
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">Loading Configurator Catalog</h4>
          <p className="text-xs text-muted-foreground">Fetching product series and attribute matrices...</p>
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
      {/* Minimal Enterprise Header Bar */}
      <CardHeader className="bg-muted/30 border-b border-border/70 py-3 px-4 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              Product Configurator
            </CardTitle>
          </div>
        </div>

        <div className="flex items-center space-x-2">
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

          <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold bg-background text-foreground">
            Segment: {watchSegment}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {/* 2-Column Responsive Layout: Left Configurator Form (7 cols) + Right Dedicated Preview Panel (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: Configurator Inputs & Attributes (7/12 cols) */}
          <div className="lg:col-span-7 space-y-5">

            {/* Model & Series Selection Box */}
            <div className="space-y-3 bg-muted/20 border border-border/60 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Product Model
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Main Series Dropdown */}
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

                {/* Sub-Product / Model Dropdown */}
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

            {/* Attribute Configuration Form (Grid of Editable & Dropdown Attributes) */}
            {activeModel && (
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

                  {/* 1. Dimension */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Ruler className="h-3.5 w-3.5 text-muted-foreground" /> Dimension
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCustomDimension(!isCustomDimension)}
                        className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {isCustomDimension ? <RotateCcw className="h-2.5 w-2.5" /> : <Edit3 className="h-2.5 w-2.5" />}
                        {isCustomDimension ? "Preset List" : "Custom"}
                      </button>
                    </div>

                    {isCustomDimension ? (
                      <Input
                        value={selectedDimension}
                        onChange={(e) => setSelectedDimension(e.target.value)}
                        placeholder="e.g. 1500 x 750 mm"
                        className="h-9 text-xs font-mono bg-background"
                      />
                    ) : (
                      <ConfiguratorDropdown
                        options={availableDimensions}
                        value={selectedDimension}
                        onValueChange={setSelectedDimension}
                        placeholder="Select Dimension"
                        searchPlaceholder="Search dimensions..."
                        icon={<Ruler className="h-3.5 w-3.5" />}
                        isMono={true}
                      />
                    )}
                  </div>

                  {/* 2. Color / Finish Scheme */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Palette className="h-3.5 w-3.5 text-muted-foreground" /> Color / Finish
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCustomColor(!isCustomColor)}
                        className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {isCustomColor ? <RotateCcw className="h-2.5 w-2.5" /> : <Edit3 className="h-2.5 w-2.5" />}
                        {isCustomColor ? "Preset List" : "Custom"}
                      </button>
                    </div>

                    {isCustomColor ? (
                      <Input
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        placeholder="e.g. Walnut Top / Black Legs"
                        className="h-9 text-xs bg-background"
                      />
                    ) : (
                      <ConfiguratorDropdown
                        options={availableColors}
                        value={selectedColor}
                        onValueChange={setSelectedColor}
                        placeholder="Select Color"
                        searchPlaceholder="Search colors..."
                        icon={<Palette className="h-3.5 w-3.5" />}
                      />
                    )}
                  </div>

                  {/* 3. Leg Type */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" /> Leg Frame
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCustomLegType(!isCustomLegType)}
                        className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {isCustomLegType ? <RotateCcw className="h-2.5 w-2.5" /> : <Edit3 className="h-2.5 w-2.5" />}
                        {isCustomLegType ? "Preset List" : "Custom"}
                      </button>
                    </div>

                    {isCustomLegType ? (
                      <Input
                        value={selectedLegType}
                        onChange={(e) => setSelectedLegType(e.target.value)}
                        placeholder="e.g. Custom Loop Leg"
                        className="h-9 text-xs bg-background"
                      />
                    ) : (
                      <ConfiguratorDropdown
                        options={availableLegTypes}
                        value={selectedLegType}
                        onValueChange={setSelectedLegType}
                        placeholder="Select Leg Type"
                        searchPlaceholder="Search leg frames..."
                        icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
                      />
                    )}
                  </div>

                  {/* 4. Table Top Finish */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Grid className="h-3.5 w-3.5 text-muted-foreground" /> Top Finish
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCustomTableTop(!isCustomTableTop)}
                        className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {isCustomTableTop ? <RotateCcw className="h-2.5 w-2.5" /> : <Edit3 className="h-2.5 w-2.5" />}
                        {isCustomTableTop ? "Preset List" : "Custom"}
                      </button>
                    </div>

                    {isCustomTableTop ? (
                      <Input
                        value={selectedTableTop}
                        onChange={(e) => setSelectedTableTop(e.target.value)}
                        placeholder="e.g. Laminate Beech"
                        className="h-9 text-xs bg-background"
                      />
                    ) : (
                      <ConfiguratorDropdown
                        options={availableTableTopFinishes}
                        value={selectedTableTop}
                        onValueChange={setSelectedTableTop}
                        placeholder="Select Table Top"
                        searchPlaceholder="Search finishes..."
                        icon={<Grid className="h-3.5 w-3.5" />}
                      />
                    )}
                  </div>

                  {/* 5. Chair Type */}
                  {availableChairTypes.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Armchair className="h-3.5 w-3.5 text-muted-foreground" /> Chair / Backrest
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCustomChairType(!isCustomChairType)}
                          className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {isCustomChairType ? <RotateCcw className="h-2.5 w-2.5" /> : <Edit3 className="h-2.5 w-2.5" />}
                          {isCustomChairType ? "Preset List" : "Custom"}
                        </button>
                      </div>

                      {isCustomChairType ? (
                        <Input
                          value={selectedChairType}
                          onChange={(e) => setSelectedChairType(e.target.value)}
                          placeholder="e.g. Ergonomic High Back"
                          className="h-9 text-xs bg-background"
                        />
                      ) : (
                        <ConfiguratorDropdown
                          options={availableChairTypes}
                          value={selectedChairType}
                          onValueChange={setSelectedChairType}
                          placeholder="Select Chair Type"
                          searchPlaceholder="Search chair types..."
                          icon={<Armchair className="h-3.5 w-3.5" />}
                        />
                      )}
                    </div>
                  )}

                  {/* 6. Storage Options */}
                  {availableStorageOptions.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Box className="h-3.5 w-3.5 text-muted-foreground" /> Storage Unit
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCustomStorage(!isCustomStorage)}
                          className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {isCustomStorage ? <RotateCcw className="h-2.5 w-2.5" /> : <Edit3 className="h-2.5 w-2.5" />}
                          {isCustomStorage ? "Preset List" : "Custom"}
                        </button>
                      </div>

                      {isCustomStorage ? (
                        <Input
                          value={selectedStorage}
                          onChange={(e) => setSelectedStorage(e.target.value)}
                          placeholder="e.g. Mobile Pedestal"
                          className="h-9 text-xs bg-background"
                        />
                      ) : (
                        <ConfiguratorDropdown
                          options={availableStorageOptions}
                          value={selectedStorage}
                          onValueChange={setSelectedStorage}
                          placeholder="Select Storage"
                          searchPlaceholder="Search storage options..."
                          icon={<Box className="h-3.5 w-3.5" />}
                        />
                      )}
                    </div>
                  )}

                  {/* 7. Finish Material */}
                  {availableFinishMaterials.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" /> Finish Material
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCustomFinish(!isCustomFinish)}
                          className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {isCustomFinish ? <RotateCcw className="h-2.5 w-2.5" /> : <Edit3 className="h-2.5 w-2.5" />}
                          {isCustomFinish ? "Preset List" : "Custom"}
                        </button>
                      </div>

                      {isCustomFinish ? (
                        <Input
                          value={selectedFinish}
                          onChange={(e) => setSelectedFinish(e.target.value)}
                          placeholder="e.g. Custom Fabric"
                          className="h-9 text-xs bg-background"
                        />
                      ) : (
                        <ConfiguratorDropdown
                          options={availableFinishMaterials}
                          value={selectedFinish}
                          onValueChange={setSelectedFinish}
                          placeholder="Select Material"
                          searchPlaceholder="Search materials..."
                          icon={<Tag className="h-3.5 w-3.5" />}
                        />
                      )}
                    </div>
                  )}

                  {/* 8. Warranty */}
                  {availableWarranties.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Warranty
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCustomWarranty(!isCustomWarranty)}
                          className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {isCustomWarranty ? <RotateCcw className="h-2.5 w-2.5" /> : <Edit3 className="h-2.5 w-2.5" />}
                          {isCustomWarranty ? "Preset List" : "Custom"}
                        </button>
                      </div>

                      {isCustomWarranty ? (
                        <Input
                          value={selectedWarranty}
                          onChange={(e) => setSelectedWarranty(e.target.value)}
                          placeholder="e.g. 5 Years Extended"
                          className="h-9 text-xs bg-background"
                        />
                      ) : (
                        <ConfiguratorDropdown
                          options={availableWarranties}
                          value={selectedWarranty}
                          onValueChange={setSelectedWarranty}
                          placeholder="Select Warranty"
                          searchPlaceholder="Search warranties..."
                          icon={<ShieldCheck className="h-3.5 w-3.5" />}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
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
                      src={activeProductPayload.imageUrl}
                      alt={activeProductPayload.productName}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                <div className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block border-b border-border/40 pb-1">
                    Selected Specifications
                  </span>
                  <div className="space-y-1 text-xs">
                    {selectedDimension && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Dimension:</span>
                        <span className="font-mono font-bold text-foreground">{selectedDimension}</span>
                      </div>
                    )}
                    {selectedColor && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Color:</span>
                        <span className="font-semibold text-foreground">{selectedColor}</span>
                      </div>
                    )}
                    {selectedLegType && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Leg Frame:</span>
                        <span className="font-medium text-foreground">{selectedLegType}</span>
                      </div>
                    )}
                    {selectedTableTop && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Top Finish:</span>
                        <span className="font-medium text-foreground">{selectedTableTop}</span>
                      </div>
                    )}
                    {selectedStorage && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Storage:</span>
                        <span className="font-medium text-foreground">{selectedStorage}</span>
                      </div>
                    )}
                    {selectedWarranty && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Warranty:</span>
                        <span className="font-medium text-foreground">{selectedWarranty}</span>
                      </div>
                    )}
                  </div>
                </div>

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
