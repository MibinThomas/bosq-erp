// Pricing margin settings are stored as { dealer, interior, project, special } (Settings → Pricing).
// Product forms work with { dealer, interior, direct, online }: direct = project, online = special.

export interface PricingTiers {
  dealer: number
  interior: number
  direct: number
  online: number
}

export const DEFAULT_PRICING_TIERS: PricingTiers = { dealer: 15, interior: 30, direct: 50, online: 75 }

const pct = (v: unknown, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 && n < 100 ? n : fallback
}

export function normalizePricingTiers(data: any): PricingTiers {
  const d = DEFAULT_PRICING_TIERS
  return {
    dealer: pct(data?.dealer, d.dealer),
    interior: pct(data?.interior, d.interior),
    direct: pct(data?.project ?? data?.direct, d.direct),
    online: pct(data?.special ?? data?.online, d.online),
  }
}
