import { gsap } from 'gsap'
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { LADDERS, SNAKES, tileAt } from '../rules/board'
import { CELL, cellOf, centerOf, fan, laneMarketD, routeOf } from './geometry'

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

export type RouteStyle = 'market' | 'printed'

const TIP: Record<string, string> = {
  event: 'Event: draw a card', tariff: 'Tariff: every other player moves back 3', sanction: 'Sanction: the Net Worth leader moves back 5',
  goal: 'Land exactly on 100 to finish and take the bonus',
}

export const Board = forwardRef<BoardHandle, { squaresOf: number[]; active: number; names: string[]; routeStyle: RouteStyle; reach: number[] }>(
  function Board({ squaresOf, active, names, routeStyle, reach }, ref) {
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
      <svg ref={svg} className="board" viewBox="-24 -24 1048 1048" role="img" aria-label="Game board">
        <defs>
          {(['ladder', 'snake'] as const).map((k) => (
            <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className={`arrowhead ${k}`} />
            </marker>
          ))}
          <linearGradient id="sheen-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.42" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffe9b0" stopOpacity="0.16" />
            <stop offset="0.58" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          {PAWN_COLORS.map((c, i) => (
            <radialGradient key={i} id={`pawn-${i}`} cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="0.25" stopColor={c} />
              <stop offset="1" stopColor={c} stopOpacity="1" />
            </radialGradient>
          ))}
          <linearGradient id="gold-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbe7a1" /><stop offset="0.5" stopColor="#c9962f" /><stop offset="1" stopColor="#f5d67b" />
          </linearGradient>
          <linearGradient id="tile-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#222c4b" /><stop offset="1" stopColor="#18203a" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>
        <rect x={-24} y={-24} width={1048} height={1048} rx={16} className="frame" />
        <rect x={-17} y={-17} width={1034} height={1034} rx={11} className="frame-line" />
        {[[-24, -24, 1, 1], [1024, -24, -1, 1], [-24, 1024, 1, -1], [1024, 1024, -1, -1]].map(([x, y, sx, sy], i) => (
          <path key={i} className="frame-corner" transform={`translate(${x},${y}) scale(${sx},${sy})`} d="M4 34V4h30M11 26V11h15M18 18h0" />
        ))}
        <rect x={-10} y={-10} width={1020} height={1020} rx={8} className="felt" />
        <image href="logo.png" x={290} y={380} width={420} height={286} className="watermark" />

        {squares.map((sq) => {
          const { x, y } = cellOf(sq)
          const type = tileAt(sq)
          const art = type !== 'plain' && type !== 'start'
          const dest = DEST.get(sq)
          const route = ROUTES.find((r) => r.from === hot)
          const tip = type === 'ladder' ? `FDI ladder: invest to climb to ${LADDERS[sq]} (Δ${LADDERS[sq]! - sq})`
            : type === 'snake' ? `Market crash: slide to ${SNAKES[sq]} unless you hedge` : TIP[type]
          return (
            <g key={sq} className={`sq ${type} ${reach.includes(sq) ? 'reach' : ''} ${route && (route.from === sq || route.to === sq) ? 'hot' : ''}`}
              onPointerEnter={() => setHot(type === 'ladder' || type === 'snake' ? sq : null)} onPointerLeave={() => setHot(null)}>
              {tip && <title>{`${sq}. ${tip}`}</title>}
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
          const motion = routeStyle === 'market' ? laneMarketD(pts, r.kind) : `M${pts.map((p) => `${p.x},${p.y}`).join(' L')}`
          const drawn = routeStyle === 'market' ? laneMarketD(pts, r.kind, true) : drawnD(pts)
          return (
            <g key={`r${r.from}`} className={`route ${r.kind} ${routeStyle} ${hot === r.from ? 'hot' : ''}`}>
              <path id={`route-${r.from}`} d={motion} className="motion" />
              <path d={drawn} className="casing" />
              <path d={drawn} className="line" markerEnd={routeStyle === 'printed' ? `url(#arrow-${r.kind})` : undefined} />
              <path d={drawn} className="flow" />
              {routeStyle === 'market' && (() => {
                const z = centerOf(r.to)
                return <g className="endcap" transform={`translate(${z.x},${z.y})`}><circle r={9} /><path d={r.kind === 'ladder' ? 'M-4,2 L0,-3 L4,2' : 'M-4,-2 L0,3 L4,-2'} /></g>
              })()}
            </g>
          )
        })}

        <rect x={-24} y={-24} width={1048} height={1048} rx={16} className="sheen" pointerEvents="none" />

        <g ref={fxRef} className="fx" />

        {squaresOf.map((_, p) => (
          <g key={`p${p}`} ref={(el) => { if (el) pawns.current[p] = el }} className={`pawn ${p === active ? 'active' : ''}`}>
            <ellipse className="shadow" rx={19} ry={7} cy={18} />
            {p === active && <circle r={28} className="halo" />}
            <g ref={(el) => { if (el) bodies.current[p] = el }}>
              <circle r={21} fill={PAWN_COLORS[p]} className="base" />
              <circle r={21} fill={`url(#pawn-${p})`} />
              <circle r={21} className="rim" />
              <circle r={15} className="inner" />
              <text textAnchor="middle" dy="7">{p + 1}</text>
              <ellipse rx={9} ry={4.5} cx={-5} cy={-11} className="gloss" />
            </g>
            <title>{names[p]}</title>
          </g>
        ))}
      </svg>
    )
  },
)
