/**
 * Discount approval policy — the single source of truth for:
 *  - how a quotation's discount metrics are measured,
 *  - which approval tier those discounts require,
 *  - who may approve each tier, and
 *  - whether a quotation may be released to the client.
 *
 * Line `discount` is an absolute amount per unit (amount = (unitPrice - discount) * qty).
 * Discount % is measured against the estimator's price when the line was costed,
 * otherwise against the line's unit price.
 */

export const APPROVAL_TIERS = {
  NONE: "AUTO_APPROVED",
  IDC: "PENDING_IDC_APPROVAL",
  MANAGER: "PENDING_MANAGER_APPROVAL",
  GM: "PENDING_GM_APPROVAL",
} as const

export const PENDING_APPROVAL_STATUSES: string[] = [
  APPROVAL_TIERS.IDC,
  APPROVAL_TIERS.MANAGER,
  APPROVAL_TIERS.GM,
]

/** Tier thresholds: above GM_PCT → GM, above MANAGER_PCT → Manager, above 0 → IDC review. */
export const MANAGER_PCT = 10
export const GM_PCT = 20

const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"]
const GM_ROLES = ["SUPER_ADMIN", "ADMIN"]

/** Statuses where the quotation is in (or past) the client's hands. */
export const CLIENT_RELEASE_STATUSES: string[] = [
  "SENT_TO_CLIENT",
  "CLIENT_REVIEWING",
  "CLIENT_APPROVED",
  "CLIENT_REJECTED",
  "CLIENT_CONFIRMED",
  "PO_RECEIVED",
  "UNDER_PRODUCTION",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
]

const EPS = 0.01
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : 0
}

type LineInput = {
  quantity?: unknown
  unitPrice?: unknown
  discount?: unknown
  estimatorUnitPrice?: unknown
}

/** Per-line audit fields persisted on QuotationItem. */
export function lineApprovalFields(line: LineInput) {
  const unitPrice = num(line.unitPrice)
  const estimatorUnitPrice = Math.max(0, num(line.estimatorUnitPrice))
  const reference = estimatorUnitPrice > 0 ? estimatorUnitPrice : unitPrice
  const consultantDiscountAmount = Math.max(0, num(line.discount))
  const consultantDiscountPct = reference > 0 ? (consultantDiscountAmount / reference) * 100 : 0
  return { estimatorUnitPrice, consultantDiscountAmount, consultantDiscountPct }
}

/** Special (whole-quotation) discount expressed as a percentage of subtotal + charges. */
export function specialDiscountPercent(input: {
  specialDiscountType?: string | null
  specialDiscountValue?: unknown
  subtotal?: unknown
  additionalCost?: unknown
}) {
  const value = num(input.specialDiscountValue)
  if (value <= 0) return 0
  if (input.specialDiscountType === "PERCENTAGE") return value
  if (input.specialDiscountType === "FIXED") {
    const base = num(input.subtotal) + num(input.additionalCost)
    return base > 0 ? (value / base) * 100 : 0
  }
  return 0
}

export type ApprovalMetrics = {
  totalEstimatorSellingPrice: number
  totalConsultantDiscountAmount: number
  overallDiscountPercentage: number
  maxDiscountPercentage: number
  specialDiscountPercentage: number
  /** The percentage that decides the tier. */
  routingPct: number
}

export function computeApprovalMetrics(lines: LineInput[], specialPct: number): ApprovalMetrics {
  let totalEst = 0
  let totalDisc = 0
  let maxPct = 0
  for (const line of lines) {
    const qty = num(line.quantity) || 1
    const f = lineApprovalFields(line)
    const reference = f.estimatorUnitPrice > 0 ? f.estimatorUnitPrice : num(line.unitPrice)
    totalEst += reference * qty
    totalDisc += f.consultantDiscountAmount * qty
    if (f.consultantDiscountPct > maxPct) maxPct = f.consultantDiscountPct
  }
  const overall = totalEst > 0 ? (totalDisc / totalEst) * 100 : 0
  const special = Math.max(0, specialPct)
  return {
    totalEstimatorSellingPrice: totalEst,
    totalConsultantDiscountAmount: totalDisc,
    overallDiscountPercentage: overall,
    maxDiscountPercentage: maxPct,
    specialDiscountPercentage: special,
    routingPct: Math.max(maxPct, overall, special),
  }
}

export function tierForPct(pct: number): string {
  if (pct > GM_PCT + 1e-9) return APPROVAL_TIERS.GM
  if (pct > MANAGER_PCT + 1e-9) return APPROVAL_TIERS.MANAGER
  if (pct > 1e-9) return APPROVAL_TIERS.IDC
  return APPROVAL_TIERS.NONE
}

/** The quotation as it was before this save (a Quotation row is fine). */
export type PreviousApproval = {
  approvalStatus?: string | null
  maxDiscountPercentage?: number | null
  overallDiscountPercentage?: number | null
  specialDiscountType?: string | null
  specialDiscountValue?: number | null
  subtotal?: number | null
  deliveryCharge?: number | null
}

/**
 * Decide the approval status after a save.
 * - No discount → AUTO_APPROVED.
 * - A manager's APPROVED decision survives as long as no discount went up.
 * - A REJECTED decision survives only while nothing changed; any change re-routes it.
 */
export function resolveApprovalStatus(metrics: ApprovalMetrics, previous?: PreviousApproval | null): string {
  const routed = tierForPct(metrics.routingPct)
  if (routed === APPROVAL_TIERS.NONE || !previous) return routed

  const prevMax = previous.maxDiscountPercentage || 0
  const prevOverall = previous.overallDiscountPercentage || 0
  const prevSpecial = specialDiscountPercent({
    specialDiscountType: previous.specialDiscountType,
    specialDiscountValue: previous.specialDiscountValue,
    subtotal: previous.subtotal,
    additionalCost: previous.deliveryCharge,
  })

  const noIncrease =
    metrics.maxDiscountPercentage <= prevMax + EPS &&
    metrics.overallDiscountPercentage <= prevOverall + EPS &&
    metrics.specialDiscountPercentage <= prevSpecial + EPS
  if (previous.approvalStatus === "APPROVED" && noIncrease) return "APPROVED"

  const unchanged =
    Math.abs(metrics.maxDiscountPercentage - prevMax) < EPS &&
    Math.abs(metrics.overallDiscountPercentage - prevOverall) < EPS &&
    Math.abs(metrics.specialDiscountPercentage - prevSpecial) < EPS
  if (previous.approvalStatus === "REJECTED" && unchanged) return "REJECTED"

  return routed
}

export function isApprovalBlocking(approvalStatus?: string | null) {
  return !!approvalStatus && (PENDING_APPROVAL_STATUSES.includes(approvalStatus) || approvalStatus === "REJECTED")
}

/** Which tier a quotation needs, from its stored metrics (used by the approve endpoint). */
export function requiredTierForQuotation(q: {
  maxDiscountPercentage?: number | null
  overallDiscountPercentage?: number | null
  specialDiscountType?: string | null
  specialDiscountValue?: number | null
  subtotal?: number | null
  deliveryCharge?: number | null
}) {
  const special = specialDiscountPercent({
    specialDiscountType: q.specialDiscountType,
    specialDiscountValue: q.specialDiscountValue,
    subtotal: q.subtotal,
    additionalCost: q.deliveryCharge,
  })
  return tierForPct(Math.max(q.maxDiscountPercentage || 0, q.overallDiscountPercentage || 0, special))
}

const TIER_RANK: Record<string, number> = {
  [APPROVAL_TIERS.NONE]: 0,
  [APPROVAL_TIERS.IDC]: 1,
  [APPROVAL_TIERS.MANAGER]: 2,
  [APPROVAL_TIERS.GM]: 3,
}

/** The strictest of the given tiers (unknown values such as APPROVED/REJECTED count as none). */
export function highestTier(...tiers: (string | null | undefined)[]) {
  return tiers.reduce<string>(
    (best, t) => ((TIER_RANK[t ?? ""] ?? 0) > TIER_RANK[best] ? (t as string) : best),
    APPROVAL_TIERS.NONE
  )
}

export function canApproveTier(role: string | null | undefined, tier: string) {
  const r = (role || "").toUpperCase()
  if (tier === APPROVAL_TIERS.GM) return GM_ROLES.includes(r)
  return MANAGER_ROLES.includes(r)
}

export function tierLabel(tier: string) {
  if (tier === APPROVAL_TIERS.GM) return "General Manager / Director"
  if (tier === APPROVAL_TIERS.MANAGER) return "Sales Manager"
  if (tier === APPROVAL_TIERS.IDC) return "Manager review"
  return "No approval"
}

/**
 * Returns an error message when moving to `newStatus` would release a quotation
 * to the client while its discount approval is pending or rejected; otherwise null.
 */
export function releaseBlockedReason(currentStatus: string, newStatus: string, approvalStatus?: string | null) {
  const releasing = CLIENT_RELEASE_STATUSES.includes(newStatus) && !CLIENT_RELEASE_STATUSES.includes(currentStatus)
  if (!releasing || !isApprovalBlocking(approvalStatus)) return null
  if (approvalStatus === "REJECTED") {
    return "The discount on this quotation was rejected. Revise the pricing and get it approved before sending it to the client."
  }
  return `This quotation's discount needs approval (${tierLabel(approvalStatus!)}) before it can be sent to the client.`
}
