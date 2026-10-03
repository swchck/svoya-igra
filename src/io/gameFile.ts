import type { Game } from '../types'
import { withFreshIds } from '../game/model'
import { parseGame } from '../game/parse'
import { exportGameZip, importGameZip } from './archive'
import { fileSlug, saveBlob } from './files'

export type GameFileFormat = 'gamezip' | 'json'

/** Accepted by the import file picker. */
export const GAME_FILE_ACCEPT = '.gamezip,.zip,.json,application/json,application/zip,application/x-svoya-igra+zip'

/** Reads a .gamezip or .json file into a new game with fresh ids. */
export async function importGameFile(file: File): Promise<Game> {
  if (/\.(gamezip|zip)$/i.test(file.name)) return importGameZip(file)
  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('Файл не похож на игру: это не JSON и не .gamezip')
  }
  return withFreshIds(parseGame(data))
}

/** Saves the game to a file in the given format. */
export async function exportGameFile(game: Game, format: GameFileFormat): Promise<void> {
  const blob =
    format === 'gamezip'
      ? await exportGameZip(game)
      : new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' })
  saveBlob(blob, `${fileSlug(game.title)}.${format}`)
}
