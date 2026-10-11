// A phone's connection to its room. Reconnects on its own and reclaims the seat with a token
// kept per room and name in localStorage (so two players on one browser keep separate seats).
import PartySocket from 'partysocket'
import type { ClientMsg, ServerMsg } from './protocol'

const tokenKey = (room: string, name: string) => `dod-room-${room}-${name.toLowerCase()}`

export interface Net {
  room: string
  send(m: ClientMsg): void
  close(): void
}

export function connect(room: string, name: string, onMsg: (m: ServerMsg) => void, onStatus: (open: boolean) => void): Net {
  const sock = new PartySocket({ host: location.host, party: 'room', room })
  let token: string | undefined
  try { token = localStorage.getItem(tokenKey(room, name)) ?? undefined } catch { /* no storage */ }
  const send = (m: ClientMsg) => sock.send(JSON.stringify(m))
  sock.addEventListener('open', () => { onStatus(true); send({ t: 'join', name, token }) })
  sock.addEventListener('close', () => onStatus(false))
  sock.addEventListener('message', (e) => {
    const m = JSON.parse(String(e.data)) as ServerMsg
    if (m.t === 'welcome') { token = m.token; try { localStorage.setItem(tokenKey(room, name), m.token) } catch { /* no storage */ } }
    onMsg(m)
  })
  return { room, send, close: () => sock.close() }
}
