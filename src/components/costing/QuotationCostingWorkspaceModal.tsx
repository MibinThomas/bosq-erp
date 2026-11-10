"use client"

import React, { useEffect, useId, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  Building2,
  Calculator,
  Check,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleAlert,
  FileSpreadsheet,
  Layers,
  Loader2,
  Maximize2,
  Package,
  Save,
  Upload,
  User,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  COSTING_FIELD_LABELS,
  type CostingField,
  type CostingImportPreview,
  type CostingImportRow,
} from "@/lib/costing-template"

export interface CostingItemData {
  id: string
  quotationId: string
  itemNo: number
  description: string
  specifications: string | null
  productNotes: string | null
  productDescription: string | null
  quantity: number
  unitPrice: number
  amount: number
  unitCost: number
  materialCost: number    // Used as Factory Cost
  laborCost: number       // Used as Accessories Cost
  overheadCost: number
  transportCost: number
  installationCost: number
  marginPercentage: number // Margin %
  negotiationPct?: number  // Negotiation buffer %
  costingStatus: string
  estimatorNotes: string | null
  costingRequestedAt: string | null
  costingCompletedAt: string | null
  customImageUrl: string | null
  imageUrl: string | null
  categoryName: string | null
  chairType: string | null
  batchHeading?: string | null
  product?: {
    id: string
    productName: string
    sku: string | null
    imageUrl: string | null
  } | null
}

export interface QuotationGroupData {
  quotationId: string
  quotationNumber: string
  projectName: string | null
  status: string
  costingStatus: string | null
  client: {
    id: string
    companyName: string
    contactPerson: string | null
    email: string | null
    phone: string | null
  }
  preparedBy: {
    id: string
    name: string | null
    email: string | null
    role: string
  }
  assignedEstimator?: {
    id: string
    name: string | null
    email: string | null
  } | null
  requestDate: string | null
  items: CostingItemData[]
}

interface QuotationCostingWorkspaceModalProps {
  quotationGroup: QuotationGroupData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function cleanHtmlText(htmlStr?: string | null): string {
  if (!htmlStr) return ""
  return htmlStr
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
}

interface EditableItemState {
  id: string
  factoryCost: number | string       // Stored in materialCost
  accessoriesCost: number | string   // Stored in laborCost
  marginPercentage: number | string
  negotiationPct: number | string    // Buffer / discount % for negotiation
  unitPrice: number
  estimatorNotes: string
  costingStatus: string
}

const parseNum = (val: any): number => {
  if (val === undefined || val === null || val === "") return 0
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

const aed = (n: number) => `AED ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Margin health: red below 10%, amber below 20%, green from 20%. */
const marginTone = (pct: number) => (pct <= 0 ? "muted" : pct < 10 ? "low" : pct < 20 ? "mid" : "good")
const toneText: Record<string, string> = {
  muted: "text-muted-foreground",
  low: "text-rose-600 dark:text-rose-400",
  mid: "text-amber-600 dark:text-amber-400",
  good: "text-emerald-600 dark:text-emerald-400",
}
const toneBg: Record<string, string> = {
  muted: "bg-muted-foreground/30",
  low: "bg-rose-500",
  mid: "bg-amber-500",
  good: "bg-emerald-500",
}
const tonePill: Record<string, string> = {
  muted: "bg-muted text-muted-foreground border-border",
  low: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  mid: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  good: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
}

const QUICK_MARGINS = [10, 15, 20, 25, 30]

/**
 * Formula Calculation Engine:
 * 1. Total Cost (Unit) = Factory Cost + Accessories Cost
 * 2. Scenario 1 (Margin % only): Final Selling Price = Total Cost / (1 - Margin %)
 * 3. Scenario 2 (Margin % + Negotiation %): Final Selling Price = {Total Cost / (1 - Margin %)} / (1 - Negotiation %)
 * 4. Scenario 3 (Negotiation % only): Final Selling Price = Total Cost / (1 - Negotiation %)
 * 5. Scenario 4 (Neither): Final Selling Price = Total Cost
 */
export function calculateProductPrice(
  factoryCost: number,
  accessoriesCost: number,
  marginPct: number,
  negotiationPct: number,
  manualUnitPrice?: number
) {
  const totalCost = (factoryCost || 0) + (accessoriesCost || 0)
  const M = Math.min(Math.max(marginPct || 0, 0), 99.9) / 100
  const N = Math.min(Math.max(negotiationPct || 0, 0), 99.9) / 100

  // Base selling price with Margin % only: Total Cost / (1 - M)
  const baseSellingPrice = M > 0 && M < 1
    ? Math.round((totalCost / (1 - M)) * 100) / 100
    : totalCost

  let computedFinalPrice = totalCost
  if (M > 0 && N > 0) {
    computedFinalPrice = Math.round(((totalCost / (1 - M)) / (1 - N)) * 100) / 100
  } else if (M > 0) {
    computedFinalPrice = Math.round((totalCost / (1 - M)) * 100) / 100
  } else if (N > 0) {
    computedFinalPrice = Math.round((totalCost / (1 - N)) * 100) / 100
  }

  const finalSellingPrice = (manualUnitPrice && manualUnitPrice > 0) ? manualUnitPrice : computedFinalPrice

  const marginValue = baseSellingPrice - totalCost
  const negotiationValue = finalSellingPrice - baseSellingPrice

  return {
    totalCost,
    baseSellingPrice,
    marginValue,
    negotiationValue,
    finalSellingPrice
  }
}

const initialStateFor = (item: CostingItemData): EditableItemState => ({
  id: item.id,
  factoryCost: item.materialCost ? item.materialCost : "",
  accessoriesCost: item.laborCost ? item.laborCost : "",
  marginPercentage: item.marginPercentage ? item.marginPercentage : "",
  negotiationPct: item.negotiationPct ? item.negotiationPct : "",
  unitPrice: 0,
  estimatorNotes: item.estimatorNotes || "",
  costingStatus: item.costingStatus || "PENDING_COSTING",
})

type ItemFilter = "all" | "pending" | "costed"

export function QuotationCostingWorkspaceModal({
  quotationGroup,
  open,
  onOpenChange,
  onSuccess
}: QuotationCostingWorkspaceModalProps) {
  const [loading, setLoading] = useState(false)
  const [itemStates, setItemStates] = useState<Record<string, EditableItemState>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<ItemFilter>("all")
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<CostingImportPreview | null>(null)
  const [importFileName, setImportFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const items = useMemo(() => quotationGroup?.items || [], [quotationGroup])

  // Initialize editable state when the workspace opens (or switches quotation); expand the first line
  // still needing costing. Keyed on the quotation id so a parent re-render can't wipe unsaved edits.
  const quotationKey = quotationGroup?.quotationId
  useEffect(() => {
    if (quotationGroup && open) {
      const initial: Record<string, EditableItemState> = {}
      quotationGroup.items.forEach((item) => {
        initial[item.id] = initialStateFor(item)
      })
      setItemStates(initial)
      const firstPending = quotationGroup.items.find((i) => !(i.materialCost || i.laborCost))
      setExpanded(firstPending ? { [firstPending.id]: true } : quotationGroup.items[0] ? { [quotationGroup.items[0].id]: true } : {})
      setImportedIds(new Set())
      setImportPreview(null)
      setFilter("all")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationKey, open])

  // Helper to update a specific field of an item
  const updateItemField = (itemId: string, field: keyof EditableItemState, value: any) => {
    setItemStates((prev) => {
      const curr = prev[itemId] || {
        id: itemId,
        factoryCost: "",
        accessoriesCost: "",
        marginPercentage: "",
        negotiationPct: "",
        unitPrice: 0,
        estimatorNotes: "",
        costingStatus: "PENDING_COSTING"
      }
      const updated = { ...curr, [field]: value }
      if (field === "factoryCost" || field === "accessoriesCost" || field === "marginPercentage" || field === "negotiationPct") {
        updated.unitPrice = 0
      }
      return { ...prev, [itemId]: updated }
    })
  }

  // Per-line calculations used by the cards, the totals and the filters
  const lineCalcs = useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateProductPrice> & {
      qty: number
      lineCost: number
      lineRevenue: number
      lineProfit: number
      linePct: number
      costed: boolean
    }> = {}
    for (const item of items) {
      const state = itemStates[item.id] || initialStateFor(item)
      const calc = calculateProductPrice(
        parseNum(state.factoryCost),
        parseNum(state.accessoriesCost),
        parseNum(state.marginPercentage),
        parseNum(state.negotiationPct),
        state.unitPrice
      )
      const qty = item.quantity || 1
      const lineRevenue = calc.finalSellingPrice * qty
      const lineCost = calc.totalCost * qty
      const lineProfit = lineRevenue - lineCost
      map[item.id] = {
        ...calc,
        qty,
        lineCost,
        lineRevenue,
        lineProfit,
        linePct: lineRevenue > 0 ? (lineProfit / lineRevenue) * 100 : 0,
        costed: calc.totalCost > 0,
      }
    }
    return map
  }, [items, itemStates])

  // Quotation-level totals
  const quotationTotals = useMemo(() => {
    let grandFactoryCost = 0
    let grandAccessoriesCost = 0
    let grandTotalCost = 0
    let grandBaseSellingPrice = 0
    let grandFinalSellingPrice = 0
    let grandNegotiation = 0
    let costedCount = 0

    items.forEach((item) => {
      const state = itemStates[item.id]
      const c = lineCalcs[item.id]
      if (!c) return
      grandFactoryCost += parseNum(state?.factoryCost) * c.qty
      grandAccessoriesCost += parseNum(state?.accessoriesCost) * c.qty
      grandTotalCost += c.lineCost
      grandBaseSellingPrice += c.baseSellingPrice * c.qty
      grandFinalSellingPrice += c.lineRevenue
      grandNegotiation += c.negotiationValue * c.qty
      if (c.costed) costedCount++
    })

    const grandTotalProfit = grandFinalSellingPrice - grandTotalCost
    const overallMarginPct = grandFinalSellingPrice > 0 ? (grandTotalProfit / grandFinalSellingPrice) * 100 : 0

    return {
      grandFactoryCost,
      grandAccessoriesCost,
      grandTotalCost,
      grandBaseSellingPrice,
      grandFinalSellingPrice,
      grandNegotiation,
      grandTotalProfit,
      overallMarginPct,
      costedCount,
    }
  }, [items, itemStates, lineCalcs])

  const pendingCount = items.length - quotationTotals.costedCount
  const visibleItems = items.filter((item) =>
    filter === "all" ? true : filter === "costed" ? lineCalcs[item.id]?.costed : !lineCalcs[item.id]?.costed
  )

  // ---------- Import updated costing ----------
  const currentValue = (itemId: string, field: CostingField): number | string => {
    const s = itemStates[itemId]
    if (!s) return field === "estimatorNotes" ? "" : 0
    if (field === "factoryCost") return parseNum(s.factoryCost)
    if (field === "accessoriesCost") return parseNum(s.accessoriesCost)
    if (field === "marginPct") return parseNum(s.marginPercentage)
    if (field === "negotiationPct") return parseNum(s.negotiationPct)
    return s.estimatorNotes || ""
  }

  /** Field changes of an imported row against the workspace's current (possibly unsaved) values. */
  const rowChanges = (row: CostingImportRow) => {
    if (!row.itemId || row.errors.length) return []
    const changes: { field: CostingField; from: number | string; to: number | string }[] = []
    for (const [field, to] of Object.entries(row.values) as [CostingField, number | string][]) {
      const from = currentValue(row.itemId, field)
      const same = typeof to === "number" ? Math.abs(Number(from) - to) < 0.005 : String(from).trim() === String(to).trim()
      if (!same) changes.push({ field, from, to })
    }
    return changes
  }

  const handleImportFile = async (file: File) => {
    if (!quotationGroup) return
    setImporting(true)
    setImportFileName(file.name)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/quotations/${quotationGroup.quotationId}/import-costing`, { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to read the costing file")
      setImportPreview(data)
    } catch (err: any) {
      toast.error(err.message || "Failed to read the costing file")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const applyImport = () => {
    if (!importPreview) return
    const applied = new Set<string>()
    setItemStates((prev) => {
      const next = { ...prev }
      for (const row of importPreview.rows) {
        if (!row.itemId || row.errors.length || rowChanges(row).length === 0) continue
        const curr = next[row.itemId]
        if (!curr) continue
        const v = row.values
        next[row.itemId] = {
          ...curr,
          factoryCost: v.factoryCost !== undefined ? v.factoryCost : curr.factoryCost,
          accessoriesCost: v.accessoriesCost !== undefined ? v.accessoriesCost : curr.accessoriesCost,
          marginPercentage: v.marginPct !== undefined ? v.marginPct : curr.marginPercentage,
          negotiationPct: v.negotiationPct !== undefined ? v.negotiationPct : curr.negotiationPct,
          estimatorNotes: v.estimatorNotes !== undefined ? String(v.estimatorNotes) : curr.estimatorNotes,
          unitPrice: 0, // recalculated from the imported values
        }
        applied.add(row.itemId)
      }
      return next
    })
    setImportedIds(applied)
    setImportPreview(null)
    toast.success(`Imported costing for ${applied.size} line(s). Review the figures, then Save Progress or mark Costing Completed.`)
  }

  // Save changes API handler
  const handleSaveCosting = async (isComplete: boolean) => {
    if (!quotationGroup) return
    setLoading(true)
    try {
      const payloadItems = items.map((item) => {
        const state = itemStates[item.id] || ({} as EditableItemState)
        const facCost = parseNum(state.factoryCost)
        const accCost = parseNum(state.accessoriesCost)
        const marginPct = parseNum(state.marginPercentage)
        const negotiationPct = parseNum(state.negotiationPct)

        const calc = calculateProductPrice(facCost, accCost, marginPct, negotiationPct, state.unitPrice)

        return {
          id: item.id,
          materialCost: facCost,       // Factory Cost stored in materialCost
          laborCost: accCost,          // Accessories Cost stored in laborCost
          overheadCost: 0,
          transportCost: 0,
          installationCost: 0,
          marginPercentage: marginPct,
          negotiationPct,
          unitPrice: calc.finalSellingPrice,
          estimatorNotes: state.estimatorNotes || "",
          costingStatus: isComplete ? "COSTING_COMPLETED" : (state.costingStatus || "COSTING_IN_PROGRESS")
        }
      })

      const res = await fetch(`/api/quotations/${quotationGroup.quotationId}/costing-update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update quotation costing")
      }

      if (isComplete) {
        toast.success(`Costing completed for Quotation ${quotationGroup.quotationNumber}! Sales team notified.`)
      } else {
        toast.success(`Costing progress saved for Quotation ${quotationGroup.quotationNumber}.`)
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Failed to save costing updates")
    } finally {
      setLoading(false)
    }
  }

  if (!quotationGroup) return null

  const overallTone = marginTone(quotationTotals.overallMarginPct)
  const allExpanded = visibleItems.length > 0 && visibleItems.every((i) => expanded[i.id])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl sm:max-w-6xl lg:max-w-7xl max-h-[94vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl border shadow-2xl bg-card">
          {/* Header: quotation, client, and the offline costing actions */}
          <DialogHeader className="px-5 sm:px-6 py-4 border-b shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  <Calculator className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">
                    Costing Workspace
                    <Badge variant="outline" className="font-mono text-xs">{quotationGroup.quotationNumber}</Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground flex items-center gap-x-3 gap-y-0.5 flex-wrap mt-0.5">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {quotationGroup.client?.companyName || "Client"}
                    </span>
                    {quotationGroup.projectName && <span className="truncate max-w-[240px]">Project: {quotationGroup.projectName}</span>}
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> {quotationGroup.preparedBy?.name || "Sales Team"}
                    </span>
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/api/quotations/${quotationGroup.quotationId}/export-costing`, "_blank")}
                  className="h-8 text-xs font-semibold cursor-pointer"
                  title="Download the costing breakdown as an Excel template you can update offline"
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  Export Costing Breakdown
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={importing}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs font-semibold cursor-pointer"
                  title="Upload the exported Excel file after updating costs offline"
                >
                  {importing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5 text-primary" />}
                  Import Updated Costing
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImportFile(f)
                  }}
                />
              </div>
            </div>
          </DialogHeader>

          {/* Key figures */}
          <div className="px-5 sm:px-6 py-4 border-b bg-muted/20 shrink-0 space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Total Cost" value={aed(quotationTotals.grandTotalCost)} hint="Factory + accessories × qty" />
              <KpiCard label="Selling Price" value={aed(quotationTotals.grandFinalSellingPrice)} hint="Revenue incl. negotiation buffer" accent="text-foreground" />
              <KpiCard
                label="Profit"
                value={aed(quotationTotals.grandTotalProfit)}
                hint="Selling price − cost"
                accent={quotationTotals.grandTotalProfit < 0 ? toneText.low : toneText.good}
              />
              <div className="rounded-xl border bg-card p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Margin</div>
                <div className={cn("text-xl font-bold tabular-nums", toneText[overallTone])}>
                  {quotationTotals.overallMarginPct.toFixed(1)}%
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden>
                  <div className={cn("h-full rounded-full", toneBg[overallTone])} style={{ width: `${Math.min(100, Math.max(0, quotationTotals.overallMarginPct))}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-x-5 gap-y-1 flex-wrap text-xs text-muted-foreground">
              <span>Factory <strong className="text-foreground tabular-nums">{aed(quotationTotals.grandFactoryCost)}</strong></span>
              <span>Accessories <strong className="text-foreground tabular-nums">{aed(quotationTotals.grandAccessoriesCost)}</strong></span>
              <span>Negotiation buffer <strong className="text-foreground tabular-nums">{aed(quotationTotals.grandNegotiation)}</strong></span>
              <span className="flex items-center gap-2 ml-auto">
                Costing progress
                <span className="inline-block w-24 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden>
                  <span
                    className="block h-full bg-primary rounded-full"
                    style={{ width: `${items.length ? (quotationTotals.costedCount / items.length) * 100 : 0}%` }}
                  />
                </span>
                <strong className="text-foreground">{quotationTotals.costedCount} of {items.length} costed</strong>
              </span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-5 sm:px-6 py-2.5 border-b flex items-center justify-between gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg" role="tablist" aria-label="Filter products">
              {([
                { key: "all", label: `All (${items.length})` },
                { key: "pending", label: `Pending (${pendingCount})` },
                { key: "costed", label: `Costed (${quotationTotals.costedCount})` },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === t.key}
                  onClick={() => setFilter(t.key)}
                  className={cn(
                    "px-3 h-7 text-xs font-semibold rounded-md cursor-pointer transition-colors",
                    filter === t.key ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs cursor-pointer"
              onClick={() => setExpanded(allExpanded ? {} : Object.fromEntries(visibleItems.map((i) => [i.id, true])))}
            >
              {allExpanded ? <ChevronsDownUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronsUpDown className="mr-1.5 h-3.5 w-3.5" />}
              {allExpanded ? "Collapse all" : "Expand all"}
            </Button>
          </div>

          {/* Product cards */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3">
            {visibleItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">
                {filter === "pending" ? "Every product has been costed." : "No products costed yet."}
              </p>
            )}
            {visibleItems.map((item) => {
              const state = itemStates[item.id] || initialStateFor(item)
              const c = lineCalcs[item.id]
              const isOpen = !!expanded[item.id]
              const tone = marginTone(c.linePct)
              const productImg = item.imageUrl || item.customImageUrl || item.product?.imageUrl || null
              const specs = cleanHtmlText(item.specifications || (item.product as any)?.specifications)
              const notes = cleanHtmlText(item.productDescription || item.productNotes)
              const index = items.indexOf(item) + 1
              const imported = importedIds.has(item.id)

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border bg-card transition-colors",
                    isOpen && "shadow-sm border-primary/30",
                    imported && "ring-1 ring-sky-400/60"
                  )}
                >
                  {/* Card header — always visible */}
                  <button
                    type="button"
                    onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
                  >
                    <span className="font-mono text-xs font-bold text-muted-foreground w-6 text-center shrink-0">{index}</span>
                    <div className="h-11 w-11 rounded-lg border bg-white flex items-center justify-center overflow-hidden shrink-0">
                      {productImg ? <img src={productImg} alt="" className="h-full w-full object-contain" /> : <Package className="h-5 w-5 text-muted-foreground/40" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">{item.description}</div>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                        {item.categoryName && <span>{item.categoryName}</span>}
                        {item.batchHeading && item.batchHeading !== "General Items" && (
                          <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{item.batchHeading}</span>
                        )}
                        <span>Qty {c.qty}</span>
                        {c.costed ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Costed</span>
                        ) : (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">Needs costing</span>
                        )}
                        {imported && <span className="font-semibold text-sky-600 dark:text-sky-400">Imported</span>}
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-5 text-right shrink-0">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Unit cost → price</div>
                        <div className="text-xs font-semibold tabular-nums">
                          {c.totalCost.toFixed(2)} → {c.finalSellingPrice.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Line profit</div>
                        <div className={cn("text-xs font-semibold tabular-nums", c.lineProfit < 0 ? toneText.low : "text-foreground")}>
                          {aed(c.lineProfit)}
                        </div>
                      </div>
                    </div>
                    <span className={cn("text-xs font-bold tabular-nums px-2 py-0.5 rounded-full border shrink-0", tonePill[tone])}>
                      {c.linePct.toFixed(1)}%
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
                  </button>

                  {isOpen && (
                    <div className="border-t p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* 1. Product information */}
                      <section className="lg:col-span-4 space-y-3">
                        <SectionTitle n={1} title="Product information" />
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            disabled={!productImg}
                            onClick={() => productImg && setEnlargedImage({ url: productImg, title: item.description })}
                            className="relative group h-24 w-24 rounded-lg border bg-white flex items-center justify-center overflow-hidden shrink-0 cursor-pointer disabled:cursor-default"
                            aria-label="Enlarge product image"
                          >
                            {productImg ? <img src={productImg} alt={item.description} className="h-full w-full object-contain" /> : <Package className="h-7 w-7 text-muted-foreground/40" />}
                            {productImg && (
                              <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Maximize2 className="h-4 w-4 text-white" />
                              </span>
                            )}
                          </button>
                          <div className="text-xs space-y-1 min-w-0">
                            <div className="font-semibold text-foreground leading-snug">{item.description}</div>
                            {item.product?.sku && <div className="font-mono text-muted-foreground">{item.product.sku}</div>}
                            <div className="text-muted-foreground">Quantity: <strong className="text-foreground">{c.qty}</strong></div>
                          </div>
                        </div>
                        {specs && (
                          <details className="group rounded-lg border bg-muted/30 px-3 py-2 text-xs" open={specs.length < 240}>
                            <summary className="cursor-pointer font-semibold text-muted-foreground list-none flex items-center justify-between">
                              Specifications
                              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                            </summary>
                            <p className="mt-1.5 whitespace-pre-line leading-relaxed text-foreground">{specs}</p>
                          </details>
                        )}
                        {notes && (
                          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs">
                            <div className="font-semibold text-amber-800 dark:text-amber-300">Sales notes</div>
                            <p className="mt-0.5 text-foreground leading-relaxed">{notes}</p>
                          </div>
                        )}
                      </section>

                      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* 2. Cost inputs */}
                        <section className="space-y-3">
                          <SectionTitle n={2} title="Cost inputs" note="per unit" />
                          <MoneyField
                            label="Factory cost"
                            hint="Base production"
                            value={state.factoryCost}
                            onChange={(v) => updateItemField(item.id, "factoryCost", v)}
                          />
                          <MoneyField
                            label="Accessories cost"
                            hint="Hardware & fittings"
                            value={state.accessoriesCost}
                            onChange={(v) => updateItemField(item.id, "accessoriesCost", v)}
                          />
                          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
                            <span className="text-muted-foreground">Total unit cost</span>
                            <strong className="tabular-nums">{aed(c.totalCost)}</strong>
                          </div>
                        </section>

                        {/* 3. Margin & negotiation */}
                        <section className="space-y-3">
                          <SectionTitle n={3} title="Margin & negotiation" />
                          <PercentField
                            label="Margin %"
                            hint="Profit target"
                            value={state.marginPercentage}
                            onChange={(v) => updateItemField(item.id, "marginPercentage", v)}
                          />
                          <div className="flex items-center gap-1 flex-wrap -mt-1">
                            {QUICK_MARGINS.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => updateItemField(item.id, "marginPercentage", m)}
                                className={cn(
                                  "text-[11px] px-2 h-6 rounded-md border cursor-pointer tabular-nums",
                                  parseNum(state.marginPercentage) === m ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                                )}
                              >
                                {m}%
                              </button>
                            ))}
                          </div>
                          <PercentField
                            label="Negotiation %"
                            hint="Buffer for client discounts"
                            value={state.negotiationPct}
                            onChange={(v) => updateItemField(item.id, "negotiationPct", v)}
                          />
                        </section>

                        {/* 4. Cost summary */}
                        <section className="space-y-2">
                          <SectionTitle n={4} title="Cost summary" note="per unit" />
                          <dl className="rounded-lg border divide-y text-xs">
                            <SummaryRow label="Total cost" value={aed(c.totalCost)} />
                            <SummaryRow label="+ Margin" value={aed(c.marginValue)} />
                            <SummaryRow label="+ Negotiation buffer" value={aed(c.negotiationValue)} />
                            <SummaryRow label="Selling price" value={aed(c.finalSellingPrice)} strong />
                          </dl>
                        </section>

                        {/* 5. Profit analysis */}
                        <section className="space-y-2">
                          <SectionTitle n={5} title="Profit analysis" note={`× ${c.qty}`} />
                          <dl className="rounded-lg border divide-y text-xs">
                            <SummaryRow label="Line revenue" value={aed(c.lineRevenue)} />
                            <SummaryRow label="Line cost" value={aed(c.lineCost)} />
                            <SummaryRow
                              label="Line profit"
                              value={aed(c.lineProfit)}
                              strong
                              valueClass={c.lineProfit < 0 ? toneText.low : toneText.good}
                            />
                          </dl>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Margin</span>
                            <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden>
                              <span className={cn("block h-full rounded-full", toneBg[tone])} style={{ width: `${Math.min(100, Math.max(0, c.linePct))}%` }} />
                            </span>
                            <strong className={cn("tabular-nums", toneText[tone])}>{c.linePct.toFixed(1)}%</strong>
                          </div>
                        </section>

                        <div className="md:col-span-2 space-y-1">
                          <label htmlFor={`notes-${item.id}`} className="text-xs font-semibold text-muted-foreground">
                            Estimator notes <span className="font-normal">(internal)</span>
                          </label>
                          <Input
                            id={`notes-${item.id}`}
                            type="text"
                            value={state.estimatorNotes || ""}
                            onChange={(e) => updateItemField(item.id, "estimatorNotes", e.target.value)}
                            placeholder="Materials, veneer specs, supplier quote references…"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-3 border-t flex items-center justify-between gap-3 flex-wrap shrink-0 bg-card">
            <span className="text-xs text-muted-foreground">
              {pendingCount > 0 ? `${pendingCount} product(s) still need costing.` : "All products are costed."}
              {importedIds.size > 0 && ` ${importedIds.size} line(s) updated from Excel — not saved yet.`}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading} className="h-9 cursor-pointer">
                Cancel
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSaveCosting(false)} disabled={loading} className="h-9 cursor-pointer">
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                Save Progress
              </Button>
              <Button
                size="sm"
                onClick={() => handleSaveCosting(true)}
                disabled={loading}
                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                title={pendingCount > 0 ? `${pendingCount} product(s) have no cost yet` : undefined}
              >
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                Costing Completed
              </Button>
            </div>
          </div>

          {/* Import preview */}
          {importPreview && (
            <ImportPreviewPanel
              preview={importPreview}
              fileName={importFileName}
              rowChanges={rowChanges}
              onCancel={() => setImportPreview(null)}
              onApply={applyImport}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Enlarged image */}
      <Dialog open={!!enlargedImage} onOpenChange={(o) => !o && setEnlargedImage(null)}>
        <DialogContent className="max-w-3xl sm:max-w-3xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm">{enlargedImage?.title}</DialogTitle>
          </DialogHeader>
          {enlargedImage && <img src={enlargedImage.url} alt={enlargedImage.title} className="w-full max-h-[75vh] object-contain rounded-lg bg-white" />}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------- small building blocks ----------

function KpiCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-bold tabular-nums truncate", accent || "text-foreground")} title={value}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

function SectionTitle({ n, title, note }: { n: number; title: string; note?: string }) {
  return (
    <h4 className="flex items-center gap-2 text-xs font-semibold text-foreground">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{n}</span>
      {title}
      {note && <span className="font-normal text-muted-foreground">· {note}</span>}
    </h4>
  )
}

function MoneyField({ label, hint, value, onChange }: { label: string; hint: string; value: number | string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-foreground flex justify-between">
        {label}
        <span className="text-[11px] font-normal text-muted-foreground">{hint}</span>
      </label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground pointer-events-none">AED</span>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="h-9 pl-11 text-sm font-semibold tabular-nums"
        />
      </div>
    </div>
  )
}

function PercentField({ label, hint, value, onChange }: { label: string; hint: string; value: number | string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-foreground flex justify-between">
        {label}
        <span className="text-[11px] font-normal text-muted-foreground">{hint}</span>
      </label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          max="99"
          step="0.1"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="h-9 pr-8 text-sm font-semibold tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">%</span>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, strong, valueClass }: { label: string; value: string; strong?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <dt className={cn("text-muted-foreground", strong && "text-foreground font-semibold")}>{label}</dt>
      <dd className={cn("tabular-nums", strong ? "font-bold" : "font-medium", valueClass)}>{value}</dd>
    </div>
  )
}

function ImportPreviewPanel({
  preview,
  fileName,
  rowChanges,
  onCancel,
  onApply,
}: {
  preview: CostingImportPreview
  fileName: string
  rowChanges: (row: CostingImportRow) => { field: CostingField; from: number | string; to: number | string }[]
  onCancel: () => void
  onApply: () => void
}) {
  const rows = preview.rows.map((r) => ({ ...r, diff: rowChanges(r) }))
  const changed = rows.filter((r) => r.itemId && !r.errors.length && r.diff.length > 0)
  const unchanged = rows.filter((r) => r.itemId && !r.errors.length && r.diff.length === 0)
  const invalid = rows.filter((r) => r.errors.length > 0)
  const blocked = preview.fileErrors.some((e) => /exported for quotation/i.test(e))
  const fmt = (field: CostingField, v: number | string) =>
    field === "estimatorNotes" ? (String(v) || "—") : field === "marginPct" || field === "negotiationPct" ? `${Number(v).toFixed(1)}%` : Number(v).toFixed(2)

  return (
    <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-full bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden" role="dialog" aria-label="Import preview">
        <div className="px-5 py-4 border-b flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Review imported costing
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fileName} · {preview.templateRecognised ? "BOSQ costing template" : "Unrecognised template — columns matched by name"}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onCancel} aria-label="Close preview">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-5 py-3 border-b grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <Stat label="Will update" value={changed.length} tone="text-sky-600 dark:text-sky-400" />
          <Stat label="No change" value={unchanged.length} tone="text-muted-foreground" />
          <Stat label="Invalid" value={invalid.filter((r) => r.matchedBy).length} tone="text-rose-600 dark:text-rose-400" />
          <Stat label="Unmatched" value={rows.filter((r) => !r.matchedBy).length} tone="text-amber-600 dark:text-amber-400" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {preview.fileErrors.map((e) => (
            <div key={e} className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
              <CircleAlert className="h-4 w-4 shrink-0 mt-0.5" /> {e}
            </div>
          ))}

          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-1.5 pr-2 font-semibold">Row</th>
                <th className="py-1.5 pr-2 font-semibold">Product</th>
                <th className="py-1.5 font-semibold">Changes / issues</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = r.errors.length ? "error" : r.diff.length ? "change" : "same"
                return (
                  <tr
                    key={r.row}
                    className={cn(
                      "border-b align-top",
                      status === "error" && "bg-rose-500/5",
                      status === "change" && "bg-sky-500/5"
                    )}
                  >
                    <td className="py-2 pr-2 font-mono text-muted-foreground">{r.row}</td>
                    <td className="py-2 pr-2">
                      <div className="font-medium text-foreground">{r.description || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.slNo && `#${r.slNo}`} {r.itemCode && `· ${r.itemCode}`}
                        {r.matchedBy && ` · matched by ${r.matchedBy === "lineItemId" ? "Line Item ID" : r.matchedBy === "itemCode" ? "Item Code" : "Sl No"}`}
                      </div>
                    </td>
                    <td className="py-2 space-y-0.5">
                      {r.errors.map((e) => (
                        <div key={e} className="flex items-start gap-1 text-rose-700 dark:text-rose-300"><CircleAlert className="h-3.5 w-3.5 shrink-0 mt-px" />{e}</div>
                      ))}
                      {!r.errors.length && r.diff.map((d) => (
                        <div key={d.field}>
                          <span className="text-muted-foreground">{COSTING_FIELD_LABELS[d.field]}:</span>{" "}
                          <span className="line-through text-muted-foreground">{fmt(d.field, d.from)}</span>{" "}
                          → <strong className="text-foreground">{fmt(d.field, d.to)}</strong>
                        </div>
                      ))}
                      {!r.errors.length && r.diff.length === 0 && <span className="text-muted-foreground">No change</span>}
                      {r.warnings.map((w) => (
                        <div key={w} className="flex items-start gap-1 text-amber-700 dark:text-amber-300"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />{w}</div>
                      ))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {preview.missingItems.length > 0 && (
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
              <div className="font-semibold text-foreground">Not in the file (left unchanged)</div>
              <div className="text-muted-foreground">{preview.missingItems.map((m) => `#${m.itemNo} ${m.description}`).join(" · ")}</div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">
            Rows with errors are skipped. Applied values update the workspace; save to keep them.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="h-9 cursor-pointer">Cancel</Button>
            <Button size="sm" onClick={onApply} disabled={blocked || changed.length === 0} className="h-9 cursor-pointer">
              <Check className="mr-1.5 h-4 w-4" />
              Apply {changed.length} update{changed.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border px-2 py-1.5">
      <div className={cn("text-lg font-bold tabular-nums", tone)}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}
