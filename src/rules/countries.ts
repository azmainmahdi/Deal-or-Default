import type { CountryId } from './types'

// Perk logic lives where each rule is applied (engine.ts / ops.ts); this is display data.
export const COUNTRIES: Record<CountryId, { name: string; perk: string }> = {
  usa: { name: 'USA', perk: 'Invest up to 4 chips on a ladder' },
  china: { name: 'China', perk: 'Tariffs push you back 2, not 3, and +1 Capital when anyone else lands on a tariff' },
  japan: { name: 'Japan', perk: 'Hedging costs 1 less (min 1)' },
  germany: { name: 'Germany', perk: 'Made in Germany: projects of 2+ chips pay +2' },
  bangladesh: { name: 'Bangladesh', perk: 'Ladders with Δ ≤ 14 mature a turn sooner' },
  uk: { name: 'UK', perk: 'Each Debt chip gives 2 Capital' },
}

export const COUNTRY_IDS = Object.keys(COUNTRIES) as CountryId[]
