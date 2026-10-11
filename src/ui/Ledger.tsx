// The scoreboard. Built around money: coins now, and FDI projects paying in soon.
// Debt and Net Worth only show when they differ from plain coins (debt is rare).
import { COUNTRIES } from '../rules/countries'
import type { GameState } from '../rules/types'
import { PAWN_COLORS } from './Board'
import { Flag } from './Flag'
import { Num } from './Num'

export interface Shown { square: number; capital: number; debt: number; waivers: number }

const STATUS: Record<string, string> = {
  rateHike: 'Rate hike', capitalControls: 'Capital controls', tradeCorridor: 'Corridor +1',
  embargo: 'Embargo', noRepay: 'No repay', sanctionThreat: 'Sanction threat',
}

export function Ledger({ s, shown, active, you }: { s: GameState; shown: Shown[]; active: number; you?: number }) {
  return (
    <div className="board-score" role="table" aria-label="Players">
      {s.players.map((pl, p) => {
        const v = shown[p] ?? pl
        const projects = [...pl.projects].sort((a, b) => a.ttm - b.ttm)
        const nextTurn = projects.filter((x) => x.ttm <= 1).reduce((a, x) => a + x.profit, 0)
        const pipeline = projects.reduce((a, x) => a + x.profit, 0)
        const nw = v.capital - s.config.debtWeight * v.debt
        return (
          <article key={p} role="row" data-ledger={p} className={`score-row ${p === active ? 'active' : ''}`} style={{ '--pc': PAWN_COLORS[p] } as React.CSSProperties}>
            <div className="sr-who">
              <Flag c={pl.country} />
              <div className="sr-name">
                <b>{pl.name}{p === you ? <em> (you)</em> : null}</b>
                <small title={COUNTRIES[pl.country].perk}>{COUNTRIES[pl.country].name} · sq {v.square}</small>
              </div>
            </div>
            <div className="sr-coins" title="Capital">
              <svg className="chip capital" viewBox="-12 -12 24 24" aria-hidden="true"><path d="M-5-11.5h10l6.5 6.5v10L5 11.5h-10l-6.5-6.5v-10z" /><path d="M-3.5-8h7l5 5v6l-5 5h-7l-5-5v-6z" className="inner" /></svg>
              <Num value={v.capital} />
              <span className="sr-waiver" title={`${v.waivers} Tariff Waiver${v.waivers === 1 ? '' : 's'}`}><i />{v.waivers}</span>
            </div>
            <div className="sr-pipe" aria-label="FDI projects">
              {projects.length === 0 ? <span className="sr-none">No projects</span> : (
                <>
                  {nextTurn > 0 && <span className="sr-next">+{nextTurn} next turn</span>}
                  {projects.map((x) => (
                    <span key={x.id} className={`proj ${x.ttm <= 1 ? 'soon' : ''}`} title={`+${x.profit} in ${x.ttm} turn${x.ttm === 1 ? '' : 's'}`}>
                      +{x.profit}
                      <i className="ttm" aria-label={`${x.ttm} turns`}>{Array.from({ length: Math.min(x.ttm, 4) }, (_, k) => <b key={k} />)}</i>
                    </span>
                  ))}
                  {projects.length > 1 && <span className="sr-total">= +{pipeline}</span>}
                </>
              )}
            </div>
            {(v.debt > 0 || pl.statuses.length > 0 || pl.fraud) && (
              <div className="sr-tags">
                {v.debt > 0 && <span className="tag debt">Debt {v.debt} · Net <Num value={nw} /></span>}
                {pl.statuses.map((st, i) => <span key={i} className="tag status">{STATUS[st.kind]} ({st.turns})</span>)}
                {pl.fraud && <span className="tag status">Insurance fraud</span>}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
