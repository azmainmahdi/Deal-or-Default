// The decision panel: whatever the game is waiting on (an event card, a ladder, a crash, a
// tariff, a takeover) opens over the board with its choices directly underneath.
import { legalIntents } from '../rules/engine'
import type { CardId, GameState, Intent } from '../rules/types'
import { PAWN_COLORS } from './Board'
import { EventText } from './Cards'
import { KEY, keyOf, label, prompt } from './Dock'

/** Decisions that take the stage; the debt window and plain rolls stay in the action bar. */
export const STAGE_KINDS = new Set(['ackCard', 'cardChoice', 'invest', 'hedge', 'waiver', 'takeover'])

const HEAD: Record<string, [string, string]> = {
  invest: ['FDI ladder', 'ladder'], hedge: ['Market crash', 'snake'], waiver: ['Tariff', 'tariff'], takeover: ['Hostile takeover', 'goal'],
}

export function Decide({ s, card, mine, busy, onIntent }: { s: GameState; card: CardId | null; mine: boolean; busy: boolean; onIntent: (i: Intent) => void }) {
  const d = s.decision
  const open = !busy && !!d && STAGE_KINDS.has(d.kind) && s.phase === 'playing'
  const who = d ? s.players[d.player]! : null
  const intents = open && mine ? legalIntents(s) : []
  const head = d && HEAD[d.kind]
  const icon = d?.kind === 'waiver' ? 'tariff' : head?.[1]
  return (
    <div className={`decide ${open ? 'open' : ''} ${card ? 'has-card' : ''}`} aria-live="polite">
      {/* the card always lands here, so draws animate into the same spot the panel uses */}
      <div className="reveal-spot" data-reveal-spot>
        {card && <div className="reveal" key={card}><EventText id={card} /></div>}
      </div>
      {open && d && who && (
        <section className="decide-panel" style={{ '--pc': PAWN_COLORS[d.player] } as React.CSSProperties} aria-label="Decision">
          {!card && head && (
            <div className="decide-head">
              {icon && <img src={`./icons/${icon}.svg`} alt="" />}
              <div><small>{head[0]}</small><b>{prompt(s)}</b></div>
            </div>
          )}
          <p className="decide-who"><span className="dot" />{mine ? `${who.name}, your call` : `${who.name} is deciding…`}</p>
          {mine && (
            <div className="decide-buttons">
              {intents.map((i, k) => {
                const [main, sub] = label(i, s)
                const primary = i.type === 'ack' || (i.type === 'hedge' && i.hedge) || (i.type === 'waiver' && i.use)
                return (
                  <button key={k} className={primary ? 'primary' : ''} onClick={() => onIntent(i)}>
                    <span>{main}</span>{sub && <small>{sub}</small>}
                    {KEY[keyOf(i)] && <kbd>{KEY[keyOf(i)]}</kbd>}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
