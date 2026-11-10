"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Globe, ImagePlus, Loader2, Pencil, Plus, Search, Trash2, UploadCloud, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { prepareImageForUpload } from "@/lib/image-upload"

type LinkedProduct = { id: string; name: string }
type Poster = {
  id: string
  title: string
  description: string | null
  imageUrl: string
  tags: string[]
  productIds: string[]
  categoryIds: string[]
  appliesToAll: boolean
  isActive: boolean
  sortOrder: number
  products?: LinkedProduct[]
}
type Category = { id: string; name: string; parentId: string | null }

type Draft = {
  id?: string
  title: string
  description: string
  imageUrl: string
  tags: string
  products: LinkedProduct[]
  categoryIds: string[]
  appliesToAll: boolean
  isActive: boolean
  sortOrder: string
}

const emptyDraft = (): Draft => ({
  title: "", description: "", imageUrl: "", tags: "", products: [], categoryIds: [],
  appliesToAll: false, isActive: true, sortOrder: "0",
})

/** Searchable product picker that adds products to a list. */
function ProductLinker({ value, onChange }: { value: LinkedProduct[]; onChange: (v: LinkedProduct[]) => void }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<LinkedProduct[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(term)}&page=1&pageSize=15`)
        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items : []
        setResults(items.map((p: any) => ({ id: p.id, name: `${p.productName} (${p.productCode})` })))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-[11px] font-semibold">
            {p.name}
            <button type="button" aria-label={`Remove ${p.name}`} className="cursor-pointer"
              onClick={() => onChange(value.filter((x) => x.id !== p.id))}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products by name or code…" className="h-9 pl-8 text-sm" />
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin absolute right-2.5 top-2.5 text-muted-foreground" />}
      </div>
      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
          {results.filter((r) => !value.some((v) => v.id === r.id)).map((r) => (
            <button key={r.id} type="button" className="w-full text-left px-3 py-2 text-xs hover:bg-muted cursor-pointer"
              onClick={() => { onChange([...value, r]); setQ(""); setResults([]) }}>
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function PosterLibraryManager() {
  const [posters, setPosters] = useState<Poster[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/posters?includeInactive=1"),
        fetch("/api/products/categories"),
      ])
      const p = await pRes.json()
      if (!pRes.ok) throw new Error(p.error || "Failed to load posters")
      setPosters(p)
      const c = await cRes.json().catch(() => [])
      setCategories(Array.isArray(c) ? c.map((x: any) => ({ id: x.id, name: x.name, parentId: x.parentId || null })) : [])
    } catch (err: any) {
      toast.error(err.message || "Failed to load posters")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || "Unknown category"

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const prepared = await prepareImageForUpload(file)
      const form = new FormData()
      form.append("file", prepared)
      const res = await fetch("/api/upload?type=poster", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setDraft((d) => (d ? { ...d, imageUrl: data.url, title: d.title || file.name.replace(/\.[^.]+$/, "") } : d))
    } catch (err: any) {
      toast.error(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const payload = {
        title: draft.title,
        description: draft.description || null,
        imageUrl: draft.imageUrl,
        tags: draft.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
        productIds: draft.products.map((p) => p.id),
        categoryIds: draft.categoryIds,
        appliesToAll: draft.appliesToAll,
        isActive: draft.isActive,
        sortOrder: parseInt(draft.sortOrder || "0", 10) || 0,
      }
      const res = await fetch(draft.id ? `/api/posters/${draft.id}` : "/api/posters", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save poster")
      toast.success(draft.id ? "Poster updated." : "Poster added to the library.")
      setDraft(null)
      await load()
    } catch (err: any) {
      toast.error(err.message || "Failed to save poster")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (p: Poster) => {
    if (!window.confirm(`Delete "${p.title}" from the library? Quotations that use it will stop printing it.`)) return
    const res = await fetch(`/api/posters/${p.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(data.error || "Failed to delete poster"); return }
    toast.success("Poster deleted.")
    await load()
  }

  const toggleActive = async (p: Poster, isActive: boolean) => {
    setPosters((ps) => ps.map((x) => (x.id === p.id ? { ...x, isActive } : x)))
    const res = await fetch(`/api/posters/${p.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }),
    })
    if (!res.ok) { toast.error("Failed to update poster"); await load() }
  }

  const visible = posters.filter((p) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return p.title.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)) ||
      (p.products || []).some((x) => x.name.toLowerCase().includes(q))
  })

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg"><ImagePlus className="h-5 w-5 text-primary" /> Poster Library</CardTitle>
            <CardDescription className="max-w-2xl">
              Product posters and brochure pages, printed as full A4 pages after the quotation.
              Link a poster to products or categories and it is added automatically to quotations that include them;
              consultants can still add or remove posters per quotation. Images only (JPG, PNG, WebP); portrait A4 proportions print best.
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setDraft(emptyDraft())} className="shrink-0"><Plus className="h-4 w-4 mr-1" /> Add poster</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, tag or product…" className="h-9 pl-8 text-sm" />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading posters…</div>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              {posters.length === 0 ? "No posters yet. Add your first product poster or brochure page." : "No posters match your search."}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {visible.map((p) => (
                <div key={p.id} className={`rounded-2xl border overflow-hidden bg-card flex flex-col ${p.isActive ? "" : "opacity-60"}`}>
                  <div className="aspect-[1/1.414] bg-muted flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt={p.title} loading="lazy" className="w-full h-full object-contain" />
                  </div>
                  <div className="p-3 space-y-2 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold leading-tight">{p.title}</p>
                      <Switch checked={p.isActive} onCheckedChange={(v) => toggleActive(p, v)} aria-label="Active" />
                    </div>
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {p.appliesToAll && <Badge variant="outline" className="text-[10px]"><Globe className="h-3 w-3 mr-1" />All quotations</Badge>}
                      {(p.products || []).slice(0, 3).map((x) => <Badge key={x.id} variant="secondary" className="text-[10px]">{x.name}</Badge>)}
                      {(p.products || []).length > 3 && <Badge variant="secondary" className="text-[10px]">+{(p.products || []).length - 3} products</Badge>}
                      {p.categoryIds.map((id) => <Badge key={id} variant="outline" className="text-[10px]">{categoryName(id)}</Badge>)}
                      {p.tags.map((t) => <span key={t} className="text-muted-foreground">#{t}</span>)}
                    </div>
                    <div className="flex gap-2 pt-1 mt-auto">
                      <Button type="button" size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setDraft({
                        id: p.id, title: p.title, description: p.description || "", imageUrl: p.imageUrl,
                        tags: p.tags.join(", "), products: p.products || [], categoryIds: p.categoryIds,
                        appliesToAll: p.appliesToAll, isActive: p.isActive, sortOrder: String(p.sortOrder),
                      })}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => remove(p)} aria-label="Delete poster">
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={draft !== null} onOpenChange={(o) => { if (!o) setDraft(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit poster" : "Add poster"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-32 shrink-0 aspect-[1/1.414] rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted cursor-pointer hover:border-primary">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    : draft.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={draft.imageUrl} alt="" className="w-full h-full object-contain" />
                      : <span className="text-[11px] text-muted-foreground flex flex-col items-center gap-1 p-2 text-center"><UploadCloud className="h-5 w-5" />Upload image</span>}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = "" }} />
                <div className="flex-1 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title</Label>
                    <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Executive Desk Series — Walnut" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description (optional)</Label>
                    <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="min-h-[60px] text-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Linked products</Label>
                <ProductLinker value={draft.products} onChange={(products) => setDraft({ ...draft, products })} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Linked categories (a parent category covers its sub-categories)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => {
                    const on = draft.categoryIds.includes(c.id)
                    return (
                      <button key={c.id} type="button" aria-pressed={on}
                        onClick={() => setDraft({ ...draft, categoryIds: on ? draft.categoryIds.filter((x) => x !== c.id) : [...draft.categoryIds, c.id] })}
                        className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold cursor-pointer ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                        {c.parentId ? `↳ ${c.name}` : c.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tags (comma separated)</Label>
                  <Input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="walnut, executive, brochure" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Print order (lower first)</Label>
                  <Input type="number" min={0} value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={draft.appliesToAll} onCheckedChange={(v) => setDraft({ ...draft, appliesToAll: v })} />
                  Suggest for every quotation (e.g. company profile)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} />
                  Active
                </label>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving || uploading || !draft?.imageUrl || !draft?.title.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} {draft?.id ? "Save changes" : "Add poster"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
