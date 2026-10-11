// Messages between a phone and its room. Shared by client and server.
import type { GameEvent, GameState, Intent } from '../rules/types'

export interface LobbyPlayer { name: string; seat: number; online: boolean }

export type ClientMsg =
  | { t: 'join'; name?: string; token?: string }
  | { t: 'start' }
  | { t: 'intent'; intent: Intent }
  | { t: 'sync' }

export type ServerMsg =
  | { t: 'welcome'; seat: number; token: string; room: string }
  | { t: 'lobby'; players: LobbyPlayer[]; host: number; started: boolean }
  | { t: 'update'; seq: number; events: GameEvent[]; state: GameState }
  | { t: 'reject'; reason: string }

/** 4-letter room codes without look-alikes (no I, O, 0, 1). */
export function roomCode(): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => A[n % A.length]).join('')
}
