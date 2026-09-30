// Board data only. OPEN: verify every entry against the physical board / .ai files.

export const LADDERS: Readonly<Record<number, number>> = {
  10: 13, 22: 26, 29: 32, 37: 42, 50: 55, 59: 64, 67: 75, 71: 86,
}

export const SNAKES: Readonly<Record<number, number>> = {
  17: 5, 28: 9, 31: 14, 48: 26, 58: 39, 65: 46, 88: 73, 99: 63,
}

// 54 is OPEN: the manual's board shows it, the old code omitted it.
export const EVENTS: readonly number[] = [7, 25, 43, 54, 61, 69, 76, 87, 96]
export const TARIFFS: readonly number[] = [23, 34, 62, 72, 83]
export const SANCTIONS: readonly number[] = [18, 45, 68, 79, 91]
export const GOAL = 100

export type Tile = 'start' | 'plain' | 'ladder' | 'snake' | 'event' | 'tariff' | 'sanction' | 'goal'

export function tileAt(square: number): Tile {
  if (square === 1) return 'start'
  if (square === GOAL) return 'goal'
  if (square in LADDERS) return 'ladder'
  if (square in SNAKES) return 'snake'
  if (EVENTS.includes(square)) return 'event'
  if (TARIFFS.includes(square)) return 'tariff'
  if (SANCTIONS.includes(square)) return 'sanction'
  return 'plain'
}
