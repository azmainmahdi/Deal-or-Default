// The decision dock: shows what the engine is waiting for and one button per legal intent.
import { CARDS } from '../rules/cards'
import { legalIntents } from '../rules/engine'
import type { GameState, Intent } from '../rules/types'
import { PAWN_COLORS } from './Board'

const OPTION_LABEL: Record<string, string> = { capital: '+2 Capital', repay: 'Remove 1 Debt', pay: 'Pay 2 Capital', debt: 'Take 1 Debt' }

function label(i: Intent, s: GameState): string {
  switch (i.type) {
    case 'roll': return 'Roll'
    case 'takeDebt': return `Borrow ${i.n}`
    case 'repay': return `Repay ${i.n}`
    case 'invest': return i.chips === 0 ? 'Stay (invest 0)' : `Invest ${i.chips}`
    case 'hedge': return i.hedge ? `Hedge` : 'Take the full slide'
    case 'waiver': return i.use ? 'Use a waiver' : 'Take the hit'
    case 'choose': return OPTION_LABEL[i.option] ?? i.option
    case 'takeover': return i.victim === null ? 'No takeover' : `Take over from ${s.players[i.victim]!.name}`
    case 'ack': return 'Apply card'
  }
}

function prompt(s: GameState): string {
  const d = s.decision!
  const card = d.kind === 'ackCard' ? CARDS[d.card] : null
  const pl = s.players[d.player]!
  switch (d.kind) {
    case 'debtWindow': return `Borrow, repay, or roll.${s.turnFlags.noRepay ? ' (Debt Spiral: no repaying this turn.)' : ''}${pl.square >= s.config.crunchFrom && pl.debt > 0 ? ' Crunch: your roll is halved while in debt.' : ''}`
    case 'roll': return 'Roll the die.'
    case 'invest': return `FDI ladder ${d.from} → ${d.to} (Δ${d.to - d.from}). Invest chips to climb; each chip earns ${d.to - d.from} when the project matures.`
    case 'hedge': return `Market crash ${d.from} → ${d.to}. Hedge for ${d.cost} to slide only ${Math.ceil((d.from - d.to) / 2)} and keep your projects.`
    case 'waiver': return `Tariff from ${s.players[d.from]!.name}: back ${d.setback}, unless you spend a waiver.`
    case 'cardChoice': return 'Choose one.'
    case 'takeover': return `Hostile takeover: pay ${s.config.takeoverCost} to take a rival's smallest project.`
    case 'ackCard': return card ? `${card.name}: ${card.text}` : ''
  }
}

export function Dock({ s, onIntent }: { s: GameState; onIntent: (i: Intent) => void }) {
  const d = s.decision
  if (!d) return null
  const pl = s.players[d.player]!
  const intents = legalIntents(s)
  return (
    <section className="dock" aria-label="Your decision" style={{ '--pc': PAWN_COLORS[d.player] } as React.CSSProperties}>
      <h2><span className="dot" aria-hidden="true" />{pl.name}</h2>
      <p>{prompt(s)}</p>
      <div className="buttons">
        {intents.map((i, k) => (
          <button key={k} className={i.type === 'roll' || i.type === 'ack' ? 'primary' : ''} onClick={() => onIntent(i)}>{label(i, s)}</button>
        ))}
      </div>
    </section>
  )
}
