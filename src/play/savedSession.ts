import type { SessionSnapshot } from '@/composables/usePlaySession'

// a play-through is a per-machine convenience, so localStorage is enough; losing it
// costs one game's score, never the game itself
const key = (gameId: string) => `svoya-igra:session:${gameId}`

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
  } catch {
    // storage full or unavailable: the game goes on, it just won't resume
  }
}

export function clearSession(gameId: string): void {
  try {
    localStorage.removeItem(key(gameId))
  } catch {
    // nothing to clear
  }
}
