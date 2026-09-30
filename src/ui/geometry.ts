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
