import type { CountryId } from './types'

// Perk logic lives where each rule is applied (engine.ts / ops.ts); this is display data.
export const COUNTRIES: Record<CountryId, { name: string; perk: string }> = {
  usa: { name: 'USA', perk: 'Invest up to 4 chips on a ladder' },
  china: { name: 'China', perk: 'Tariffs push you back 2, not 3' },
  japan: { name: 'Japan', perk: 'Hedging costs 1 less (min 1)' },
  germany: { name: 'Germany', perk: 'Exactly 2 chips gives +1 profit' },
  bangladesh: { name: 'Bangladesh', perk: 'Ladders with Δ ≤ 14 mature a turn sooner' },
  uk: { name: 'UK', perk: 'Each Debt chip gives 2 Capital' },
}

export const COUNTRY_IDS = Object.keys(COUNTRIES) as CountryId[]
