// Board layout: 10×10 in a 1000×1000 viewBox, square 1 bottom-left, rows snake back and forth.
export const CELL = 100

export function cellOf(square: number): { x: number; y: number } {
  const i = square - 1
  const row = Math.floor(i / 10)
  const col = row % 2 === 0 ? i % 10 : 9 - (i % 10)
  return { x: col * CELL, y: (9 - row) * CELL }
}

export function centerOf(square: number): { x: number; y: number } {
  const { x, y } = cellOf(square)
  return { x: x + CELL / 2, y: y + CELL / 2 }
}

/** Offset for the k-th of n pawns sharing a square (ring of up to 6). */
export function fan(k: number, n: number): { dx: number; dy: number } {
  if (n === 1) return { dx: 0, dy: 0 }
  const a = (2 * Math.PI * k) / n - Math.PI / 2
  return { dx: 22 * Math.cos(a), dy: 22 * Math.sin(a) }
}

/** Printed-board style route for a ladder or snake: out of the source tile to the row gap,
 *  along the gap, then into the destination tile. `lane` nudges routes that share a gap. */
export function routeOf(from: number, to: number, lane = 0): { x: number; y: number }[] {
  const a = centerOf(from), z = centerOf(to)
  const up = to > from
  const gy = cellOf(from).y + (up ? 0 : CELL) + lane * 7
  return [a, { x: a.x, y: gy }, { x: z.x, y: gy }, z]
}

type Pt = { x: number; y: number }

/** Lane route in the "market" style: ladders get rounded corners (a smooth rising rail),
 *  crashes get a jagged price-chart edge along every segment. trim pulls the ends to tile edges. */
export function laneMarketD(pts: Pt[], kind: 'ladder' | 'snake', trim = false): string {
  const p = pts.map((q) => ({ ...q }))
  if (trim) {
    const pull = (a: Pt, b: Pt, d: number) => { const l = Math.hypot(b.x - a.x, b.y - a.y) || 1; a.x += ((b.x - a.x) / l) * d; a.y += ((b.y - a.y) / l) * d }
    pull(p[0]!, p[1]!, 36)
    pull(p[p.length - 1]!, p[p.length - 2]!, 38)
  }
  if (kind === 'ladder') {
    const r = 22
    let d = `M${p[0]!.x},${p[0]!.y}`
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i - 1]!, b = p[i]!, c = p[i + 1]!
      const la = Math.hypot(b.x - a.x, b.y - a.y), lc = Math.hypot(c.x - b.x, c.y - b.y)
      if (!la || !lc) continue
      const k1 = Math.min(r, la / 2) / la, k2 = Math.min(r, lc / 2) / lc
      d += ` L${b.x - (b.x - a.x) * k1},${b.y - (b.y - a.y) * k1} Q${b.x},${b.y} ${b.x + (c.x - b.x) * k2},${b.y + (c.y - b.y) * k2}`
    }
    const z = p[p.length - 1]!
    return `${d} L${z.x},${z.y}`
  }
  const out: Pt[] = [p[0]!]
  let flip = 1
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1]!, b = p[i]!
    const l = Math.hypot(b.x - a.x, b.y - a.y)
    if (!l) continue
    const n = Math.max(1, Math.round(l / 20))
    const nx = -(b.y - a.y) / l, ny = (b.x - a.x) / l
    for (let k = 1; k <= n; k++) {
      const t = k / n
      const last = i === p.length - 1 && k === n
      flip = -flip
      const amp = last || k === n ? 0 : 6 * flip
      out.push({ x: a.x + (b.x - a.x) * t + nx * amp, y: a.y + (b.y - a.y) * t + ny * amp })
    }
  }
  return `M${out.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' L')}`
}
