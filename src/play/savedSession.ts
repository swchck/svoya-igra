import type { SessionSnapshot } from '@/composables/usePlaySession'

// a play-through is a per-machine convenience, so localStorage is enough; losing it
// costs one game's score, never the game itself
const key = (gameId: string) => `svoya-igra:session:${gameId}`
const LAST_KEY = 'svoya-igra:last-session'

/** Which game was played last and when its play-through was last saved. */
export interface LastSession {
  gameId: string
  /** Unix time, ms. */
  at: number
}

export function loadSession(gameId: string): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(key(gameId))
    return raw ? (JSON.parse(raw) as SessionSnapshot) : null
  } catch {
    return null
  }
}

export function saveSession(gameId: string, snapshot: SessionSnapshot): void {
  try {
    localStorage.setItem(key(gameId), JSON.stringify(snapshot))
    localStorage.setItem(LAST_KEY, JSON.stringify({ gameId, at: Date.now() } satisfies LastSession))
  } catch {
    // storage full or unavailable: the game goes on, it just won't resume
  }
}

export function clearSession(gameId: string): void {
  try {
    if (lastSession()?.gameId === gameId) localStorage.removeItem(LAST_KEY)
    localStorage.removeItem(key(gameId))
  } catch {
    // nothing to clear
  }
}

/** The play-through saved most recently, while it is still saved; null otherwise. */
export function lastSession(): LastSession | null {
  try {
    const last = JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null') as LastSession | null
    if (last && typeof last.gameId === 'string' && typeof last.at === 'number' && localStorage.getItem(key(last.gameId))) return last
    // saved before the app kept a pointer: any play-through left will do, its time unknown
    const [gameId] = savedGameIds()
    return gameId ? { gameId, at: 0 } : null
  } catch {
    return null
  }
}

/** Ids of the games that have a play-through saved. */
export function savedGameIds(): string[] {
  const prefix = key('')
  const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '')
  return keys.filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length))
}

/** Reports whether a saved play-through is somewhere a game can go on from. */
export function inProgress(snapshot: SessionSnapshot): boolean {
  return snapshot.phase !== 'title' && snapshot.phase !== 'results'
}
