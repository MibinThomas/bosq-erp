"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useWatch, type UseFormReturn } from "react-hook-form"
import { ArrowDown, ArrowUp, ImageIcon, Loader2, Plus, Search, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Poster = { id: string; title: string; imageUrl: string; tags: string[] }

/**
 * The picker bound to the quotation form (fields: items, postersAuto, posterIds). It subscribes
 * only to those fields, so typing elsewhere in the form doesn't re-render it.
 */
export function QuotationPosterField({ form, disabled }: { form: UseFormReturn<any>; disabled?: boolean }) {
  const items = useWatch({ control: form.control, name: "items" }) as { productId?: string }[] | undefined
  const auto = useWatch({ control: form.control, name: "postersAuto" }) as boolean | undefined
  const ids = useWatch({ control: form.control, name: "posterIds" }) as string[] | undefined
  const productIds = useMemo(() => (items || []).map((i) => i?.productId || "").filter(Boolean), [items])
  return (
    <QuotationPosterPicker
      productIds={productIds}
      auto={auto !== false}
      selectedIds={ids || []}
      disabled={disabled}
      onChange={(nextAuto, nextIds) => {
        form.setValue("postersAuto", nextAuto, { shouldDirty: true })
        form.setValue("posterIds", nextIds, { shouldDirty: true })
      }}
    />
  )
}

/**
 * Poster pages for a quotation PDF. Automatic: posters linked to the quotation's products /
 * categories (or marked for all quotations). Manual: exactly the chosen posters, in order.
 */
export function QuotationPosterPicker({ productIds, auto, selectedIds, onChange, disabled }: {
  productIds: string[]
  auto: boolean
  selectedIds: string[]
  onChange: (auto: boolean, ids: string[]) => void
  disabled?: boolean
}) {
  const [suggested, setSuggested] = useState<Poster[]>([])
  const [library, setLibrary] = useState<Poster[]>([])
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [q, setQ] = useState("")

  const productKey = useMemo(() => Array.from(new Set(productIds.filter(Boolean))).sort().join(","), [productIds])

  // Suggestions follow the products in the quotation
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/posters?forProducts=${encodeURIComponent(productKey)}`)
        const data = await res.json()
        setSuggested(Array.isArray(data) ? data : [])
      } catch {
        setSuggested([])
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [productKey])

  // The library is needed to show manually chosen posters and to add more
  useEffect(() => {
    if (auto && !pickerOpen) return
    if (library.length > 0) return
    fetch("/api/posters").then((r) => r.json()).then((d) => setLibrary(Array.isArray(d) ? d : [])).catch(() => {})
  }, [auto, pickerOpen, library.length])

  const byId = (id: string) => library.find((p) => p.id === id) || suggested.find((p) => p.id === id)
  const shown: Poster[] = auto ? suggested : selectedIds.map(byId).filter((p): p is Poster => !!p)

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...selectedIds]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(false, next)
  }

  const filteredLibrary = library.filter((p) => {
    const term = q.trim().toLowerCase()
    return !term || p.title.toLowerCase().includes(term) || p.tags.some((t) => t.includes(term))
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /> Poster pages</p>
          <p className="text-xs text-muted-foreground">
            {auto
              ? "Automatic: posters linked to the products in this quotation print after the quotation."
              : "Manual: exactly these posters print after the quotation, in this order."}
          </p>
        </div>
        <div className="flex gap-2">
          {auto ? (
            <Button type="button" size="sm" variant="outline" disabled={disabled}
              onClick={() => onChange(false, suggested.map((p) => p.id))}>
              Choose manually
            </Button>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => setPickerOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add poster
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(true, [])}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Automatic
              </Button>
            </>
          )}
        </div>
      </div>

      {loading && auto ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding posters…</div>
      ) : shown.length === 0 ? (
        <p className="text-xs text-muted-foreground rounded-xl border border-dashed p-4 text-center">
          {auto
            ? "No posters are linked to these products yet. Add them in Settings → Poster Library, or choose manually."
            : "No posters selected. The PDF will have no poster pages."}
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {shown.map((p, idx) => (
            <div key={p.id} className="w-28 shrink-0 rounded-xl border overflow-hidden bg-card">
              <div className="aspect-[1/1.414] bg-muted relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.title} loading="lazy" className="w-full h-full object-contain" />
                {!auto && !disabled && (
                  <button type="button" aria-label={`Remove ${p.title}`}
                    onClick={() => onChange(false, selectedIds.filter((x) => x !== p.id))}
                    className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-0.5 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="p-1.5 space-y-1">
                <p className="text-[10px] font-semibold leading-tight line-clamp-2">{p.title}</p>
                {!auto && !disabled && (
                  <div className="flex justify-between">
                    <button type="button" aria-label="Move earlier" disabled={idx === 0} onClick={() => move(idx, -1)} className="cursor-pointer disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                    <button type="button" aria-label="Move later" disabled={idx === shown.length - 1} onClick={() => move(idx, 1)} className="cursor-pointer disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add posters</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or tag…" className="h-9 pl-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {filteredLibrary.map((p) => {
              const chosen = selectedIds.includes(p.id)
              const isSuggested = suggested.some((s) => s.id === p.id)
              return (
                <button key={p.id} type="button" disabled={chosen}
                  onClick={() => onChange(false, [...selectedIds, p.id])}
                  className={`rounded-xl border overflow-hidden text-left cursor-pointer ${chosen ? "opacity-40 cursor-default" : "hover:border-primary"}`}>
                  <div className="aspect-[1/1.414] bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt={p.title} loading="lazy" className="w-full h-full object-contain" />
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-[11px] font-semibold leading-tight">{p.title}</p>
                    {chosen ? <Badge variant="secondary" className="text-[9px]">Added</Badge>
                      : isSuggested ? <Badge variant="outline" className="text-[9px]">Suggested</Badge> : null}
                  </div>
                </button>
              )
            })}
            {filteredLibrary.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground text-center py-8">No posters found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
