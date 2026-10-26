// Record-level access ("which quotations / clients may this user see?") and cost-field
// visibility, shared by API routes. Managers and admins see everything; every other role
// (Interior Design Consultants, Sales Executives, …) is limited to records assigned to them.
import prisma from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"

export const UNRESTRICTED_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"]

export const isUnrestrictedRole = (role?: string | null) => !!role && UNRESTRICTED_ROLES.includes(role)

/** Roles that always work only on their own / assigned records, whatever the role's scope setting. */
export const ASSIGNMENT_SCOPED_ROLES = ["INTERIOR_DESIGN_CONSULTANT", "SALES_EXECUTIVE"]

const ESTIMATOR_ROLES = ["ESTIMATOR", "COST_ESTIMATOR"]

/**
 * Whether the user's records in this module are limited to assigned ones. Managers: never.
 * IDC / Sales Executive: always. Other roles: when their Access Control scope (ownership) isn't "All".
 */
export async function isRecordScoped(user: { id: string; role: string }, module: string) {
  if (isUnrestrictedRole(user.role)) return false
  if (ASSIGNMENT_SCOPED_ROLES.includes(user.role)) return true
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { permissionOverrides: { where: { module, action: "ownership" }, select: { ownership: true } } },
  })
  let ownership = dbUser?.permissionOverrides[0]?.ownership
  if (!ownership) {
    const role = await prisma.role.findFirst({
      where: { name: user.role },
      select: { permissions: { where: { module }, select: { ownership: true } } },
    })
    ownership = role?.permissions[0]?.ownership
  }
  return !!ownership && ownership !== "ALL"
}

/** Clients the user owns, is assigned to, or was granted access to. */
export function clientAccessWhere(userId: string) {
  return [
    { salespersonId: userId },
    { assignments: { some: { userId } } },
    { accessRequests: { some: { userId, status: "Approved" } } },
  ]
}

/** Quotations the user prepared, is the agent on, is assigned to, or whose client is theirs. */
export function quotationAccessWhere(userId: string) {
  return [
    { preparedById: userId },
    { salesAgentId: userId },
    { assignments: { some: { userId } } },
    { client: { OR: clientAccessWhere(userId) } },
  ]
}

/** True when the user may open/act on this quotation (or another quotation in its revision series). */
export async function canAccessQuotation(user: { id: string; role: string }, quotationId: string) {
  if (!(await isRecordScoped(user, "QUOTATIONS"))) return true
  const quotation = await prisma.quotation.findUnique({ where: { id: quotationId }, select: { id: true, parentId: true } })
  if (!quotation) return false
  const seriesIds = [quotation.id, ...(quotation.parentId ? [quotation.parentId] : [])]
  const access: any[] = quotationAccessWhere(user.id)
  if (ESTIMATOR_ROLES.includes(user.role)) {
    // Estimators work on quotations sent to them (or to the estimating team) for costing
    access.push({ assignedEstimatorId: user.id }, { items: { some: { estimatorId: user.id } } }, { costingStatus: { not: "NONE" } })
  }
  const count = await prisma.quotation.count({
    where: { id: { in: seriesIds }, OR: access },
  })
  return count > 0
}

/** True when the user may open/act on this client. */
export async function canAccessClient(user: { id: string; role: string }, clientId: string) {
  if (!(await isRecordScoped(user, "CLIENTS"))) return true
  const count = await prisma.client.count({ where: { id: clientId, OR: clientAccessWhere(user.id) } })
  return count > 0
}

export interface CostVisibility {
  cost: boolean
  margin: boolean
}

/** Roles whose view of internal prices follows the Access Control "… visible" switches. */
export const COST_RESTRICTED_ROLES = ["INTERIOR_DESIGN_CONSULTANT"]

/** Which internal figures this user may see (Access Control: "Cost price visible" / "Margin visible"). */
export async function getCostVisibility(user: { id: string; role: string }, module = "PRODUCTS"): Promise<CostVisibility> {
  if (!COST_RESTRICTED_ROLES.includes(user.role)) return { cost: true, margin: true }
  const [cost, margin] = await Promise.all([
    hasPermission(user.id, module, "costPriceVisible"),
    hasPermission(user.id, module, "marginVisible"),
  ])
  return { cost, margin }
}

// Dealer / special prices are selling prices for those customer segments, so they stay visible
const PRODUCT_COST_FIELDS = ["costPrice"]

/** Removes the cost price from a product (and its variants / parent) when the user may not see it. */
export function sanitizeProduct<T>(product: T, visible: CostVisibility): T {
  if (!product || typeof product !== "object") return product
  const p: any = { ...(product as any) }
  if (!visible.cost) for (const f of PRODUCT_COST_FIELDS) if (f in p) p[f] = null
  if (Array.isArray(p.variants)) p.variants = p.variants.map((v: any) => sanitizeProduct(v, visible))
  if (p.parentProduct && typeof p.parentProduct === "object") p.parentProduct = sanitizeProduct(p.parentProduct, visible)
  return p
}

const ITEM_COST_FIELDS = ["materialCost", "laborCost", "overheadCost", "transportCost", "installationCost", "unitCost", "factoryCost", "accessoriesCost", "totalCost"]
const ITEM_MARGIN_FIELDS = ["marginPercentage", "negotiationPct"]

/**
 * A user who can't see costs gets zeros in their view; when they save, put the stored costing
 * back so the estimator's figures aren't overwritten. Lines are matched by id, else by position
 * when the product is unchanged (revisions send the source lines).
 */
export function keepHiddenCostFields(items: any[], sourceItems: any[], visible: CostVisibility) {
  if (visible.cost && visible.margin) return items
  const byId = new Map(sourceItems.map((s) => [s.id, s]))
  return items.map((item, idx) => {
    const positional = sourceItems[idx] && sourceItems[idx].productId === (item.productId || null) ? sourceItems[idx] : undefined
    const source = (item?.id && byId.get(item.id)) || positional
    const next = { ...item }
    const fields = [...(visible.cost ? [] : ITEM_COST_FIELDS), ...(visible.margin ? [] : ITEM_MARGIN_FIELDS)]
    for (const f of fields) next[f] = source ? source[f] ?? 0 : 0
    if (!visible.cost && source) {
      next.estimatorUnitPrice = source.estimatorUnitPrice ?? next.estimatorUnitPrice
      next.estimatorId = source.estimatorId ?? next.estimatorId
      next.costingCompletedAt = source.costingCompletedAt ?? next.costingCompletedAt
    }
    return next
  })
}

/** Removes costing data from a quotation/BOQ line the user may not see. */
export function sanitizeLineItem<T>(item: T, visible: CostVisibility): T {
  if (!item || typeof item !== "object") return item
  const i: any = { ...(item as any) }
  if (!visible.cost) for (const f of ITEM_COST_FIELDS) if (f in i) i[f] = 0
  if (!visible.margin) for (const f of ITEM_MARGIN_FIELDS) if (f in i) i[f] = 0
  if (i.product && typeof i.product === "object") i.product = sanitizeProduct(i.product, visible)
  return i
}
