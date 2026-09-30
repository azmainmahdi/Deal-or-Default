import { describe, expect, it } from 'vitest'
import { playGame } from '../sim'

describe('invariants over random games', () => {
  it('500 random games of 2–6 players: every invariant holds and every game ends', () => {
    for (let g = 0; g < 500; g++) {
      const r = playGame({ seed: g, players: 2 + (g % 5), policy: 'random', check: true })
      expect(r.error, `seed ${g}`).toBeUndefined()
      expect(r.finished, `seed ${g}`).toBe(true)
    }
  }, 60_000)
})
