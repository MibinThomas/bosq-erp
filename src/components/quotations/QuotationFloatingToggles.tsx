"use client"

import React, { useState } from "react"
import { 
  UserCheck, 
  User, 
  ShieldCheck, 
  Shield, 
  Tag, 
  Layers, 
  Palette, 
  SlidersHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

export interface QuotationToggleValues {
  includeSalesAgent: boolean
  includeCompanySeal: boolean
  includeCategoryName: boolean
  includeSectionHeadings: boolean
  includeMaterialsFinishes: boolean
}

interface QuotationFloatingTogglesProps {
  values: QuotationToggleValues
  onChange: (key: keyof QuotationToggleValues, value: boolean) => void
}

interface ToggleItemDef {
  key: keyof QuotationToggleValues
  title: string
  shortLabel: string
  description: string
  activeIcon: React.ElementType
  inactiveIcon: React.ElementType
  activeColorClass: string
  activeBadgeBg: string
  ringClass: string
}

const toggleDefinitions: ToggleItemDef[] = [
  {
    key: "includeSalesAgent",
    title: "Include Sales Rep Info",
    shortLabel: "Sales Rep",
    description: "Display sales agent name, title & contact numbers on quotation header/footer.",
    activeIcon: UserCheck,
    inactiveIcon: User,
    activeColorClass: "bg-blue-600 text-white shadow-blue-500/30 border-blue-500",
    activeBadgeBg: "bg-blue-500",
    ringClass: "focus-visible:ring-blue-500",
  },
  {
    key: "includeCompanySeal",
    title: "Include Company Seal",
    shortLabel: "Company Seal",
    description: "Show official company seal on quotation preview and exported PDF.",
    activeIcon: ShieldCheck,
    inactiveIcon: Shield,
    activeColorClass: "bg-emerald-600 text-white shadow-emerald-500/30 border-emerald-500",
    activeBadgeBg: "bg-emerald-500",
    ringClass: "focus-visible:ring-emerald-500",
  },
  {
    key: "includeCategoryName",
    title: "Show Product Category",
    shortLabel: "Categories",
    description: "Show product category badges (e.g. PREMIUM CHAIRS) on preview and PDF.",
    activeIcon: Tag,
    inactiveIcon: Tag,
    activeColorClass: "bg-indigo-600 text-white shadow-indigo-500/30 border-indigo-500",
    activeBadgeBg: "bg-indigo-500",
    ringClass: "focus-visible:ring-indigo-500",
  },
  {
    key: "includeSectionHeadings",
    title: "Enable Section Headings",
    shortLabel: "Sections",
    description: "Group products under section headings (e.g. Section 1, Section 2) in PDF.",
    activeIcon: Layers,
    inactiveIcon: Layers,
    activeColorClass: "bg-violet-600 text-white shadow-violet-500/30 border-violet-500",
    activeBadgeBg: "bg-violet-500",
    ringClass: "focus-visible:ring-violet-500",
  },
  {
    key: "includeMaterialsFinishes",
    title: "Materials & Finishes Schedule",
    shortLabel: "Materials",
    description: "Append dedicated material swatch schedule pages to the exported PDF.",
    activeIcon: Palette,
    inactiveIcon: Palette,
    activeColorClass: "bg-orange-600 text-white shadow-orange-500/30 border-orange-500",
    activeBadgeBg: "bg-orange-500",
    ringClass: "focus-visible:ring-orange-500",
  },
]

export function QuotationFloatingToggles({
  values,
  onChange,
}: QuotationFloatingTogglesProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeHoverKey, setActiveHoverKey] = useState<string | null>(null)

  const activeCount = toggleDefinitions.filter(
    (item) => values[item.key]
  ).length

  return (
    <aside
      aria-label="Quotation Option Toggles"
      className="fixed right-3 md:right-5 top-1/3 z-50 flex flex-col items-end gap-2.5 pointer-events-auto select-none transition-all duration-300"
    >
      {/* Main Container Card */}
      <div className="flex flex-col items-end gap-2 p-1.5 rounded-2xl bg-background/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 shadow-2xl">
        {/* Header Toggle Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "relative flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200 cursor-pointer",
            "bg-slate-900 text-slate-100 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 shadow-md",
            "border border-slate-700"
          )}
          title={isExpanded ? "Collapse Toggles" : "Expand Quotation Option Toggles"}
        >
          <SlidersHorizontal className="h-4 w-4 text-orange-400" />
          {/* Active Count Badge */}
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white shadow-sm border border-background">
            {activeCount}
          </span>
        </button>

        {/* Vertical FAB List */}
        {isExpanded && (
          <div className="flex flex-col items-end gap-2 pt-1 animate-in fade-in slide-in-from-right-4 duration-200">
            {toggleDefinitions.map((item) => {
              const isActive = !!values[item.key]
              const IconComp = isActive ? item.activeIcon : item.inactiveIcon
              const isHovered = activeHoverKey === item.key

              return (
                <div
                  key={item.key}
                  className="relative flex items-center group"
                  onMouseEnter={() => setActiveHoverKey(item.key)}
                  onMouseLeave={() => setActiveHoverKey(null)}
                >
                  {/* Tooltip / Flyout Card (Left Side) */}
                  <div
                    className={cn(
                      "absolute right-14 top-1/2 -translate-y-1/2 w-64 p-3 rounded-xl shadow-xl border bg-popover/95 text-popover-foreground backdrop-blur-md transition-all duration-200 pointer-events-auto",
                      isHovered
                        ? "opacity-100 translate-x-0 scale-100 z-50"
                        : "opacity-0 translate-x-2 scale-95 pointer-events-none"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        {item.title}
                      </span>
                      <Badge
                        variant={isActive ? "default" : "outline"}
                        className={cn(
                          "text-[10px] px-1.5 py-0 font-semibold",
                          isActive
                            ? `${item.activeBadgeBg} text-white border-transparent`
                            : "text-muted-foreground"
                        )}
                      >
                        {isActive ? "ON" : "OFF"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug mb-2.5">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Toggle State:
                      </span>
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => onChange(item.key, checked)}
                      />
                    </div>
                  </div>

                  {/* Floating Action Button */}
                  <button
                    type="button"
                    onClick={() => onChange(item.key, !isActive)}
                    className={cn(
                      "relative flex items-center justify-center h-11 w-11 rounded-xl transition-all duration-200 cursor-pointer shadow-md group-hover:scale-105",
                      isActive
                        ? `${item.activeColorClass} ring-2 ring-offset-1 ring-offset-background`
                        : "bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                    )}
                    aria-label={`Toggle ${item.title}`}
                  >
                    <IconComp className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />

                    {/* Active Status Indicator Dot */}
                    <span
                      className={cn(
                        "absolute top-1 right-1 h-2.5 w-2.5 rounded-full border border-background transition-all duration-200",
                        isActive
                          ? "bg-white animate-pulse"
                          : "bg-muted-foreground/40 opacity-0 group-hover:opacity-100"
                      )}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
