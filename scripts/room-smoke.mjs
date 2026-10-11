// Two fake phones join a room, start, and move: checks the deployed rooms keep them in sync.
// node scripts/room-smoke.mjs [wss://host]
import WebSocket from 'ws'
const base = process.argv[2] ?? "wss://deal-or-default.azmain-one.workers.dev"
const url = `${base}/parties/room/TEST${Math.floor(Math.random() * 1e4)}`
const open = (name) => new Promise((res) => { const ws = new WebSocket(url); const msgs = []; ws.on('message', (d) => msgs.push(JSON.parse(d))); ws.on('open', () => { ws.send(JSON.stringify({ t: 'join', name })); res({ ws, msgs }) }) })
const a = await open('A'); await new Promise((r) => setTimeout(r, 800))
const b = await open('B'); await new Promise((r) => setTimeout(r, 800))
a.ws.send(JSON.stringify({ t: 'start' })); await new Promise((r) => setTimeout(r, 1200))
const ua = a.msgs.filter((m) => m.t === 'update'), ub = b.msgs.filter((m) => m.t === 'update')
const d = ua.at(-1).state.decision
a.ws.send(JSON.stringify({ t: 'intent', intent: { player: 0, type: 'roll' } })); await new Promise((r) => setTimeout(r, 1200))
b.ws.send(JSON.stringify({ t: 'intent', intent: { player: 0, type: 'roll' } })); await new Promise((r) => setTimeout(r, 800))
console.log({ welcomeA: a.msgs.find((m) => m.t === 'welcome')?.seat, welcomeB: b.msgs.find((m) => m.t === 'welcome')?.seat, firstDecision: d, aUpdates: a.msgs.filter((m) => m.t === 'update').length, bUpdates: b.msgs.filter((m) => m.t === 'update').length, sameState: JSON.stringify(a.msgs.at(-1)?.state?.players) === JSON.stringify(b.msgs.filter((m) => m.t === 'update').at(-1)?.state?.players), bRejectedForSeat0: b.msgs.find((m) => m.t === 'reject')?.reason, deckHidden: ua.at(-1).state.deck.every((c) => c === 'lendLease'), rng: ua.at(-1).state.rng })
a.ws.close(); b.ws.close()
