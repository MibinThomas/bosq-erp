"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Armchair, Check } from "lucide-react"
import {
  CHAIR_COMPONENTS,
  type ChairConfig,
  type ChairOptions,
  buildChairSpec,
  chairSpecItems,
  chairSurcharge,
  getChairOptions,
  isHighBack,
  parseChairSpec,
} from "@/lib/chair-options"

export interface ChairSelection {
  variant: any
  config: ChairConfig
  /** "Ace High Back Chair" */
  productTitle: string
  itemCode: string
  /** "Headrest: Black; Backrest: Black; Seat: Black; Base: Nylon." */
  componentSpec: string
  surcharge: number
  quantity: number
}

interface ChairConfiguratorProps {
  products: any[]
  categories: { id: string; name: string; parentId?: string | null }[]
  watchSegment: string
  /** The quotation line being edited, used to pre-fill a previously configured chair */
  currentProductId?: string
  currentSpecifications?: string
  currentQuantity?: number | string
  disabled?: boolean
  onApply: (selection: ChairSelection) => void
}

const segmentPrice = (p: any, segment: string): number => {
  if (!p) return 0
  if (segment === "Interior") return p.interiorPrice ?? p.unitPrice ?? 0
  if (segment === "Dealer") return p.dealerPrice ?? p.unitPrice ?? 0
  if (segment === "Project") return p.projectPrice ?? p.unitPrice ?? 0
  if (segment === "Special") return p.specialPrice ?? p.unitPrice ?? 0
  return p.unitPrice ?? 0
}

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/30"

/** Identifies chair products: the "Chairs" category, its sub-categories, or any category named like "chair". */
export function useChairCategoryIds(categories: ChairConfiguratorProps["categories"]) {
  return useMemo(() => {
    const roots = categories.filter((c) => /^chairs?$/i.test(c.name.trim()))
    const ids = new Set<string>(roots.map((c) => c.id))
    for (const c of categories) {
      if ((c.parentId && ids.has(c.parentId)) || /chair|seating/i.test(c.name)) ids.add(c.id)
    }
    return ids
  }, [categories])
}

export const isChairProduct = (p: any, chairCategoryIds: Set<string>) =>
  chairCategoryIds.has(p?.categoryId) || /chair|seating/i.test(p?.category?.name || "")

interface ChairModel {
  key: string
  name: string
  code: string
  group: string
  variants: any[]
}

const typeCodeOf = (variant: any, options: ChairOptions) =>
  options.typeCode || (String(variant.productCode || "").match(/(\d{3})/)?.[1] ?? "")

export function ChairConfigurator({
  products,
  categories,
  watchSegment,
  currentProductId,
  currentSpecifications,
  currentQuantity,
  disabled,
  onApply,
}: ChairConfiguratorProps) {
  const chairCategoryIds = useChairCategoryIds(categories)

  // Group chair variants into models (by their master product; standalone chairs are their own model)
  const models = useMemo(() => {
    const byKey = new Map<string, ChairModel>()
    for (const p of products) {
      if (p.isMaster || p.deletedAt || !isChairProduct(p, chairCategoryIds)) continue
      const parent = p.parentProduct
      const key = parent?.id || p.id
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          name: parent?.productName || p.modelName || p.productName,
          code: parent?.modelCode || p.modelCode || "",
          group: p.category?.name || "Chairs",
          variants: [],
        })
      }
      byKey.get(key)!.variants.push(p)
    }
    for (const m of byKey.values()) {
      m.variants.sort((a, b) => String(a.productCode).localeCompare(String(b.productCode), undefined, { numeric: true }))
    }
    return [...byKey.values()].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
  }, [products, chairCategoryIds])

  const groups = useMemo(() => [...new Set(models.map((m) => m.group))], [models])

  const initialVariant = products.find((p) => p.id === currentProductId && isChairProduct(p, chairCategoryIds))
  const [modelKey, setModelKey] = useState<string>(initialVariant ? initialVariant.parentProduct?.id || initialVariant.id : "")
  const [variantId, setVariantId] = useState<string>(initialVariant?.id || "")
  // The user's picks; `config` below is the version valid for the selected chair type
  const [picked, setPicked] = useState<ChairConfig>(() => (initialVariant ? parseChairSpec(currentSpecifications) : {}))
  const [quantity, setQuantity] = useState<string>(String(currentQuantity || 1))
  const [showErrors, setShowErrors] = useState(false)

  const model = models.find((m) => m.key === modelKey)
  const variant = model?.variants.find((v) => v.id === variantId)
  const options = getChairOptions(variant?.variantAttributes)
  const highBack = isHighBack(variant?.chairType)

  // Valid configuration for the selected type: no headrest unless High Back, only colours this type
  // offers, and the single option pre-selected when there is just one.
  const config: ChairConfig = {}
  for (const c of CHAIR_COMPONENTS) {
    if (c.key === "headrest" && !highBack) continue
    const list = options[c.optionsKey]
    if (list.length === 0) continue
    const keep = list.find((o) => o.name === picked[c.key])
    config[c.key] = keep ? keep.name : list.length === 1 ? list[0].name : undefined
  }

  const visibleComponents = CHAIR_COMPONENTS.filter(
    (c) => !(c.key === "headrest" && !highBack) && options[c.optionsKey].length > 0
  )
  const missing = visibleComponents.filter((c) => !config[c.key])
  const qtyNum = Number(quantity)
  const qtyValid = Number.isInteger(qtyNum) && qtyNum > 0

  const surcharge = variant ? chairSurcharge(options, config, variant.chairType) : 0
  const unitPrice = variant ? segmentPrice(variant, watchSegment) + surcharge : 0
  const typeCode = variant ? typeCodeOf(variant, options) : ""
  const productTitle = model && variant ? `${model.name} ${variant.chairType || ""}`.trim() : ""
  const specItems = variant ? chairSpecItems(config, variant.chairType, variant.dimensions) : []
  const componentSpec = variant ? buildChairSpec(config, variant.chairType, variant.dimensions) : ""
  const isUpdate = !!currentProductId && currentProductId === variantId

  const handleModelChange = (key: string) => {
    setModelKey(key)
    const m = models.find((x) => x.key === key)
    // Default to the first type (usually High Back) so the item code shows immediately
    setVariantId(m?.variants[0]?.id || "")
    setShowErrors(false)
  }

  const handleApply = () => {
    setShowErrors(true)
    if (!variant || missing.length > 0 || !qtyValid) return
    onApply({
      variant,
      config,
      // "Ace High Back" → "Ace High Back Chair"; types that already name the item ("Visitor Chair", "Bar Stool") are kept
      productTitle: /(chair|stool)$/i.test(productTitle) ? productTitle : `${productTitle} Chair`,
      itemCode: variant.productCode,
      componentSpec,
      surcharge,
      quantity: qtyNum,
    })
    setShowErrors(false)
  }

  if (models.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground text-center">
        No chairs found in the product master. Import chairs with the chair template, or use another category.
      </div>
    )
  }

  const stepTitle = (n: number, title: string) => (
    <h4 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{n}</span>
      {title}
    </h4>
  )

  return (
    <div className="rounded-xl border bg-background overflow-hidden">
      <div className="flex items-center gap-2 bg-muted/50 px-4 py-2.5 border-b">
        <Armchair className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Configure chair</span>
      </div>

      <div className="p-4 space-y-5">
        {/* 1. Select chair */}
        <section className="space-y-3">
          {stepTitle(1, "Select chair")}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Chair model</span>
              <select
                className={cn(selectClass, showErrors && !model && "border-destructive")}
                value={modelKey}
                disabled={disabled}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                <option value="">Select chair model…</option>
                {groups.map((g) => (
                  <optgroup key={g} label={g}>
                    {models.filter((m) => m.group === g).map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.code && m.code.toLowerCase() !== m.name.toLowerCase() ? `${m.name} — ${m.code}` : m.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Chair type</span>
              <select
                className={cn(selectClass, showErrors && model && !variant && "border-destructive")}
                value={variantId}
                disabled={disabled || !model}
                onChange={(e) => setVariantId(e.target.value)}
              >
                <option value="">{model ? "Select chair type…" : "Select a model first"}</option>
                {model?.variants.map((v) => {
                  const code = typeCodeOf(v, getChairOptions(v.variantAttributes))
                  return (
                    <option key={v.id} value={v.id}>
                      {(v.chairType || v.productName) + (code ? ` — ${code}` : "")}
                    </option>
                  )
                })}
              </select>
            </label>
          </div>
          {variant && (
            <div className="flex items-center gap-3 text-sm">
              {(variant.imageUrl || variant.parentProduct?.imageUrl) && (
                <img
                  src={variant.imageUrl || variant.parentProduct?.imageUrl}
                  alt={productTitle}
                  className="h-12 w-12 rounded-md border object-contain bg-white"
                />
              )}
              <span>
                Item code: <span className="font-mono font-semibold">{variant.productCode}</span>
                <span className="mx-3 text-muted-foreground">|</span>
                Product: <span className="font-semibold">{productTitle}</span>
                {typeCode && <span className="sr-only"> ({typeCode})</span>}
              </span>
            </div>
          )}
        </section>

        {/* 2. Customize components */}
        {variant && (
          <section className="space-y-3 border-t pt-4">
            {stepTitle(2, "Customize components")}
            {visibleComponents.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No component options are set up for this chair in the product master.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleComponents.map((c) => (
                  <label key={c.key} className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {c.label}
                      {c.key === "headrest" && <span className="font-normal"> · High Back only</span>}
                    </span>
                    <select
                      className={cn(selectClass, showErrors && !config[c.key] && "border-destructive")}
                      value={config[c.key] || ""}
                      disabled={disabled}
                      onChange={(e) => setPicked((prev) => ({ ...prev, [c.key]: e.target.value || undefined }))}
                    >
                      <option value="">Select…</option>
                      {options[c.optionsKey].map((o) => (
                        <option key={o.name} value={o.name}>
                          {o.name}
                          {o.surcharge ? ` (+AED ${o.surcharge.toFixed(2)})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">Options are loaded from the ERP product master.</p>
          </section>
        )}

        {/* 3. Quotation details */}
        {variant && (
          <section className="space-y-3 border-t pt-4">
            {stepTitle(3, "Quotation details")}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Quantity</span>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={quantity}
                  disabled={disabled}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={cn("h-10", showErrors && !qtyValid && "border-destructive")}
                />
              </label>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground block">Unit price in AED ({watchSegment})</span>
                <div className="h-10 flex items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold">
                  {unitPrice.toFixed(2)}
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                    {surcharge ? `incl. customization +${surcharge.toFixed(2)}` : "From ERP price list"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/30 border px-3 py-2.5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Quotation line preview</span>
              <p className="text-sm font-medium">
                <span className="font-mono">{variant.productCode}</span> &nbsp;|&nbsp; {productTitle}
              </p>
              {specItems.length > 0 && (
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                  {specItems.map((s) => (
                    <li key={s.label}>
                      <span className="font-semibold text-foreground">{s.label}:</span> {s.value}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {showErrors && (missing.length > 0 || !qtyValid) && (
              <p className="text-xs text-destructive">
                {missing.length > 0 && `Select ${missing.map((m) => m.label.toLowerCase()).join(", ")}. `}
                {!qtyValid && "Quantity must be a positive whole number."}
              </p>
            )}

            <Button type="button" onClick={handleApply} disabled={disabled} className="h-9 text-sm font-semibold">
              <Check className="mr-1.5 h-4 w-4" />
              {isUpdate ? "Update quotation line" : "Add to quotation"}
            </Button>
          </section>
        )}
      </div>
    </div>
  )
}
