import { LADDERS, SNAKES, tileAt } from '../rules/board'
import type { GameState } from '../rules/types'
import { CELL, cellOf, centerOf, fan } from './geometry'

export const PAWN_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9']

const squares = Array.from({ length: 100 }, (_, i) => i + 1)

export function Board({ s }: { s: GameState }) {
  const bySquare = new Map<number, number[]>()
  s.players.forEach((pl, p) => bySquare.set(pl.square, [...(bySquare.get(pl.square) ?? []), p]))
  const turnOf = s.decision?.player ?? s.current

  return (
    <svg className="board" viewBox="0 0 1000 1000" role="img" aria-label="Game board">
      {squares.map((sq) => {
        const { x, y } = cellOf(sq)
        const type = tileAt(sq)
        const art = type !== 'plain' && type !== 'start'
        return (
          <g key={sq}>
            <rect x={x} y={y} width={CELL} height={CELL} className={`tile ${(Math.floor((sq - 1) / 10) + sq) % 2 ? 'a' : 'b'}`} />
            {art && <image href={`icons/${type}.svg`} x={x + 4} y={y + 4} width={CELL - 8} height={CELL - 8} />}
            <text x={x + 8} y={y + 22} className="sqnum">{sq}</text>
            {type === 'start' && <text x={x + 50} y={y + 62} className="startlab" textAnchor="middle">START</text>}
            <title>{`${sq}: ${type}`}</title>
          </g>
        )
      })}

      {Object.entries(LADDERS).map(([b, t]) => {
        const a = centerOf(+b), z = centerOf(t)
        return (
          <g key={`l${b}`} className="ladder">
            <line x1={a.x} y1={a.y} x2={z.x} y2={z.y} />
            <line x1={a.x} y1={a.y} x2={z.x} y2={z.y} className="rungs" />
          </g>
        )
      })}
      {Object.entries(SNAKES).map(([h, t]) => {
        const a = centerOf(+h), z = centerOf(t)
        // ponytail: one generated curve per snake until the .ai paths arrive
        const mx = (a.x + z.x) / 2 + (a.y - z.y) * 0.25, my = (a.y + z.y) / 2 + (z.x - a.x) * 0.25
        return (
          <g key={`s${h}`} className="snake">
            <path d={`M${a.x},${a.y} Q${mx},${my} ${z.x},${z.y}`} />
            <circle cx={a.x} cy={a.y} r={11} />
          </g>
        )
      })}

      {[...bySquare].map(([sq, ps]) => ps.map((p, k) => {
        const c = centerOf(sq), o = fan(k, ps.length)
        return (
          <g key={`p${p}`} className={`pawn ${p === turnOf ? 'active' : ''}`} transform={`translate(${c.x + o.dx},${c.y + o.dy})`}>
            <circle r={19} fill={PAWN_COLORS[p]} />
            <text textAnchor="middle" dy="7">{p + 1}</text>
          </g>
        )
      }))}
    </svg>
  )
}
