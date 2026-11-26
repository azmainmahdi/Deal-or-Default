// State helpers shared by the engine and the cards. They mutate the working copy and emit events.
import type { GameEvent, GameState, Loan, MoveVia, Player, Seat, StatusKind } from './types'

export interface Ctx { s: GameState; ev: GameEvent[] }

export function addCapital(c: Ctx, p: Seat, delta: number, reason: string) {
  if (!delta) return
  c.s.players[p]!.capital += delta
  c.ev.push({ type: 'capital', player: p, delta, reason })
}

/** Loans oldest first. A player whose `debt` was set directly (tests, old saves) gets the gap as one loan from turn 0. */
export function loansOf(pl: Player): Loan[] {
  pl.loans ??= []
  const gap = pl.debt - pl.loans.reduce((a, l) => a + l.n, 0)
  if (gap > 0) pl.loans.unshift({ n: gap, turn: 0 })
  for (let g = -gap; g > 0 && pl.loans.length; g--) { const l = pl.loans[pl.loans.length - 1]!; if (!--l.n) pl.loans.pop() }
  return pl.loans
}

/** Interest on one loan cleared now: on time within debtOnTime of the owner's own turns, else the late rate. */
const bund = (s: GameState, p: Seat) => s.players[p]!.country === 'germany' && s.config.germanyPerk === 'bund'
const interest = (s: GameState, p: Seat, l: Loan) =>
  bund(s, p) || (s.turn - l.turn) / s.players.length <= s.config.debtOnTime ? s.config.debtInterest : s.config.debtLateInterest

/** Loan sizes the player does not hold (each of 1, 2, 3 can be held once), within the cap. */
export function freeLoans(s: GameState, p: Seat): number[] {
  const pl = s.players[p]!, held = loansOf(pl).map((l) => l.n)
  return s.config.loanSizes.filter((n) => !held.includes(n) && pl.debt + n <= s.config.debtCap)
}

/** What repaying the loan of size n costs: n plus its interest. Infinity if not held. */
export function repayCost(s: GameState, p: Seat, n: number): number {
  const l = loansOf(s.players[p]!).find((x) => x.n === n)
  return l ? n + interest(s, p, l) : Infinity
}

/** Loan sizes the player holds and can afford to repay now. */
export function repayable(s: GameState, p: Seat): number[] {
  const pl = s.players[p]!
  return [...new Set(loansOf(pl).map((l) => l.n))].filter((n) => repayCost(s, p, n) <= pl.capital).sort((a, b) => a - b)
}

/** What open loans cost at the end: each one plus the late rate. */
export function debtCost(s: GameState, p: Seat): number {
  const extra = bund(s, p) ? s.config.debtInterest : s.config.debtLateInterest
  return loansOf(s.players[p]!).reduce((a, l) => a + l.n + extra, 0)
}

function debtEvent(c: Ctx, p: Seat, delta: number, reason: string) {
  c.s.players[p]!.debt += delta
  c.ev.push({ type: 'debt', player: p, delta, reason })
}

/** Borrow the loan of size n (the caller checks it is free). */
export function takeLoan(c: Ctx, p: Seat, n: number, reason: string) {
  loansOf(c.s.players[p]!).push({ n, turn: c.s.turn })
  debtEvent(c, p, n, reason)
}

/** Repay the oldest loan of size n in full, interest included. */
export function repayLoan(c: Ctx, p: Seat, n: number) {
  const pl = c.s.players[p]!, loans = loansOf(pl), i = loans.findIndex((l) => l.n === n)
  if (i < 0) return
  addCapital(c, p, -repayCost(c.s, p, n), 'repaid debt')
  loans.splice(i, 1)
  debtEvent(c, p, -n, 'repaid')
}

/** Card debt and card relief. Adding takes your smallest free loan (ASSUMPTION: cards say "+1 Debt"; with fixed loans
 *  the 1 is used if free, else the 2, else the 3, else nothing). Removing lowers your smallest loan by one chip.
 *  Returns the change applied. */
export function addDebt(c: Ctx, p: Seat, delta: number, reason: string): number {
  const pl = c.s.players[p]!, loans = loansOf(pl)
  if (delta > 0) {
    const n = freeLoans(c.s, p)[0]
    if (n === undefined) return 0
    takeLoan(c, p, n, reason)
    return n
  }
  if (delta < 0 && loans.length) {
    const l = loans.reduce((a, x) => (x.n < a.n ? x : a))
    l.n--
    if (!l.n) loans.splice(loans.indexOf(l), 1)
    debtEvent(c, p, -1, reason)
    return -1
  }
  return 0
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
  if (pl.country === 'germany' && c.s.config.germanyPerk === 'export') addCapital(c, p, c.s.config.germanyExport, 'export champion')
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
  return pl.capital - debtCost(s, p)
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
