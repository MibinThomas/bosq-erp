"use client"

import React from "react"
import { useWatch, type UseFormReturn } from "react-hook-form"
import { Calculator } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { BOQ_COST_FIELDS, boqUnitCost, priceFromMargin } from "@/lib/boq-costing"

/** Number input that commits on blur / Enter, like the BOQ form's other price inputs. */
function CostInput({ value, onCommit, disabled, label }: {
  value: unknown
  onCommit: (v: string) => void
  disabled?: boolean
  label: string
}) {
  const [local, setLocal] = React.useState(String(value ?? ""))
  React.useEffect(() => { setLocal(value === 0 || value === "0" ? "" : String(value ?? "")) }, [value])
  return (
    <Input
      type="number"
      min="0"
      step="0.01"
      inputMode="decimal"
      placeholder="0.00"
      aria-label={label}
      disabled={disabled}
      className="h-9 text-xs font-mono bg-background border-border"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          onCommit(local)
          e.currentTarget.blur()
        }
      }}
    />
  )
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Estimator cost entry for one BOQ line: Material, Labour, Outsourcing, Hardware, Factory, Other.
 * The total becomes the line's base price; the selling price applies the consultant's margin
 * from the pricing row (0 until they set one). The estimator never sets a margin.
 */
export function BoqCostFields({ form, index, readOnly = false }: {
  form: UseFormReturn<any>
  index: number
  readOnly?: boolean
}) {
  const item = useWatch({ control: form.control, name: `items.${index}` }) || {}
  const total = boqUnitCost(item)
  const qty = Number(item.quantity) || 1

  const commit = (key: string, raw: string) => {
    const value = raw === "" ? 0 : Math.max(0, parseFloat(raw) || 0)
    form.setValue(`items.${index}.${key}`, value, { shouldDirty: true })
    const current = { ...form.getValues(`items.${index}`), [key]: value }
    const unitCost = boqUnitCost(current)
    if (unitCost > 0) {
      const margin = parseFloat(String(current.margin ?? 0)) || 0
      form.setValue(`items.${index}.priceSource`, "manual", { shouldDirty: true })
      form.setValue(`items.${index}.basePrice`, unitCost, { shouldDirty: true })
      form.setValue(`items.${index}.unitPrice`, priceFromMargin(unitCost, margin), { shouldDirty: true, shouldValidate: true })
    }
  }

  return (
    <div className="mt-4 bg-orange-50/40 dark:bg-orange-950/20 p-5 rounded-xl border border-orange-500/20 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <span className="text-sm font-bold text-orange-950 dark:text-orange-200">Estimator Costing (per unit)</span>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase font-mono bg-background">
          {readOnly ? "Read only" : "Costs only — margin is set by the consultant"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {BOQ_COST_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground block">{f.label} (AED)</label>
            {readOnly ? (
              <div className="h-9 px-3 rounded-md bg-muted/60 border border-border flex items-center font-mono text-xs">
                {fmt(Number(item[f.key]) || 0)}
              </div>
            ) : (
              <CostInput label={`${f.label} cost`} value={item[f.key]} onCommit={(v) => commit(f.key, v)} />
            )}
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-muted-foreground block">Total cost (AED)</label>
          <div className="h-9 px-3 rounded-md bg-orange-500/10 border border-orange-500/30 flex items-center font-mono text-xs font-bold">
            {fmt(total)}
          </div>
        </div>
      </div>

      {total > 0 && qty > 1 && (
        <p className="text-[11px] text-muted-foreground">
          Line cost for {qty} units: <span className="font-mono font-semibold text-foreground">AED {fmt(total * qty)}</span>
        </p>
      )}
    </div>
  )
}
