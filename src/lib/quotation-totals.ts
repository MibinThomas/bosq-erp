// Quotation totals: one formula for create, update and costing saves.
// Taxable = lines + additional charges − special discount; VAT 5% unless prices include VAT.

export interface QuotationTotalsInput {
  subtotal: number
  additionalCharges?: unknown
  specialDiscountType?: string | null
  specialDiscountValue?: number | string | null
  vatMode?: string | null
}

export function computeQuotationTotals({ subtotal, additionalCharges, specialDiscountType, specialDiscountValue, vatMode }: QuotationTotalsInput) {
  const charges = Array.isArray(additionalCharges) ? additionalCharges : []
  const totalAdditionalCost = charges.reduce((sum: number, c: any) => sum + (parseFloat(c?.amount) || 0), 0)

  const discountVal = parseFloat(String(specialDiscountValue ?? 0)) || 0
  const base = subtotal + totalAdditionalCost
  let discountAmt = 0
  let appliedDiscountPercent = 0
  if (discountVal > 0) {
    if (specialDiscountType === "PERCENTAGE") {
      appliedDiscountPercent = discountVal
      discountAmt = base * (discountVal / 100)
    } else if (specialDiscountType === "FIXED") {
      appliedDiscountPercent = base > 0 ? (discountVal / base) * 100 : 0
      discountAmt = discountVal
    }
  }

  const taxableAmount = Math.max(0, base - discountAmt)
  const vatAmount = vatMode === "INCLUDING" ? 0 : taxableAmount * 0.05
  const grandTotal = Math.round(taxableAmount + vatAmount)

  return { totalAdditionalCost, discountAmt, appliedDiscountPercent, taxableAmount, vatAmount, grandTotal }
}
