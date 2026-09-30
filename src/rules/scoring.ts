import { netWorth } from './ops'
import type { FinalLedger, GameState, Seat } from './types'

/** Net Worth = Capital - 1.5 × Debt. Pending projects count 0. Ties: furthest pawn, then shared. */
export function finalLedger(s: GameState, finisher: Seat, bonus: number): FinalLedger {
  const rows = s.players.map((pl, p) => ({
    player: p,
    capital: pl.capital,
    bonus: p === finisher ? bonus : 0,
    matured: pl.matured,
    debt: pl.debt,
    debtCost: s.config.debtWeight * pl.debt,
    pendingLost: pl.projects.reduce((a, x) => a + x.profit, 0),
    netWorth: netWorth(s, p),
    square: pl.square,
    rank: 0,
  }))
  const better = (a: typeof rows[0], b: typeof rows[0]) => b.netWorth - a.netWorth || b.square - a.square
  const sorted = [...rows].sort(better)
  for (const r of rows) r.rank = 1 + sorted.filter((o) => better(o, r) < 0).length
  return { rows: sorted, winners: sorted.filter((r) => r.rank === 1).map((r) => r.player) }
}
