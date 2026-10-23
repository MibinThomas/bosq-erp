// Who may view or edit the costing breakdown (factory cost, margin, negotiation) of quotations.
import prisma from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"

const COSTING_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER", "ESTIMATOR", "COST_ESTIMATOR"]

export async function canUseCosting(user: { id?: string; email?: string | null }) {
  const dbUser = await prisma.user.findUnique({
    where: user.id ? { id: user.id } : { email: user.email || "" },
    include: { permissionOverrides: { where: { module: { in: ["QUOTATIONS", "COSTING_REQUESTS"] } } } },
  })
  if (!dbUser || !dbUser.isActive || dbUser.deletedAt) return false
  const role = (dbUser.role || "").toUpperCase()
  if (COSTING_ROLES.includes(role)) return true
  if (await hasPermission(dbUser.id, "QUOTATIONS", "canViewCostingBreakdown")) return true
  if (await hasPermission(dbUser.id, "COSTING_REQUESTS", "edit")) return true
  return dbUser.permissionOverrides.some(
    (o) => (o.action === "costPriceVisible" || o.action === "canViewCostingBreakdown") && o.value === true
  )
}
