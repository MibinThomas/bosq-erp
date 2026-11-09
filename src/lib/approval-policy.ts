/**
 * Approval policy — pure logic, no database access (see approval-engine.ts for that).
 *  - how a quotation's discount metrics are measured,
 *  - which configured rules match a document and which level they require,
 *  - whether a previous decision still covers the document, and
 *  - whether a document may be released to the client.
 *
 * Line `discount` is an absolute amount per unit (amount = (unitPrice - discount) * qty).
 * Discount % is measured against the estimator's price when the line was costed,
 * otherwise against the line's unit price.
 */

/** Quotation.approvalStatus values. Legacy PENDING_*_APPROVAL values are treated as pending. */
export const APPROVAL_STATUS = {
  AUTO_APPROVED: "AUTO_APPROVED",
  PENDING: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const

export function isPendingApproval(status?: string | null) {
  return !!status && status.startsWith("PENDING")
}

export function isApprovalBlocking(status?: string | null) {
  return isPendingApproval(status) || status === APPROVAL_STATUS.REJECTED
}

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

export const CUSTOMER_SEGMENTS = ["Dealer", "Interior", "Project", "Special"]

const EPS = 0.01
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : 0
}

// ─── Discount metrics ─────────────────────────────────────────────────

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
  /** The discount % rules are evaluated against: the largest of line, overall and special discount. */
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

/** Fields persisted on Quotation for reporting. */
export function quotationMetricFields(m: ApprovalMetrics) {
  return {
    maxDiscountPercentage: m.maxDiscountPercentage,
    overallDiscountPercentage: m.overallDiscountPercentage,
    totalEstimatorSellingPrice: m.totalEstimatorSellingPrice,
    totalConsultantDiscountAmount: m.totalConsultantDiscountAmount,
  }
}

// ─── Rules ────────────────────────────────────────────────────────────

export type LevelConfig = {
  id: string
  rank: number
  name: string
  approverRoles: string[]
  approverUserIds: string[]
}

export type RuleConfig = {
  id: string
  name: string
  isActive: boolean
  levelId: string
  minDiscountPct?: number | null
  minAmount?: number | null
  customerSegments?: string[]
  departments?: string[]
  projectKeyword?: string | null
}

/** What a rule is evaluated against. */
export type ApprovalContext = {
  discountPct: number
  amount: number
  customerSegment?: string | null
  department?: string | null
  projectName?: string | null
}

const lower = (s?: string | null) => (s || "").trim().toLowerCase()

export function ruleMatches(rule: RuleConfig, ctx: ApprovalContext) {
  if (!rule.isActive) return false
  if (rule.minDiscountPct != null && !(ctx.discountPct > rule.minDiscountPct + 1e-9)) return false
  if (rule.minAmount != null && !(ctx.amount >= rule.minAmount)) return false
  if (rule.customerSegments && rule.customerSegments.length > 0 &&
      !rule.customerSegments.some((s) => lower(s) === lower(ctx.customerSegment))) return false
  if (rule.departments && rule.departments.length > 0 &&
      !rule.departments.some((d) => lower(d) === lower(ctx.department))) return false
  if (rule.projectKeyword && rule.projectKeyword.trim() &&
      !lower(ctx.projectName).includes(lower(rule.projectKeyword))) return false
  return true
}

/** The most senior level required by the matching rules, or null when no rule matches. */
export function requiredLevel(levels: LevelConfig[], rules: RuleConfig[], ctx: ApprovalContext) {
  const matched = rules.filter((r) => ruleMatches(r, ctx))
  let level: LevelConfig | null = null
  for (const r of matched) {
    const l = levels.find((x) => x.id === r.levelId)
    if (l && (!level || l.rank > level.rank)) level = l
  }
  return { level, matchedRules: matched }
}

/** Approvers of a level may approve that level and any lower one. Super Admin may approve anything. */
export function canApproveLevel(
  user: { id: string; role?: string | null },
  levels: LevelConfig[],
  requiredRank: number
) {
  const role = (user.role || "").toUpperCase()
  if (role === "SUPER_ADMIN") return true
  return levels.some((l) =>
    l.rank >= requiredRank &&
    (l.approverRoles.map((r) => r.toUpperCase()).includes(role) || l.approverUserIds.includes(user.id))
  )
}

// ─── Decisions ────────────────────────────────────────────────────────

/** Snapshot stored on each approval request. */
export type ApprovalSnapshot = {
  discountPct: number
  maxDiscountPct: number
  overallDiscountPct: number
  specialDiscountPct: number
  amount: number
}

export function snapshotOf(m: ApprovalMetrics, amount: number): ApprovalSnapshot {
  return {
    discountPct: m.routingPct,
    maxDiscountPct: m.maxDiscountPercentage,
    overallDiscountPct: m.overallDiscountPercentage,
    specialDiscountPct: m.specialDiscountPercentage,
    amount,
  }
}

/** An earlier approval still covers the document if it was at least as senior and nothing went up. */
export function approvalStillCovers(
  approved: { levelRank: number; metrics?: Partial<ApprovalSnapshot> | null },
  requiredRank: number,
  now: ApprovalSnapshot
) {
  if (approved.levelRank < requiredRank) return false
  const m = approved.metrics || {}
  return (
    now.discountPct <= (m.discountPct ?? 0) + EPS &&
    now.maxDiscountPct <= (m.maxDiscountPct ?? 0) + EPS &&
    now.overallDiscountPct <= (m.overallDiscountPct ?? 0) + EPS &&
    now.specialDiscountPct <= (m.specialDiscountPct ?? 0) + EPS &&
    now.amount <= (m.amount ?? 0) + 1
  )
}

/** A rejection stands until the discounts or value change. */
export function rejectionStillApplies(rejected: { metrics?: Partial<ApprovalSnapshot> | null }, now: ApprovalSnapshot) {
  const m = rejected.metrics || {}
  return (
    Math.abs(now.discountPct - (m.discountPct ?? 0)) < EPS &&
    Math.abs(now.specialDiscountPct - (m.specialDiscountPct ?? 0)) < EPS &&
    Math.abs(now.amount - (m.amount ?? 0)) < 1
  )
}

/**
 * Returns an error message when moving to `newStatus` would release a quotation
 * to the client while its approval is pending or rejected; otherwise null.
 */
export function releaseBlockedReason(
  currentStatus: string,
  newStatus: string,
  approvalStatus?: string | null,
  levelName?: string | null
) {
  const releasing = CLIENT_RELEASE_STATUSES.includes(newStatus) && !CLIENT_RELEASE_STATUSES.includes(currentStatus)
  if (!releasing || !isApprovalBlocking(approvalStatus)) return null
  if (approvalStatus === APPROVAL_STATUS.REJECTED) {
    return "This quotation's approval was rejected. Revise it and get it approved before sending it to the client."
  }
  return `This quotation needs approval${levelName ? ` (${levelName})` : ""} before it can be sent to the client.`
}

// ─── Defaults ─────────────────────────────────────────────────────────

/** Seeded on first use; mirrors the original fixed tiers. */
export const DEFAULT_QUOTATION_WORKFLOW = {
  levels: [
    { rank: 1, name: "Manager review", approverRoles: ["SALES_MANAGER", "MANAGER", "ADMIN"] },
    { rank: 2, name: "Sales Manager", approverRoles: ["SALES_MANAGER", "MANAGER", "ADMIN"] },
    { rank: 3, name: "General Manager / Director", approverRoles: ["ADMIN"] },
  ],
  rules: [
    { name: "Any discount", levelRank: 1, minDiscountPct: 0 },
    { name: "Discount above 10%", levelRank: 2, minDiscountPct: 10 },
    { name: "Discount above 20%", levelRank: 3, minDiscountPct: 20 },
  ],
}
