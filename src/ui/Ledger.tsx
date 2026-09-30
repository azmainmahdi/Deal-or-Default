import { COUNTRIES } from '../rules/countries'
import type { GameState } from '../rules/types'
import { PAWN_COLORS } from './Board'
import { Num } from './Num'

export interface Shown { square: number; capital: number; debt: number; waivers: number }

const STATUS: Record<string, string> = {
  rateHike: 'Rate hike', capitalControls: 'Capital controls', tradeCorridor: 'Corridor +1',
  embargo: 'Embargo', noRepay: 'No repay', sanctionThreat: 'Sanction threat',
}

export function Ledger({ s, shown, active }: { s: GameState; shown: Shown[]; active: number }) {
  return (
    <div className="ledgers">
      {s.players.map((pl, p) => {
        const v = shown[p] ?? pl
        return (
          <article key={p} data-ledger={p} className={`ledger ${p === active ? 'active' : ''}`} style={{ '--pc': PAWN_COLORS[p] } as React.CSSProperties}>
            <header>
              <span className="dot seat" aria-hidden="true">{p + 1}</span>
              <b>{pl.name}</b>
              <span className="sq">sq {v.square}</span>
            </header>
            <p className="country" title={COUNTRIES[pl.country].perk}>{COUNTRIES[pl.country].name} · {COUNTRIES[pl.country].perk}</p>
            <dl>
              <div><dt>Capital</dt><dd><Num value={v.capital} /></dd></div>
              <div><dt>Debt</dt><dd><Num value={v.debt} /></dd></div>
              <div><dt>Waivers</dt><dd><Num value={v.waivers} /></dd></div>
              <div><dt>Net</dt><dd><Num value={v.capital - s.config.debtWeight * v.debt} /></dd></div>
            </dl>
            {pl.projects.length > 0 && (
              <ul className="projects" aria-label="Pending projects">
                {pl.projects.map((x) => (
                  <li key={x.id} title={`${x.profit} profit in ${x.ttm} turns`}>
                    <span className="clock" style={{ '--t': Math.min(1, x.ttm / 4) } as React.CSSProperties} aria-hidden="true" />+{x.profit}<small>{x.ttm}t</small>
                  </li>
                ))}
              </ul>
            )}
            {(pl.statuses.length > 0 || pl.fraud) && (
              <p className="statuses">
                {pl.statuses.map((st, i) => <span key={i}>{STATUS[st.kind]} ({st.turns})</span>)}
                {pl.fraud && <span>Insurance fraud</span>}
              </p>
            )}
          </article>
        )
      })}
    </div>
  )
}
