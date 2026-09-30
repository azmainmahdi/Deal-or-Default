import type { CardId } from './types'

// Every tunable number. Simulations override any of these per game.
export const DEFAULT_CONFIG = {
  startCapital: 5,
  startWaivers: 1,
  debtCap: 6,                 // OPEN: Azmain thinks 1+2+3
  maxDebtTake: 3,
  ukDebtCapital: 2,           // UK gains this much Capital per Debt chip
  debtWeight: 1.5,            // Net Worth = Capital - debtWeight × Debt
  finishBonus: 20,            // OPEN: 20 or 30, sims decide
  crunchFrom: 81,             // liquidity crunch: halve rolls from here while in debt
  maxInvest: 3,
  usaMaxInvest: 4,
  germanyBonusChips: 2,
  bangladeshMaxDelta: 14,
  bangladeshMinTtm: 1,        // FLAG: min 1 means no benefit on 1-chip projects
  hedgeDivisor: 5,
  fraudSurcharge: 2,
  hedgeLoss: 'largest' as 'largest' | 'all',  // FLAG: manual says both
  tariffSetback: 3,
  chinaTariffSetback: 2,
  sanctionSetback: 5,
  sanctionThreat: 'only' as 'only' | 'add',   // FLAG: threatened player replaces or joins the leaders
  defaultSetback: 4,          // Sovereign Default
  takeoverCost: 3,
  commodityBoom: 3 as number | 'delta',       // OPEN: manual +3, old code +Δ
  firstPlayer: 'join' as 'join' | 'random',
  ackCards: true,             // UI waits for an acknowledgement on each card; sims turn it off
  landingCap: 500,            // safety stop for chained tile resolutions in one turn (real max seen: 70)
  // OPEN: final 24. Default is the plan's suggestion: add tradeCorridor, drop capitalControls + surplusBudget.
  deck: [
    'commodityBoom', 'lendLease', 'debtRestructure', 'fastTrack', 'tariffTruce', 'exportSubsidy',
    'productivitySurge', 'strategicReserve', 'alliedAid', 'warBond', 'tradeCorridor',
    'devaluation', 'bankingPanic', 'cyberAttack', 'embargo', 'strike', 'sovereignDefault', 'portBlockade',
    'insuranceFraud', 'corruptionProbe', 'debtSpiral', 'sanctionThreat', 'rateHike', 'commodityCrash',
  ] as CardId[],
}

export type Config = typeof DEFAULT_CONFIG
