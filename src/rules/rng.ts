// Seeded PRNG. All game randomness goes through here so a game replays from seed + intents.

/** mulberry32 step: returns [value in [0, 1), next state]. Pure, so state stays plain JSON. */
export function next(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) | 0
  let t = s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s]
}

/** Integer in [1, sides]. */
export function roll(state: number, sides = 6): [number, number] {
  const [v, s] = next(state)
  return [1 + Math.floor(v * sides), s]
}

/** Fisher-Yates on a copy. */
export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const out = [...items]
  let s = state
  for (let i = out.length - 1; i > 0; i--) {
    let v: number
    ;[v, s] = next(s)
    const j = Math.floor(v * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return [out, s]
}
