import type { Game } from './types'
import { dbDelete, dbGet, dbGetAll, dbPut } from './db'
import { parseGame } from './game/parse'
import { plainCopy } from './lib/plain'
import { mediaItems } from './game/model'
import { deleteUnreferencedMedia } from './media/store'

const LEGACY_KEY = 'svoya-igra:games:v1'

let legacyMoved = false

/** Moves games from the localStorage era into IndexedDB, once per session. */
async function moveLegacyGames(): Promise<void> {
  if (legacyMoved) return
  legacyMoved = true
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return
    for (const g of data) {
      try {
        await dbPut(parseGame(g))
      } catch {
        // a single broken entry should not block the rest
      }
    }
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // no localStorage or unreadable data: nothing to move
  }
}

/** Returns all saved games, most recently edited first. */
export async function loadGames(): Promise<Game[]> {
  await moveLegacyGames()
  const all = await dbGetAll<unknown>()
  return all.map(parseGame).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getGame(id: string): Promise<Game | undefined> {
  await moveLegacyGames()
  const g = await dbGet<unknown>(id)
  return g === undefined ? undefined : parseGame(g)
}

/**
 * Persists a snapshot of the game and returns it. The argument is left untouched,
 * so saving a reactive game never re-triggers watchers on it.
 */
export async function upsertGame(game: Game): Promise<Game> {
  const snapshot = { ...plainCopy(game), updatedAt: Date.now() }
  await dbPut(snapshot)
  return snapshot
}

export async function deleteGame(id: string): Promise<void> {
  await dbDelete(id)
}

/**
 * Deletes attachments no saved game refers to: leftovers of deleted games and of
 * media removed in the editor. Must not run while an editor may hold a freshly
 * stored attachment its game has not been saved with yet.
 */
export async function pruneMedia(): Promise<number> {
  const games = await loadGames()
  return deleteUnreferencedMedia(games.flatMap((g) => mediaItems(g).map((m) => m.url)))
}
