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

/** Octagonal chips like the printed ones: gold for Capital, copper with a hole for Debt. */
function Chip({ kind }: { kind: 'capital' | 'debt' }) {
  return (
    <svg className={`chip ${kind}`} viewBox="-12 -12 24 24" aria-hidden="true">
      <path d="M-5-11.5h10l6.5 6.5v10L5 11.5h-10l-6.5-6.5v-10z" />
      {kind === 'debt' ? <circle r="4" className="hole" /> : <path d="M-3.5-8h7l5 5v6l-5 5h-7l-5-5v-6z" className="inner" />}
    </svg>
  )
}

export function Ledger({ s, shown, active }: { s: GameState; shown: Shown[]; active: number }) {
  return (
    <div className="ledgers">
      {s.players.map((pl, p) => {
        const v = shown[p] ?? pl
        return (
          <article key={p} data-ledger={p} className={`ledger plaque ${p === active ? 'active' : ''}`} style={{ '--pc': PAWN_COLORS[p] } as React.CSSProperties}>
            <svg className="pl-frame" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" d="M12 3H288L297 12V108L288 117H12L3 108V12Z" />
              <path vectorEffect="non-scaling-stroke" className="inner" d="M16 7H284L293 16V104L284 113H16L7 104V16Z" />
              <path vectorEffect="non-scaling-stroke" className="step" d="M3 22H9V9H22V3M297 22H291V9H278V3M3 98H9V111H22V117M297 98H291V111H278V117" />
            </svg>
            <div className="pl-arch">
              <span className="pl-sun" aria-hidden="true" />
              <span className="pl-portrait" style={{ backgroundImage: `url(./art/countries/${pl.country}.jpg)` }} />
              <Flag c={pl.country} />
              <span className="pl-seat" data-n={p + 1} />
            </div>
            <div className="lg-body">
              <header>
                <b>{pl.name}</b>
                <span className="sq">Sq {v.square}</span>
              </header>
              <p className="country" title={COUNTRIES[pl.country].perk}><span>{COUNTRIES[pl.country].name}</span> {COUNTRIES[pl.country].perk}</p>
              <div className="purse">
                <span title="Capital"><Chip kind="capital" /><Num value={v.capital} /></span>
                <span title="Debt"><Chip kind="debt" /><Num value={v.debt} /></span>
                <span title="Tariff Waivers" className="tickets">
                  {Array.from({ length: Math.min(v.waivers, 4) }, (_, i) => <i key={i} />)}
                  {v.waivers === 0 ? <em>no waiver</em> : v.waivers > 4 ? <em>×{v.waivers}</em> : null}
                </span>
                <span className="nw" title="Net Worth = Capital − 1.5 × Debt">NW <Num value={v.capital - s.config.debtWeight * v.debt} /></span>
              </div>
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
            </div>
          </article>
        )
      })}
    </div>
  )
}
