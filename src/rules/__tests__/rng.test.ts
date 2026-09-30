import { describe, expect, it } from 'vitest'
import { roll, shuffle } from '../rng'

describe('rng', () => {
  it('replays the same sequence from the same seed', () => {
    const run = (seed: number) => {
      const out: number[] = []
      let s = seed
      for (let i = 0; i < 20; i++) {
        let r: number
        ;[r, s] = roll(s)
        out.push(r)
      }
      return out
    }
    expect(run(42)).toEqual(run(42))
    expect(run(42)).not.toEqual(run(43))
  })

  it('rolls every face of a d6 and nothing else', () => {
    const seen = new Set<number>()
    let s = 1
    for (let i = 0; i < 6000; i++) {
      let r: number
      ;[r, s] = roll(s)
      seen.add(r)
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('shuffles into a permutation without touching the input', () => {
    const deck = Array.from({ length: 24 }, (_, i) => i)
    const [out] = shuffle(deck, 7)
    expect(out).not.toEqual(deck)
    expect([...out].sort((a, b) => a - b)).toEqual(deck)
    expect(deck[0]).toBe(0)
  })
})
