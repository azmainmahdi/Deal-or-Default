import { gsap } from 'gsap'
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { LADDERS, SNAKES, tileAt } from '../rules/board'
import { CELL, cellOf, centerOf, fan } from './geometry'

export const PAWN_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9']

const squares = Array.from({ length: 100 }, (_, i) => i + 1)

/** Imperative handle the animation director drives. React never sets pawn transforms. */
export interface BoardHandle {
  pawn(p: number): SVGGElement
  body(p: number): SVGGElement
  snakePath(head: number): SVGPathElement
  fx(): SVGGElement
  /** Tween every pawn to its fanned spot for the given squares. */
  layout(squares: number[], duration?: number): gsap.core.Timeline
}

function snakeD(head: number, tail: number): string {
  const a = centerOf(head), z = centerOf(tail)
  // ponytail: one generated S-curve per snake until the .ai paths arrive
  const dx = z.x - a.x, dy = z.y - a.y
  const c1 = { x: a.x + dx * 0.25 + dy * 0.3, y: a.y + dy * 0.25 - dx * 0.3 }
  const c2 = { x: a.x + dx * 0.75 - dy * 0.3, y: a.y + dy * 0.75 + dx * 0.3 }
  return `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${z.x},${z.y}`
}

function ladderRungs(base: number, top: number) {
  const a = centerOf(base), z = centerOf(top)
  const len = Math.hypot(z.x - a.x, z.y - a.y)
  const nx = -(z.y - a.y) / len, ny = (z.x - a.x) / len // unit normal
  const w = 14
  const rails = [-1, 1].map((s) => ({ x1: a.x + nx * w * s, y1: a.y + ny * w * s, x2: z.x + nx * w * s, y2: z.y + ny * w * s }))
  const n = Math.max(2, Math.floor(len / 26))
  const rungs = Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n
    const cx = a.x + (z.x - a.x) * t, cy = a.y + (z.y - a.y) * t
    return { x1: cx - nx * w, y1: cy - ny * w, x2: cx + nx * w, y2: cy + ny * w }
  })
  return { rails, rungs }
}

export const Board = forwardRef<BoardHandle, { squaresOf: number[]; active: number; names: string[] }>(
  function Board({ squaresOf, active, names }, ref) {
    const pawns = useRef<SVGGElement[]>([])
    const bodies = useRef<SVGGElement[]>([])
    const fxRef = useRef<SVGGElement>(null)
    const svg = useRef<SVGSVGElement>(null)

    const handle: BoardHandle = {
      pawn: (p) => pawns.current[p]!,
      body: (p) => bodies.current[p]!,
      snakePath: (head) => svg.current!.querySelector<SVGPathElement>(`#snake-${head}`)!,
      fx: () => fxRef.current!,
      layout(sqs, duration = 0.25) {
        const tl = gsap.timeline()
        const by = new Map<number, number[]>()
        sqs.forEach((sq, p) => by.set(sq, [...(by.get(sq) ?? []), p]))
        for (const [sq, ps] of by) ps.forEach((p, k) => {
          const c = centerOf(sq), o = fan(k, ps.length)
          const el = pawns.current[p]
          if (el) tl.to(el, { x: c.x + o.dx, y: c.y + o.dy, duration, ease: 'power2.out' }, 0)
        })
        return tl
      },
    }
    useImperativeHandle(ref, () => handle)

    // First paint: place pawns without tweening.
    useLayoutEffect(() => {
      handle.layout(squaresOf, 0)
    }, [squaresOf.length]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <svg ref={svg} className="board" viewBox="-20 -20 1040 1040" role="img" aria-label="Game board">
        <rect x={-20} y={-20} width={1040} height={1040} rx={14} className="frame" />
        {squares.map((sq) => {
          const { x, y } = cellOf(sq)
          const type = tileAt(sq)
          const art = type !== 'plain' && type !== 'start'
          return (
            <g key={sq}>
              <rect x={x} y={y} width={CELL} height={CELL} className={`tile ${(Math.floor((sq - 1) / 10) + sq) % 2 ? 'a' : 'b'}`} />
              {art && <image href={`icons/${type}.svg`} x={x + 5} y={y + 5} width={CELL - 10} height={CELL - 10} />}
              <text x={x + 7} y={y + 20} className="sqnum">{sq}</text>
              {type === 'start' && <text x={x + 50} y={y + 88} className="startlab" textAnchor="middle">START</text>}
            </g>
          )
        })}

        {Object.entries(LADDERS).map(([b, t]) => {
          const { rails, rungs } = ladderRungs(+b, t)
          return (
            <g key={`l${b}`} className="ladder">
              {rungs.map((l, i) => <line key={`r${i}`} {...l} className="rung" />)}
              {rails.map((l, i) => <line key={i} {...l} className="rail" />)}
            </g>
          )
        })}
        {Object.entries(SNAKES).map(([h, t]) => {
          const a = centerOf(+h)
          return (
            <g key={`s${h}`} className="snake">
              <path id={`snake-${h}`} d={snakeD(+h, t)} className="body-shadow" />
              <path d={snakeD(+h, t)} className="body" />
              <path d={snakeD(+h, t)} className="scales" />
              <circle cx={a.x} cy={a.y} r={13} className="head" />
              <circle cx={a.x - 4} cy={a.y - 3} r={2.5} className="eye" />
              <circle cx={a.x + 4} cy={a.y - 3} r={2.5} className="eye" />
            </g>
          )
        })}

        <g ref={fxRef} className="fx" />

        {squaresOf.map((_, p) => (
          <g key={`p${p}`} ref={(el) => { if (el) pawns.current[p] = el }} className={`pawn ${p === active ? 'active' : ''}`}>
            <ellipse className="shadow" rx={17} ry={7} cy={16} />
            <g ref={(el) => { if (el) bodies.current[p] = el }}>
              <circle r={19} fill={PAWN_COLORS[p]} />
              <circle r={19} className="shine" />
              <text textAnchor="middle" dy="7">{p + 1}</text>
            </g>
            <title>{names[p]}</title>
          </g>
        ))}
      </svg>
    )
  },
)
