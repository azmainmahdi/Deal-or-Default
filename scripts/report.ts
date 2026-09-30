// npm run report -- [--games 10000] [--out report.json]
// Runs each rule variant over the same seeds and writes balance stats as JSON (M2 report).
import { writeFileSync } from 'node:fs'
import type { Config } from '../src/rules/config'
import { COUNTRY_IDS } from '../src/rules/countries'
import { playGame, type Policy } from '../src/rules/sim'

const args = process.argv.slice(2)
const arg = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d)
const games = Number(arg('games', '10000'))
const out = arg('out', 'report.json')

const MIX: Policy[] = ['smart', 'noDebt', 'greedy', 'cautious']

const variants: { id: string; label: string; config: Partial<Config>; mix?: boolean }[] = [
  { id: 'b20-largest', label: 'Bonus 20, lose largest project', config: { finishBonus: 20, hedgeLoss: 'largest' } },
  { id: 'b30-largest', label: 'Bonus 30, lose largest project', config: { finishBonus: 30, hedgeLoss: 'largest' } },
  { id: 'b20-all', label: 'Bonus 20, lose all projects', config: { finishBonus: 20, hedgeLoss: 'all' } },
  { id: 'b30-all', label: 'Bonus 30, lose all projects', config: { finishBonus: 30, hedgeLoss: 'all' } },
  { id: 'b0-largest', label: 'No bonus (reference)', config: { finishBonus: 0, hedgeLoss: 'largest' } },
  { id: 'china1', label: 'China tariff setback 1 (tuning test)', config: { finishBonus: 20, chinaTariffSetback: 1 } },
  { id: 'mix', label: 'Strategy mix, bonus 20', config: { finishBonus: 20 }, mix: true },
]

type Tally = Record<string, { wins: number; expected: number; n: number }>
const add = (t: Tally, k: string, won: number, expected: number) => {
  const x = (t[k] ??= { wins: 0, expected: 0, n: 0 })
  x.wins += won
  x.expected += expected
  x.n++
}
const ratio = (t: Tally) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, { ratio: v.wins / v.expected, n: v.n }]))

const results = variants.map((v) => {
  const t0 = performance.now()
  const country: Tally = {}, seat: Tally = {}, policy: Tally = {}, borrowed: Tally = {}, bySize: Tally = {}
  const rounds: number[] = []
  let errors = 0, finisherWon = 0, sanctions = 0, winnerSanctioned = 0, hedges = 0, unhedged = 0, lost = 0
  let longTurns = 0, allTurns = 0, maxChain = 0, winnerNW = 0, avgNW = 0, maturedShare = 0, uncontested = 0

  for (let g = 0; g < games; g++) {
    const n = 2 + (g % 5)
    // Rotate strategies across seats so seat and strategy effects don't mix.
    const policies = Array.from({ length: n }, (_, i): Policy => (v.mix ? MIX[(i + g) % MIX.length]! : 'smart'))
    const took = new Set<number>(), hit = new Set<number>()
    let moves = 0
    const r = playGame({
      seed: g, players: n, policy: policies, config: v.config,
      onEvents(events) {
        for (const e of events) {
          if (e.type === 'debt' && e.delta > 0 && e.reason === 'borrowed') took.add(e.player)
          if (e.type === 'sanctionHit') (sanctions++, hit.add(e.player))
          if (e.type === 'hedged') hedges++
          if (e.type === 'moved' && e.via === 'snake') unhedged++
          if (e.type === 'projectLost') lost++
          if (e.type === 'moved') moves++
          if (e.type === 'turnStarted') {
            allTurns++
            if (moves >= 20) longTurns++
            maxChain = Math.max(maxChain, moves)
            moves = 0
          }
        }
      },
    })
    if (r.error) { errors++; continue }
    const res = r.state.result!
    const share = 1 / res.winners.length
    const finisher = res.rows.find((x) => x.square === 100)?.player
    if (finisher !== undefined && res.winners.includes(finisher)) finisherWon += share
    if (res.winners.some((w) => hit.has(w))) winnerSanctioned++
    const top = res.rows[0]!, second = res.rows[1]!
    if (top.netWorth - second.netWorth > v.config.finishBonus!) uncontested++
    rounds.push(r.turns / n)
    winnerNW += top.netWorth
    avgNW += res.rows.reduce((a, x) => a + x.netWorth, 0) / n
    const cap = res.rows.reduce((a, x) => a + Math.max(0, x.capital), 0)
    maturedShare += cap ? res.rows.reduce((a, x) => a + x.matured, 0) / cap : 0
    r.state.players.forEach((pl, p) => {
      const won = res.winners.includes(p) ? share : 0
      add(country, pl.country, won, 1 / n)
      add(seat, String(p + 1), won, 1 / n)
      add(policy, policies[p]!, won, 1 / n)
      add(borrowed, took.has(p) ? 'borrowed' : 'never', won, 1 / n)
      add(bySize, `${n}p-${pl.country}`, won, 1 / n)
    })
  }
  const ok = games - errors
  rounds.sort((a, b) => a - b)
  const out = {
    id: v.id, label: v.label, config: v.config, games, errors,
    rounds: { mean: rounds.reduce((a, x) => a + x, 0) / ok, p10: rounds[Math.floor(ok * 0.1)], p50: rounds[Math.floor(ok * 0.5)], p90: rounds[Math.floor(ok * 0.9)] },
    finisherWinRate: finisherWon / ok,
    uncontestedRate: uncontested / ok,
    winnerNW: winnerNW / ok, avgNW: avgNW / ok,
    maturedShare: maturedShare / ok,
    perGame: { sanctions: sanctions / ok, hedges: hedges / ok, unhedgedSlides: (unhedged - hedges) / ok, projectsLost: lost / ok },
    winnerSanctionedRate: winnerSanctioned / ok,
    longChainPer1000Turns: (1000 * longTurns) / allTurns, maxChain,
    country: ratio(country), seat: ratio(seat), policy: v.mix ? ratio(policy) : undefined,
    borrowed: ratio(borrowed), countryBySize: ratio(bySize),
    seconds: (performance.now() - t0) / 1000,
  }
  console.error(`${v.id}: ${out.seconds.toFixed(0)}s, errors ${errors}`)
  return out
})

writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), games, countries: COUNTRY_IDS, results }, null, 1))
console.error(`wrote ${out}`)
