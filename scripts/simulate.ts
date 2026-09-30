// npm run sim -- --games 10000 [--players 2-6] [--policy random|greedy|cautious|mix] [--check] [--bonus 20,30] [--hedgeLoss largest,all]
// Prints one summary block per config combination. M2 extends the stats.
import { COUNTRIES } from '../src/rules/countries'
import { playGame, type Policy } from '../src/rules/sim'
import type { Config } from '../src/rules/config'

const args = process.argv.slice(2)
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`)
  return i >= 0 && args[i + 1] && !args[i + 1]!.startsWith('--') ? args[i + 1]! : d
}
const games = Number(arg('games', '1000'))
const [pMin, pMax = pMin] = arg('players', '2-6').split('-').map(Number) as [number, number?]
const policyArg = arg('policy', 'mix')
const policy: Policy | Policy[] = policyArg === 'mix' ? ['greedy', 'cautious', 'random'] : (policyArg as Policy)
const check = args.includes('--check')
const bonuses = arg('bonus', '20').split(',').map(Number)
const hedgeLosses = arg('hedgeLoss', 'largest').split(',') as Config['hedgeLoss'][]

let failed = false
for (const finishBonus of bonuses) for (const hedgeLoss of hedgeLosses) {
  const t0 = performance.now()
  let turns = 0, errors = 0
  const wins: Record<string, number> = {}, seats: Record<string, number> = {}, dealt: Record<string, number> = {}
  let finisherWon = 0
  for (let g = 0; g < games; g++) {
    const players = pMin + (g % (pMax - pMin + 1))
    const r = playGame({ seed: g, players, policy, check, config: { finishBonus, hedgeLoss } })
    if (r.error) {
      errors++
      if (errors <= 5) console.error(`seed ${g} (${players}p): ${r.error} — replay with seed + ${r.intents.length} intents`)
      continue
    }
    turns += r.turns
    const res = r.state.result!
    for (const p of r.state.players) dealt[p.country] = (dealt[p.country] ?? 0) + 1
    for (const w of res.winners) {
      const c = r.state.players[w]!.country
      wins[c] = (wins[c] ?? 0) + 1 / res.winners.length
      seats[w] = (seats[w] ?? 0) + 1 / res.winners.length
    }
    if (res.winners.includes(res.rows.find((x) => x.bonus > 0)!.player)) finisherWon++
  }
  const ok = games - errors
  const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`
  console.log(`\n== bonus ${finishBonus}, hedgeLoss ${hedgeLoss}, ${games} games, ${pMin}–${pMax}p, policy ${policyArg} (${((performance.now() - t0) / 1000).toFixed(1)}s)`)
  console.log(`errors ${errors}; avg length ${(turns / ok).toFixed(1)} turns; finisher wins ${pct(finisherWon, ok)}`)
  console.log('win rate when dealt: ' + Object.keys(COUNTRIES).map((c) => `${c} ${pct(wins[c] ?? 0, dealt[c] ?? 1)}`).join(' · '))
  console.log('wins by seat: ' + Object.entries(seats).map(([s, n]) => `${s}: ${pct(n, ok)}`).join(' · '))
  if (errors) failed = true
}
process.exit(failed ? 1 : 0)
