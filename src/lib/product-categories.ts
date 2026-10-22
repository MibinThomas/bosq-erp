import prisma from "@/lib/prisma"

/** Returns the category id plus the ids of its sub-categories, so filtering by a parent includes its children. */
export async function getCategoryIdsWithChildren(categoryId: string): Promise<string[]> {
  const children = await prisma.productCategory.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  })
  return [categoryId, ...children.map((c) => c.id)]
}

/**
 * Validates a requested parent for a category. Categories are limited to two levels:
 * a parent must itself be top-level, and a category that has sub-categories cannot become a child.
 * Returns an error message, or null when the parent is valid.
 */
export async function validateCategoryParent(categoryId: string | null, parentId: string): Promise<string | null> {
  if (categoryId && parentId === categoryId) return "A category cannot be its own parent."
  const parent = await prisma.productCategory.findUnique({ where: { id: parentId }, select: { parentId: true } })
  if (!parent) return "Parent category not found."
  if (parent.parentId) return "Sub-categories cannot have their own sub-categories. Choose a top-level parent."
  if (categoryId) {
    const childCount = await prisma.productCategory.count({ where: { parentId: categoryId } })
    if (childCount > 0) return "This category has sub-categories, so it cannot be placed under another category."
  }
  return null
}

/**
 * Finds or creates a category by name. A name written as "Parent > Child" (e.g. "Chairs > Premium Chairs")
 * creates/links the child under the parent. Matching is case-insensitive.
 */
export async function findOrCreateCategory(rawName: string): Promise<{ id: string; name: string }> {
  const parts = rawName.split(">").map((s) => s.trim()).filter(Boolean)
  const findOrCreate = async (name: string, parentId: string | null) => {
    const existing = await prisma.productCategory.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })
    if (existing) {
      // Link an existing top-level category under the requested parent if it has no parent yet
      if (parentId && !existing.parentId && existing.id !== parentId) {
        const hasChildren = await prisma.productCategory.count({ where: { parentId: existing.id } })
        if (!hasChildren) {
          return prisma.productCategory.update({ where: { id: existing.id }, data: { parentId } })
        }
      }
      return existing
    }
    return prisma.productCategory.create({
      data: { name, description: `${name} category`, parentId },
    })
  }

  if (parts.length >= 2) {
    const parent = await findOrCreate(parts[0], null)
    const child = await findOrCreate(parts[parts.length - 1], parent.id)
    return { id: child.id, name: child.name }
  }
  const category = await findOrCreate(parts[0] || rawName.trim(), null)
  return { id: category.id, name: category.name }
}
