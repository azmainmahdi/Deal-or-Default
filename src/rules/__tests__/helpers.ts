import { expect } from 'vitest'
import type { Config } from '../config'
import { newGame, step } from '../engine'
import { roll } from '../rng'
import type { CountryId, GameEvent, GameState, Intent, Player } from '../types'

/** A fresh game at player 0's debt window. Countries default to Germany (its perk only fires on exactly 2 chips). */
export function game(n = 2, config: Partial<Config> = {}, countries: CountryId[] = []): GameState {
  const { state } = newGame({ names: Array.from({ length: n }, (_, i) => `P${i}`), seed: 1, config: { ackCards: false, ...config } })
  state.players.forEach((pl, i) => (pl.country = countries[i] ?? 'germany'))
  return state
}

export function edit(s: GameState, f: (s: GameState) => void): GameState {
  const out = structuredClone(s)
  f(out)
  return out
}

export const setPlayer = (s: GameState, i: number, patch: Partial<Player>) => edit(s, (x) => Object.assign(x.players[i]!, patch))

/** An rng state whose next d6 roll is `value`. */
export function seedForRoll(value: number): number {
  for (let r = 0; ; r++) if (roll(r)[0] === value) return r
}

/** Apply intents in order, failing the test on any rejection. Returns the final state and all events. */
export function play(s: GameState, ...intents: Intent[]): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []
  for (const i of intents) {
    const r = step(s, i)
    expect(r.error).toBeUndefined()
    s = r.state
    events.push(...r.events)
  }
  return { state: s, events }
}

/** Player 0 rolls exactly `value` (skipping the debt window). */
export function rollAs(s: GameState, value: number, player = s.current) {
  return play(edit(s, (x) => (x.rng = seedForRoll(value))), { player, type: 'roll' })
}
