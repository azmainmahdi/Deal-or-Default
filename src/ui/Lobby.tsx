import type { LobbyPlayer } from '../client/protocol'
import { PAWN_COLORS } from './Board'

export function Lobby({ room, players, you, host, onStart, onLeave, error }: {
  room: string; players: LobbyPlayer[]; you: number; host: number; onStart: () => void; onLeave: () => void; error?: string
}) {
  const link = `${location.origin}${location.pathname}#${room}`
  return (
    <main className="title-screen lobby">
      <div className="rays" aria-hidden="true" />
      <section className="title-panel">
        <h2>Room code</h2>
        <p className="room-code" aria-label={`Room code ${room.split('').join(' ')}`}>{room}</p>
        <button type="button" className="ghost" onClick={() => navigator.clipboard?.writeText(link).catch(() => {})}>Copy invite link</button>
        <p className="lobby-hint">Friends open the game and enter this code, or open the link.</p>
        <div className="names">
          {players.map((p) => (
            <div key={p.seat} className={`namerow lobby-row ${p.online ? '' : 'offline'}`}>
              <span className="token" style={{ '--pc': PAWN_COLORS[p.seat] } as React.CSSProperties}>{p.seat + 1}</span>
              <b>{p.name}</b>
              <small>{p.seat === host ? 'Host' : ''}{p.seat === you ? ' · You' : ''}{p.online ? '' : ' · offline'}</small>
            </div>
          ))}
          {players.length < 2 && <p className="lobby-hint">Waiting for at least one more player…</p>}
        </div>
        {error && <p className="error">{error}</p>}
        {you === host
          ? <button className="primary big" disabled={players.length < 2} onClick={onStart}>Start the game</button>
          : <p className="lobby-hint">Waiting for the host to start.</p>}
        <button type="button" className="quiet" onClick={onLeave}>Leave room</button>
      </section>
    </main>
  )
}
