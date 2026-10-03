import type { Game } from './types'
import { dbDelete, dbGetAll, dbGetAllByIndex, dbGetKeysByIndex, dbPut, SNAPSHOT_BY_GAME, STORE_SNAPSHOTS } from './db'
import { mediaItems, uid } from './game/model'
import { plainCopy } from './lib/plain'
import { parseGame } from './game/parse'

/** Snapshots kept per game; older ones are dropped as new ones arrive. */
export const MAX_SNAPSHOTS = 30

export type SnapshotReason = 'open' | 'auto' | 'before-delete' | 'before-restore'

/** A full copy of a game at some moment. */
export interface Snapshot {
  id: string
  gameId: string
  /** Unix time, ms. */
  createdAt: number
  reason: SnapshotReason
  game: Game
  rounds: number
  questions: number
  /** media:// and other URLs the copy refers to, so pruning needs no parsing of the games. */
  media: string[]
}

// snapshots taken within one millisecond must still sort in the order they were made
let lastStamp = 0

// updatedAt moves on every save and says nothing about the content
function fingerprint(game: Game): string {
  return JSON.stringify({ ...game, updatedAt: 0 })
}

/** Returns the game's snapshots, newest first. */
export async function listSnapshots(gameId: string): Promise<Snapshot[]> {
  const all = await dbGetAllByIndex<Snapshot>(STORE_SNAPSHOTS, SNAPSHOT_BY_GAME, gameId)
  return all.map((s) => ({ ...s, game: parseGame(s.game) })).sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Stores a copy of the game unless it is identical to the newest snapshot.
 * Returns whether one was taken.
 */
export async function takeSnapshot(game: Game, reason: SnapshotReason): Promise<boolean> {
  const copy = plainCopy(game)
  const existing = await dbGetAllByIndex<Snapshot>(STORE_SNAPSHOTS, SNAPSHOT_BY_GAME, game.id)
  existing.sort((a, b) => b.createdAt - a.createdAt)
  if (existing[0] && fingerprint(existing[0].game) === fingerprint(copy)) return false

  lastStamp = Math.max(Date.now(), lastStamp + 1)
  const questions = copy.rounds.reduce((n, r) => n + r.themes.reduce((m, th) => m + th.questions.length, 0), 0)
  await dbPut<Snapshot>(
    {
      id: uid('s_'),
      gameId: game.id,
      createdAt: lastStamp,
      reason,
      game: copy,
      rounds: copy.rounds.length,
      questions,
      media: mediaItems(copy).map((m) => m.url),
    },
    STORE_SNAPSHOTS,
  )
  for (const old of existing.slice(MAX_SNAPSHOTS - 1)) await dbDelete(old.id, STORE_SNAPSHOTS)
  return true
}

/** Drops every snapshot of the game. */
export async function deleteSnapshots(gameId: string): Promise<void> {
  for (const id of await dbGetKeysByIndex(STORE_SNAPSHOTS, SNAPSHOT_BY_GAME, gameId)) await dbDelete(id, STORE_SNAPSHOTS)
}

/** Returns the URLs of all media any snapshot refers to. */
export async function snapshotMediaUrls(): Promise<string[]> {
  return (await dbGetAll<Snapshot>(STORE_SNAPSHOTS)).flatMap((s) => s.media)
}
