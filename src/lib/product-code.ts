import prisma from "@/lib/prisma"

/**
 * Generates the next sequential product code for a category, e.g. "CH-01", "CH-02" … "CH-100".
 *
 * The numeric suffix is compared as a number (not as text), so "CH-100" correctly follows "CH-99".
 * Codes that don't follow the `PREFIX-<number>` pattern (e.g. "CH-MESH-BLK") are ignored.
 */
export async function generateProductCode(categoryName: string): Promise<string> {
  const prefix = (categoryName || "PR").trim().substring(0, 2).toUpperCase() || "PR"
  const pattern = new RegExp(`^${prefix.replace(/[^A-Z0-9]/g, "\\$&")}-(\\d+)$`)

  const existing = await prisma.product.findMany({
    where: { productCode: { startsWith: `${prefix}-` } },
    select: { productCode: true },
  })

  let max = 0
  for (const { productCode } of existing) {
    const match = productCode.match(pattern)
    if (match) max = Math.max(max, parseInt(match[1], 10))
  }

  return `${prefix}-${(max + 1).toString().padStart(2, "0")}`
}
