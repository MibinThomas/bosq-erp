import prisma from "./prisma"

export { isManagerOrAdminRole } from "./utils"

/**
 * Checks if a user has a specific permission for a module, taking overrides and roles into account.
 * Super Admin always returns true.
 */
export async function hasPermission(
  userId: string,
  module: string,
  action: string,
  amount?: number
): Promise<boolean> {
  if (!userId || typeof userId !== "string") {
    return false
  }

  try {
    // 1. Fetch user and their overrides
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissionOverrides: {
          where: { module }
        }
      }
    })

  if (!user || !user.isActive || user.deletedAt) {
    return false
  }

  // Super Admin bypasses all checks
  if (user.role === "SUPER_ADMIN") {
    return true
  }

  // 2. Check for User-Level Overrides first
  const override = user.permissionOverrides.find(o => o.action === action)
  if (override !== undefined) {
    if (action === "approve" && amount !== undefined && override.value) {
      const limit = override.approvalLimit
      if (limit !== null && amount > limit) {
        return false
      }
    }
    return override.value
  }

  // 3. Fall back to Role-Level Permissions
  const role = await prisma.role.findFirst({
    where: { name: user.role },
    include: {
      permissions: {
        where: { module }
      }
    }
  })

  if (!role) {
    return false
  }

  const rolePermission = role.permissions[0]
  if (!rolePermission) {
    return false
  }

  const hasRoleAccess = (rolePermission as any)[action]
  if (typeof hasRoleAccess !== "boolean") {
    return false
  }

  if (hasRoleAccess) {
    if (action === "approve" && amount !== undefined) {
      const limit = rolePermission.approvalLimit
      if (limit !== null && amount > limit) {
        return false
      }
    }
    return true
  }

  return false
  } catch (error) {
    console.error(`[rbac] Error checking permission for user "${userId}":`, error)
    return false
  }
}

/**
 * Verifies if a user can access a specific record based on ownership rules.
 * Ownership constraints can be: "ALL", "DEPARTMENT", "OWN", "ASSIGNED", or "NONE".
 */
export async function checkOwnership(
  userId: string,
  module: string,
  recordOwnerId: string,
  recordDepartment?: string,
  assignedUserIds?: string[]
): Promise<boolean> {
  if (!userId || typeof userId !== "string") {
    return false
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissionOverrides: {
          where: { module }
        }
      }
    })

  if (!user || !user.isActive || user.deletedAt) {
    return false
  }

  // Super Admin bypasses all ownership limits
  if (user.role === "SUPER_ADMIN") {
    return true
  }

  let ownershipRule = "ALL"

  // Check override for view/edit or general ownership override
  const ownershipOverride = user.permissionOverrides.find(o => o.action === "ownership")
  if (ownershipOverride?.ownership) {
    ownershipRule = ownershipOverride.ownership
  } else {
    const role = await prisma.role.findFirst({
      where: { name: user.role },
      include: {
        permissions: {
          where: { module }
        }
      }
    })
    const rolePermission = role?.permissions[0]
    if (rolePermission?.ownership) {
      ownershipRule = rolePermission.ownership
    }
  }

  switch (ownershipRule) {
    case "ALL":
      return true

    case "OWN":
      return userId === recordOwnerId

    case "DEPARTMENT":
      if (!user.department) return userId === recordOwnerId
      return user.department === recordDepartment || userId === recordOwnerId

    case "ASSIGNED":
      if (userId === recordOwnerId) return true
      if (assignedUserIds && assignedUserIds.includes(userId)) return true
      return false

    case "NONE":
    default:
      return false
  }
  } catch (error) {
    console.error(`[rbac] Error checking ownership for user "${userId}":`, error)
    return false
  }
}

/**
 * Get permissions profile for a user
 */
export async function getPermissionsProfile(userId: string) {
  if (!userId || typeof userId !== "string") {
    return null
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissionOverrides: true,
      }
    })

  if (!user || !user.isActive || user.deletedAt) {
    return null
  }

  const allModules = [
    "DASHBOARD", "CLIENTS", "PRODUCTS", "QUOTATIONS", "BOQS", "PURCHASE_ORDERS",
    "REPORTS", "USER_MANAGEMENT", "SETTINGS", "PRICING_MARKUP", "ACCESS_CONTROL",
    "NOTIFICATIONS", "SHAREPOINT", "SYSTEM_CONFIGURATION"
  ]

  const isManager = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(user.role)

  if (isManager) {
    const profile: Record<string, any> = {}
    for (const m of allModules) {
      profile[m] = {
        view: true, create: true, edit: true, delete: true, approve: true, reject: true,
        export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true,
        ownership: "ALL", approvalLimit: null,
        costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true,
        maxDiscountPercent: 100, canOverrideVat: true, canAddCustomCharges: true, canConfirmQuotation: true, canApplySpecialDiscount: true, canExportBoqExcel: true, canViewCostingBreakdown: true,
        canSaveToCatalog: true, canReviseQuotation: true, canAssignClients: true, canApproveClientAccess: true
      }
    }
    return {
      role: user.role,
      isSuperAdmin: user.role === "SUPER_ADMIN",
      isAdmin: true,
      permissions: profile,
    }
  }

  const role = await prisma.role.findFirst({
    where: { name: user.role },
    include: {
      permissions: true
    }
  })

  const profile: Record<string, any> = {}

  for (const m of allModules) {
    profile[m] = {
      view: false, create: false, edit: false, delete: false, approve: false, reject: false,
      export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false,
      ownership: "NONE", approvalLimit: null,
      costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false,
      maxDiscountPercent: 0, canOverrideVat: false, canAddCustomCharges: false, canConfirmQuotation: false, canApplySpecialDiscount: false, canExportBoqExcel: false, canViewCostingBreakdown: false,
      canSaveToCatalog: false, canReviseQuotation: false, canAssignClients: false, canApproveClientAccess: false
    }
  }

  if (role) {
    for (const perm of role.permissions) {
      profile[perm.module] = {
        view: perm.view,
        create: perm.create,
        edit: perm.edit,
        delete: perm.delete,
        approve: perm.approve,
        reject: perm.reject,
        export: perm.export,
        downloadPdf: perm.downloadPdf,
        uploadFiles: perm.uploadFiles,
        share: perm.share,
        manage: perm.manage,
        ownership: perm.ownership,
        approvalLimit: perm.approvalLimit,
        costPriceVisible: perm.costPriceVisible,
        dealerPriceVisible: perm.dealerPriceVisible,
        marginVisible: perm.marginVisible,
        profitVisible: perm.profitVisible,
        markupVisible: perm.markupVisible,
        maxDiscountPercent: perm.maxDiscountPercent,
        canOverrideVat: perm.canOverrideVat,
        canAddCustomCharges: perm.canAddCustomCharges,
        canConfirmQuotation: perm.canConfirmQuotation,
        canApplySpecialDiscount: perm.canApplySpecialDiscount,
        canExportBoqExcel: perm.canExportBoqExcel,
        canViewCostingBreakdown: (perm as any).canViewCostingBreakdown ?? perm.costPriceVisible,
        canSaveToCatalog: (perm as any).canSaveToCatalog ?? false,
        canReviseQuotation: (perm as any).canReviseQuotation ?? false,
        canAssignClients: (perm as any).canAssignClients ?? false,
        canApproveClientAccess: (perm as any).canApproveClientAccess ?? false
      }
    }
  }

  for (const override of user.permissionOverrides) {
    if (!profile[override.module]) {
      continue
    }
    const action = override.action
    if (action === "ownership") {
      profile[override.module].ownership = override.ownership ?? profile[override.module].ownership
    } else if (action === "approvalLimit") {
      profile[override.module].approvalLimit = override.approvalLimit ?? profile[override.module].approvalLimit
    } else if (action === "maxDiscountPercent") {
      profile[override.module].maxDiscountPercent = override.maxDiscountPercent ?? profile[override.module].maxDiscountPercent
    } else if (action === "canOverrideVat") {
      profile[override.module].canOverrideVat = override.value
    } else if (action === "canAddCustomCharges") {
      profile[override.module].canAddCustomCharges = override.value
    } else if (action === "canConfirmQuotation") {
      profile[override.module].canConfirmQuotation = override.value
    } else if (action === "canApplySpecialDiscount") {
      profile[override.module].canApplySpecialDiscount = override.value
    } else if (action === "canExportBoqExcel") {
      profile[override.module].canExportBoqExcel = override.value
    } else if (action === "canViewCostingBreakdown") {
      profile[override.module].canViewCostingBreakdown = override.value
    } else if (action === "canSaveToCatalog") {
      profile[override.module].canSaveToCatalog = override.value
    } else if (action === "canReviseQuotation") {
      profile[override.module].canReviseQuotation = override.value
    } else if (action === "canAssignClients") {
      profile[override.module].canAssignClients = override.value
    } else if (action === "canApproveClientAccess") {
      profile[override.module].canApproveClientAccess = override.value
    } else {
      profile[override.module][action] = override.value
    }
  }

  return {
    role: user.role,
    isSuperAdmin: false,
    permissions: profile,
  }
  } catch (error) {
    console.error(`[rbac] Error getting permissions profile for user "${userId}":`, error)
    return null
  }
}
