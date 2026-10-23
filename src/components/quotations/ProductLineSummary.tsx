"use client"

import { Button } from "@/components/ui/button"
import { Pencil, Package } from "lucide-react"
import { specToText } from "@/lib/chair-options"

interface ProductLineSummaryProps {
  imageUrl?: string | null
  title: string
  productCode?: string | null
  tabLabel?: string
  specifications?: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  disabled?: boolean
  onUpdate: () => void
}

const aed = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Compact view of the product on a quotation line; "Update" reopens the product selector. */
export function ProductLineSummary({
  imageUrl,
  title,
  productCode,
  tabLabel,
  specifications,
  quantity,
  unitPrice,
  lineTotal,
  disabled,
  onUpdate,
}: ProductLineSummaryProps) {
  // Specification bullets (e.g. Headrest: Black, Dimensions: …) — the first few, as a quick reminder
  const specs = specToText(specifications)
    .split("\n")
    .map((s) => s.replace(/^[\s•\-*]+/, "").trim())
    .filter((s) => s && !/^product specifications$/i.test(s))
  const shown = specs.slice(0, 6)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border bg-muted/20 p-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="h-16 w-16 shrink-0 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="h-full w-full object-contain" />
          ) : (
            <Package className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
            {tabLabel && <span className="font-semibold uppercase tracking-wider text-primary">{tabLabel}</span>}
            {productCode && <span className="font-mono">{productCode}</span>}
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug truncate" title={title}>
            {title}
          </p>
          {shown.length > 0 && (
            <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              {shown.map((s) => {
                const i = s.indexOf(":")
                return (
                  <li key={s}>
                    {i > 0 ? (
                      <>
                        <span className="font-semibold text-foreground">{s.slice(0, i)}:</span>
                        {s.slice(i + 1)}
                      </>
                    ) : (
                      s
                    )}
                  </li>
                )
              })}
              {specs.length > shown.length && <li>+{specs.length - shown.length} more</li>}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
        <div className="text-right text-xs">
          <div className="text-muted-foreground">
            {quantity} × AED {aed(unitPrice)}
          </div>
          <div className="text-sm font-bold text-foreground">AED {aed(lineTotal)}</div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onUpdate}
          disabled={disabled}
          className="h-8 text-xs font-semibold cursor-pointer"
          title={disabled ? "Item is locked during costing" : "Change the product or its options"}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Update
        </Button>
      </div>
    </div>
  )
}
