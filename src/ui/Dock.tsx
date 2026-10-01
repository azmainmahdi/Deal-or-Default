// The decision dock: shows what the engine is waiting for and one button per legal intent.
import { useState } from 'react'
import { CARDS } from '../rules/cards'
import { legalIntents, projectTerms } from '../rules/engine'
import type { GameState, Intent } from '../rules/types'
import { PAWN_COLORS } from './Board'

const OPTION_LABEL: Record<string, string> = { capital: '+2 Capital', repay: 'Remove 1 Debt', pay: 'Pay 2 Capital', debt: 'Take 1 Debt' }

const KEY: Record<string, string> = { roll: 'Space', ack: 'Space', 'invest:0': '0', 'invest:1': '1', 'invest:2': '2', 'invest:3': '3', 'invest:4': '4', 'yes': 'Y', 'no': 'N' }
function keyOf(i: Intent): string {
  if (i.type === 'invest') return `invest:${i.chips}`
  if (i.type === 'hedge') return i.hedge ? 'yes' : 'no'
  if (i.type === 'waiver') return i.use ? 'yes' : 'no'
  if (i.type === 'takeover') return i.victim === null ? 'no' : 'yes'
  return i.type
}

/** Button text plus the outcome in small print, so every choice says what it does. */
function label(i: Intent, s: GameState): [string, string?] {
  const d = s.decision!
  const pl = s.players[i.player]!
  switch (i.type) {
    case 'roll': return ['Roll']
    case 'takeDebt': return [`Borrow ${i.n}`]
    case 'repay': return [`Repay ${i.n}`]
    case 'invest': {
      if (d.kind !== 'invest') return [`Invest ${i.chips}`]
      if (i.chips === 0) return ['Stay', 'keep your Capital']
      const t = projectTerms(pl.country, i.chips, d.to - d.from, s.config)
      return [`Invest ${i.chips}`, `+${t.profit} in ${t.ttm} turn${t.ttm === 1 ? '' : 's'}`]
    }
    case 'hedge': {
      if (d.kind !== 'hedge') return [i.hedge ? 'Hedge' : 'Take the crash']
      const delta = d.from - d.to
      if (i.hedge) return [`Hedge for ${d.cost}`, `slide ${Math.ceil(delta / 2)}, keep projects`]
      const lose = s.config.hedgeLoss === 'all' ? pl.projects.reduce((a, x) => a + x.profit, 0) : Math.max(0, ...pl.projects.map((x) => x.profit))
      return ['Take the crash', `slide ${delta}${lose ? `, lose +${lose}` : ''}`]
    }
    case 'waiver': return i.use ? ['Use a waiver', `${pl.waivers - 1} left after`] : ['Take the hit', d.kind === 'waiver' ? `back ${d.setback}` : '']
    case 'choose': return [OPTION_LABEL[i.option] ?? i.option]
    case 'takeover': {
      if (i.victim === null) return ['No takeover']
      const v = s.players[i.victim]!
      const smallest = Math.min(...v.projects.map((x) => x.profit))
      return [`Take ${v.name}'s project`, `pay ${s.config.takeoverCost}, gain +${smallest}`]
    }
    case 'ack': return ['Apply card']
  }
}

function prompt(s: GameState): string {
  const d = s.decision!
  const card = d.kind === 'ackCard' ? CARDS[d.card] : null
  const pl = s.players[d.player]!
  switch (d.kind) {
    case 'debtWindow': return `Roll, or borrow first.${s.turnFlags.noRepay ? ' (Debt Spiral: no repaying this turn.)' : ''}${pl.square >= s.config.crunchFrom && pl.debt > 0 ? ' Crunch: your roll is halved while in debt.' : ''}`
    case 'roll': return 'Roll the die.'
    case 'invest': return `FDI ladder ${d.from} → ${d.to}. Each chip you invest earns ${d.to - d.from}.`
    case 'hedge': return `Market crash! ${d.from} → ${d.to}.`
    case 'waiver': return `Tariff from ${s.players[d.from]!.name}: back ${d.setback}, unless you spend a waiver.`
    case 'cardChoice': return 'Choose one.'
    case 'takeover': return `Hostile takeover: pay ${s.config.takeoverCost} to take a rival's smallest project.`
    case 'ackCard': return card ? `${card.name}: ${card.text}` : ''
  }
}

export function Dock({ s, onIntent }: { s: GameState; onIntent: (i: Intent) => void }) {
  const [mode, setMode] = useState<null | 'takeDebt' | 'repay'>(null)
  const [forDecision, setForDecision] = useState(s.decision)
  if (forDecision !== s.decision) { setForDecision(s.decision); setMode(null) } // new decision: close any chooser
  const d = s.decision
  if (!d) return null
  const pl = s.players[d.player]!
  const all = legalIntents(s)
  // The debt window shows Roll plus one Borrow and one Repay button; the amount is chosen after.
  const intents = d.kind === 'debtWindow'
    ? mode ? all.filter((i) => i.type === mode) : all.filter((i) => i.type === 'roll')
    : all
  const perChip = pl.country === 'uk' ? s.config.ukDebtCapital : 1
  const text = mode === 'takeDebt'
    ? `Borrow how much? Each Debt chip gives ${perChip} Capital now and costs ${s.config.debtWeight} Net Worth at the end if unpaid.`
    : mode === 'repay' ? 'Repay how much? Each chip costs 1 Capital.' : prompt(s)
  return (
    <section className="dock" aria-label="Your decision" style={{ '--pc': PAWN_COLORS[d.player] } as React.CSSProperties}>
      <h2><span className="dot" aria-hidden="true" />{pl.name}</h2>
      <p>{text}</p>
      <div className="buttons">
        {intents.map((i, k) => (
          <button key={k} className={i.type === 'roll' || i.type === 'ack' ? 'primary' : mode ? 'amount' : ''} onClick={() => onIntent(i)}>
            {mode && (i.type === 'takeDebt' || i.type === 'repay') ? i.n : (() => { const [main, sub] = label(i, s); return <>{main}{sub && <small>{sub}</small>}</> })()}
            {KEY[keyOf(i)] && <kbd>{KEY[keyOf(i)]}</kbd>}
          </button>
        ))}
        {d.kind === 'debtWindow' && !mode && d.maxTake > 0 && <button onClick={() => setMode('takeDebt')}>Borrow…</button>}
        {d.kind === 'debtWindow' && !mode && d.maxRepay > 0 && <button onClick={() => setMode('repay')}>Repay…</button>}
        {mode && <button className="quiet" onClick={() => setMode(null)}>Back</button>}
      </div>
    </section>
  )
}
