// Bots and a game runner for invariant checks and balance simulations. Not used by the UI.
import type { Config } from './config'
import { legalIntents, newGame, step } from './engine'
import { next } from './rng'
import type { GameState, Intent } from './types'

export type Policy = 'random' | 'greedy' | 'cautious'

export interface SimResult {
  finished: boolean
  turns: number
  state: GameState
  intents: Intent[]
  error?: string
}

function pick(policy: Policy, s: GameState, legal: Intent[], r: number): Intent {
  if (policy === 'random') return legal[Math.floor(r * legal.length)]!
  const pl = s.players[legal[0]!.player]!
  const has = (t: Intent['type']) => legal.filter((i) => i.type === t)
  const last = <T>(xs: T[]) => xs[xs.length - 1]
  const greedy = policy === 'greedy'
  const want: (Intent | undefined)[] = [
    // debt window: greedy borrows early and never repays; cautious repays everything it can
    greedy && pl.square < 60 && pl.debt === 0 ? last(has('takeDebt')) : undefined,
    !greedy ? last(has('repay')) : undefined,
    last(has('invest').filter((i) => i.type === 'invest' && (greedy || i.chips <= 2))),
    has('hedge').find((i) => i.type === 'hedge' && i.hedge),
    has('waiver').find((i) => i.type === 'waiver' && i.use),
    has('takeover').find((i) => i.type === 'takeover' && (greedy ? i.victim !== null : i.victim === null)),
  ]
  return want.find(Boolean) ?? legal[0]!
}

export function checkInvariants(s: GameState): string | undefined {
  const cap = s.config.debtCap
  for (const [i, p] of s.players.entries()) {
    if (p.square < 1 || p.square > 100) return `player ${i} on square ${p.square}`
    if (p.debt < 0 || p.debt > cap) return `player ${i} debt ${p.debt}`
    if (!Number.isInteger(p.capital)) return `player ${i} capital ${p.capital}`
  }
  if (s.current < 0 || s.current >= s.players.length) return `current ${s.current}`
  if (s.phase === 'playing' && !s.decision) return 'playing with no decision'
  if (s.phase === 'playing' && s.queue.length && !s.decision) return 'queue left undrained'
  if (s.phase === 'finished' && !s.result) return 'finished without a result'
}

export function playGame(opts: {
  seed: number
  players: number
  policy: Policy | Policy[]
  config?: Partial<Config>
  check?: boolean
  maxTurns?: number
}): SimResult {
  const policies = Array.isArray(opts.policy) ? opts.policy : [opts.policy]
  const names = Array.from({ length: opts.players }, (_, i) => `Bot${i}`)
  const init = newGame({ names, seed: opts.seed, config: { ackCards: false, ...opts.config } })
  let s = init.state
  let r = (opts.seed ^ 0x9e3779b9) >>> 0
  const intents: Intent[] = []
  const maxTurns = opts.maxTurns ?? 2000
  const fail = (error: string): SimResult => ({ finished: false, turns: s.turn, state: s, intents, error })

  while (s.phase === 'playing') {
    if (s.turn > maxTurns) return fail(`no finish within ${maxTurns} turns`)
    const legal = legalIntents(s)
    if (!legal.length) return fail('no legal intent')
    let v
    ;[v, r] = next(r)
    const intent = pick(policies[legal[0]!.player % policies.length]!, s, legal, v)
    const res = step(s, intent)
    if (res.error) return fail(res.error)
    if (opts.check) {
      const bad = res.events.find((e) => e.type === 'error') ?? checkInvariants(res.state)
      if (bad) return fail(typeof bad === 'string' ? bad : bad.message)
    }
    intents.push(intent)
    s = res.state
  }

  if (opts.check) {
    // Replay: seed + intents must reproduce the exact final state.
    let replay = newGame({ names, seed: opts.seed, config: { ackCards: false, ...opts.config } }).state
    for (const i of intents) replay = step(replay, i).state
    if (JSON.stringify(replay) !== JSON.stringify(s)) return fail('replay diverged')
  }
  return { finished: true, turns: s.turn, state: s, intents }
}

