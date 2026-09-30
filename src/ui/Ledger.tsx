import { COUNTRIES } from '../rules/countries'
import { netWorth } from '../rules/ops'
import type { GameState } from '../rules/types'
import { PAWN_COLORS } from './Board'

const STATUS: Record<string, string> = {
  rateHike: 'Rate hike', capitalControls: 'Capital controls', tradeCorridor: 'Trade corridor +1',
  embargo: 'Embargo', noRepay: 'No repay', sanctionThreat: 'Sanction threat',
}

export function Ledger({ s }: { s: GameState }) {
  const turnOf = s.decision?.player ?? s.current
  return (
    <div className="ledgers">
      {s.players.map((pl, p) => (
        <article key={p} className={`ledger ${p === turnOf ? 'active' : ''}`} style={{ '--pc': PAWN_COLORS[p] } as React.CSSProperties}>
          <header>
            <span className="dot seat" aria-hidden="true">{p + 1}</span>
            <b>{pl.name}</b>
            <span className="country" title={COUNTRIES[pl.country].perk}>{COUNTRIES[pl.country].name}</span>
            <span className="sq">sq {pl.square}</span>
          </header>
          <p className="perk">{COUNTRIES[pl.country].perk}</p>
          <dl>
            <div><dt>Capital</dt><dd>{pl.capital}</dd></div>
            <div><dt>Debt</dt><dd>{pl.debt}</dd></div>
            <div><dt>Waivers</dt><dd>{pl.waivers}</dd></div>
            <div><dt>Net Worth</dt><dd>{netWorth(s, p)}</dd></div>
          </dl>
          {pl.projects.length > 0 && (
            <ul className="projects" aria-label="Pending projects">
              {pl.projects.map((x) => <li key={x.id}>+{x.profit} in {x.ttm} turn{x.ttm === 1 ? '' : 's'}</li>)}
            </ul>
          )}
          {(pl.statuses.length > 0 || pl.fraud) && (
            <p className="statuses">
              {pl.statuses.map((st, i) => <span key={i}>{STATUS[st.kind]} ({st.turns})</span>)}
              {pl.fraud && <span>Insurance fraud</span>}
            </p>
          )}
        </article>
      ))}
    </div>
  )
}
