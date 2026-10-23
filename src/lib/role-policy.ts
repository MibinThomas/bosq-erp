// Shared rules for changing a user's role or active status.
// Every route that creates users or edits role/isActive must go through checkUserChange.
import prisma from "@/lib/prisma"

/** Roles only a Super Admin may assign, or modify accounts holding them. */
export const PRIVILEGED_ROLES = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"]

const BUILT_IN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "SALES_MANAGER",
  "SALES_EXECUTIVE",
  "INTERIOR_DESIGN_CONSULTANT",
  "ESTIMATOR",
  "ACCOUNTS",
  "PRODUCTION",
]

export const isPrivilegedRole = (role?: string | null) => !!role && PRIVILEGED_ROLES.includes(role)

async function roleExists(role: string) {
  if (BUILT_IN_ROLES.includes(role)) return true
  return !!(await prisma.role.findUnique({ where: { name: role }, select: { id: true } }))
}

interface UserChange {
  actorId: string
  actorRole: string
  /** null when creating a new user */
  target: { id: string; role: string; isActive: boolean } | null
  newRole?: string | null
  newIsActive?: boolean
}

/** Returns an error message when the change is not allowed, otherwise null. */
export async function checkUserChange({ actorId, actorRole, target, newRole, newIsActive }: UserChange): Promise<string | null> {
  const isSuperAdmin = actorRole === "SUPER_ADMIN"
  const isSelf = !!target && target.id === actorId
  const roleChanging = newRole !== undefined && newRole !== null && newRole !== "" && newRole !== target?.role
  const deactivating = newIsActive === false && (target ? target.isActive : true)

  if (target && isPrivilegedRole(target.role) && !isSuperAdmin && !isSelf && (roleChanging || newIsActive !== undefined)) {
    return "Only a Super Admin can change the role or status of admin or manager accounts."
  }

  if (roleChanging) {
    if (isSelf) return "You cannot change your own role."
    if (!(await roleExists(newRole!))) return `Unknown role "${newRole}".`
    if (isPrivilegedRole(newRole) && !isSuperAdmin) {
      return "Only a Super Admin can assign the Super Admin, Admin or Manager roles."
    }
  }

  if (deactivating && isSelf) return "You cannot deactivate your own account."

  // Never leave the system without an active Super Admin
  if (target?.role === "SUPER_ADMIN" && target.isActive && (roleChanging || deactivating)) {
    const others = await prisma.user.count({
      where: { role: "SUPER_ADMIN", isActive: true, deletedAt: null, id: { not: target.id } },
    })
    if (others === 0) return "This is the last active Super Admin account; it cannot be demoted or deactivated."
  }

  return null
}
