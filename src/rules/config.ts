import type { CardId } from './types'

// Every tunable number. Simulations override any of these per game.
export const DEFAULT_CONFIG = {
  startCapital: 5,
  startWaivers: 1,
  debtCap: 6,
  loanSizes: [1, 2, 3],       // his call 18 Oct: three loans, each held once, at most one borrowed per turn
  ukDebtCapital: 2,           // UK gains this much Capital per Debt chip
  // Debt interest (his pick C, 19 Oct): clearing a loan within debtOnTime of your own turns costs it + debtInterest,
  // later it costs + debtLateInterest; a loan still open at the end counts as it + debtLateInterest against Net Worth.
  debtInterest: 1,
  debtLateInterest: 2,
  debtOnTime: 3,
  chinaTariffIncome: 1,       // China perk C "Export surplus": +1 whenever another player lands on a tariff square
  finishBonus: 30,            // his call 18 Oct
  crunchFrom: 81,             // liquidity crunch: halve rolls from here while in debt
  maxInvest: 3,
  usaMaxInvest: 4,
  germanyBonusChips: 2,
  // Germany perk under test (19 Oct, Germany wins 0.87 of its share with the old one):
  // exact2 = exactly 2 chips gives +1 profit (printed); bund = loans never go late (+1 interest always, +1 at the end);
  // quality = projects of 2+ chips pay germanyQuality extra; export = +germanyExport Capital whenever a project pays out
  germanyPerk: 'quality' as 'exact2' | 'bund' | 'quality' | 'export',
  germanyQuality: 2,           // his pick 19 Oct: "Made in Germany", +2 on projects of 2+ chips (bots: 1.06 of its share)
  germanyExport: 2,
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
  // Printed cards win (his call 18 Oct): the printed set includes Surplus Budget and two Capital Controls. ASSUMPTION:
  // every card we know of is in, so 27; the print says 24 and we don't know which 3 are missing.
  deck: [
    'commodityBoom', 'lendLease', 'debtRestructure', 'fastTrack', 'tariffTruce', 'exportSubsidy',
    'productivitySurge', 'surplusBudget', 'strategicReserve', 'alliedAid', 'warBond', 'tradeCorridor',
    'devaluation', 'bankingPanic', 'cyberAttack', 'embargo', 'strike', 'sovereignDefault', 'portBlockade',
    'insuranceFraud', 'corruptionProbe', 'debtSpiral', 'sanctionThreat', 'rateHike', 'commodityCrash',
    'capitalControls', 'capitalControls',
  ] as CardId[],
}

export type Config = typeof DEFAULT_CONFIG
