"use client"

import React from "react"
import { 
  FileEdit, 
  Send, 
  Clock, 
  CheckCircle2, 
  FileCheck, 
  Check, 
  User, 
  Calendar,
  Lock,
  Sparkles
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface QuotationStatusTimelineProps {
  status: string
  costingStatus: string
  createdAt?: string | Date | null
  preparedByName?: string | null
  sentToCostingAt?: string | Date | null
  sentToCostingByName?: string | null
  costingCompletedAt?: string | Date | null
  costedByName?: string | null
  approvedAt?: string | Date | null
  approvedByName?: string | null
  className?: string
}

export function QuotationStatusTimeline({
  status = "DRAFT",
  costingStatus = "NONE",
  createdAt,
  preparedByName,
  sentToCostingAt,
  sentToCostingByName,
  costingCompletedAt,
  costedByName,
  approvedAt,
  approvedByName,
  className
}: QuotationStatusTimelineProps) {
  // Determine current active step index (0 to 5)
  // 0: Draft
  // 1: Pending Costing
  // 2: Partially Costed
  // 3: Costing Completed
  // 4: Active Quotation
  // 5: Client Approved

  let currentStepIndex = 0
  const normalizedCosting = (costingStatus || "").toUpperCase()
  const normalizedStatus = (status || "").toUpperCase()

  if (normalizedStatus === "APPROVED" || normalizedStatus === "CLIENT_APPROVED") {
    currentStepIndex = 5
  } else if (normalizedStatus === "SENT_TO_CLIENT" || normalizedStatus === "ACTIVE") {
    currentStepIndex = 4
  } else if (normalizedCosting === "COSTING_COMPLETED") {
    currentStepIndex = 3
  } else if (normalizedCosting === "COSTING_IN_PROGRESS" || normalizedCosting === "PARTIALLY_COSTED") {
    currentStepIndex = 2
  } else if (normalizedCosting === "PENDING_COSTING" || normalizedCosting === "ADDED_FOR_COSTING") {
    currentStepIndex = 1
  } else {
    currentStepIndex = 0
  }

  const steps = [
    {
      id: 0,
      label: "Draft",
      description: "Quotation created",
      actor: preparedByName || "Interior Design Consultant",
      timestamp: createdAt,
      icon: FileEdit
    },
    {
      id: 1,
      label: "Pending Costing",
      description: "Locked & sent to estimator",
      actor: sentToCostingByName || preparedByName || "Consultant",
      timestamp: sentToCostingAt,
      icon: Send
    },
    {
      id: 2,
      label: "Partially Costed",
      description: "Estimator reviewing costs",
      actor: costedByName || "Estimator",
      timestamp: null,
      icon: Clock
    },
    {
      id: 3,
      label: "Costing Completed",
      description: "Base costs locked by estimator",
      actor: costedByName || "Estimator",
      timestamp: costingCompletedAt,
      icon: CheckCircle2
    },
    {
      id: 4,
      label: "Active Quotation",
      description: "Margin applied & ready for client",
      actor: preparedByName || "Consultant",
      timestamp: null,
      icon: FileCheck
    },
    {
      id: 5,
      label: "Client Approved",
      description: "Order confirmed by client",
      actor: approvedByName || "Client",
      timestamp: approvedAt,
      icon: Sparkles
    }
  ]

  const formatDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return null
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return null
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch (e) {
      return null
    }
  }

  return (
    <div className={cn("w-full bg-card border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4", className)}>
      <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5">
            Quotation Workflow Lifecycle
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            Stage {currentStepIndex + 1} of 6
          </span>
        </div>

        {/* Current Status Badge */}
        {currentStepIndex === 1 || currentStepIndex === 2 ? (
          <Badge className="bg-amber-500 text-white font-bold text-xs px-3 py-1 flex items-center gap-1.5 animate-pulse">
            <Lock className="h-3.5 w-3.5" /> Locked for Costing
          </Badge>
        ) : currentStepIndex === 3 ? (
          <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Costing Completed
          </Badge>
        ) : currentStepIndex >= 4 ? (
          <Badge className="bg-blue-600 text-white font-bold text-xs px-3 py-1 flex items-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5" /> Active Quotation
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-semibold text-xs px-3 py-1">
            Draft Mode (Full Access)
          </Badge>
        )}
      </div>

      {/* Stepper Timeline Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 relative">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex
          const isCurrent = idx === currentStepIndex
          const isUpcoming = idx > currentStepIndex
          const IconComp = step.icon
          const dateStr = formatDate(step.timestamp)

          return (
            <div 
              key={step.id} 
              className={cn(
                "flex flex-col p-3 rounded-xl border transition-all duration-200 relative",
                isCurrent 
                  ? "bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20" 
                  : isCompleted 
                    ? "bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/60" 
                    : "bg-muted/20 border-border/60 opacity-65"
              )}
            >
              {/* Top Step Badge */}
              <div className="flex items-center justify-between mb-2">
                <div 
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    isCompleted 
                      ? "bg-emerald-600 text-white" 
                      : isCurrent 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground border"
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : idx + 1}
                </div>
                <IconComp className={cn(
                  "h-4 w-4",
                  isCompleted ? "text-emerald-600" : isCurrent ? "text-primary" : "text-muted-foreground"
                )} />
              </div>

              {/* Title & Description */}
              <h4 className={cn(
                "text-xs font-bold line-clamp-1",
                isCurrent ? "text-primary" : isCompleted ? "text-emerald-900 dark:text-emerald-300" : "text-muted-foreground"
              )}>
                {step.label}
              </h4>
              <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">
                {step.description}
              </p>

              {/* Audit Details */}
              {(dateStr || step.actor) && (
                <div className="mt-2 pt-1.5 border-t border-border/40 text-[9px] text-muted-foreground space-y-0.5">
                  {step.actor && (
                    <div className="flex items-center gap-1 font-medium truncate">
                      <User className="h-2.5 w-2.5 shrink-0 opacity-70" />
                      <span className="truncate">{step.actor}</span>
                    </div>
                  )}
                  {dateStr && (
                    <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground/80">
                      <Calendar className="h-2.5 w-2.5 shrink-0 opacity-70" />
                      <span>{dateStr}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
