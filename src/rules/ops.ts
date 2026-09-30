// State helpers shared by the engine and the cards. They mutate the working copy and emit events.
import type { GameEvent, GameState, MoveVia, Seat, StatusKind } from './types'

export interface Ctx { s: GameState; ev: GameEvent[] }

export function addCapital(c: Ctx, p: Seat, delta: number, reason: string) {
  if (!delta) return
  c.s.players[p]!.capital += delta
  c.ev.push({ type: 'capital', player: p, delta, reason })
}

/** Debt never leaves 0..cap; returns the change actually applied. */
export function addDebt(c: Ctx, p: Seat, delta: number, reason: string): number {
  const pl = c.s.players[p]!
  const next = Math.min(c.s.config.debtCap, Math.max(0, pl.debt + delta))
  const applied = next - pl.debt
  if (!applied) return 0
  pl.debt = next
  c.ev.push({ type: 'debt', player: p, delta: applied, reason })
  return applied
}

export function addWaivers(c: Ctx, p: Seat, delta: number, reason: string) {
  c.s.players[p]!.waivers += delta
  c.ev.push({ type: 'waiver', player: p, delta, reason })
}

export function addStatus(c: Ctx, p: Seat, kind: StatusKind, turns: number) {
  const status = { kind, turns }
  c.s.players[p]!.statuses.push(status)
  c.ev.push({ type: 'statusAdded', player: p, status: { ...status } })
}

export function move(c: Ctx, p: Seat, to: number, via: MoveVia) {
  const pl = c.s.players[p]!
  const from = pl.square
  if (to === from) return
  const step = to > from ? 1 : -1
  // Walks and pushes list every square (pawn hops); ladders and snakes are one path segment.
  const path = via === 'ladder' || via === 'snake'
    ? [from, to]
    : Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from + i * step)
  pl.square = to
  c.ev.push({ type: 'moved', player: p, path, via })
}

export function matureProject(c: Ctx, p: Seat, id: number) {
  const pl = c.s.players[p]!
  const i = pl.projects.findIndex((x) => x.id === id)
  if (i < 0) return
  const [proj] = pl.projects.splice(i, 1)
  pl.matured += proj!.profit
  c.ev.push({ type: 'projectMatured', player: p, id, profit: proj!.profit })
  addCapital(c, p, proj!.profit, 'project matured')
}

/** Move every project's clock by `by` (-1 = one turn closer). Anything reaching 0 pays out. */
export function tickProjects(c: Ctx, p: Seat, by: number) {
  const pl = c.s.players[p]!
  for (const proj of [...pl.projects]) {
    proj.ttm = Math.max(0, proj.ttm + by)
    c.ev.push({ type: 'projectTicked', player: p, id: proj.id, ttm: proj.ttm })
    if (proj.ttm === 0) matureProject(c, p, proj.id)
  }
}

export function changeProfit(c: Ctx, p: Seat, id: number, delta: number, reason: string) {
  const proj = c.s.players[p]!.projects.find((x) => x.id === id)
  if (!proj) return
  proj.profit = Math.max(0, proj.profit + delta)
  c.ev.push({ type: 'projectChanged', player: p, id, profit: proj.profit, reason })
}

export function netWorth(s: GameState, p: Seat): number {
  const pl = s.players[p]!
  return pl.capital - s.config.debtWeight * pl.debt
}

/** Every seat after `p`, in turn order. */
export function othersInOrder(s: GameState, p: Seat): Seat[] {
  const n = s.players.length
  return Array.from({ length: n - 1 }, (_, i) => (p + 1 + i) % n)
}

/** Seats with the top value of `f`, in turn order starting at the current player. */
export function topBy(s: GameState, f: (p: Seat) => number): Seat[] {
  const order = [s.current, ...othersInOrder(s, s.current)]
  const best = Math.max(...order.map(f))
  return order.filter((p) => f(p) === best)
}
