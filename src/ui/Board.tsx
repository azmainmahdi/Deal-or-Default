import { gsap } from 'gsap'
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { LADDERS, SNAKES, tileAt } from '../rules/board'
import type { CountryId } from '../rules/types'
import { FLAG_BODY } from './Flag'
import { CELL, cellOf, centerOf, fan, gutterRoute } from './geometry'

export const PAWN_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9']

const squares = Array.from({ length: 100 }, (_, i) => i + 1)
const INSET = 8 // tile inset: the 16px gutters carry the routes
const ROUTES = [
  ...Object.entries(LADDERS).map(([f, t], i) => ({ from: +f, to: t, kind: 'ladder' as const, lane: (i % 3) - 1 })),
  ...Object.entries(SNAKES).map(([f, t], i) => ({ from: +f, to: t, kind: 'snake' as const, lane: ((i + 1) % 3) - 1 })),
]
const DEST = new Map(ROUTES.map((r) => [r.to, r.kind]))
const pathD = (pts: { x: number; y: number }[]) => `M${pts.map((p) => `${p.x},${p.y}`).join(' L')}`

const TIP: Record<string, string> = {
  event: 'Event: draw a card', tariff: 'Tariff: every other player moves back 3', sanction: 'Sanction: the Net Worth leader moves back 5',
  goal: 'Land exactly on 100 to finish and take the bonus',
}

/** Imperative handle the animation director drives. React never sets pawn transforms. */
export interface BoardHandle {
  pawn(p: number): SVGGElement
  body(p: number): SVGGElement
  routePath(from: number): SVGPathElement
  fx(): SVGGElement
  layout(squares: number[], duration?: number): gsap.core.Timeline
}

export const Board = forwardRef<BoardHandle, { squaresOf: number[]; active: number; names: string[]; countries: CountryId[]; reach: number[] }>(
  function Board({ squaresOf, active, names, countries, reach }, ref) {
    const [hot, setHot] = useState<number | null>(null)
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
      <svg ref={svg} className="board" viewBox="-28 -28 1056 1070" role="img" aria-label="Game board">
        <defs>
          {(['ladder', 'snake'] as const).map((k) => (
            <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.6" markerHeight="3.6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className={`arrowhead ${k}`} />
            </marker>
          ))}
          <linearGradient id="gold-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbe7a1" /><stop offset="0.5" stopColor="#c9962f" /><stop offset="1" stopColor="#f5d67b" />
          </linearGradient>
          <linearGradient id="brass-side" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6e4a0c" /><stop offset="0.35" stopColor="#d9a845" /><stop offset="0.7" stopColor="#9b6a12" /><stop offset="1" stopColor="#5a3c08" />
          </linearGradient>
          <linearGradient id="tile-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#222c4b" /><stop offset="1" stopColor="#18203a" />
          </linearGradient>
          <linearGradient id="board-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a6420" /><stop offset="1" stopColor="#4a3208" />
          </linearGradient>
          <radialGradient id="puck-gloss" cx="35%" cy="25%" r="70%">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" /><stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <clipPath id="puck-clip"><circle r="23" /></clipPath>
          <filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="9" /></filter>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>

        {/* the board is a slab: a visible edge below the face, and a tight contact shadow on the table */}
        <rect x={-24} y={-8} width={1048} height={1066} rx={18} className="contact-shadow" filter="url(#soft)" />
        <rect x={-28} y={-28} width={1056} height={1070} rx={16} fill="url(#board-edge)" />
        <rect x={-28} y={-28} width={1056} height={1056} rx={16} className="frame" />
        <rect x={-19} y={-19} width={1038} height={1038} rx={10} className="frame-line" />
        {[[-28, -28, 1, 1], [1028, -28, -1, 1], [-28, 1028, 1, -1], [1028, 1028, -1, -1]].map(([x, y, sx, sy], i) => (
          <path key={i} className="frame-corner" transform={`translate(${x},${y}) scale(${sx},${sy})`} d="M5 36V5h31M12 28V12h16" />
        ))}
        <rect x={-10} y={-10} width={1020} height={1020} rx={6} className="felt" />
        <image href="logo.png" x={290} y={380} width={420} height={286} className="watermark" />

        {squares.map((sq) => {
          const { x, y } = cellOf(sq)
          const type = tileAt(sq)
          const art = type !== 'plain' && type !== 'start'
          const dest = DEST.get(sq)
          const route = ROUTES.find((r) => r.from === hot)
          const tip = type === 'ladder' ? `FDI ladder: invest to climb to ${LADDERS[sq]} (Δ${LADDERS[sq]! - sq})`
            : type === 'snake' ? `Market crash: slide to ${SNAKES[sq]} unless you hedge` : TIP[type]
          const w = CELL - INSET * 2
          return (
            <g key={sq} className={`sq ${type} ${reach.includes(sq) ? 'reach' : ''} ${route && (route.from === sq || route.to === sq) ? 'hot' : ''}`}
              onPointerEnter={() => setHot(type === 'ladder' || type === 'snake' ? sq : null)} onPointerLeave={() => setHot(null)}>
              {tip && <title>{`${sq}. ${tip}`}</title>}
              <rect x={x + INSET} y={y + INSET} width={w} height={w} rx={4} className="tile" />
              {art && <image href={`icons/${type}.svg`} x={x + INSET} y={y + INSET} width={w} height={w} />}
              {dest && <rect x={x + INSET + 4} y={y + INSET + 4} width={w - 8} height={w - 8} rx={3} className={`dest ${dest}`} />}
              {type === 'start' ? <text x={x + 18} y={y + 38} className="startlab">Start</text>
                : <text x={x + CELL - 16} y={y + 31} textAnchor="end" className={`sqnum ${art ? 'on-art' : ''}`}>{sq}</text>}
              {type === 'ladder' && <text x={x + CELL - 16} y={y + CELL - 16} textAnchor="end" className="delta">Δ{LADDERS[sq]! - sq}</text>}
            </g>
          )
        })}

        {ROUTES.map((r) => {
          const { line, motion } = gutterRoute(r.from, r.to, r.lane)
          return (
            <g key={`r${r.from}`} className={`route ${r.kind} ${hot === r.from ? 'hot' : ''}`}>
              <path id={`route-${r.from}`} d={pathD(motion)} className="motion" />
              <path d={pathD(line)} className="casing" />
              <path d={pathD(line)} className="line" markerEnd={`url(#arrow-${r.kind})`} />
              <path d={pathD(line)} className="flow" />
            </g>
          )
        })}

        <g ref={fxRef} className="fx" />

        {squaresOf.map((_, p) => (
          <g key={`p${p}`} ref={(el) => { if (el) pawns.current[p] = el }} className={`pawn ${p === active ? 'active' : ''}`}>
            <ellipse className="shadow" rx={28} ry={11} cy={14} />
            {p === active && <circle r={36} className="halo" />}
            <g ref={(el) => { if (el) bodies.current[p] = el }}>
              {/* raised puck: brass side, gold rim, flag face, gloss */}
              <ellipse rx={28} ry={28} cy={7} fill="url(#brass-side)" />
              <circle r={28} className="rim" />
              <g clipPath="url(#puck-clip)"><g transform="translate(-34.5,-23) scale(2.3)">{FLAG_BODY[countries[p] ?? 'usa']}</g></g>
              <circle r={23} className="face-ring" style={{ stroke: PAWN_COLORS[p] }} />
              <circle r={28} fill="url(#puck-gloss)" />
            </g>
            <title>{names[p]}</title>
          </g>
        ))}
      </svg>
    )
  },
)
