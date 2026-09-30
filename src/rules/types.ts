import type { Config } from './config'

export type CountryId = 'usa' | 'china' | 'japan' | 'germany' | 'bangladesh' | 'uk'

export type CardId =
  | 'commodityBoom' | 'lendLease' | 'debtRestructure' | 'fastTrack' | 'tariffTruce' | 'exportSubsidy'
  | 'productivitySurge' | 'surplusBudget' | 'strategicReserve' | 'alliedAid' | 'warBond' | 'tradeCorridor'
  | 'devaluation' | 'bankingPanic' | 'cyberAttack' | 'embargo' | 'strike' | 'sovereignDefault'
  | 'portBlockade' | 'insuranceFraud' | 'corruptionProbe' | 'debtSpiral' | 'sanctionThreat'
  | 'rateHike' | 'commodityCrash' | 'capitalControls'

export interface Project { id: number; chips: number; delta: number; ttm: number; profit: number }

/** Countdown statuses: each is consumed at the start of its owner's turn, `turns` times. */
export type StatusKind = 'rateHike' | 'capitalControls' | 'tradeCorridor' | 'embargo' | 'noRepay' | 'sanctionThreat'
export interface Status { kind: StatusKind; turns: number }

export interface Player {
  name: string
  country: CountryId
  square: number
  capital: number
  debt: number
  waivers: number
  projects: Project[]
  statuses: Status[]
  fraud: boolean     // Insurance Fraud: next hedge costs more
  matured: number    // profit paid out so far (already inside capital; shown on the ledger)
}

/** Players are referred to by seat index everywhere. */
export type Seat = number

export type Effect =
  | { t: 'turnStart' }
  | { t: 'askDebt' }
  | { t: 'askRoll' }
  | { t: 'roll' }
  | { t: 'land'; p: Seat }
  | { t: 'push'; p: Seat; by: number; via: 'push' | 'card'; tiles: boolean }
  | { t: 'tariff'; from: Seat; victims: Seat[] }
  | { t: 'setback'; by: number; threat: boolean }
  | { t: 'drawCard'; p: Seat }
  | { t: 'applyCard'; p: Seat; card: CardId }
  | { t: 'finish'; p: Seat }
  | { t: 'takeover' }
  | { t: 'endTurn' }

export type Decision =
  | { kind: 'debtWindow'; player: Seat; maxTake: number; maxRepay: number }
  | { kind: 'roll'; player: Seat }
  | { kind: 'invest'; player: Seat; max: number; from: number; to: number }
  | { kind: 'hedge'; player: Seat; cost: number; from: number; to: number }
  | { kind: 'waiver'; player: Seat; from: Seat; setback: number; rest: Seat[] }
  | { kind: 'cardChoice'; player: Seat; card: CardId; options: string[] }
  | { kind: 'takeover'; player: Seat; victims: Seat[] }
  | { kind: 'ackCard'; player: Seat; card: CardId }

export type Intent =
  | { player: Seat; type: 'takeDebt'; n: number }
  | { player: Seat; type: 'repay'; n: number }
  | { player: Seat; type: 'roll' }
  | { player: Seat; type: 'invest'; chips: number }
  | { player: Seat; type: 'hedge'; hedge: boolean }
  | { player: Seat; type: 'waiver'; use: boolean }
  | { player: Seat; type: 'choose'; option: string }
  | { player: Seat; type: 'takeover'; victim: Seat | null }
  | { player: Seat; type: 'ack' }

export type MoveVia = 'walk' | 'ladder' | 'snake' | 'push' | 'card'

export type GameEvent =
  | { type: 'turnStarted'; player: Seat; turn: number }
  | { type: 'turnSkipped'; player: Seat }
  | { type: 'diceRolled'; player: Seat; raw: number; crunched: boolean; bonus: number; value: number }
  | { type: 'noMove'; player: Seat; reason: 'overshoot' | 'zero' }
  | { type: 'moved'; player: Seat; path: number[]; via: MoveVia }
  | { type: 'capital'; player: Seat; delta: number; reason: string }
  | { type: 'debt'; player: Seat; delta: number; reason: string }
  | { type: 'waiver'; player: Seat; delta: number; reason: string }
  | { type: 'projectCreated'; player: Seat; project: Project }
  | { type: 'projectTicked'; player: Seat; id: number; ttm: number }
  | { type: 'projectChanged'; player: Seat; id: number; profit: number; reason: string }
  | { type: 'projectMatured'; player: Seat; id: number; profit: number }
  | { type: 'projectLost'; player: Seat; id: number }
  | { type: 'projectStolen'; from: Seat; to: Seat; id: number }
  | { type: 'hedged'; player: Seat; cost: number }
  | { type: 'cardDrawn'; player: Seat; card: CardId }
  | { type: 'deckShuffled' }
  | { type: 'tariffHit'; from: Seat; player: Seat; setback: number }
  | { type: 'waiverUsed'; player: Seat }
  | { type: 'sanctionHit'; player: Seat; setback: number }
  | { type: 'statusAdded'; player: Seat; status: Status }
  | { type: 'statusExpired'; player: Seat; kind: StatusKind }
  | { type: 'finished'; player: Seat; bonus: number }
  | { type: 'error'; message: string }

export interface LedgerRow {
  player: Seat
  capital: number   // final, bonus included
  bonus: number
  matured: number
  debt: number
  debtCost: number
  pendingLost: number  // profit of projects that never matured
  netWorth: number
  square: number
  rank: number
}
export interface FinalLedger { rows: LedgerRow[]; winners: Seat[] }

export interface GameState {
  v: 1
  config: Config
  rng: number
  phase: 'playing' | 'finished'
  players: Player[]
  current: Seat
  turn: number
  deck: CardId[]
  discard: CardId[]
  queue: Effect[]
  decision: Decision | null
  turnFlags: { rollBonus: number; noRepay: boolean; landings: number }
  nextProjectId: number
  result?: FinalLedger
}
