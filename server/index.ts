// Online rooms: one Durable Object per room code. The rules engine runs here, so every phone
// sees the same game; clients only send intents and animate the events they get back.
// Bots (added by the host) also run here, so a room plays the same whoever is connected.
import { Server, routePartykitRequest, type Connection } from 'partyserver'
import { legalIntents, newGame, step } from '../src/rules/engine'
import { botIntent } from '../src/rules/sim'
import { COUNTRY_IDS } from '../src/rules/countries'
import type { CountryId, GameEvent, GameState, Intent } from '../src/rules/types'
import type { ClientMsg, LobbyPlayer, ServerMsg } from '../src/client/protocol'

interface Env { Room: DurableObjectNamespace<Room>; ASSETS: Fetcher }
interface Seat { name: string; token: string; bot?: boolean; country?: CountryId }
interface Saved { seats: Seat[]; host: string; game: GameState | null; seq: number }
// a connection is tied to its seat token, not an index: removing a bot can shift seat numbers
interface ConnState { token: string }

const OFFLINE_GRACE_MS = 60_000
const BOT_NAMES = ['Ana', 'Bo', 'Kenji', 'Lena', 'Rafi', 'Mira']

/** What happens for a player who has been offline too long: the cautious choice. */
function safeIntent(legal: Intent[]): Intent | undefined {
  const pick = (f: (i: Intent) => boolean) => legal.find(f)
  return pick((i) => i.type === 'roll') ?? pick((i) => i.type === 'ack')
    ?? pick((i) => i.type === 'invest' && i.chips === 0) ?? pick((i) => i.type === 'hedge' && i.hedge)
    ?? pick((i) => i.type === 'hedge') ?? pick((i) => i.type === 'waiver' && i.use)
    ?? pick((i) => i.type === 'takeover' && i.victim === null) ?? legal[0]
}

export class Room extends Server<Env> {
  static options = { hibernate: true }
  data: Saved = { seats: [], host: '', game: null, seq: 0 }

  async onStart() {
    this.data = (await this.ctx.storage.get<Saved>('room')) ?? this.data
  }

  private save() { return this.ctx.storage.put('room', this.data) }
  private send(c: Connection, m: ServerMsg) { c.send(JSON.stringify(m)) }
  private all(m: ServerMsg) { this.broadcast(JSON.stringify(m)) }
  private seatOf(token: string | undefined) { return token ? this.data.seats.findIndex((s) => s.token === token) : -1 }
  private connSeat(c: Connection<ConnState>) { return this.seatOf(c.state?.token) }

  private online(): Set<number> {
    const out = new Set<number>()
    for (const c of this.getConnections<ConnState>()) { const s = this.connSeat(c); if (s >= 0) out.add(s) }
    return out
  }

  private lobby(): ServerMsg {
    const on = this.online()
    const players: LobbyPlayer[] = this.data.seats.map((s, i) => ({ name: s.name, seat: i, online: s.bot || on.has(i), bot: !!s.bot, country: s.country }))
    return { t: 'lobby', players, host: this.seatOf(this.data.host), started: !!this.data.game }
  }

  /** Every connection's seat number, sent again after the seats change shape. */
  private greetAll() {
    for (const c of this.getConnections<ConnState>()) {
      const seat = this.connSeat(c)
      if (seat >= 0) this.send(c, { t: 'welcome', seat, token: c.state!.token, room: this.name })
    }
  }

  /** Deck order and RNG would let a client predict cards and rolls. */
  private redact(s: GameState): GameState {
    return { ...s, rng: 0, deck: s.deck.map(() => 'lendLease' as const) }
  }

  private update(events: GameEvent[]): ServerMsg {
    return { t: 'update', seq: this.data.seq, events, state: this.redact(this.data.game!) }
  }

  private async apply(intent: Intent): Promise<string | undefined> {
    const r = step(this.data.game!, intent)
    if (r.error) return r.error
    this.data.game = r.state
    this.data.seq++
    this.all(this.update(r.events))
  }

  /** A human move, then every bot move it hands over to, then the offline timer. */
  private async advance(intent: Intent): Promise<string | undefined> {
    const err = await this.apply(intent)
    if (err) return err
    await this.runBots()
  }

  private async runBots() {
    // ponytail: a bot game with no humans left would loop here; the guard caps one call at 400 moves
    for (let guard = 0; guard < 400; guard++) {
      const g = this.data.game
      if (!g || g.phase !== 'playing' || !g.decision || !this.data.seats[g.decision.player]?.bot) break
      const i = botIntent(g) ?? safeIntent(legalIntents(g))
      if (!i || (await this.apply(i))) break
    }
    await this.save()
    await this.armTimeout()
  }

  /** If the player we are waiting on is offline, give them a minute before the safe default. */
  private async armTimeout() {
    const d = this.data.game?.decision
    if (d && !this.online().has(d.player)) await this.ctx.storage.setAlarm(Date.now() + OFFLINE_GRACE_MS)
  }

  async onAlarm() {
    for (let guard = 0; guard < 50; guard++) {
      const g = this.data.game
      if (!g || g.phase !== 'playing' || !g.decision || this.online().has(g.decision.player)) return
      const i = safeIntent(legalIntents(g))
      if (!i || (await this.advance(i))) return
    }
  }

  async onMessage(conn: Connection<ConnState>, raw: string | ArrayBuffer) {
    let m: ClientMsg
    try { m = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)) } catch { return }
    const reject = (reason: string) => this.send(conn, { t: 'reject', reason })

    if (m.t === 'join') {
      let seat = this.seatOf(m.token)
      let token = m.token ?? ''
      if (seat < 0 || this.data.seats[seat]!.bot) {
        if (this.data.game) return reject('This game has already started.')
        if (this.data.seats.length >= 6) return reject('This room is full (6 players).')
        token = crypto.randomUUID()
        const name = (m.name ?? '').replace(/[<>&"'`]/g, '').trim().slice(0, 16) || `Player ${this.data.seats.length + 1}`
        this.data.seats.push({ name, token })
        if (!this.data.host) this.data.host = token
        seat = this.data.seats.length - 1
        await this.save()
      }
      conn.setState({ token })
      this.send(conn, { t: 'welcome', seat, token, room: this.name })
      this.all(this.lobby())
      if (this.data.game) this.send(conn, this.update([]))
      return
    }

    const seat = this.connSeat(conn)
    if (seat < 0) return reject('Join the room first.')
    const isHost = this.data.seats[seat]?.token === this.data.host

    if (m.t === 'pick') {
      if (this.data.game) return
      const c = m.country
      if (c !== null && !COUNTRY_IDS.includes(c)) return
      if (c && this.data.seats.some((s, i) => i !== seat && s.country === c)) return reject('Someone else has that card.')
      this.data.seats[seat]!.country = c ?? undefined
      await this.save()
      this.all(this.lobby())
      return
    }

    if (m.t === 'bot') {
      if (!isHost) return reject('Only the host can add bots.')
      if (this.data.game) return
      if (m.add) {
        if (this.data.seats.length >= 6) return reject('This room is full (6 players).')
        const used = new Set(this.data.seats.map((s) => s.name))
        this.data.seats.push({ name: BOT_NAMES.find((n) => !used.has(n)) ?? 'Bot', token: 'bot-' + crypto.randomUUID(), bot: true })
      } else {
        const last = this.data.seats.map((s) => !!s.bot).lastIndexOf(true)
        if (last < 0) return
        this.data.seats.splice(last, 1)
        this.greetAll()
      }
      await this.save()
      this.all(this.lobby())
      return
    }

    if (m.t === 'start') {
      if (!isHost) return reject('Only the host can start.')
      if (this.data.game) return
      if (this.data.seats.length < 2) return reject('Need at least 2 players.')
      // picked cards stay; everyone on random is dealt from what is left
      const left = COUNTRY_IDS.filter((c) => !this.data.seats.some((s) => s.country === c))
      for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [left[i], left[j]] = [left[j]!, left[i]!] }
      const countries = this.data.seats.map((s) => s.country ?? left.pop()!)
      const r = newGame({ names: this.data.seats.map((s) => s.name), seed: crypto.getRandomValues(new Uint32Array(1))[0]!, countries })
      this.data.game = r.state
      this.data.seq = 1
      this.all(this.lobby())
      this.all(this.update(r.events))
      await this.runBots()
      return
    }

    if (m.t === 'intent') {
      if (!this.data.game) return reject('The game has not started.')
      if (m.intent.player !== seat) return reject('It is not your decision.')
      const err = await this.advance(m.intent)
      if (err) reject('That move is not allowed right now.')
      return
    }

    if (m.t === 'sync' && this.data.game) this.send(conn, this.update([]))
  }

  async onClose() {
    this.all(this.lobby())
    await this.armTimeout()
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    return (await routePartykitRequest(req, env as never)) ?? env.ASSETS.fetch(req)
  },
}
