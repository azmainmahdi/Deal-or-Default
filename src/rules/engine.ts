// The rules engine. step(state, intent) validates the intent against the pending decision,
// turns it into effects, and drains the effect queue until the next decision (or the end).
// Pure from the outside: the input state is never mutated.
import { GOAL, LADDERS, SNAKES, tileAt } from './board'
import { CARDS } from './cards'
import { DEFAULT_CONFIG, type Config } from './config'
import { COUNTRY_IDS } from './countries'
import {
  addCapital, addDebt, addWaivers, move, netWorth, othersInOrder, tickProjects, topBy, type Ctx,
} from './ops'
import { roll, shuffle } from './rng'
import { finalLedger } from './scoring'
import type { Decision, Effect, GameEvent, GameState, Intent, Seat } from './types'

export interface StepResult { state: GameState; events: GameEvent[]; error?: string }

export function newGame(opts: { names: string[]; seed: number; config?: Partial<Config> }): StepResult {
  const config = { ...DEFAULT_CONFIG, ...opts.config }
  const n = opts.names.length
  if (n < 2 || n > COUNTRY_IDS.length) throw new Error(`2–${COUNTRY_IDS.length} players, got ${n}`)
  let rng = opts.seed >>> 0
  let countries, deck, first
  ;[countries, rng] = shuffle(COUNTRY_IDS, rng)
  ;[deck, rng] = shuffle(config.deck, rng)
  ;[first, rng] = config.firstPlayer === 'random' ? roll(rng, n) : [1, rng]
  const s: GameState = {
    v: 1,
    config,
    rng,
    phase: 'playing',
    players: opts.names.map((name, i) => ({
      name,
      country: countries[i]!,
      square: 1,
      capital: config.startCapital,
      debt: 0,
      waivers: config.startWaivers,
      projects: [],
      statuses: [],
      fraud: false,
      matured: 0,
    })),
    current: first - 1,
    turn: 1,
    deck,
    discard: [],
    queue: [{ t: 'turnStart' }],
    decision: null,
    turnFlags: { rollBonus: 0, noRepay: false, landings: 0 },
    nextProjectId: 1,
  }
  const c = { s, ev: [] }
  drain(c)
  return { state: s, events: c.ev }
}

/** Every intent the engine will accept right now. The UI builds its buttons from this. */
export function legalIntents(s: GameState): Intent[] {
  const d = s.decision
  if (!d || s.phase !== 'playing') return []
  const player = d.player
  const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)
  switch (d.kind) {
    case 'debtWindow':
      return [
        { player, type: 'roll' },
        ...range(1, d.maxTake).map((n): Intent => ({ player, type: 'takeDebt', n })),
        ...range(1, d.maxRepay).map((n): Intent => ({ player, type: 'repay', n })),
      ]
    case 'roll': return [{ player, type: 'roll' }]
    case 'invest': return range(0, d.max).map((chips): Intent => ({ player, type: 'invest', chips }))
    case 'hedge': return [{ player, type: 'hedge', hedge: true }, { player, type: 'hedge', hedge: false }]
    case 'waiver': return [{ player, type: 'waiver', use: true }, { player, type: 'waiver', use: false }]
    case 'cardChoice': return d.options.map((option): Intent => ({ player, type: 'choose', option }))
    case 'takeover': return [null, ...d.victims].map((victim): Intent => ({ player, type: 'takeover', victim }))
    case 'ackCard': return [{ player, type: 'ack' }]
  }
}

const sameIntent = (a: Intent, b: Intent) => {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => (a as never)[k] === (b as never)[k])
}

export function step(state: GameState, intent: Intent): StepResult {
  if (!legalIntents(state).some((l) => sameIntent(l, intent))) {
    return { state, events: [], error: `illegal intent ${JSON.stringify(intent)}` }
  }
  const s = structuredClone(state)
  const c: Ctx = { s, ev: [] }
  const d = s.decision!
  s.decision = null
  s.queue.unshift(...resolveDecision(c, d, intent))
  drain(c)
  return { state: s, events: c.ev }
}

function drain(c: Ctx) {
  const s = c.s
  while (!s.decision && s.phase === 'playing' && s.queue.length) {
    const kids = run(c, s.queue.shift()!)
    // Children run before anything already queued, so a chained landing fully resolves first.
    s.queue.unshift(...kids)
  }
}

function resolveDecision(c: Ctx, d: Decision, i: Intent): Effect[] {
  const s = c.s
  const p = d.player
  const pl = s.players[p]!
  switch (i.type) {
    case 'takeDebt':
      addDebt(c, p, i.n, 'borrowed')
      addCapital(c, p, i.n * (pl.country === 'uk' ? s.config.ukDebtCapital : 1), 'borrowed')
      return [{ t: 'askRoll' }]
    case 'repay':
      addCapital(c, p, -i.n, 'repaid debt')
      addDebt(c, p, -i.n, 'repaid')
      return [{ t: 'askRoll' }]
    case 'roll':
      return [{ t: 'roll' }]
    case 'invest': {
      if (d.kind !== 'invest' || i.chips === 0) return []
      const delta = d.to - d.from
      addCapital(c, p, -i.chips, 'invested')
      const fast = pl.country === 'bangladesh' && delta <= s.config.bangladeshMaxDelta
      const project = {
        id: s.nextProjectId++,
        chips: i.chips,
        delta,
        ttm: fast ? Math.max(s.config.bangladeshMinTtm, i.chips - 1) : i.chips,
        profit: i.chips * delta + (pl.country === 'germany' && i.chips === s.config.germanyBonusChips ? 1 : 0),
      }
      pl.projects.push(project)
      move(c, p, d.to, 'ladder')
      c.ev.push({ type: 'projectCreated', player: p, project: { ...project } })
      return [{ t: 'land', p }]
    }
    case 'hedge':
      if (d.kind !== 'hedge') return []
      return snakeSlide(c, p, d.from, d.to, i.hedge ? d.cost : null)
    case 'waiver': {
      if (d.kind !== 'waiver') return []
      const rest: Effect = { t: 'tariff', from: d.from, victims: d.rest }
      if (!i.use) return [{ t: 'push', p, by: -d.setback, via: 'push', tiles: true }, rest]
      addWaivers(c, p, -1, 'used against tariff')
      c.ev.push({ type: 'waiverUsed', player: p })
      return [rest]
    }
    case 'choose':
      if (d.kind !== 'cardChoice') return []
      s.discard.push(d.card)
      return CARDS[d.card].apply(c, p, i.option)
    case 'takeover': {
      if (i.victim === null) return []
      const victim = s.players[i.victim]!
      const smallest = victim.projects.reduce((a, x) => (x.profit < a.profit ? x : a))
      victim.projects.splice(victim.projects.indexOf(smallest), 1)
      pl.projects.push(smallest)
      addCapital(c, p, -s.config.takeoverCost, 'hostile takeover')
      c.ev.push({ type: 'projectStolen', from: i.victim, to: p, id: smallest.id })
      return []
    }
    case 'ack':
      if (d.kind !== 'ackCard') return []
      return [{ t: 'applyCard', p, card: d.card }]
  }
}

/** Slide down a snake. cost = null means unhedged: full slide and project loss. */
function snakeSlide(c: Ctx, p: Seat, head: number, tail: number, cost: number | null): Effect[] {
  const pl = c.s.players[p]!
  if (cost !== null) {
    addCapital(c, p, -cost, 'hedged')
    c.ev.push({ type: 'hedged', player: p, cost })
    move(c, p, head - Math.ceil((head - tail) / 2), 'snake')
  } else {
    move(c, p, tail, 'snake')
    const lost = c.s.config.hedgeLoss === 'all' || !pl.projects.length
      ? [...pl.projects]
      : [pl.projects.reduce((a, x) => (x.profit > a.profit ? x : a))]
    for (const x of lost) {
      pl.projects.splice(pl.projects.indexOf(x), 1)
      c.ev.push({ type: 'projectLost', player: p, id: x.id })
    }
  }
  return [{ t: 'land', p }]
}

function run(c: Ctx, e: Effect): Effect[] {
  const s = c.s
  const cfg = s.config
  switch (e.t) {
    case 'turnStart': {
      const p = s.current
      const pl = s.players[p]!
      s.turnFlags = { rollBonus: 0, noRepay: false, landings: 0 }
      c.ev.push({ type: 'turnStarted', player: p, turn: s.turn })
      let skip = false
      for (const st of pl.statuses) {
        if (st.kind === 'rateHike' || st.kind === 'capitalControls') addCapital(c, p, -1, st.kind)
        if (st.kind === 'tradeCorridor') s.turnFlags.rollBonus++
        if (st.kind === 'noRepay') s.turnFlags.noRepay = true
        if (st.kind === 'embargo') skip = true
        st.turns--
        if (st.turns === 0) c.ev.push({ type: 'statusExpired', player: p, kind: st.kind })
      }
      pl.statuses = pl.statuses.filter((st) => st.turns > 0)
      tickProjects(c, p, -1)
      if (skip) {
        c.ev.push({ type: 'turnSkipped', player: p })
        return [{ t: 'endTurn' }]
      }
      return [{ t: 'askDebt' }]
    }

    case 'askDebt': {
      const pl = s.players[s.current]!
      s.decision = {
        kind: 'debtWindow',
        player: s.current,
        maxTake: Math.min(cfg.maxDebtTake, cfg.debtCap - pl.debt),
        maxRepay: s.turnFlags.noRepay ? 0 : Math.max(0, Math.min(pl.debt, pl.capital)),
      }
      return []
    }

    case 'askRoll':
      s.decision = { kind: 'roll', player: s.current }
      return []

    case 'roll': {
      const p = s.current
      const pl = s.players[p]!
      let raw
      ;[raw, s.rng] = roll(s.rng)
      const crunched = pl.square >= cfg.crunchFrom && pl.debt > 0
      const bonus = s.turnFlags.rollBonus
      const value = (crunched ? Math.floor(raw / 2) : raw) + bonus
      c.ev.push({ type: 'diceRolled', player: p, raw, crunched, bonus, value })
      if (value === 0 || pl.square + value > GOAL) {
        c.ev.push({ type: 'noMove', player: p, reason: value === 0 ? 'zero' : 'overshoot' })
        return [{ t: 'endTurn' }]
      }
      move(c, p, pl.square + value, 'walk')
      return [{ t: 'land', p }, { t: 'takeover' }, { t: 'endTurn' }]
    }

    case 'land': {
      if (++s.turnFlags.landings > cfg.landingCap) {
        c.ev.push({ type: 'error', message: `landing cap (${cfg.landingCap}) hit on turn ${s.turn}` })
        s.queue = []
        return [{ t: 'endTurn' }]
      }
      const p = e.p
      const pl = s.players[p]!
      const sq = pl.square
      switch (tileAt(sq)) {
        case 'ladder': {
          const cap = pl.country === 'usa' ? cfg.usaMaxInvest : cfg.maxInvest
          const max = Math.max(0, Math.min(cap, pl.capital))
          if (max > 0) s.decision = { kind: 'invest', player: p, max, from: sq, to: LADDERS[sq]! }
          return []
        }
        case 'snake': {
          const delta = sq - SNAKES[sq]!
          const base = Math.round(delta / cfg.hedgeDivisor) - (pl.country === 'japan' ? 1 : 0)
          const cost = Math.max(1, base) + (pl.fraud ? cfg.fraudSurcharge : 0)
          pl.fraud = false
          // ponytail: unaffordable hedge resolves straight to the full slide instead of a one-button prompt
          if (pl.capital < cost) return snakeSlide(c, p, sq, SNAKES[sq]!, null)
          s.decision = { kind: 'hedge', player: p, cost, from: sq, to: SNAKES[sq]! }
          return []
        }
        case 'event': return [{ t: 'drawCard', p }]
        case 'tariff': return [{ t: 'tariff', from: p, victims: othersInOrder(s, p) }]
        case 'sanction': return [{ t: 'setback', by: cfg.sanctionSetback, threat: true }]
        case 'goal': return [{ t: 'finish', p }]
        default: return []
      }
    }

    case 'push': {
      const pl = s.players[e.p]!
      const target = pl.square + e.by
      const to = e.by > 0 ? (target > GOAL ? pl.square : target) : Math.max(1, target)
      if (to === pl.square) return []
      move(c, e.p, to, e.via)
      if (e.tiles) return [{ t: 'land', p: e.p }]
      return to === GOAL ? [{ t: 'finish', p: e.p }] : []
    }

    case 'tariff': {
      const [v, ...rest] = e.victims
      if (v === undefined) return []
      const victim = s.players[v]!
      const setback = victim.country === 'china' ? cfg.chinaTariffSetback : cfg.tariffSetback
      const next: Effect = { t: 'tariff', from: e.from, victims: rest }
      if (victim.square === 1) return [next]
      c.ev.push({ type: 'tariffHit', from: e.from, player: v, setback })
      if (victim.waivers > 0) {
        s.decision = { kind: 'waiver', player: v, from: e.from, setback, rest }
        return []
      }
      return [{ t: 'push', p: v, by: -setback, via: 'push', tiles: true }, next]
    }

    case 'setback': {
      const threatened = e.threat
        ? s.players.map((_, q) => q).filter((q) => s.players[q]!.statuses.some((st) => st.kind === 'sanctionThreat'))
        : []
      const leaders = topBy(s, (q) => netWorth(s, q))
      const targets = !threatened.length ? leaders
        : cfg.sanctionThreat === 'only' ? threatened
        : [...new Set([...leaders, ...threatened])]
      for (const q of targets) c.ev.push({ type: 'sanctionHit', player: q, setback: e.by })
      return targets.map((q): Effect => ({ t: 'push', p: q, by: -e.by, via: 'push', tiles: true }))
    }

    case 'drawCard': {
      if (!s.deck.length) {
        ;[s.deck, s.rng] = shuffle(s.discard, s.rng)
        s.discard = []
        c.ev.push({ type: 'deckShuffled' })
      }
      const card = s.deck.shift()
      if (!card) return []
      c.ev.push({ type: 'cardDrawn', player: e.p, card })
      if (cfg.ackCards) {
        s.decision = { kind: 'ackCard', player: e.p, card }
        return []
      }
      return [{ t: 'applyCard', p: e.p, card }]
    }

    case 'applyCard': {
      const def = CARDS[e.card]
      const options = def.options?.(c, e.p) ?? []
      if (options.length > 1) {
        s.decision = { kind: 'cardChoice', player: e.p, card: e.card, options }
        return []
      }
      s.discard.push(e.card)
      return def.apply(c, e.p, options[0])
    }

    case 'finish': {
      const bonus = cfg.finishBonus
      addCapital(c, e.p, bonus, 'reached 100')
      c.ev.push({ type: 'finished', player: e.p, bonus })
      s.phase = 'finished'
      s.queue = []
      s.decision = null
      s.result = finalLedger(s, e.p, bonus)
      return []
    }

    case 'takeover': {
      const p = s.current
      const pl = s.players[p]!
      if (pl.square === 1 || pl.square === GOAL || pl.capital < cfg.takeoverCost) return []
      const victims = othersInOrder(s, p).filter((q) => s.players[q]!.square === pl.square && s.players[q]!.projects.length)
      if (victims.length) s.decision = { kind: 'takeover', player: p, victims }
      return []
    }

    case 'endTurn':
      s.current = (s.current + 1) % s.players.length
      s.turn++
      return [{ t: 'turnStart' }]
  }
}
