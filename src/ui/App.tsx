import { useEffect, useState } from 'react'
import { COUNTRIES } from '../rules/countries'
import { legalIntents, newGame, step } from '../rules/engine'
import type { GameEvent, GameState, Intent } from '../rules/types'
import { Board, PAWN_COLORS } from './Board'
import { describe } from './describe'
import { Dock } from './Dock'
import { Ledger } from './Ledger'

const SAVE = 'dod-local-game'
interface Saved { state: GameState; log: string[]; die: number | null }

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(SAVE)
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch { return null }
}
function save(g: Saved | null) {
  try { g ? localStorage.setItem(SAVE, JSON.stringify(g)) : localStorage.removeItem(SAVE) } catch { /* private mode: play on without saving */ }
}

export function App() {
  const [game, setGame] = useState<Saved | null>(load)
  useEffect(() => save(game), [game])

  function apply(state: GameState, events: GameEvent[], prev: Saved | null) {
    const lines = events.map((e) => describe(e, state)).filter((x): x is string => !!x)
    const rolled = [...events].reverse().find((e) => e.type === 'diceRolled')
    setGame({ state, log: [...(prev?.log ?? []), ...lines].slice(-200), die: rolled?.type === 'diceRolled' ? rolled.value : prev?.die ?? null })
  }

  function send(i: Intent) {
    if (!game) return
    const r = step(game.state, i)
    if (!r.error) apply(r.state, r.events, game)
  }

  // Keyboard: Space rolls or applies a card, 0–4 invest, Y/N answer yes/no prompts.
  useEffect(() => {
    if (!game || game.state.phase !== 'playing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      const legal = legalIntents(game.state)
      const k = e.key.toLowerCase()
      const hit = legal.find((i) =>
        (k === ' ' && (i.type === 'roll' || i.type === 'ack')) ||
        (i.type === 'invest' && k === String(i.chips)) ||
        (k === 'y' && ((i.type === 'hedge' && i.hedge) || (i.type === 'waiver' && i.use) || (i.type === 'takeover' && i.victim !== null))) ||
        (k === 'n' && ((i.type === 'hedge' && !i.hedge) || (i.type === 'waiver' && !i.use) || (i.type === 'takeover' && i.victim === null))))
      if (hit) {
        e.preventDefault()
        send(hit)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  if (!game) return <Setup onStart={(names) => { const r = newGame({ names, seed: (Math.random() * 2 ** 32) >>> 0 }); apply(r.state, r.events, null) }} />
  const { state: s, log, die } = game

  return (
    <div className="game">
      <header className="topbar">
        <h1>Deal or Default</h1>
        <span className="turn">Turn {s.turn}</span>
        <button className="quiet" onClick={() => confirm('Abandon this game?') && setGame(null)}>New game</button>
      </header>
      <main className="layout">
        <div className="boardwrap">{s.phase === 'finished' ? <Final s={s} onNew={() => setGame(null)} /> : <Board s={s} />}</div>
        <aside className="side">
          {s.phase === 'playing' && (
            <>
              <div className="die" aria-label={die ? `Last roll ${die}` : 'No roll yet'}>{die ?? '–'}</div>
              <Dock s={s} onIntent={send} />
            </>
          )}
          <section className="log" aria-label="Game log">
            <ol aria-live="polite">{log.slice(-40).map((l, i) => <li key={log.length - 40 + i}>{l}</li>)}</ol>
          </section>
        </aside>
        <Ledger s={s} />
      </main>
    </div>
  )
}

function Setup({ onStart }: { onStart: (names: string[]) => void }) {
  const [names, setNames] = useState(['', ''])
  const clean = names.map((n, i) => n.trim() || `Player ${i + 1}`)
  return (
    <main className="setup">
      <img src="./logo.png" alt="Deal or Default" width={260} />
      <h1>Same-screen game</h1>
      <p>2 to 6 players on this device. Countries are dealt at random.</p>
      <form onSubmit={(e) => { e.preventDefault(); onStart(clean) }}>
        {names.map((n, i) => (
          <div className="namerow" key={i}>
            <span className="dot" style={{ background: PAWN_COLORS[i] }} aria-hidden="true" />
            <input aria-label={`Player ${i + 1} name`} placeholder={`Player ${i + 1}`} value={n} maxLength={16}
              onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
            {names.length > 2 && <button type="button" className="quiet" aria-label={`Remove player ${i + 1}`} onClick={() => setNames(names.filter((_, j) => j !== i))}>Remove</button>}
          </div>
        ))}
        {names.length < 6 && <button type="button" className="quiet" onClick={() => setNames([...names, ''])}>Add player</button>}
        <button className="primary" type="submit">Start game</button>
      </form>
    </main>
  )
}

function Final({ s, onNew }: { s: GameState; onNew: () => void }) {
  const r = s.result!
  return (
    <section className="final" aria-label="Final ledger">
      <h2>{r.winners.map((w) => s.players[w]!.name).join(' and ')} win{r.winners.length === 1 ? 's' : ''}</h2>
      <table>
        <thead><tr><th>#</th><th>Player</th><th>Capital</th><th>incl. bonus</th><th>incl. matured profit</th><th>− Debt × {s.config.debtWeight}</th><th>Unfinished deals</th><th>Net Worth</th></tr></thead>
        <tbody>
          {r.rows.map((x) => (
            <tr key={x.player}>
              <td>{x.rank}</td>
              <td>{s.players[x.player]!.name} <small>{COUNTRIES[s.players[x.player]!.country].name}</small></td>
              <td>{x.capital}</td>
              <td>{x.bonus ? `+${x.bonus}` : ''}</td>
              <td>{x.matured}</td>
              <td>{x.debtCost ? `−${x.debtCost}` : 0}</td>
              <td><s>{x.pendingLost}</s></td>
              <td><b>{x.netWorth}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="primary" onClick={onNew}>New game</button>
    </section>
  )
}
