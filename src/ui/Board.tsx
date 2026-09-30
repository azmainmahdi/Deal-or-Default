import { gsap } from 'gsap'
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { LADDERS, SNAKES, tileAt } from '../rules/board'
import { CELL, cellOf, centerOf, fan, routeOf } from './geometry'

export const PAWN_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9']

const squares = Array.from({ length: 100 }, (_, i) => i + 1)
const ROUTES = [
  ...Object.entries(LADDERS).map(([f, t], i) => ({ from: +f, to: t, kind: 'ladder' as const, lane: (i % 3) - 1 })),
  ...Object.entries(SNAKES).map(([f, t], i) => ({ from: +f, to: t, kind: 'snake' as const, lane: ((i + 1) % 3) - 1 })),
]
const DEST = new Map(ROUTES.map((r) => [r.to, r.kind]))

/** Imperative handle the animation director drives. React never sets pawn transforms. */
export interface BoardHandle {
  pawn(p: number): SVGGElement
  body(p: number): SVGGElement
  routePath(from: number): SVGPathElement
  fx(): SVGGElement
  layout(squares: number[], duration?: number): gsap.core.Timeline
}

/** Line drawn from the route's points, trimmed so it starts and ends at the tile edges. */
function drawnD(pts: { x: number; y: number }[]) {
  const [a, b, c, z] = pts as [typeof pts[0], typeof pts[0], typeof pts[0], typeof pts[0]]
  const sy = a.y + Math.sign(b.y - a.y) * 38
  const ey = z.y + Math.sign(c.y - z.y) * 40
  return `M${a.x},${sy} L${b.x},${b.y} L${c.x},${c.y} L${z.x},${ey}`
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
      routePath: (from) => svg.current!.querySelector<SVGPathElement>(`#route-${from}`)!,
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
    useLayoutEffect(() => { handle.layout(squaresOf, 0) }, [squaresOf.length]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <svg ref={svg} className="board" viewBox="-24 -24 1048 1048" role="img" aria-label="Game board">
        <defs>
          {(['ladder', 'snake'] as const).map((k) => (
            <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className={`arrowhead ${k}`} />
            </marker>
          ))}
        </defs>
        <rect x={-24} y={-24} width={1048} height={1048} rx={16} className="frame" />
        <rect x={-10} y={-10} width={1020} height={1020} rx={8} className="felt" />
        <image href="logo.png" x={290} y={380} width={420} height={286} className="watermark" />

        {squares.map((sq) => {
          const { x, y } = cellOf(sq)
          const type = tileAt(sq)
          const art = type !== 'plain' && type !== 'start'
          const dest = DEST.get(sq)
          return (
            <g key={sq} className={`sq ${type}`}>
              <rect x={x + 5} y={y + 5} width={CELL - 10} height={CELL - 10} rx={4} className="tile" />
              {art && <image href={`icons/${type}.svg`} x={x + 5} y={y + 5} width={CELL - 10} height={CELL - 10} />}
              {dest && <rect x={x + 10} y={y + 10} width={CELL - 20} height={CELL - 20} rx={3} className={`dest ${dest}`} />}
              {type === 'start' ? <text x={x + 14} y={y + 34} className="startlab">Start</text>
                : <text x={x + CELL - 12} y={y + 28} textAnchor="end" className={`sqnum ${art ? 'on-art' : ''}`}>{sq}</text>}
              {type === 'ladder' && <text x={x + CELL - 12} y={y + CELL - 13} textAnchor="end" className="delta">Δ{LADDERS[sq]! - sq}</text>}
            </g>
          )
        })}

        {ROUTES.map((r) => {
          const pts = routeOf(r.from, r.to, r.lane)
          return (
            <g key={`r${r.from}`} className={`route ${r.kind}`}>
              <path id={`route-${r.from}`} d={`M${pts.map((p) => `${p.x},${p.y}`).join(' L')}`} className="motion" />
              <path d={drawnD(pts)} className="casing" />
              <path d={drawnD(pts)} className="line" markerEnd={`url(#arrow-${r.kind})`} />
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
