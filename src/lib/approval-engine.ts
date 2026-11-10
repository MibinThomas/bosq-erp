import prisma from "./prisma"
import {
  APPROVAL_STATUS,
  ApprovalMetrics,
  ApprovalSnapshot,
  DEFAULT_QUOTATION_WORKFLOW,
  LevelConfig,
  RuleConfig,
  approvalStillCovers,
  canApproveLevel,
  computeApprovalMetrics,
  isPendingApproval,
  quotationMetricFields,
  rejectionStillApplies,
  releaseBlockedReason,
  requiredLevel,
  snapshotOf,
  specialDiscountPercent,
} from "./approval-policy"

/** SystemSetting key for the system-wide Approval Module switch. */
export const APPROVAL_MODULE_SETTING = "approval_module_enabled"

/** Document types the approval engine knows about. Only wired modules can be configured. */
export const APPROVAL_MODULES = [
  { module: "QUOTATION", label: "Quotations", available: true },
  { module: "PURCHASE_ORDER", label: "Purchase Orders", available: false },
  { module: "SALES_ORDER", label: "Sales Orders", available: false },
  { module: "PRODUCTION_REQUEST", label: "Production Requests", available: false },
] as const

const QUOTATION = "QUOTATION"

export type WorkflowWithConfig = {
  id: string
  module: string
  name: string
  enabled: boolean
  levels: LevelConfig[]
  rules: RuleConfig[]
}

export async function isApprovalModuleEnabled() {
  const row = await prisma.systemSetting.findUnique({ where: { key: APPROVAL_MODULE_SETTING } })
  return row?.value === "true"
}

/** Loads a module's workflow, creating the default one the first time. */
export async function getWorkflow(module: string): Promise<WorkflowWithConfig> {
  let wf = await prisma.approvalWorkflow.findUnique({
    where: { module },
    include: { levels: { orderBy: { rank: "asc" } }, rules: { orderBy: { createdAt: "asc" } } },
  })
  if (!wf && module === QUOTATION) {
    wf = await seedQuotationWorkflow()
  }
  if (!wf) {
    return { id: "", module, name: module, enabled: false, levels: [], rules: [] }
  }
  return {
    id: wf.id,
    module: wf.module,
    name: wf.name,
    enabled: wf.enabled,
    levels: wf.levels,
    rules: wf.rules,
  }
}

async function seedQuotationWorkflow() {
  try {
    return await prisma.$transaction(async (tx) => {
      const wf = await tx.approvalWorkflow.create({
        data: { module: QUOTATION, name: "Quotation discount approval", enabled: true },
      })
      const levels = []
      for (const l of DEFAULT_QUOTATION_WORKFLOW.levels) {
        levels.push(await tx.approvalLevel.create({ data: { ...l, workflowId: wf.id } }))
      }
      for (const r of DEFAULT_QUOTATION_WORKFLOW.rules) {
        const level = levels.find((l) => l.rank === r.levelRank)!
        await tx.approvalRule.create({
          data: { workflowId: wf.id, levelId: level.id, name: r.name, minDiscountPct: r.minDiscountPct },
        })
      }
      return tx.approvalWorkflow.findUniqueOrThrow({
        where: { id: wf.id },
        include: { levels: { orderBy: { rank: "asc" } }, rules: { orderBy: { createdAt: "asc" } } },
      })
    })
  } catch {
    // Another request seeded it at the same time
    return prisma.approvalWorkflow.findUnique({
      where: { module: QUOTATION },
      include: { levels: { orderBy: { rank: "asc" } }, rules: { orderBy: { createdAt: "asc" } } },
    })
  }
}

/** Approvals apply only when the master switch AND the module's workflow are on. */
export async function getActiveWorkflow(module: string) {
  if (!(await isApprovalModuleEnabled())) return null
  const wf = await getWorkflow(module)
  return wf.enabled ? wf : null
}

// ─── Quotation decisions ──────────────────────────────────────────────

export type ApprovalDecision = {
  active: boolean
  status: string
  level: LevelConfig | null
  matchedRuleNames: string[]
  snapshot: ApprovalSnapshot
  /** A decided request whose approval still covers this document. */
  carriedFrom?: { id: string; documentId: string; documentNumber: string; decidedById: string | null; decidedByName: string | null }
}

type QuotationApprovalInput = {
  /** Documents whose most recent decision may carry over (the quotation itself, or a revision's source). */
  historyDocumentIds: string[]
  metrics: ApprovalMetrics
  amount: number
  customerSegment?: string | null
  preparedById?: string | null
  projectName?: string | null
}

/** Decide a quotation's approval status. Read-only: call applyQuotationApproval after saving. */
export async function decideQuotationApproval(input: QuotationApprovalInput): Promise<ApprovalDecision> {
  const snapshot = snapshotOf(input.metrics, input.amount)
  const wf = await getActiveWorkflow(QUOTATION)
  if (!wf) {
    return { active: false, status: APPROVAL_STATUS.AUTO_APPROVED, level: null, matchedRuleNames: [], snapshot }
  }

  const preparer = input.preparedById
    ? await prisma.user.findUnique({ where: { id: input.preparedById }, select: { department: true } })
    : null
  const { level, matchedRules } = requiredLevel(wf.levels, wf.rules, {
    discountPct: input.metrics.routingPct,
    amount: input.amount,
    marginPct: input.metrics.marginPct,
    customerSegment: input.customerSegment,
    department: preparer?.department,
    projectName: input.projectName,
  })
  const matchedRuleNames = matchedRules.map((r) => r.name)
  if (!level) {
    return { active: true, status: APPROVAL_STATUS.AUTO_APPROVED, level: null, matchedRuleNames, snapshot }
  }

  const ids = input.historyDocumentIds.filter(Boolean)
  const lastDecision = ids.length
    ? await prisma.approvalRequest.findFirst({
        where: { module: QUOTATION, documentId: { in: ids }, status: { in: ["APPROVED", "REJECTED"] } },
        orderBy: { decidedAt: "desc" },
      })
    : null
  const prevMetrics = (lastDecision?.metrics || null) as Partial<ApprovalSnapshot> | null

  if (lastDecision?.status === "APPROVED" &&
      approvalStillCovers({ levelRank: lastDecision.levelRank, metrics: prevMetrics }, level.rank, snapshot)) {
    return {
      active: true, status: APPROVAL_STATUS.APPROVED, level, matchedRuleNames, snapshot,
      carriedFrom: {
        id: lastDecision.id,
        documentId: lastDecision.documentId,
        documentNumber: lastDecision.documentNumber,
        decidedById: lastDecision.decidedById,
        decidedByName: lastDecision.decidedByName,
      },
    }
  }
  if (lastDecision?.status === "REJECTED" && rejectionStillApplies({ metrics: prevMetrics }, snapshot)) {
    return { active: true, status: APPROVAL_STATUS.REJECTED, level, matchedRuleNames, snapshot }
  }
  return { active: true, status: APPROVAL_STATUS.PENDING, level, matchedRuleNames, snapshot }
}

/** Quotation fields to save alongside a decision. */
export function approvalDataFor(decision: ApprovalDecision, metrics: ApprovalMetrics) {
  return {
    approvalStatus: decision.status,
    ...quotationMetricFields(metrics),
    ...(decision.status === APPROVAL_STATUS.APPROVED && decision.carriedFrom
      ? { approvedById: decision.carriedFrom.decidedById }
      : decision.status !== APPROVAL_STATUS.APPROVED
        ? { approvedById: null, approvedAt: null }
        : {}),
  }
}

/** Record the decision's approval request after the quotation was saved. Never throws. */
export async function applyQuotationApproval(args: {
  quotationId: string
  quotationNumber: string
  decision: ApprovalDecision
  requestedById?: string | null
  /** false for drafts: the status shows approval will be needed, but approvers aren't asked yet */
  openRequest?: boolean
}) {
  const { quotationId, quotationNumber, decision, requestedById, openRequest = true } = args
  if (!decision.active) return
  try {
    const pending = await prisma.approvalRequest.findMany({
      where: { module: QUOTATION, documentId: quotationId, status: "PENDING" },
    })
    const cancel = async (ids: string[], comment: string) => {
      if (ids.length === 0) return
      await prisma.approvalRequest.updateMany({
        where: { id: { in: ids }, status: "PENDING" },
        data: { status: "CANCELLED", comment, decidedAt: new Date() },
      })
    }

    if (decision.status !== APPROVAL_STATUS.PENDING || !decision.level) {
      await cancel(pending.map((p) => p.id), "No longer requires approval after changes.")
      // A revision inherits its source's approval: record it so the audit trail is complete
      if (decision.status === APPROVAL_STATUS.APPROVED && decision.carriedFrom &&
          decision.carriedFrom.documentId !== quotationId && decision.level) {
        await prisma.approvalRequest.create({
          data: {
            module: QUOTATION,
            documentId: quotationId,
            documentNumber: quotationNumber,
            levelRank: decision.level.rank,
            levelName: decision.level.name,
            status: "APPROVED",
            reason: decision.matchedRuleNames.join(", "),
            metrics: decision.snapshot,
            requestedById: requestedById || null,
            decidedById: decision.carriedFrom.decidedById,
            decidedByName: decision.carriedFrom.decidedByName,
            decidedAt: new Date(),
            comment: `Approval carried over from ${decision.carriedFrom.documentNumber}.`,
          },
        })
      }
      return
    }

    const level = decision.level
    const sameLevel = pending.find((p) => p.levelRank === level.rank)
    await cancel(pending.filter((p) => p !== sameLevel).map((p) => p.id), "Superseded by a new approval request.")
    if (sameLevel) {
      await prisma.approvalRequest.update({
        where: { id: sameLevel.id },
        data: { metrics: decision.snapshot, reason: decision.matchedRuleNames.join(", "), documentNumber: quotationNumber },
      })
      return
    }
    if (!openRequest) return

    await prisma.approvalRequest.create({
      data: {
        module: QUOTATION,
        documentId: quotationId,
        documentNumber: quotationNumber,
        levelRank: level.rank,
        levelName: level.name,
        status: "PENDING",
        reason: decision.matchedRuleNames.join(", "),
        metrics: decision.snapshot,
        requestedById: requestedById || null,
      },
    })
    await notifyApprovers(level, quotationId, quotationNumber, decision, requestedById)
  } catch (err) {
    console.error("[approvals] Failed to record approval request:", err)
  }
}

async function notifyApprovers(
  level: LevelConfig,
  quotationId: string,
  quotationNumber: string,
  decision: ApprovalDecision,
  requestedById?: string | null
) {
  const approvers = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [
        { role: { in: level.approverRoles } },
        { id: { in: level.approverUserIds } },
      ],
      ...(requestedById ? { id: { not: requestedById } } : {}),
    },
    select: { id: true },
  })
  if (approvers.length === 0) return
  await prisma.notification.createMany({
    data: approvers.map((u) => ({
      userId: u.id,
      title: "Approval Required",
      message: `Quotation ${quotationNumber} needs ${level.name} approval (discount ${decision.snapshot.discountPct.toFixed(1)}%${decision.snapshot.marginPct != null ? `, margin ${decision.snapshot.marginPct.toFixed(1)}%` : ""}, value AED ${Math.round(decision.snapshot.amount).toLocaleString()}).`,
      type: "APPROVAL_REQUEST",
      link: `/quotations/${quotationId}/preview`,
    })),
  })
}

/** Approval inputs re-measured from a stored quotation and its lines. */
async function storedQuotationInput(quotation: any): Promise<QuotationApprovalInput & { metrics: ApprovalMetrics }> {
  const items = Array.isArray(quotation.items)
    ? quotation.items
    : await prisma.quotationItem.findMany({ where: { quotationId: quotation.id } })
  const metrics = computeApprovalMetrics(items, specialDiscountPercent({
    specialDiscountType: quotation.specialDiscountType,
    specialDiscountValue: quotation.specialDiscountValue,
    subtotal: quotation.subtotal,
    additionalCost: quotation.deliveryCharge,
  }))
  return {
    historyDocumentIds: [quotation.id],
    metrics,
    amount: quotation.grandTotal || 0,
    customerSegment: quotation.customerSegment,
    preparedById: quotation.preparedById,
    projectName: quotation.projectName,
  }
}

/** Re-decide a stored quotation and persist the result if it changed. */
export async function refreshStoredQuotationApproval(quotation: any, userId?: string | null) {
  const input = await storedQuotationInput(quotation)
  const decision = await decideQuotationApproval(input)
  if (!decision.active) return decision
  if (decision.status !== quotation.approvalStatus) {
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: approvalDataFor(decision, input.metrics),
    })
  }
  await applyQuotationApproval({
    quotationId: quotation.id,
    quotationNumber: quotation.quotationNumber,
    decision,
    requestedById: userId || quotation.preparedById,
  })
  return decision
}

/**
 * Before a status change releases a quotation to the client: returns an error message when its
 * approval is pending or rejected (always null while the Approval Module is off).
 */
export async function checkQuotationRelease(quotation: any, newStatus: string, userId?: string | null) {
  const wouldRelease = releaseBlockedReason(quotation.status, newStatus, APPROVAL_STATUS.PENDING) !== null
  if (!wouldRelease) return null
  const decision = await refreshStoredQuotationApproval(quotation, userId)
  return releaseBlockedReason(quotation.status, newStatus, decision.status, decision.level?.name)
}

// ─── Approver actions & views ─────────────────────────────────────────

type SessionUser = { id: string; role?: string | null; name?: string | null }

/** Approval panel for one quotation: status, open request, whether this user may decide, history. */
export async function getQuotationApprovalView(quotationId: string, user: SessionUser) {
  const wf = await getActiveWorkflow(QUOTATION)
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, deletedAt: null },
    select: { id: true, approvalStatus: true, rejectionReason: true },
  })
  if (!quotation) return null
  const history = await prisma.approvalRequest.findMany({
    where: { module: QUOTATION, documentId: quotationId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  const open = history.find((h) => h.status === "PENDING") ||
    (quotation.approvalStatus === APPROVAL_STATUS.REJECTED ? history.find((h) => h.status === "REJECTED") : undefined)
  return {
    moduleEnabled: !!wf,
    approvalStatus: quotation.approvalStatus,
    rejectionReason: quotation.rejectionReason,
    request: open || null,
    canDecide: !!wf && !!open && canApproveLevel(user, wf.levels, open.levelRank),
    history,
  }
}

/** Approve or reject a quotation's open approval request. */
export async function decideQuotationRequest(args: {
  quotationId: string
  user: SessionUser
  action: "APPROVE" | "REJECT"
  comment?: string | null
}): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const { quotationId, user, action } = args
  const comment = (args.comment || "").trim() || null
  const wf = await getActiveWorkflow(QUOTATION)
  if (!wf) return { ok: false, status: 409, message: "The Approval Module is turned off; no approval is needed." }

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, deletedAt: null },
    include: { items: true },
  })
  if (!quotation) return { ok: false, status: 404, message: "Quotation not found" }

  // Older quotations may be pending without a request row yet
  if (isPendingApproval(quotation.approvalStatus)) {
    const exists = await prisma.approvalRequest.count({
      where: { module: QUOTATION, documentId: quotationId, status: "PENDING" },
    })
    if (exists === 0) await refreshStoredQuotationApproval(quotation, quotation.preparedById)
  }

  const request = await prisma.approvalRequest.findFirst({
    where: {
      module: QUOTATION,
      documentId: quotationId,
      status: action === "APPROVE" ? { in: ["PENDING", "REJECTED"] } : "PENDING",
    },
    orderBy: { createdAt: "desc" },
  })
  const current = await prisma.quotation.findUnique({ where: { id: quotationId }, select: { approvalStatus: true } })
  if (!request || !(isPendingApproval(current?.approvalStatus) || current?.approvalStatus === APPROVAL_STATUS.REJECTED)) {
    return { ok: false, status: 409, message: "This quotation is not awaiting approval." }
  }
  if (action === "REJECT" && !comment) {
    return { ok: false, status: 400, message: "Please give a reason for the rejection." }
  }
  if (!canApproveLevel(user, wf.levels, request.levelRank)) {
    return { ok: false, status: 403, message: `Forbidden: this quotation requires ${request.levelName} approval.` }
  }

  const now = new Date()
  const approverName = user.name || "Approver"
  // Conditional update: if someone else decided in the meantime, nothing is written
  const updated = await prisma.approvalRequest.updateMany({
    where: { id: request.id, status: request.status },
    data: {
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
      decidedById: user.id,
      decidedByName: approverName,
      decidedAt: now,
      comment,
    },
  })
  if (updated.count === 0) {
    return { ok: false, status: 409, message: "This approval was decided by someone else in the meantime. Refresh and try again." }
  }

  await prisma.quotation.update({
    where: { id: quotationId },
    data: action === "APPROVE"
      ? { approvalStatus: APPROVAL_STATUS.APPROVED, approvedById: user.id, approvedAt: now, rejectionReason: null }
      : { approvalStatus: APPROVAL_STATUS.REJECTED, approvedById: null, approvedAt: null, rejectionReason: comment },
  })

  await prisma.activityLog.create({
    data: {
      entityType: "QUOTATION",
      entityId: quotationId,
      userId: user.id,
      action: action === "APPROVE" ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
      details: action === "APPROVE"
        ? `${approverName} approved quotation ${quotation.quotationNumber} at ${request.levelName} level.${comment ? ` Comment: ${comment}` : ""}`
        : `${approverName} rejected quotation ${quotation.quotationNumber} at ${request.levelName} level. Reason: ${comment}`,
    },
  }).catch((err) => console.error("[approvals] Failed to log activity", err))

  if (quotation.preparedById && quotation.preparedById !== user.id) {
    await prisma.notification.create({
      data: {
        userId: quotation.preparedById,
        title: action === "APPROVE" ? "Quotation Approved" : "Quotation Rejected",
        message: action === "APPROVE"
          ? `${approverName} approved quotation ${quotation.quotationNumber}. It can now be sent to the client.`
          : `${approverName} rejected quotation ${quotation.quotationNumber}: ${comment}`,
        type: "QUOTATION_UPDATE",
        link: `/quotations/${quotationId}/preview`,
      },
    }).catch((err) => console.error("[approvals] Failed to notify quotation owner", err))
  }

  return { ok: true }
}
