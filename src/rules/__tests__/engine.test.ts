import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../config'
import { legalIntents, newGame, projectTerms, step } from '../engine'
import { debtCost, repayCost } from '../ops'
import { finalLedger } from '../scoring'
import { edit, game, play, rollAs, setPlayer } from './helpers'

describe('setup', () => {
  it('deals 5 Capital, 1 Waiver, Start square, distinct countries, and opens player 0 debt window', () => {
    const { state: s } = newGame({ names: ['A', 'B', 'C', 'D', 'E', 'F'], seed: 9 })
    expect(new Set(s.players.map((p) => p.country)).size).toBe(6)
    for (const p of s.players) expect([p.capital, p.debt, p.waivers, p.square]).toEqual([5, 0, 1, 1])
    expect(s.decision).toMatchObject({ kind: 'debtWindow', player: 0 })
    expect(s.deck).toHaveLength(27) // every printed card we know of (assumption: the print says 24)
  })
  it('uses drafted countries when given, and rejects duplicates', () => {
    const { state } = newGame({ names: ['A', 'B'], seed: 3, countries: ['uk', 'china'] })
    expect(state.players.map((p) => p.country)).toEqual(['uk', 'china'])
    expect(() => newGame({ names: ['A', 'B'], seed: 3, countries: ['uk', 'uk'] })).toThrow()
  })
  it('rejects fewer than 2 or more than 6 players', () => {
    expect(() => newGame({ names: ['A'], seed: 1 })).toThrow()
    expect(() => newGame({ names: Array(7).fill('x'), seed: 1 })).toThrow()
  })
})

describe('debt window', () => {
  it('borrow one of the 1/2/3 loans for equal Capital; then no more borrowing this turn, but repaying is allowed', () => {
    const { state } = play(game(), { player: 0, type: 'takeDebt', n: 3 })
    expect(state.players[0]).toMatchObject({ capital: 8, debt: 3, loans: [{ n: 3 }] })
    expect(state.decision).toEqual({ kind: 'debtWindow', player: 0, take: [], repay: [3] })
  })
  it('each loan size is held once; the window offers only free sizes within the cap', () => {
    const s = setPlayer(game(), 1, { debt: 2, loans: [{ n: 2, turn: 0 }], capital: 9 })
    expect(rollAs(s, 3).state.decision).toMatchObject({ kind: 'debtWindow', player: 1, take: [1, 3], repay: [2] })
  })
  it('UK gets 2 Capital per Debt chip', () => {
    const { state } = play(game(2, {}, ['uk']), { player: 0, type: 'takeDebt', n: 2 })
    expect(state.players[0]).toMatchObject({ capital: 9, debt: 2 })
  })
  it('repaying a whole loan needs its cost in Capital; unaffordable loans are not offered', () => {
    const s = setPlayer(game(), 1, { debt: 4, loans: [{ n: 1, turn: 1 }, { n: 3, turn: 1 }], capital: 2 })
    const w = rollAs(s, 3).state
    expect(w.decision).toEqual({ kind: 'debtWindow', player: 1, take: [2], repay: [1] })
    expect(step(w, { player: 1, type: 'repay', n: 3 }).error).toBeDefined()
    expect(play(w, { player: 1, type: 'repay', n: 1 }).state.players[1]).toMatchObject({ capital: 0, debt: 3 })
  })
  it('v1 soft-lock: debt actions and other players are rejected while a decision is pending', () => {
    const s = setPlayer(game(), 0, { square: 5 })
    const { state } = rollAs(s, 5) // lands on ladder 10
    expect(state.decision?.kind).toBe('invest')
    const bad = step(state, { player: 0, type: 'takeDebt', n: 1 })
    expect(bad.error).toBeDefined()
    expect(bad.state).toBe(state)
    expect(step(state, { player: 1, type: 'invest', chips: 1 }).error).toBeDefined()
  })
})

describe('roll and move', () => {
  it('walks, then passes the turn to the next player exactly once', () => {
    const { state, events } = rollAs(game(3), 4)
    expect(state.players[0]!.square).toBe(5)
    expect(state.current).toBe(1)
    expect(events.filter((e) => e.type === 'turnStarted')).toHaveLength(1)
    expect(events.find((e) => e.type === 'moved')).toMatchObject({ path: [1, 2, 3, 4, 5], via: 'walk' })
  })
  it('overshooting 100 stays put', () => {
    const { state, events } = rollAs(setPlayer(game(), 0, { square: 98 }), 5)
    expect(state.players[0]!.square).toBe(98)
    expect(events).toContainEqual({ type: 'noMove', player: 0, reason: 'overshoot' })
  })
  it('liquidity crunch halves rolls from 81 while in debt', () => {
    const { state } = rollAs(setPlayer(game(), 0, { square: 84, debt: 1 }), 5)
    expect(state.players[0]!.square).toBe(86)
  })
  it('a halved 1 is a zero roll: no move, no tile', () => {
    const { state, events } = rollAs(setPlayer(game(), 0, { square: 81, debt: 1 }), 1)
    expect(state.players[0]!.square).toBe(81)
    expect(events).toContainEqual({ type: 'noMove', player: 0, reason: 'zero' })
  })
  it('no crunch without debt', () => {
    expect(rollAs(setPlayer(game(), 0, { square: 84 }), 5).state.players[0]!.square).toBe(89)
  })
})

describe('ladder', () => {
  const atBase = (patch = {}, countries: Parameters<typeof game>[2] = []) =>
    rollAs(setPlayer(game(2, {}, countries), 0, { square: 5, ...patch }), 5).state // lands on 10 (→13, Δ3)
  it('offers 0–3 chips, capped by Capital', () => {
    expect(atBase().decision).toMatchObject({ kind: 'invest', max: 3, from: 10, to: 13 })
    expect(atBase({ capital: 2 }).decision).toMatchObject({ max: 2 })
    expect(atBase({ capital: 0 }).decision?.kind).toBe('debtWindow') // nothing affordable: turn moves on
  })
  it('USA may invest 4', () => {
    expect(atBase({ capital: 9 }, ['usa']).decision).toMatchObject({ max: 4 })
  })
  it('investing climbs and creates a project: ttm = chips, profit = chips × Δ', () => {
    const { state } = play(atBase(), { player: 0, type: 'invest', chips: 3 })
    expect(state.players[0]).toMatchObject({ square: 13, capital: 2 })
    expect(state.players[0]!.projects).toEqual([{ id: 1, chips: 3, delta: 3, ttm: 3, profit: 9 }])
  })
  it('investing 0 stays at the base', () => {
    const { state } = play(atBase(), { player: 0, type: 'invest', chips: 0 })
    expect(state.players[0]).toMatchObject({ square: 10, capital: 5, projects: [] })
  })
  it('Germany: exactly 2 chips gives +1 profit', () => {
    const { state } = play(atBase(), { player: 0, type: 'invest', chips: 2 })
    expect(state.players[0]!.projects[0]!.profit).toBe(7)
  })
  it('Made in Germany (default): projects of 2+ chips pay +2', () => {
    expect(projectTerms('germany', 2, 3, DEFAULT_CONFIG).profit).toBe(8)
    expect(projectTerms('germany', 1, 3, DEFAULT_CONFIG).profit).toBe(3)
    expect(projectTerms('usa', 2, 3, DEFAULT_CONFIG).profit).toBe(6)
  })
  it('Bangladesh: Δ ≤ 14 matures a turn sooner, minimum 1', () => {
    const s = atBase({}, ['bangladesh'])
    expect(play(s, { player: 0, type: 'invest', chips: 2 }).state.players[0]!.projects[0]!.ttm).toBe(1)
    expect(play(s, { player: 0, type: 'invest', chips: 1 }).state.players[0]!.projects[0]!.ttm).toBe(1)
  })
  it('projects tick at the owner turn start and pay out at 0', () => {
    let s = play(atBase(), { player: 0, type: 'invest', chips: 1 }).state // ttm 1, profit 3, capital 4
    s = rollAs(s, 2).state // player 1 moves; player 0 turn starts
    expect(s.players[0]).toMatchObject({ capital: 7, matured: 3, projects: [] })
  })
})

describe('snake', () => {
  const atHead = (patch = {}, config = {}, countries: Parameters<typeof game>[2] = []) =>
    rollAs(setPlayer(game(2, config, countries), 0, { square: 14, ...patch }), 3).state // 17 → 5, Δ12
  const projects = [
    { id: 1, chips: 1, delta: 3, ttm: 1, profit: 3 },
    { id: 2, chips: 3, delta: 5, ttm: 3, profit: 15 },
  ]
  it('hedge costs round(Δ/5); hedging slides ceil(Δ/2) and keeps projects', () => {
    const s = atHead({ projects })
    expect(s.decision).toMatchObject({ kind: 'hedge', cost: 2 })
    const { state } = play(s, { player: 0, type: 'hedge', hedge: true })
    expect(state.players[0]).toMatchObject({ square: 11, capital: 3 })
    expect(state.players[0]!.projects).toHaveLength(2)
  })
  it('skipping slides the full Δ and loses the largest project', () => {
    const { state } = play(atHead({ projects }), { player: 0, type: 'hedge', hedge: false })
    expect(state.players[0]!.square).toBe(5)
    expect(state.players[0]!.projects.map((p) => p.id)).toEqual([1])
  })
  it('hedgeLoss "all" loses every project', () => {
    const { state } = play(atHead({ projects }, { hedgeLoss: 'all' }), { player: 0, type: 'hedge', hedge: false })
    expect(state.players[0]!.projects).toEqual([])
  })
  it('Japan pays 1 less (min 1); Insurance Fraud adds 2 once', () => {
    expect(atHead({}, {}, ['japan']).decision).toMatchObject({ cost: 1 })
    const s = atHead({ fraud: true })
    expect(s.decision).toMatchObject({ cost: 4 })
    expect(s.players[0]!.fraud).toBe(false)
  })
  it('cannot afford the hedge: full slide, no prompt', () => {
    const s = atHead({ capital: 1, projects })
    expect(s.players[0]!.square).toBe(5)
    expect(s.decision?.kind).toBe('debtWindow')
  })
})

describe('tariff', () => {
  const hit = (victim: object, countries: Parameters<typeof game>[2] = []) =>
    rollAs(setPlayer(setPlayer(game(3, {}, countries), 0, { square: 20 }), 1, victim), 3).state // p0 lands on 23
  it('pushes every other player back 3; China 2', () => {
    const s = hit({ square: 40, waivers: 0 }, ['germany', 'china'])
    expect(s.players[1]!.square).toBe(38)
    expect(s.players[2]!.square).toBe(1) // on Start: unaffected
  })
  it('a waiver holder decides; using it blocks the push', () => {
    const s = hit({ square: 40 })
    expect(s.decision).toMatchObject({ kind: 'waiver', player: 1, setback: 3 })
    const used = play(s, { player: 1, type: 'waiver', use: true }).state
    expect(used.players[1]).toMatchObject({ square: 40, waivers: 0 })
    const declined = play(s, { player: 1, type: 'waiver', use: false }).state
    expect(declined.players[1]).toMatchObject({ square: 37, waivers: 1 })
  })
  it('a tariff push-back onto a ladder base does nothing (his ruling 21 Oct: squares you are sent back onto never act)', () => {
    const s = hit({ square: 13, waivers: 0 }) // 13 - 3 = 10, ladder base
    expect(s.players[1]!.square).toBe(10)
    expect(s.decision).toMatchObject({ kind: 'debtWindow', player: 1 }) // no invest offer; p0's turn ended normally
  })
})

describe('sanction', () => {
  const base = (config = {}) => {
    let s = game(3, config)
    s = setPlayer(s, 0, { square: 15 })
    s = setPlayer(s, 1, { square: 40, capital: 9 })
    return setPlayer(s, 2, { square: 30, capital: 9 })
  }
  it('Net Worth leaders move back 5, ties all move', () => {
    const s = rollAs(base(), 3).state // 18
    expect(s.players.map((p) => p.square)).toEqual([18, 35, 25])
  })
  it('Net Worth subtracts 1.5 × Debt (v1 added it)', () => {
    const s = rollAs(setPlayer(base(), 1, { debt: 2 }), 3).state
    expect(s.players.map((p) => p.square)).toEqual([18, 40, 25])
  })
  it('Sanction Threat makes that player the only target', () => {
    const s = rollAs(setPlayer(base(), 0, { statuses: [{ kind: 'sanctionThreat', turns: 1 }] }), 3).state
    expect(s.players.map((p) => p.square)).toEqual([18 - 5, 40, 30])
  })
  it('sanctionThreat "add" hits the leaders too', () => {
    const s = rollAs(setPlayer(base({ sanctionThreat: 'add' }), 0, { statuses: [{ kind: 'sanctionThreat', turns: 1 }] }), 3).state
    expect(s.players.map((p) => p.square)).toEqual([13, 35, 25])
  })
})

describe('events', () => {
  it('draws the top card, waits for ack, applies it, discards it', () => {
    const s = edit(setPlayer(game(2, { ackCards: true }), 0, { square: 4 }), (x) => (x.deck = ['lendLease', 'warBond']))
    const drawn = rollAs(s, 3).state
    expect(drawn.decision).toEqual({ kind: 'ackCard', player: 0, card: 'lendLease' })
    const { state } = play(drawn, { player: 0, type: 'ack' })
    expect(state.players[0]!.capital).toBe(8)
    expect(state.deck).toEqual(['warBond'])
    expect(state.discard).toEqual(['lendLease'])
  })
  it('reshuffles the discard pile when the deck is empty', () => {
    const s = edit(setPlayer(game(), 0, { square: 4 }), (x) => ((x.deck = []), (x.discard = ['warBond'])))
    const { state, events } = rollAs(s, 3)
    expect(events).toContainEqual({ type: 'deckShuffled' })
    expect(state.players[0]!.capital).toBe(7)
  })
  it('Export Subsidy moves 3 without resolving the tile it lands on', () => {
    const s = edit(setPlayer(game(), 0, { square: 4 }), (x) => (x.deck = ['exportSubsidy'])) // 7 → 10 (ladder)
    const { state } = rollAs(s, 3)
    expect(state.players[0]!.square).toBe(10)
    expect(state.decision?.kind).toBe('debtWindow')
  })
  it('Trade Embargo skips the next turn, once', () => {
    let s = edit(setPlayer(game(), 0, { square: 4 }), (x) => (x.deck = ['embargo']))
    s = rollAs(s, 3).state // p0 draws embargo
    s = rollAs(s, 1).state // p1 rolls; p0 skipped; back to p1
    expect(s.decision).toMatchObject({ kind: 'debtWindow', player: 1 })
    s = rollAs(s, 1).state
    expect(s.decision).toMatchObject({ player: 0 })
  })
  it('Interest Rate Hike: every player -1 at each of their next 3 turn starts', () => {
    let s = edit(setPlayer(game(), 0, { square: 4 }), (x) => (x.deck = ['rateHike']))
    s = rollAs(s, 3).state
    s = edit(s, (x) => ((x.players[0]!.square = 92), (x.players[1]!.square = 50))) // plain squares ahead
    for (let i = 0; i < 6; i++) s = rollAs(s, 1).state
    expect(s.players.map((p) => p.capital)).toEqual([2, 2])
    expect(s.players.every((p) => p.statuses.length === 0)).toBe(true)
  })
  it('Trade Corridor (printed): the next tariff landed on by anyone is cancelled', () => {
    let s = edit(setPlayer(game(), 0, { square: 4 }), (x) => (x.deck = ['tradeCorridor']))
    s = rollAs(s, 3).state // on 7, draws it
    s = setPlayer(s, 1, { square: 20 })
    const r = rollAs(s, 3) // p1 lands on 23, a tariff
    expect(r.events.some((e) => e.type === 'tariffCancelled')).toBe(true)
    expect(r.events.some((e) => e.type === 'tariffHit')).toBe(false)
    expect(r.state.corridor).toBe(0)
  })
  it('Debt Spiral blocks repayment next turn', () => {
    let s = edit(setPlayer(game(), 0, { square: 4, capital: 9 }), (x) => (x.deck = ['debtSpiral']))
    s = rollAs(s, 3).state
    s = rollAs(s, 1).state
    expect(s.decision).toMatchObject({ kind: 'debtWindow', player: 0, repay: [] })
    expect(s.players[0]!.debt).toBe(1)
  })
  it('Strategic Reserve asks only when there is debt to repay', () => {
    const s = edit(setPlayer(game(), 0, { square: 4, debt: 2 }), (x) => (x.deck = ['strategicReserve']))
    const drawn = rollAs(s, 3).state
    expect(drawn.decision).toMatchObject({ kind: 'cardChoice', options: ['capital', 'repay'] })
    expect(play(drawn, { player: 0, type: 'choose', option: 'repay' }).state.players[0]!.debt).toBe(1)
    const noDebt = rollAs(setPlayer(s, 0, { debt: 0 }), 3).state
    expect(noDebt.players[0]!.capital).toBe(7)
  })
  it('Banking Panic at the debt cap must pay', () => {
    const s = edit(setPlayer(game(), 0, { square: 4, debt: 6 }), (x) => (x.deck = ['bankingPanic']))
    expect(rollAs(s, 3).state.players[0]).toMatchObject({ capital: 3, debt: 6 })
  })
  it('Allied Aid chains: a player pushed onto a tile resolves it', () => {
    let s = edit(setPlayer(game(), 0, { square: 4 }), (x) => (x.deck = ['alliedAid']))
    s = setPlayer(s, 1, { square: 5 }) // pushed 5 → 7, an event tile
    s = edit(s, (x) => x.deck.push('warBond'))
    const { state } = rollAs(s, 3)
    expect(state.players[1]).toMatchObject({ square: 7, capital: 7 })
    expect(state.players[0]!.capital).toBe(6)
  })
})

describe('hostile takeover', () => {
  const victimProjects = [
    { id: 5, chips: 2, delta: 5, ttm: 2, profit: 10 },
    { id: 6, chips: 1, delta: 3, ttm: 1, profit: 3 },
  ]
  it('on a shared square: pay 3, both roll (ties again), the higher roll takes the other\'s best project', () => {
    const s = setPlayer(setPlayer(game(), 0, { square: 2 }), 1, { square: 5, projects: victimProjects })
    const at = rollAs(s, 3).state
    expect(at.decision).toEqual({ kind: 'takeover', player: 0, victims: [1], rest: [1] })
    const { state, events } = play(at, { player: 0, type: 'takeover', victim: 1 })
    const duel = events.find((e) => e.type === 'duel')!
    expect(duel).toBeDefined()
    if (duel.type !== 'duel') return
    const [a, b] = duel.rolls[duel.rolls.length - 1]!
    expect(a).not.toBe(b)
    expect(state.players[0]!.capital).toBe(2) // the fee is paid either way
    if (a > b) {
      expect(duel.winner).toBe(0)
      expect(state.players[0]!.projects.map((p) => p.id)).toEqual([5])
    } else {
      expect(duel.winner).toBe(1)
      expect(state.players[0]!.projects).toEqual([]) // p0 had nothing to lose
      expect(state.players[1]!.projects.map((p) => p.id)).toContain(5)
    }
  })
  it('if the lander passes, the other player on the square gets the choice', () => {
    const s = setPlayer(setPlayer(game(), 0, { square: 2, projects: [{ id: 9, chips: 1, delta: 4, ttm: 2, profit: 4 }] }), 1, { square: 5, projects: victimProjects })
    const at = rollAs(s, 3).state
    const { state } = play(at, { player: 0, type: 'takeover', victim: null })
    expect(state.decision).toEqual({ kind: 'takeover', player: 1, victims: [0], rest: [] })
  })
  it('not offered without 3 Capital', () => {
    const s = setPlayer(setPlayer(game(), 0, { square: 2, capital: 2 }), 1, { square: 5, projects: victimProjects })
    expect(rollAs(s, 3).state.decision?.kind).toBe('debtWindow')
  })
})

describe('finish and scoring', () => {
  it('exactly 100 adds the bonus and ends the game at once', () => {
    const s = setPlayer(game(2, { finishBonus: 30 }), 0, { square: 97 })
    const { state, events } = rollAs(s, 3)
    expect(state.phase).toBe('finished')
    expect(state.decision).toBeNull()
    expect(events).toContainEqual({ type: 'finished', player: 0, bonus: 30 })
    expect(state.result!.winners).toEqual([0])
    expect(legalIntents(state)).toEqual([])
  })
  it('pending projects count 0; ties go to the furthest pawn, then shared', () => {
    let s = game(3)
    s = setPlayer(s, 0, { capital: 10, square: 50, projects: [{ id: 1, chips: 3, delta: 15, ttm: 3, profit: 45 }] })
    s = setPlayer(s, 1, { capital: 14, debt: 2, square: 60 }) // 2 open = 2 + 2 late interest
    s = setPlayer(s, 2, { capital: 10, square: 40 })
    const r = finalLedger(s, 1, 0)
    expect(r.winners).toEqual([1])
    expect(r.rows.map((x) => x.player)).toEqual([1, 0, 2])
    expect(r.rows.find((x) => x.player === 0)!.pendingLost).toBe(45)
    const tie = finalLedger(setPlayer(s, 2, { square: 60 }), 1, 0)
    expect(tie.winners).toEqual([1, 2])
  })
})

describe('debt interest (rule C) and China export surplus', () => {
  const owing = (turn: number) => edit(setPlayer(game(), 0, { debt: 2, loans: [{ n: 2, turn: 1 }], capital: 9 }), (x) => (x.turn = turn))
  it('clearing a loan within 3 of your turns costs it + 1, later + 2', () => {
    expect(repayCost(owing(1 + 2 * 3), 0, 2)).toBe(3)
    expect(repayCost(owing(1 + 2 * 4), 0, 2)).toBe(4)
    expect(repayCost(owing(1), 0, 1)).toBe(Infinity) // not held
  })
  it('repaying a loan takes its cost from Capital', () => {
    const s = edit(setPlayer(game(), 0, { debt: 3, loans: [{ n: 1, turn: 1 }, { n: 2, turn: 5 }], capital: 9 }), (x) => (x.turn = 7))
    const w = edit(s, (x) => (x.decision = { kind: 'debtWindow', player: 0, take: [3], repay: [1, 2] }))
    const p0 = play(w, { player: 0, type: 'repay', n: 1 }).state.players[0]!
    expect(p0).toMatchObject({ capital: 7, debt: 2, loans: [{ n: 2, turn: 5 }] })
  })
  it('an open loan counts as it + 2 at the end', () => {
    expect(debtCost(owing(1), 0)).toBe(4)
  })
  it('China gains 1 when another player lands on a tariff square', () => {
    const s = setPlayer(game(2, {}, ['germany', 'china']), 0, { square: 20 })
    const { state } = rollAs(s, 3) // 20 + 3 = 23, a tariff square
    expect(state.players[1]!.capital).toBe(6)
  })
})
