import { strFromU8, strToU8, unzip, zip, type Unzipped, type Zippable } from 'fflate'
import { t } from '../i18n'
import type { Game } from '../types'
import { getMedia, putMedia } from '../media/store'
import { exportGameZip, importGameZip } from './archive'
import { BACKUP_EXTENSION, fileSlug } from './files'

/*
 * .gamebackup — every game of the library in one file:
 *   games/<nnn>-<slug>.gamezip   each game exactly as a single-game export writes it
 *   meta.json                    { app, format, version, exportedAt, count }
 * Reusing .gamezip keeps one media format to maintain and lets a user pull a single game
 * out of a backup with any zip tool.
 */

const GAMES_DIR = 'games/'

/** Reports how many of the total games are done. */
export type BackupProgress = (done: number, total: number) => void

function zipAsync(files: Zippable): Promise<Uint8Array> {
  return new Promise((resolve, reject) => zip(files, { level: 0 }, (err, data) => (err ? reject(err) : resolve(data))))
}

function unzipAsync(bytes: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) => unzip(bytes, (err, data) => (err ? reject(err) : resolve(data))))
}

/** Returns a dated backup file name, such as svoya-igra-2026-10-04.gamebackup. */
export function backupFileName(now = new Date()): string {
  const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, '0')).join('-')
  return `svoya-igra-${day}.${BACKUP_EXTENSION}`
}

/** Packs the games, in the given order, with their attachments into a single .gamebackup. */
export async function exportBackup(
  games: readonly Game[],
  onProgress: BackupProgress = () => {},
  loadMedia: (url: string) => Promise<Blob | null> = getMedia,
): Promise<Blob> {
  const files: Zippable = {}
  const width = String(games.length).length
  for (const [i, game] of games.entries()) {
    const name = `${GAMES_DIR}${String(i + 1).padStart(width, '0')}-${fileSlug(game.title)}.gamezip`
    files[name] = new Uint8Array(await (await exportGameZip(game, loadMedia)).arrayBuffer())
    onProgress(i + 1, games.length)
  }
  files['meta.json'] = strToU8(
    JSON.stringify(
      { app: 'svoya-igra', format: BACKUP_EXTENSION, version: 1, exportedAt: new Date().toISOString(), count: games.length },
      null,
      2,
    ),
  )
  // the inner archives are deflated already
  const zipped = await zipAsync(files)
  return new Blob([zipped.slice().buffer], { type: 'application/x-svoya-igra-backup+zip' })
}

/** What a backup gave back: games with fresh ids, and how many entries could not be read. */
export interface RestoredBackup {
  games: Game[]
  failed: number
}

/**
 * Reads a .gamebackup into new games with fresh ids, in the order they were saved, storing
 * their attachments. A broken game is counted in `failed` instead of stopping the rest.
 */
export async function importBackup(
  file: Blob,
  onProgress: BackupProgress = () => {},
  storeMedia: (blob: Blob) => Promise<string> = putMedia,
): Promise<RestoredBackup> {
  let entries: Unzipped
  try {
    entries = await unzipAsync(new Uint8Array(await file.arrayBuffer()))
    const meta = JSON.parse(strFromU8(entries['meta.json'])) as { format?: unknown }
    if (meta.format !== BACKUP_EXTENSION) throw new Error()
  } catch {
    throw new Error(t('prefsLibrary.errors.notBackup'))
  }
  const names = Object.keys(entries)
    .filter((n) => n.startsWith(GAMES_DIR) && n.endsWith('.gamezip'))
    .sort()

  const games: Game[] = []
  let failed = 0
  for (const [i, name] of names.entries()) {
    try {
      games.push(await importGameZip(new Blob([entries[name].slice().buffer]), storeMedia))
    } catch {
      failed++
    }
    onProgress(i + 1, names.length)
  }
  return { games, failed }
}
