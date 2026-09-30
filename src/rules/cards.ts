// Event cards: data plus one apply function each. apply returns follow-up effects (moves that chain).
import {
  addCapital, addDebt, addStatus, addWaivers, changeProfit, matureProject, othersInOrder, tickProjects, topBy, type Ctx,
} from './ops'
import type { CardId, Effect, Seat } from './types'

export interface CardDef {
  name: string
  kind: 'beneficial' | 'adverse'
  text: string
  /** When more than one option is returned, the player chooses; otherwise options[0] is applied. */
  options?: (c: Ctx, p: Seat) => string[]
  apply: (c: Ctx, p: Seat, choice?: string) => Effect[]
}

const none: Effect[] = []

export const CARDS: Record<CardId, CardDef> = {
  // Beneficial
  commodityBoom: {
    name: 'Commodity Boom', kind: 'beneficial', text: 'Each of your pending projects gains profit.',
    apply(c, p) {
      const boom = c.s.config.commodityBoom
      for (const x of c.s.players[p]!.projects) changeProfit(c, p, x.id, boom === 'delta' ? x.delta : boom, 'Commodity Boom')
      return none
    },
  },
  lendLease: {
    name: 'Lend-Lease Shipment', kind: 'beneficial', text: '+3 Capital.',
    apply: (c, p) => (addCapital(c, p, 3, 'Lend-Lease Shipment'), none),
  },
  debtRestructure: {
    name: 'Debt Restructure', kind: 'beneficial', text: 'Remove 1 Debt for free.',
    apply: (c, p) => (addDebt(c, p, -1, 'Debt Restructure'), none),
  },
  fastTrack: {
    name: 'Fast-Track Permit', kind: 'beneficial', text: 'Your project closest to maturity pays out now.',
    apply(c, p) {
      const projects = c.s.players[p]!.projects
      if (projects.length) {
        const soonest = projects.reduce((a, x) => (x.ttm < a.ttm ? x : a))
        matureProject(c, p, soonest.id)
      }
      return none
    },
  },
  tariffTruce: {
    name: 'Tariff Truce', kind: 'beneficial', text: 'Every player gains 1 Tariff Waiver.',
    apply(c) {
      c.s.players.forEach((_, q) => addWaivers(c, q, 1, 'Tariff Truce'))
      return none
    },
  },
  exportSubsidy: {
    name: 'Export Subsidy', kind: 'beneficial', text: 'Move forward 3, ignoring tile effects.',
    apply: (_c, p) => [{ t: 'push', p, by: 3, via: 'card', tiles: false }],
  },
  productivitySurge: {
    name: 'Productivity Surge', kind: 'beneficial', text: 'All your projects are 1 turn closer to maturity.',
    apply: (c, p) => (tickProjects(c, p, -1), none),
  },
  surplusBudget: {
    name: 'Surplus Budget', kind: 'beneficial', text: 'No projects: +2 Capital. Otherwise all your projects are 1 turn closer.',
    apply(c, p) {
      if (c.s.players[p]!.projects.length) tickProjects(c, p, -1)
      else addCapital(c, p, 2, 'Surplus Budget')
      return none
    },
  },
  strategicReserve: {
    name: 'Strategic Reserve Sale', kind: 'beneficial', text: 'Choose +2 Capital or remove 1 Debt for free.',
    options: (c, p) => (c.s.players[p]!.debt > 0 ? ['capital', 'repay'] : ['capital']),
    apply(c, p, choice) {
      if (choice === 'repay') addDebt(c, p, -1, 'Strategic Reserve Sale')
      else addCapital(c, p, 2, 'Strategic Reserve Sale')
      return none
    },
  },
  alliedAid: {
    name: 'Allied Aid Convoy', kind: 'beneficial', text: 'Every player behind you moves forward 2. You gain 1 Capital.',
    apply(c, p) {
      addCapital(c, p, 1, 'Allied Aid Convoy')
      const mine = c.s.players[p]!.square
      return othersInOrder(c.s, p)
        .filter((q) => c.s.players[q]!.square < mine)
        .map((q): Effect => ({ t: 'push', p: q, by: 2, via: 'card', tiles: true }))
    },
  },
  warBond: {
    name: 'War-Bond Rally', kind: 'beneficial', text: '+2 Capital.',
    apply: (c, p) => (addCapital(c, p, 2, 'War-Bond Rally'), none),
  },
  tradeCorridor: {
    name: 'Trade Corridor Opened', kind: 'beneficial', text: '+1 to your rolls for your next 3 turns.',
    apply: (c, p) => (addStatus(c, p, 'tradeCorridor', 3), none),
  },

  // Adverse
  devaluation: {
    name: 'Currency Devaluation', kind: 'adverse', text: '-3 Capital.',
    apply: (c, p) => (addCapital(c, p, -3, 'Currency Devaluation'), none),
  },
  bankingPanic: {
    name: 'Banking Panic', kind: 'adverse', text: 'Pay 2 Capital, or take 1 Debt with no Capital gained.',
    options: (c, p) => (c.s.players[p]!.debt < c.s.config.debtCap ? ['pay', 'debt'] : ['pay']),
    apply(c, p, choice) {
      if (choice === 'debt') addDebt(c, p, 1, 'Banking Panic')
      else addCapital(c, p, -2, 'Banking Panic')
      return none
    },
  },
  cyberAttack: {
    name: 'Cyber Attack', kind: 'adverse', text: 'Your most profitable project loses 5 profit.',
    apply(c, p) {
      const projects = c.s.players[p]!.projects
      if (projects.length) changeProfit(c, p, projects.reduce((a, x) => (x.profit > a.profit ? x : a)).id, -5, 'Cyber Attack')
      return none
    },
  },
  embargo: {
    name: 'Trade Embargo', kind: 'adverse', text: 'Skip your next turn.',
    apply: (c, p) => (addStatus(c, p, 'embargo', 1), none),
  },
  strike: {
    name: 'Industrial Strike', kind: 'adverse', text: 'All your projects take 1 turn longer.',
    apply: (c, p) => (tickProjects(c, p, 1), none),
  },
  sovereignDefault: {
    name: 'Sovereign Default', kind: 'adverse', text: 'The Net Worth leader(s) move back 4.',
    apply: (c) => [{ t: 'setback', by: c.s.config.defaultSetback, threat: false }],
  },
  portBlockade: {
    name: 'Port Blockade', kind: 'adverse', text: 'Lose 1 Tariff Waiver. If you have none, -1 Capital.',
    apply(c, p) {
      if (c.s.players[p]!.waivers > 0) addWaivers(c, p, -1, 'Port Blockade')
      else addCapital(c, p, -1, 'Port Blockade')
      return none
    },
  },
  insuranceFraud: {
    name: 'Insurance Fraud', kind: 'adverse', text: 'Your next hedge costs 2 more.',
    apply(c, p) {
      c.s.players[p]!.fraud = true
      return none
    },
  },
  corruptionProbe: {
    name: 'Corruption Probe', kind: 'adverse', text: 'The player(s) with the most Capital pay 2.',
    apply(c) {
      for (const q of topBy(c.s, (q) => c.s.players[q]!.capital)) addCapital(c, q, -2, 'Corruption Probe')
      return none
    },
  },
  debtSpiral: {
    name: 'Debt Spiral', kind: 'adverse', text: '+1 Debt with no Capital. You cannot repay on your next turn.',
    apply(c, p) {
      addDebt(c, p, 1, 'Debt Spiral')
      addStatus(c, p, 'noRepay', 1)
      return none
    },
  },
  sanctionThreat: {
    name: 'Sanction Threat', kind: 'adverse', text: 'Until your next turn, Sanctions target you.',
    apply: (c, p) => (addStatus(c, p, 'sanctionThreat', 1), none),
  },
  rateHike: {
    name: 'Interest Rate Hike', kind: 'adverse', text: 'Every player loses 1 Capital at the start of each of their next 3 turns.',
    apply(c) {
      c.s.players.forEach((_, q) => addStatus(c, q, 'rateHike', 3))
      return none
    },
  },
  commodityCrash: {
    name: 'Commodity Crash', kind: 'adverse', text: "Every player's pending projects lose 3 profit.",
    apply(c) {
      c.s.players.forEach((pl, q) => pl.projects.forEach((x) => changeProfit(c, q, x.id, -3, 'Commodity Crash')))
      return none
    },
  },
  capitalControls: {
    name: 'Capital Controls', kind: 'adverse', text: 'You lose 1 Capital at the start of each of your next 3 turns.',
    apply: (c, p) => (addStatus(c, p, 'capitalControls', 3), none),
  },
}

/** The italic quote on each card's text side. `true` = read off the printed card (some lines
 *  were partly hidden in the photos and completed); `false` = placeholder until Azmain sends his. */
export const FLAVOUR: Record<CardId, [string, boolean]> = {
  lendLease: ['Allies fill your coffers.', true],
  alliedAid: ['Relief ships arrive.', true],
  tradeCorridor: ['New route slashes costs.', true],
  tariffTruce: ['Borders briefly open.', true],
  surplusBudget: ['Unexpected fiscal surplus.', true],
  strike: ['Pickets halt production.', true],
  corruptionProbe: ['Officials under arrest.', true],
  commodityCrash: ['Prices collapse globally.', true],
  debtSpiral: ['Interest snowballs.', true],
  insuranceFraud: ['The claims were fake.', true],
  bankingPanic: ['Queues at every branch.', true],
  commodityBoom: ['Every barrel sells twice.', false],
  debtRestructure: ['Creditors blink first.', false],
  fastTrack: ['Stamped before lunch.', false],
  exportSubsidy: ['The state pays the freight.', false],
  productivitySurge: ['The line never stops.', false],
  strategicReserve: ['Open the vaults.', false],
  warBond: ['Buy bonds, win the war.', false],
  devaluation: ['The currency slides overnight.', false],
  cyberAttack: ['The ledgers go dark.', false],
  embargo: ['Ports close to you.', false],
  sovereignDefault: ['A nation stops paying.', false],
  portBlockade: ['Ships wait at anchor.', false],
  sanctionThreat: ['All eyes turn to you.', false],
  rateHike: ['The central bank tightens.', false],
  capitalControls: ['Money stays at home.', false],
}
