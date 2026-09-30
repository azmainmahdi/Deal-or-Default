import { gsap } from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { COUNTRIES } from '../rules/countries'
import { legalIntents, newGame, step } from '../rules/engine'
import { botIntent } from '../rules/sim'
import type { CardId, GameEvent, GameState, Intent } from '../rules/types'
import { flyCard, play } from './anim/director'
import { Board, PAWN_COLORS, type BoardHandle } from './Board'
import { CardTable, CountryCard, Reveal } from './Cards'
import { describe } from './describe'
import { Die, type DieHandle } from './Die'
import { Dock } from './Dock'
import { Ledger, type Shown } from './Ledger'
import { Num } from './Num'
import { setMuted } from './sound'

const SAVE = 'dod-local-game'
const PREFS = 'dod-prefs'
const DEMO_NAMES = ['Ada', 'Bashir', 'Chen', 'Dara']
const TABLES = [['a', 'Wood'], ['b', 'Felt'], ['c', 'Marble'], ['d', 'World']] as const
type Table = (typeof TABLES)[number][0]

interface View {
  players: Shown[]
  die: Extract<GameEvent, { type: 'diceRolled' }> | null
  card: CardId | null
  discardTop?: CardId
  deck: number
  active: number
  log: string[]
}

function viewOf(s: GameState, prev?: View): View {
  const d = s.decision
  return {
    players: s.players.map(({ square, capital, debt, waivers }) => ({ square, capital, debt, waivers })),
    die: prev?.die ?? null,
    card: d?.kind === 'ackCard' || d?.kind === 'cardChoice' ? d.card : null,
    discardTop: s.discard[s.discard.length - 1],
    deck: s.deck.length,
    active: d?.player ?? s.current,
    log: prev?.log ?? [],
  }
}

function read<T>(key: string): T | null {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null } catch { return null }
}
function write(key: string, v: unknown) {
  try { v === null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(v)) } catch { /* no storage: play on unsaved */ }
}

export function App() {
  const [saved] = useState(() => read<{ state: GameState; log: string[] }>(SAVE))
  const [state, setState] = useState<GameState | null>(saved?.state ?? null)
  const [view, setView] = useState<View | null>(() => (saved ? { ...viewOf(saved.state), log: saved.log } : null))
  const [busy, setBusy] = useState(false)
  const [prefs, setPrefs] = useState(() => ({ table: 'a' as Table, speed: 1, sound: true, ...read<{ table: Table; speed: number; sound: boolean }>(PREFS) }))
  const [demo, setDemo] = useState(false)
  const [portraitOk, setPortraitOk] = useState(false)
  const [dealt, setDealt] = useState(!!saved)
  const [arming, setArming] = useState(false) // confirm() is blocked in some hosts, so confirm in-page
  const board = useRef<BoardHandle>(null)
  const die = useRef<DieHandle>(null)
  const skipping = useRef(false)

  useEffect(() => { write(PREFS, prefs); setMuted(!prefs.sound) }, [prefs])
  useEffect(() => { if (state && view) write(SAVE, { state, log: view.log.slice(-200) }) }, [state, view])
  useEffect(() => { gsap.globalTimeline.timeScale(matchMedia('(prefers-reduced-motion: reduce)').matches ? 8 : prefs.speed) }, [prefs.speed])

  async function run(prev: GameState | null, next: GameState, events: GameEvent[]) {
    setState(next)
    if (!prev || !board.current || !die.current) {
      setView((v) => ({ ...viewOf(next, v ?? undefined), log: [...(v?.log ?? []), ...events.map((e) => describe(e, next)).filter((x): x is string => !!x)] }))
      return
    }
    setBusy(true)
    // A card that was waiting in the slot goes to the discard pile before its effects play.
    const pd = prev.decision
    if ((pd?.kind === 'ackCard' || pd?.kind === 'cardChoice') && next.discard.length > prev.discard.length) {
      setView((v) => v && { ...v, card: null })
      await flyCard(pd.card, '[data-reveal-spot]', '[data-discard]', 'text', false)
      setView((v) => v && { ...v, discardTop: pd.card })
    }
    const squares = prev.players.map((pl) => pl.square)
    // Safety net: a stalled animation must never lock the game; after 20s the screen snaps to the real state.
    await Promise.race([
      play(events, { board: board.current, die: die.current, squares, names: next.players.map((p) => p.name), colors: PAWN_COLORS }, (e) => setView((v) => v && applyEvent(v, e, next))),
      new Promise((r) => setTimeout(r, 20_000)),
    ])
    skipping.current = false
    gsap.globalTimeline.timeScale(prefs.speed)
    setView((v) => viewOf(next, v ?? undefined))
    board.current.layout(next.players.map((pl) => pl.square), 0.2)
    setBusy(false)
  }

  function send(i: Intent) {
    if (!state || busy) return
    const r = step(state, i)
    if (!r.error) void run(state, r.state, r.events)
  }

  useEffect(() => {
    if (!demo || dealt) return
    const t = setTimeout(() => setDealt(true), 3500)
    return () => clearTimeout(t)
  }, [demo, dealt])

  // Demo: the smart bot takes every decision, with a beat between moves so it reads like play.
  useEffect(() => {
    if (!demo || busy || !dealt || !state || state.phase !== 'playing') return
    const t = setTimeout(() => { const i = botIntent(state); if (i) send(i) }, 700 / prefs.speed)
    return () => clearTimeout(t)
  })

  function quit() { write(SAVE, null); setDemo(false); setState(null); setView(null) }

  function start(names: string[]) {
    const r = newGame({ names, seed: (Math.random() * 2 ** 32) >>> 0 })
    setDealt(false)
    setView({ ...viewOf(r.state), log: [] })
    void run(null, r.state, r.events)
  }

  function skip() {
    skipping.current = true
    gsap.globalTimeline.timeScale(40)
  }

  // Keyboard: Space rolls or applies a card, 0–4 invest, Y/N answer yes/no prompts.
  useEffect(() => {
    if (!state || state.phase !== 'playing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      if (busy) { if (e.key === ' ' || e.key === 'Escape') { e.preventDefault(); skip() } return }
      const k = e.key.toLowerCase()
      const hit = legalIntents(state).find((i) =>
        (k === ' ' && (i.type === 'roll' || i.type === 'ack')) ||
        (i.type === 'invest' && k === String(i.chips)) ||
        (k === 'y' && ((i.type === 'hedge' && i.hedge) || (i.type === 'waiver' && i.use) || (i.type === 'takeover' && i.victim !== null))) ||
        (k === 'n' && ((i.type === 'hedge' && !i.hedge) || (i.type === 'waiver' && !i.use) || (i.type === 'takeover' && i.victim === null))))
      if (hit) { e.preventDefault(); send(hit) }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  const tableClass = `table t-${prefs.table}`

  if (!state || !view) return <div className={tableClass}><Setup onStart={start} onDemo={() => { setDemo(true); start(DEMO_NAMES) }} /></div>

  const s = state
  const dieNote = view.die && (view.die.crunched || view.die.bonus)
    ? `${view.die.raw}${view.die.crunched ? ' → ½' : ''}${view.die.bonus ? ` +${view.die.bonus}` : ''} = ${view.die.value}` : undefined

  return (
    <div className={tableClass}>
      <header className="topbar">
        <img src="./logo.png" alt="Deal or Default" className="toplogo" />
        <span className="turn">Turn {s.turn}</span>
        {demo && <span className="demo-chip">Demo <button className="quiet" onClick={() => setDemo(false)}>Take over</button></span>}
        <details className="settings">
          <summary aria-label="Settings">Table &amp; sound</summary>
          <div className="menu">
            <p>Table</p>
            <div className="seg" role="group" aria-label="Table">
              {TABLES.map(([k, name]) => <button key={k} aria-pressed={prefs.table === k} onClick={() => setPrefs({ ...prefs, table: k })}>{name}</button>)}
            </div>
            <p>Animation speed</p>
            <div className="seg" role="group" aria-label="Animation speed">
              {[1, 2].map((x) => <button key={x} aria-pressed={prefs.speed === x} onClick={() => setPrefs({ ...prefs, speed: x })}>{x}×</button>)}
            </div>
            <p>Sound</p>
            <div className="seg" role="group" aria-label="Sound">
              <button aria-pressed={prefs.sound} onClick={() => setPrefs({ ...prefs, sound: true })}>On</button>
              <button aria-pressed={!prefs.sound} onClick={() => setPrefs({ ...prefs, sound: false })}>Off</button>
            </div>
            {document.fullscreenEnabled && <button onClick={fullscreen}>Full screen</button>}
            <button onClick={() => { if (demo || arming) quit(); else setArming(true) }} onBlur={() => setArming(false)}>
              {demo ? 'Stop demo' : arming ? 'Tap again to abandon this game' : 'New game'}
            </button>
          </div>
        </details>
      </header>

      <main className="stage">
        <div className="boardzone">
          <Reveal id={view.card} />
          <div className="tilt">
            <Board ref={board} squaresOf={view.players.map((p) => p.square)} active={view.active} names={s.players.map((p) => p.name)} />
          </div>
        </div>

        <aside className="side">
          <CardTable deck={view.deck} discardTop={view.discardTop} />
          <div className="midrow">
            <Die ref={die} note={dieNote} />
            <div className="dockwrap">
              {busy ? (
                <div className="playing"><span>Playing…</span><button className="quiet" onClick={skip}>Skip</button></div>
              ) : s.phase === 'playing' ? <Dock s={s} onIntent={send} /> : null}
            </div>
          </div>
          <Ledger s={s} shown={view.players} active={view.active} />
          <details className="log">
            <summary>Game log</summary>
            <ol aria-live="polite">{view.log.slice(-60).map((l, i) => <li key={view.log.length - 60 + i}>{l}</li>)}</ol>
          </details>
        </aside>
      </main>

      {s.phase === 'finished' && !busy && <Final s={s} onNew={quit} />}
      {!dealt && s.phase === 'playing' && (
        <div className="overlay deal">
          <p className="eyebrow">Countries dealt</p>
          <div className="deal-row">
            {s.players.map((pl, p) => (
              <div key={p} className="deal-card" style={{ animationDelay: `${0.15 + p * 0.18}s` }}>
                <CountryCard c={pl.country} />
                <b>{pl.name}</b>
                <small>{COUNTRIES[pl.country].perk}</small>
              </div>
            ))}
          </div>
          <button className="primary" onClick={() => setDealt(true)}>{demo ? 'Starting…' : 'Start the game'}</button>
        </div>
      )}
      {!portraitOk && (
        <div className="rotate">
          <div className="phone" aria-hidden="true" />
          <h2>Turn your phone sideways</h2>
          <p>The table is built for landscape.</p>
          {document.fullscreenEnabled && <button className="primary" onClick={fullscreen}>Full screen, landscape</button>}
          <button className="quiet" onClick={() => setPortraitOk(true)}>Play upright anyway</button>
        </div>
      )}
    </div>
  )
}

/** Android can lock landscape once fullscreen; iOS ignores the lock and just rotates with the phone. */
function fullscreen() {
  document.documentElement.requestFullscreen?.()
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
    .catch(() => {})
}

function applyEvent(v: View, e: GameEvent, s: GameState): View {
  const players = v.players.map((p) => ({ ...p }))
  const line = describe(e, s)
  const log = line ? [...v.log, line] : v.log
  const pl = 'player' in e ? players[e.player] : undefined
  switch (e.type) {
    case 'moved': if (pl) pl.square = e.path[e.path.length - 1]!; break
    case 'capital': if (pl) pl.capital += e.delta; break
    case 'debt': if (pl) pl.debt += e.delta; break
    case 'waiver': if (pl) pl.waivers += e.delta; break
    case 'waiverUsed': break
    case 'diceRolled': return { ...v, players, log, die: e }
    case 'cardDrawn': return { ...v, players, log, card: e.card, deck: Math.max(0, v.deck - 1) }
    case 'turnStarted': return { ...v, players, log, active: e.player }
  }
  return { ...v, players, log }
}

function Setup({ onStart, onDemo }: { onStart: (names: string[]) => void; onDemo: () => void }) {
  const [names, setNames] = useState(['', ''])
  const clean = names.map((n, i) => n.trim() || `Player ${i + 1}`)
  return (
    <main className="setup">
      <img src="./logo.png" alt="Deal or Default" width={280} />
      <h1>Same-screen game</h1>
      <p>2 to 6 players on this device. Countries are dealt at random.</p>
      <form onSubmit={(e) => { e.preventDefault(); onStart(clean) }}>
        {names.map((n, i) => (
          <div className="namerow" key={i}>
            <span className="dot seat" style={{ background: PAWN_COLORS[i] }} aria-hidden="true">{i + 1}</span>
            <input aria-label={`Player ${i + 1} name`} placeholder={`Player ${i + 1}`} value={n} maxLength={16}
              onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
            {names.length > 2 && <button type="button" className="quiet" aria-label={`Remove player ${i + 1}`} onClick={() => setNames(names.filter((_, j) => j !== i))}>Remove</button>}
          </div>
        ))}
        {names.length < 6 && <button type="button" className="quiet" onClick={() => setNames([...names, ''])}>Add player</button>}
        <button className="primary" type="submit">Deal the countries</button>
      </form>
      <button className="demo-btn" onClick={onDemo}>Watch a demo game</button>
      <p className="hint">Four bots play a full game while you watch. Take over any time.</p>
    </main>
  )
}

function Final({ s, onNew }: { s: GameState; onNew: () => void }) {
  const r = s.result!
  const [go, setGo] = useState(false)
  useEffect(() => { const t = setTimeout(() => setGo(true), 300); return () => clearTimeout(t) }, [])
  return (
    <div className="overlay">
      <section className="final" aria-label="Final ledger">
        <p className="eyebrow">Final ledger</p>
        <h2>{r.winners.map((w) => s.players[w]!.name).join(' and ')} win{r.winners.length === 1 ? 's' : ''}</h2>
        <table>
          <thead><tr><th>#</th><th>Player</th><th>Capital</th><th>incl. bonus</th><th>incl. matured</th><th>− Debt × {s.config.debtWeight}</th><th>Unfinished deals</th><th>Net Worth</th></tr></thead>
          <tbody>
            {r.rows.map((x, i) => (
              <tr key={x.player} style={{ animationDelay: `${0.4 + i * 0.35}s` }} className={r.winners.includes(x.player) ? 'win' : ''}>
                <td>{r.winners.includes(x.player) ? <span className="crown" aria-label="winner">♛</span> : x.rank}</td>
                <td><span className="dot seat" style={{ background: PAWN_COLORS[x.player] }}>{x.player + 1}</span> {s.players[x.player]!.name} <small>{COUNTRIES[s.players[x.player]!.country].name}</small></td>
                <td><Num value={go ? x.capital : 0} /></td>
                <td>{x.bonus ? `+${x.bonus}` : ''}</td>
                <td>{x.matured}</td>
                <td>{x.debtCost ? `−${x.debtCost}` : 0}</td>
                <td><s>{x.pendingLost}</s></td>
                <td><b><Num value={go ? x.netWorth : 0} /></b></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="primary" onClick={onNew}>New game</button>
      </section>
    </div>
  )
}
