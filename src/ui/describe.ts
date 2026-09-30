// One plain sentence per engine event, for the log (and the aria-live region).
import { CARDS } from '../rules/cards'
import type { GameEvent, GameState } from '../rules/types'

const STATUS: Record<string, string> = {
  rateHike: 'Interest Rate Hike', capitalControls: 'Capital Controls', tradeCorridor: 'Trade Corridor',
  embargo: 'Trade Embargo', noRepay: 'no repaying next turn', sanctionThreat: 'Sanction Threat',
}

export function describe(e: GameEvent, s: GameState): string | null {
  const n = (p: number) => s.players[p]?.name ?? `Player ${p + 1}`
  const money = (d: number) => (d > 0 ? `+${d}` : `${d}`)
  switch (e.type) {
    case 'turnStarted': return `Turn ${e.turn}: ${n(e.player)}.`
    case 'turnSkipped': return `${n(e.player)} is under embargo and skips this turn.`
    case 'diceRolled':
      return `${n(e.player)} rolled ${e.raw}` +
        (e.crunched ? `, halved by the liquidity crunch` : '') +
        (e.bonus ? `, +${e.bonus} Trade Corridor` : '') +
        (e.crunched || e.bonus ? `: moves ${e.value}.` : '.')
    case 'noMove': return e.reason === 'zero' ? `${n(e.player)} doesn't move.` : `${n(e.player)} would pass 100, so stays put.`
    case 'moved': {
      const to = e.path[e.path.length - 1]
      if (e.via === 'ladder') return `${n(e.player)} climbs the FDI ladder to ${to}.`
      if (e.via === 'snake') return `${n(e.player)} slides down to ${to}.`
      if (e.via === 'walk') return null
      return `${n(e.player)} is moved to ${to}.`
    }
    case 'capital': return `${n(e.player)} ${money(e.delta)} Capital (${e.reason}).`
    case 'debt': return `${n(e.player)} ${money(e.delta)} Debt (${e.reason}).`
    case 'waiver': return `${n(e.player)} ${money(e.delta)} Waiver (${e.reason}).`
    case 'projectCreated': return `${n(e.player)} starts a project: ${e.project.profit} profit in ${e.project.ttm} turns.`
    case 'projectTicked': return null
    case 'projectChanged': return `${n(e.player)}'s project is now worth ${e.profit} (${e.reason}).`
    case 'projectMatured': return `${n(e.player)}'s project pays out ${e.profit}.`
    case 'projectLost': return `${n(e.player)} loses a project in the crash.`
    case 'projectStolen': return `${n(e.to)} takes over a project from ${n(e.from)}.`
    case 'hedged': return `${n(e.player)} hedges for ${e.cost}.`
    case 'cardDrawn': return `${n(e.player)} draws ${CARDS[e.card].name}.`
    case 'deckShuffled': return 'The event deck is reshuffled.'
    case 'tariffHit': return `Tariff on ${n(e.player)}: back ${e.setback}.`
    case 'waiverUsed': return `${n(e.player)} uses a Tariff Waiver.`
    case 'sanctionHit': return `Sanction on ${n(e.player)}: back ${e.setback}.`
    case 'statusAdded': return `${n(e.player)}: ${STATUS[e.status.kind]} for ${e.status.turns} turn${e.status.turns > 1 ? 's' : ''}.`
    case 'statusExpired': return null
    case 'finished': return `${n(e.player)} reaches 100 and earns the ${e.bonus} bonus. Game over.`
    case 'error': return `Engine stopped a runaway chain: ${e.message}`
  }
}
