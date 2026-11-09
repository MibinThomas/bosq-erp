"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ArrowDown, ArrowUp, CheckCircle2, History, Layers, Loader2, Plus, Power, Save, ScrollText, ShieldCheck, Trash2, X,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

type UserOption = { id: string; name: string | null; email: string | null; role: string; department: string | null }

type LevelDraft = { key: string; name: string; approverRoles: string[]; approverUserIds: string[] }
type RuleDraft = {
  key: string
  name: string
  isActive: boolean
  levelKey: string
  minDiscountPct: string
  minAmount: string
  maxMarginPct: string
  customerSegments: string[]
  departments: string[]
  projectKeyword: string
}

type ModuleEntry = {
  module: string
  label: string
  available: boolean
  workflow: null | {
    enabled: boolean
    levels: { id: string; rank: number; name: string; approverRoles: string[]; approverUserIds: string[] }[]
    rules: {
      id: string; name: string; isActive: boolean; levelId: string
      minDiscountPct: number | null; minAmount: number | null; maxMarginPct?: number | null
      customerSegments: string[]; departments: string[]; projectKeyword: string | null
    }[]
  }
}

type LogRow = {
  id: string; documentId: string; documentNumber: string; levelName: string; status: string
  reason: string | null; metrics: any; requestedByName: string | null; decidedByName: string | null
  decidedAt: string | null; comment: string | null; createdAt: string
}

let keySeq = 0
const newKey = () => `new_${Date.now()}_${keySeq++}`

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  REJECTED: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
}

function ChipToggle({ options, selected, onChange, empty }: {
  options: string[]; selected: string[]; onChange: (next: string[]) => void; empty?: string
}) {
  if (options.length === 0) return <p className="text-xs text-muted-foreground">{empty || "None available"}</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(on ? selected.filter((s) => s !== opt) : [...selected, opt])}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors cursor-pointer ${
              on ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted"
            }`}
            aria-pressed={on}
          >
            {opt.replace(/_/g, " ")}
          </button>
        )
      })}
    </div>
  )
}

export function ApprovalSettingsManager() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const [masterEnabled, setMasterEnabled] = useState(false)
  const [modules, setModules] = useState<ModuleEntry[]>([])
  const [moduleEnabled, setModuleEnabled] = useState(true)
  const [levels, setLevels] = useState<LevelDraft[]>([])
  const [rules, setRules] = useState<RuleDraft[]>([])

  const [roles, setRoles] = useState<string[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [segments, setSegments] = useState<string[]>([])

  const [logs, setLogs] = useState<LogRow[]>([])
  const [settingsChanges, setSettingsChanges] = useState<any[]>([])
  const [logTotal, setLogTotal] = useState(0)
  const [logPage, setLogPage] = useState(1)
  const [logStatus, setLogStatus] = useState("")
  const [logSearch, setLogSearch] = useState("")
  const [logsLoading, setLogsLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/approvals")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load approval settings")
      setMasterEnabled(!!data.masterEnabled)
      setModules(data.workflows || [])
      setRoles(data.roles || [])
      setUsers(data.users || [])
      setDepartments(data.departments || [])
      setSegments(data.customerSegments || [])

      const wf = (data.workflows || []).find((m: ModuleEntry) => m.module === "QUOTATION")?.workflow
      if (wf) {
        setModuleEnabled(!!wf.enabled)
        setLevels(wf.levels.map((l: any) => ({
          key: l.id, name: l.name, approverRoles: l.approverRoles || [], approverUserIds: l.approverUserIds || [],
        })))
        setRules(wf.rules.map((r: any) => ({
          key: r.id,
          name: r.name,
          isActive: r.isActive,
          levelKey: r.levelId,
          minDiscountPct: r.minDiscountPct == null ? "" : String(r.minDiscountPct),
          minAmount: r.minAmount == null ? "" : String(r.minAmount),
          maxMarginPct: r.maxMarginPct == null ? "" : String(r.maxMarginPct),
          customerSegments: r.customerSegments || [],
          departments: r.departments || [],
          projectKeyword: r.projectKeyword || "",
        })))
      }
      setDirty(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to load approval settings")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLogs = useCallback(async (page: number, status: string, q: string) => {
    setLogsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (status) params.set("status", status)
      if (q.trim()) params.set("q", q.trim())
      const res = await fetch(`/api/settings/approvals/logs?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load approval logs")
      setLogs(data.requests || [])
      setLogTotal(data.total || 0)
      if (page === 1) setSettingsChanges(data.settingsChanges || [])
    } catch (err: any) {
      toast.error(err.message || "Failed to load approval logs")
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadLogs(logPage, logStatus, logSearch) }, [loadLogs, logPage, logStatus]) // search applies on Enter

  const touch = () => setDirty(true)
  const userLabel = (id: string) => {
    const u = users.find((x) => x.id === id)
    return u ? `${u.name || u.email} (${u.role.replace(/_/g, " ")})` : "Unknown user"
  }

  // ── Levels ──
  const updateLevel = (key: string, patch: Partial<LevelDraft>) => {
    setLevels((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
    touch()
  }
  const moveLevel = (idx: number, dir: -1 | 1) => {
    setLevels((ls) => {
      const next = [...ls]
      const j = idx + dir
      if (j < 0 || j >= next.length) return ls
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
    touch()
  }
  const removeLevel = (key: string) => {
    if (rules.some((r) => r.levelKey === key)) {
      toast.error("Rules still use this level. Point them at another level or delete them first.")
      return
    }
    setLevels((ls) => ls.filter((l) => l.key !== key))
    touch()
  }
  const addLevel = () => {
    setLevels((ls) => [...ls, { key: newKey(), name: `Level ${ls.length + 1}`, approverRoles: ["ADMIN"], approverUserIds: [] }])
    touch()
  }

  // ── Rules ──
  const updateRule = (key: string, patch: Partial<RuleDraft>) => {
    setRules((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    touch()
  }
  const addRule = () => {
    if (levels.length === 0) {
      toast.error("Add an approval level first.")
      return
    }
    setRules((rs) => [...rs, {
      key: newKey(), name: "New rule", isActive: true, levelKey: levels[0].key,
      minDiscountPct: "", minAmount: "", maxMarginPct: "", customerSegments: [], departments: [], projectKeyword: "",
    }])
    touch()
  }

  const describeRule = (r: RuleDraft) => {
    const parts: string[] = []
    if (r.minDiscountPct !== "") parts.push(`discount above ${r.minDiscountPct}%`)
    if (r.minAmount !== "") parts.push(`value at least AED ${Number(r.minAmount).toLocaleString()}`)
    if (r.maxMarginPct !== "") parts.push(`margin below ${r.maxMarginPct}%`)
    if (r.customerSegments.length) parts.push(`segment is ${r.customerSegments.join(" / ")}`)
    if (r.departments.length) parts.push(`prepared by ${r.departments.join(" / ")}`)
    if (r.projectKeyword.trim()) parts.push(`project name contains "${r.projectKeyword.trim()}"`)
    const level = levels.find((l) => l.key === r.levelKey)?.name || "?"
    return parts.length ? `When ${parts.join(" and ")} → ${level}` : `Every quotation → ${level}`
  }

  const save = async () => {
    const rankByKey = new Map(levels.map((l, i) => [l.key, i + 1]))
    setSaving(true)
    try {
      const res = await fetch("/api/settings/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterEnabled,
          workflow: {
            module: "QUOTATION",
            enabled: moduleEnabled,
            levels: levels.map((l, i) => ({
              rank: i + 1, name: l.name, approverRoles: l.approverRoles, approverUserIds: l.approverUserIds,
            })),
            rules: rules.map((r) => ({
              name: r.name,
              isActive: r.isActive,
              levelRank: rankByKey.get(r.levelKey) ?? 0,
              minDiscountPct: r.minDiscountPct,
              minAmount: r.minAmount,
              maxMarginPct: r.maxMarginPct,
              customerSegments: r.customerSegments,
              departments: r.departments,
              projectKeyword: r.projectKeyword || null,
            })),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save approval settings")
      toast.success("Approval settings saved. They apply immediately.")
      await load()
      void loadLogs(1, logStatus, logSearch)
      setLogPage(1)
    } catch (err: any) {
      toast.error(err.message || "Failed to save approval settings")
    } finally {
      setSaving(false)
    }
  }

  const effectiveOn = masterEnabled && moduleEnabled
  const logPages = Math.max(1, Math.ceil(logTotal / 25))
  const levelOptions = useMemo(() => levels.map((l, i) => ({ key: l.key, label: `${i + 1}. ${l.name}` })), [levels])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading approval settings…
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Master switch */}
      <Card className="rounded-3xl">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Power className="h-5 w-5 text-primary" /> Approval Module
            </CardTitle>
            <CardDescription className="max-w-2xl">
              When ON, documents that match an approval rule must be approved before they can be sent to the client.
              When OFF, users create and send documents without any approval. Changes apply immediately — no deployment needed.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="outline" className={masterEnabled ? STATUS_STYLES.APPROVED : STATUS_STYLES.CANCELLED}>
              {masterEnabled ? "ON" : "OFF"}
            </Badge>
            <Switch checked={masterEnabled} onCheckedChange={(v) => { setMasterEnabled(v); touch() }} aria-label="Approval Module" />
          </div>
        </CardHeader>
      </Card>

      {/* Modules */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Layers className="h-5 w-5 text-primary" /> Approval workflows by document type</CardTitle>
          <CardDescription>Turn approvals on or off for each document type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {modules.map((m) => (
            <div key={m.module} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3">
              <div>
                <p className="text-sm font-bold">{m.label}</p>
                <p className="text-xs text-muted-foreground">
                  {m.available
                    ? effectiveOn ? "Approvals are active" : masterEnabled ? "Turned off for this document type" : "Inactive while the Approval Module is OFF"
                    : "Available when this module is added to the ERP"}
                </p>
              </div>
              {m.available ? (
                <Switch checked={moduleEnabled} onCheckedChange={(v) => { setModuleEnabled(v); touch() }} aria-label={`${m.label} approvals`} />
              ) : (
                <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Levels */}
      <Card className="rounded-3xl">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-primary" /> Quotation approval levels</CardTitle>
            <CardDescription className="max-w-2xl">
              Ordered from junior (1) to senior. A quotation needs one approval from the most senior level its rules require.
              Approvers of a level can also approve any lower level. Super Admin can always approve.
            </CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addLevel} className="shrink-0"><Plus className="h-4 w-4 mr-1" /> Add level</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {levels.length === 0 && <p className="text-sm text-muted-foreground">No levels yet.</p>}
          {levels.map((l, idx) => (
            <div key={l.key} className="rounded-2xl border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono shrink-0">{idx + 1}</Badge>
                <Input value={l.name} onChange={(e) => updateLevel(l.key, { name: e.target.value })} className="h-9 font-semibold" aria-label="Level name" />
                <Button type="button" size="icon" variant="ghost" onClick={() => moveLevel(idx, -1)} disabled={idx === 0} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => moveLevel(idx, 1)} disabled={idx === levels.length - 1} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeLevel(l.key)} aria-label="Delete level"><Trash2 className="h-4 w-4 text-rose-500" /></Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Approver roles</Label>
                <ChipToggle options={roles} selected={l.approverRoles} onChange={(v) => updateLevel(l.key, { approverRoles: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Specific approvers (optional)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {l.approverUserIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-[11px] font-semibold">
                      {userLabel(id)}
                      <button type="button" onClick={() => updateLevel(l.key, { approverUserIds: l.approverUserIds.filter((x) => x !== id) })} aria-label="Remove approver" className="cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  className="h-9 w-full sm:w-80 rounded-md border bg-background px-2 text-sm"
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !l.approverUserIds.includes(e.target.value)) {
                      updateLevel(l.key, { approverUserIds: [...l.approverUserIds, e.target.value] })
                    }
                  }}
                  aria-label="Add approver"
                >
                  <option value="">+ Add a user…</option>
                  {users.filter((u) => !l.approverUserIds.includes(u.id)).map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.email} — {u.role.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rules */}
      <Card className="rounded-3xl">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base"><ScrollText className="h-5 w-5 text-primary" /> Quotation approval rules</CardTitle>
            <CardDescription className="max-w-2xl">
              A rule applies when all of its filled-in conditions match. Leave a condition empty to ignore it.
              Discount is the largest of the line, overall and special discount. Value is the grand total.
              Margin is the profit margin on lines with a known cost (e.g. from the estimator), after discounts.
            </CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addRule} className="shrink-0"><Plus className="h-4 w-4 mr-1" /> Add rule</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground">No rules: no quotation needs approval, even while the module is ON.</p>
          )}
          {rules.map((r) => (
            <div key={r.key} className={`rounded-2xl border p-4 space-y-3 ${r.isActive ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Input value={r.name} onChange={(e) => updateRule(r.key, { name: e.target.value })} className="h-9 font-semibold flex-1 min-w-48" aria-label="Rule name" />
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Active</span>
                  <Switch checked={r.isActive} onCheckedChange={(v) => updateRule(r.key, { isActive: v })} aria-label="Rule active" />
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => { setRules((rs) => rs.filter((x) => x.key !== r.key)); touch() }} aria-label="Delete rule">
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Requires level</Label>
                  <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={r.levelKey}
                    onChange={(e) => updateRule(r.key, { levelKey: e.target.value })}>
                    {levelOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Discount above (%)</Label>
                  <Input type="number" min={0} step="0.1" inputMode="decimal" placeholder="Any" value={r.minDiscountPct}
                    onChange={(e) => updateRule(r.key, { minDiscountPct: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Value at least (AED)</Label>
                  <Input type="number" min={0} step="1000" inputMode="decimal" placeholder="Any" value={r.minAmount}
                    onChange={(e) => updateRule(r.key, { minAmount: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Margin below (%)</Label>
                  <Input type="number" step="0.5" inputMode="decimal" placeholder="Any" value={r.maxMarginPct}
                    onChange={(e) => updateRule(r.key, { maxMarginPct: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Project name contains</Label>
                  <Input placeholder="Any" value={r.projectKeyword} onChange={(e) => updateRule(r.key, { projectKeyword: e.target.value })} className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer segment (any selected)</Label>
                  <ChipToggle options={segments} selected={r.customerSegments} onChange={(v) => updateRule(r.key, { customerSegments: v })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Preparer&apos;s department (any selected)</Label>
                  <ChipToggle options={departments} selected={r.departments} onChange={(v) => updateRule(r.key, { departments: v })} empty="No departments set on users yet" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {describeRule(r)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><History className="h-5 w-5 text-primary" /> Approval log</CardTitle>
          <CardDescription>Every approval request and decision, plus changes to these settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={logStatus}
              onChange={(e) => { setLogPage(1); setLogStatus(e.target.value) }} aria-label="Filter by status">
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <Input placeholder="Search quotation number, then Enter" value={logSearch} className="h-9 w-full sm:w-72"
              onChange={(e) => setLogSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setLogPage(1); void loadLogs(1, logStatus, logSearch) } }} />
          </div>

          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold">Quotation</th>
                  <th className="px-3 py-2 font-semibold">Level</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Discount / value</th>
                  <th className="px-3 py-2 font-semibold">Requested</th>
                  <th className="px-3 py-2 font-semibold">Decided</th>
                  <th className="px-3 py-2 font-semibold">Comment</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Loading…</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No approval activity yet.</td></tr>
                ) : logs.map((row) => (
                  <tr key={row.id} className="border-t align-top">
                    <td className="px-3 py-2 font-mono font-semibold">
                      <a href={`/quotations/${row.documentId}/preview`} className="text-primary hover:underline">{row.documentNumber}</a>
                    </td>
                    <td className="px-3 py-2">{row.levelName}{row.reason ? <div className="text-muted-foreground">{row.reason}</div> : null}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className={STATUS_STYLES[row.status] || ""}>{row.status}</Badge></td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">
                      {typeof row.metrics?.discountPct === "number" ? `${row.metrics.discountPct.toFixed(1)}%` : "—"}
                      {typeof row.metrics?.amount === "number" ? ` · AED ${Math.round(row.metrics.amount).toLocaleString()}` : ""}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                      {row.requestedByName ? <div className="text-muted-foreground">{row.requestedByName}</div> : null}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.decidedAt ? new Date(row.decidedAt).toLocaleString() : "—"}
                      {row.decidedByName ? <div className="text-muted-foreground">{row.decidedByName}</div> : null}
                    </td>
                    <td className="px-3 py-2 max-w-64">{row.comment || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{logTotal} record(s)</span>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" disabled={logPage <= 1} onClick={() => setLogPage((p) => p - 1)}>Previous</Button>
              <span>Page {logPage} of {logPages}</span>
              <Button type="button" size="sm" variant="outline" disabled={logPage >= logPages} onClick={() => setLogPage((p) => p + 1)}>Next</Button>
            </div>
          </div>

          {settingsChanges.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Recent settings changes</p>
              <ul className="space-y-1.5">
                {settingsChanges.map((c: any) => (
                  <li key={c.id} className="text-xs rounded-xl border px-3 py-2">
                    <span className="text-muted-foreground">{new Date(c.createdAt).toLocaleString()} · {c.user?.name || c.user?.email || "Super Admin"}:</span>{" "}
                    {c.details}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save bar */}
      {dirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-xl max-w-[calc(100vw-32px)]">
          <span className="text-xs font-medium">You have unsaved approval settings.</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => void load()} disabled={saving}>Discard</Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
          </Button>
        </div>
      )}
    </div>
  )
}
