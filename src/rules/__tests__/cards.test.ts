import { describe, expect, it } from 'vitest'
import { CARDS } from '../cards'
import type { Ctx } from '../ops'
import type { CardId, GameState } from '../types'
import { edit, game } from './helpers'

const proj = (id: number, ttm: number, profit: number, delta = 5) => ({ id, chips: 1, delta, ttm, profit })

/** 3 players; p0 draws. p0 at 40 with two projects and 2 debt, p1 at 20, p2 at 60 and richest. */
function table(): GameState {
  return edit(game(3), (s) => {
    Object.assign(s.players[0]!, { square: 40, capital: 5, debt: 2, projects: [proj(1, 2, 10), proj(2, 1, 4, 3)] })
    Object.assign(s.players[1]!, { square: 20, capital: 3, projects: [proj(3, 2, 2)] })
    Object.assign(s.players[2]!, { square: 60, capital: 9 })
  })
}

function draw(card: CardId, choice?: string, s = table()) {
  const c: Ctx = { s: structuredClone(s), ev: [] }
  const effects = CARDS[card].apply(c, 0, choice ?? CARDS[card].options?.(c, 0)[0])
  return { s: c.s, effects, p: c.s.players }
}

describe('every card has display data', () => {
  it.each(Object.entries(CARDS))('%s', (_id, def) => {
    expect(def.name).toBeTruthy()
    expect(def.text).toBeTruthy()
    expect(['beneficial', 'adverse']).toContain(def.kind)
  })
})

describe('card effects', () => {
  it('Commodity Boom: +3 per project (or +Δ)', () => {
    expect(draw('commodityBoom').p[0]!.projects.map((x) => x.profit)).toEqual([13, 7])
    const delta = draw('commodityBoom', undefined, edit(table(), (s) => (s.config.commodityBoom = 'delta')))
    expect(delta.p[0]!.projects.map((x) => x.profit)).toEqual([15, 7])
  })
  it('Lend-Lease +3, War-Bond +2', () => {
    expect(draw('lendLease').p[0]!.capital).toBe(8)
    expect(draw('warBond').p[0]!.capital).toBe(7)
  })
  it('Debt Restructure removes 1 Debt, never below 0', () => {
    expect(draw('debtRestructure').p[0]!.debt).toBe(1)
    expect(draw('debtRestructure', undefined, edit(table(), (s) => (s.players[0]!.debt = 0))).p[0]!.debt).toBe(0)
  })
  it('Fast-Track pays the soonest project now', () => {
    const { p } = draw('fastTrack')
    expect(p[0]!.capital).toBe(9)
    expect(p[0]!.projects.map((x) => x.id)).toEqual([1])
  })
  it('Tariff Truce: every player +1 waiver', () => {
    expect(draw('tariffTruce').p.map((x) => x.waivers)).toEqual([2, 2, 2])
  })
  it('Export Subsidy: forward 3, no tile', () => {
    expect(draw('exportSubsidy').effects).toEqual([{ t: 'push', p: 0, by: 3, via: 'card', tiles: false }])
  })
  it('Productivity Surge: all TTM -1, zeros pay out', () => {
    const { p } = draw('productivitySurge')
    expect(p[0]!.projects).toEqual([proj(1, 1, 10)])
    expect(p[0]!.capital).toBe(9)
  })
  it('Surplus Budget: +2 with no projects, otherwise a surge', () => {
    expect(draw('surplusBudget').p[0]!.projects).toHaveLength(1)
    expect(draw('surplusBudget', undefined, edit(table(), (s) => (s.players[0]!.projects = []))).p[0]!.capital).toBe(7)
  })
  it('Strategic Reserve: +2 Capital or -1 Debt', () => {
    expect(draw('strategicReserve', 'capital').p[0]!.capital).toBe(7)
    expect(draw('strategicReserve', 'repay').p[0]!.debt).toBe(1)
  })
  it('Allied Aid: players behind move +2 with tiles, you +1', () => {
    const { p, effects } = draw('alliedAid')
    expect(p[0]!.capital).toBe(6)
    expect(effects).toEqual([{ t: 'push', p: 1, by: 2, via: 'card', tiles: true }])
  })
  it('Trade Corridor: status for 3 turns', () => {
    expect(draw('tradeCorridor').p[0]!.statuses).toEqual([{ kind: 'tradeCorridor', turns: 3 }])
  })
  it('Currency Devaluation: -3, can go negative', () => {
    expect(draw('devaluation', undefined, edit(table(), (s) => (s.players[0]!.capital = 1))).p[0]!.capital).toBe(-2)
  })
  it('Banking Panic: pay 2 or 1 Debt with no Capital', () => {
    expect(draw('bankingPanic', 'pay').p[0]).toMatchObject({ capital: 3, debt: 2 })
    expect(draw('bankingPanic', 'debt').p[0]).toMatchObject({ capital: 5, debt: 3 })
  })
  it('Cyber Attack: highest-profit project -5, min 0', () => {
    expect(draw('cyberAttack').p[0]!.projects.map((x) => x.profit)).toEqual([5, 4])
  })
  it('Trade Embargo: skip-next-turn status', () => {
    expect(draw('embargo').p[0]!.statuses).toEqual([{ kind: 'embargo', turns: 1 }])
  })
  it('Industrial Strike: all your TTM +1', () => {
    expect(draw('strike').p[0]!.projects.map((x) => x.ttm)).toEqual([3, 2])
  })
  it('Sovereign Default: leaders back 4, sanction threat ignored', () => {
    expect(draw('sovereignDefault').effects).toEqual([{ t: 'setback', by: 4, threat: false }])
  })
  it('Port Blockade: lose a waiver, else -1 Capital', () => {
    expect(draw('portBlockade').p[0]).toMatchObject({ waivers: 0, capital: 5 })
    expect(draw('portBlockade', undefined, edit(table(), (s) => (s.players[0]!.waivers = 0))).p[0]!.capital).toBe(4)
  })
  it('Insurance Fraud flags the next hedge', () => {
    expect(draw('insuranceFraud').p[0]!.fraud).toBe(true)
  })
  it('Corruption Probe: the richest pay 2 (ties all pay)', () => {
    expect(draw('corruptionProbe').p.map((x) => x.capital)).toEqual([5, 3, 7])
    const tie = draw('corruptionProbe', undefined, edit(table(), (s) => (s.players[0]!.capital = 9)))
    expect(tie.p.map((x) => x.capital)).toEqual([7, 3, 7])
  })
  it('Debt Spiral: +1 Debt and a no-repay status', () => {
    const { p } = draw('debtSpiral')
    expect(p[0]).toMatchObject({ debt: 3, capital: 5, statuses: [{ kind: 'noRepay', turns: 1 }] })
  })
  it('Sanction Threat: status until your next turn', () => {
    expect(draw('sanctionThreat').p[0]!.statuses).toEqual([{ kind: 'sanctionThreat', turns: 1 }])
  })
  it('Interest Rate Hike hits every player', () => {
    expect(draw('rateHike').p.every((x) => x.statuses[0]?.kind === 'rateHike')).toBe(true)
  })
  it('Commodity Crash: every project of every player -3, min 0', () => {
    const { p } = draw('commodityCrash')
    expect(p[0]!.projects.map((x) => x.profit)).toEqual([7, 1])
    expect(p[1]!.projects.map((x) => x.profit)).toEqual([0])
  })
  it('Capital Controls: 3-turn status on you only', () => {
    const { p } = draw('capitalControls')
    expect(p[0]!.statuses).toEqual([{ kind: 'capitalControls', turns: 3 }])
    expect(p[1]!.statuses).toEqual([])
  })
})
