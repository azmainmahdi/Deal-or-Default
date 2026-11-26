// One phone + two server bots play a whole room game: checks card picks, bots, and that updates arrive in order.
// npx tsx scripts/room-bots-smoke.ts [wss://host]
// @ts-expect-error ws ships no types and this one script is not worth a dependency
import WebSocket from 'ws'
import assert from 'node:assert'
import { botIntent } from '../src/rules/sim'
const base = process.argv[2] ?? 'wss://deal-or-default.azmain-one.workers.dev'
const ws = new WebSocket(`${base}/parties/room/BOT${Math.floor(Math.random() * 1e4)}`)
let seat = -1, seq = 0, lobby: any = null, last: any = null
const done = new Promise<void>((res, rej) => {
  const t = setTimeout(() => rej(new Error('timed out; last seq ' + seq)), 120_000)
  ws.on('message', (d: unknown) => {
    const m = JSON.parse(String(d))
    if (m.t === 'welcome') { seat = m.seat; ws.send(JSON.stringify({ t: 'pick', country: 'japan' })); ws.send(JSON.stringify({ t: 'bot', add: true })); ws.send(JSON.stringify({ t: 'bot', add: true })) }
    if (m.t === 'lobby') { lobby = m; if (!m.started && m.players.length === 3) ws.send(JSON.stringify({ t: 'start' })) }
    if (m.t === 'reject') return rej(new Error(m.reason))
    if (m.t !== 'update') return
    assert.equal(m.seq, seq + 1, 'updates arrive in order'); seq = m.seq; last = m.state
    if (last.phase === 'finished') { clearTimeout(t); return res() }
    if (last.decision?.player === seat) ws.send(JSON.stringify({ t: 'intent', intent: botIntent(last) }))
  })
})
ws.on('open', () => ws.send(JSON.stringify({ t: 'join', name: 'Tester<b>' })))
await done
assert.equal(last.players[seat].country, 'japan', 'the picked card is kept')
assert.deepEqual(lobby.players.map((p: any) => !!p.bot), [false, true, true], 'two bots seated')
assert.equal(lobby.players[0].name, 'Testerb', 'markup stripped from names')
console.log(`ok: full game in ${seq} updates, ${last.result.rows.map((r: any) => `${last.players[r.player].name} ${r.netWorth}`).join(', ')}`)
ws.close()
