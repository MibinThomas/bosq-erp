// Recommended permission sets per role, applied from Settings → Access Control ("Apply recommended").
// Modules not listed get no access. Scope ("ownership") ASSIGNED = records the user created,
// owns or was assigned to.

type PermissionRow = Record<string, boolean | number | string | null>

const NONE: PermissionRow = {
  view: false, create: false, edit: false, delete: false, approve: false, reject: false,
  export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false,
  ownership: "NONE", approvalLimit: null,
  costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false,
  maxDiscountPercent: 0, canOverrideVat: false, canAddCustomCharges: false, canConfirmQuotation: false,
  canApplySpecialDiscount: false, canExportBoqExcel: false, canSaveToCatalog: false, canReviseQuotation: false,
  canAssignClients: false, canApproveClientAccess: false,
}

/** Interior Design Consultant: works only on assigned clients and quotations; never sees costs or margins. */
export const IDC_RECOMMENDED: Record<string, PermissionRow> = {
  DASHBOARD: { ...NONE, view: true, ownership: "ASSIGNED" },
  CLIENTS: { ...NONE, view: true, create: true, edit: true, uploadFiles: true, ownership: "ASSIGNED" },
  PRODUCTS: { ...NONE, view: true, downloadPdf: true, share: true, ownership: "ALL" },
  QUOTATIONS: {
    ...NONE,
    view: true, create: true, edit: true, export: true, downloadPdf: true, uploadFiles: true, share: true,
    ownership: "ASSIGNED",
    canReviseQuotation: true, canConfirmQuotation: true, canApplySpecialDiscount: true, canAddCustomCharges: true,
  },
  BOQS: { ...NONE, view: true, create: true, edit: true, export: true, downloadPdf: true, uploadFiles: true, share: true, ownership: "ASSIGNED" },
  NOTIFICATIONS: { ...NONE, view: true, edit: true, delete: true, ownership: "ASSIGNED" },
}

export const ROLE_PRESETS: Record<string, { label: string; summary: string; permissions: Record<string, PermissionRow> }> = {
  INTERIOR_DESIGN_CONSULTANT: {
    label: "Interior Design Consultant",
    summary:
      "Assigned clients, quotations, BOQs and dashboard only; catalogue view without cost prices or margins; no reports, users or settings.",
    permissions: IDC_RECOMMENDED,
  },
}

/** Full permission rows for every module, using the preset where defined and no access elsewhere. */
export function presetRows(roleName: string, moduleIds: string[]) {
  const preset = ROLE_PRESETS[roleName]
  if (!preset) return null
  return Object.fromEntries(moduleIds.map((m) => [m, { module: m, ...(preset.permissions[m] || NONE) }]))
}
