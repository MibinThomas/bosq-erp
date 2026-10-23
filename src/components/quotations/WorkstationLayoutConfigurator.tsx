"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Check, LayoutGrid } from "lucide-react"
import { productTabOf } from "@/lib/product-tabs"
import {
  WORKSTATION_COMPONENTS,
  type WorkstationConfig,
  buildWorkstationSpec,
  getWorkstationOptions,
  workstationSpecItems,
  parseWorkstationSpec,
  workstationSurcharge,
} from "@/lib/workstation-options"

export interface WorkstationSelection {
  variant: any
  config: WorkstationConfig
  /** "Zen X Workstation — Cluster Of 4" */
  productTitle: string
  /** "Dimensions: 2400 × 1200 × 750 mm; Tabletop: White; Leg frame: Black." */
  componentSpec: string
  surcharge: number
  quantity: number
}

interface WorkstationLayoutConfiguratorProps {
  products: any[]
  categories: { id: string; name: string; parentId?: string | null }[]
  watchSegment: string
  /** The quotation line being edited, used to pre-fill a previously configured workstation */
  currentProductId?: string
  currentSpecifications?: string
  currentQuantity?: number | string
  disabled?: boolean
  onApply: (selection: WorkstationSelection) => void
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

interface WorkstationModel {
  key: string
  name: string
  group: string
  variants: any[]
}

/** Layout label for a workstation product: its configured layout, else its name without the model prefix. */
const layoutOf = (variant: any, modelName: string) => {
  const opts = getWorkstationOptions(variant.variantAttributes)
  if (opts.layout) return opts.layout
  const name = String(variant.productName || "")
  const stripped = name.toLowerCase().startsWith(modelName.toLowerCase()) ? name.slice(modelName.length).replace(/^[\s—–-]+/, "") : name
  return stripped || name
}

export function WorkstationLayoutConfigurator({
  products,
  categories,
  watchSegment,
  currentProductId,
  currentSpecifications,
  currentQuantity,
  disabled,
  onApply,
}: WorkstationLayoutConfiguratorProps) {
  // Group workstation products into models (by master product; standalone products are their own model)
  const models = useMemo(() => {
    const byKey = new Map<string, WorkstationModel>()
    for (const p of products) {
      if (p.isMaster || p.deletedAt || productTabOf(p, categories) !== "workstations") continue
      const parent = p.parentProduct
      const key = parent?.id || p.id
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          name: parent?.productName || p.modelName || p.productName,
          group: p.category?.name || "Workstations",
          variants: [],
        })
      }
      byKey.get(key)!.variants.push(p)
    }
    // Order layouts by seats (Single Seater → Cluster Of 8), then name
    for (const m of byKey.values()) {
      m.variants.sort((a, b) => {
        const sa = getWorkstationOptions(a.variantAttributes, layoutOf(a, m.name)).seatsPerUnit
        const sb = getWorkstationOptions(b.variantAttributes, layoutOf(b, m.name)).seatsPerUnit
        return sa - sb || String(a.productName).localeCompare(String(b.productName))
      })
    }
    return [...byKey.values()].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
  }, [products, categories])

  const groups = useMemo(() => [...new Set(models.map((m) => m.group))], [models])

  const initialVariant = models.flatMap((m) => m.variants).find((v) => v.id === currentProductId)
  const [modelKey, setModelKey] = useState<string>(initialVariant ? initialVariant.parentProduct?.id || initialVariant.id : "")
  const [variantId, setVariantId] = useState<string>(initialVariant?.id || "")
  // The user's picks; `config` below is the version valid for the selected layout
  const [picked, setPicked] = useState<WorkstationConfig>(() => (initialVariant ? parseWorkstationSpec(currentSpecifications) : {}))
  const [quantity, setQuantity] = useState<string>(String(currentQuantity || 1))
  const [showErrors, setShowErrors] = useState(false)

  const model = models.find((m) => m.key === modelKey)
  const variant = model?.variants.find((v) => v.id === variantId)
  const layout = variant && model ? layoutOf(variant, model.name) : ""
  const options = getWorkstationOptions(variant?.variantAttributes, layout)

  // Revalidate picks against the selected model/layout; a single available option is pre-selected
  const config: WorkstationConfig = {}
  for (const c of WORKSTATION_COMPONENTS) {
    const list = options[c.optionsKey]
    if (list.length === 0) continue
    const keep = list.find((o) => o.name === picked[c.key])
    config[c.key] = keep ? keep.name : list.length === 1 ? list[0].name : undefined
  }

  const visibleComponents = WORKSTATION_COMPONENTS.filter((c) => options[c.optionsKey].length > 0)
  const missing = visibleComponents.filter((c) => !config[c.key])
  const qtyNum = Number(quantity)
  const qtyValid = Number.isInteger(qtyNum) && qtyNum > 0

  const surcharge = variant ? workstationSurcharge(options, config) : 0
  const unitPrice = variant ? segmentPrice(variant, watchSegment) + surcharge : 0
  const productTitle = model && variant ? `${model.name} — ${layout}` : ""
  const specItems = variant ? workstationSpecItems(config, options.seatsPerUnit) : []
  const componentSpec = variant ? buildWorkstationSpec(config, options.seatsPerUnit) : ""
  const isUpdate = !!currentProductId && currentProductId === variantId
  const seatingPositions = options.seatsPerUnit > 0 && qtyValid ? options.seatsPerUnit * qtyNum : 0

  const handleModelChange = (key: string) => {
    setModelKey(key)
    const m = models.find((x) => x.key === key)
    setVariantId(m?.variants.length === 1 ? m.variants[0].id : "")
    setShowErrors(false)
  }

  const handleApply = () => {
    setShowErrors(true)
    if (!variant || missing.length > 0 || !qtyValid) return
    onApply({
      variant,
      config,
      // "Zen X" → "Zen X Workstation — Cluster Of 4"; names that already say what they are (tables, desks) are kept
      productTitle: `${model!.name}${/workstation|table|desk/i.test(model!.name) ? "" : " Workstation"} — ${layout}`,
      componentSpec,
      surcharge,
      quantity: qtyNum,
    })
    setShowErrors(false)
  }

  if (models.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground text-center">
        No workstations found in the product master. Import workstations with the product template, or use another category.
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
        <LayoutGrid className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Configure workstation</span>
      </div>

      <div className="p-4 space-y-5">
        {/* 1. Select workstation */}
        <section className="space-y-3">
          {stepTitle(1, "Select workstation")}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Workstation model</span>
              <select
                className={cn(selectClass, showErrors && !model && "border-destructive")}
                value={modelKey}
                disabled={disabled}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                <option value="">Select workstation model…</option>
                {groups.map((g) => (
                  <optgroup key={g} label={g}>
                    {models.filter((m) => m.group === g).map((m) => (
                      <option key={m.key} value={m.key}>{m.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Seater and layout</span>
              <select
                className={cn(selectClass, showErrors && model && !variant && "border-destructive")}
                value={variantId}
                disabled={disabled || !model}
                onChange={(e) => setVariantId(e.target.value)}
              >
                <option value="">{model ? "Select seater and layout…" : "Select a model first"}</option>
                {model?.variants.map((v) => (
                  <option key={v.id} value={v.id}>{layoutOf(v, model.name)}</option>
                ))}
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
                Selected product: <span className="font-semibold">{productTitle}</span>
                <span className="mx-3 text-muted-foreground">|</span>
                <span className="font-mono text-xs">{variant.productCode}</span>
                {options.seatsPerUnit > 0 && (
                  <span className="ml-3 text-xs text-muted-foreground">
                    {options.seatsPerUnit} seat{options.seatsPerUnit === 1 ? "" : "s"} per unit
                  </span>
                )}
              </span>
            </div>
          )}
        </section>

        {/* 2. Customize workstation */}
        {variant && (
          <section className="space-y-3 border-t pt-4">
            {stepTitle(2, "Customize workstation")}
            {visibleComponents.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No dimension or colour options are set up for this workstation in the product master.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleComponents.map((c) => (
                  <label key={c.key} className={cn("space-y-1.5", c.key === "dimensions" && "sm:col-span-2")}>
                    <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                    <select
                      className={cn(selectClass, showErrors && !config[c.key] && "border-destructive")}
                      value={config[c.key] || ""}
                      disabled={disabled}
                      onChange={(e) => setPicked((prev) => ({ ...prev, [c.key]: e.target.value || undefined }))}
                    >
                      <option value="">{c.key === "dimensions" ? "Select available dimensions" : "Select colour"}</option>
                      {options[c.optionsKey].map((o) => (
                        <option key={o.name} value={o.name}>
                          {o.name}
                          {c.key === "dimensions" ? " mm" : ""}
                          {o.surcharge ? ` (+AED ${o.surcharge.toFixed(2)})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">Dimension and colour lists depend on the selected model and layout.</p>
          </section>
        )}

        {/* 3. Quotation details */}
        {variant && (
          <section className="space-y-3 border-t pt-4">
            {stepTitle(3, "Quotation details")}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Quantity of workstation units</span>
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
                {seatingPositions > 0 && options.seatsPerUnit > 1 && (
                  <span className="text-[11px] text-muted-foreground block">
                    {qtyNum} × {layout} = {seatingPositions} seating positions
                  </span>
                )}
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
              <p className="text-sm font-medium">{productTitle}</p>
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
                {missing.length > 0 && `Select ${missing.map((m) => (m.key === "dimensions" ? "dimensions" : m.label.toLowerCase())).join(", ")}. `}
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
