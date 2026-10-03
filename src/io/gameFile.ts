import type { Game } from '../types'
import { currentLocale, t } from '../i18n'
import { mediaItems, withFreshIds } from '../game/model'
import { parseGame } from '../game/parse'
import { plainCopy } from '../lib/plain'
import { blobToDataUrl, dataUrlToBlob } from '../media/dataUrl'
import { isStoredMedia } from '../media/ref'
import { getMedia, putMedia } from '../media/store'
import { exportGameZip, importGameZip } from './archive'
import { saveFile } from '../platform'
import { fileSlug } from './files'

export type GameFileFormat = 'gamezip' | 'json'

/** Accepted by the import file picker. */
export const GAME_FILE_ACCEPT = '.gamezip,.zip,.json,application/json,application/zip,application/x-svoya-igra+zip'

/** Reads a .gamezip or .json file into a new game with fresh ids, storing its attachments. */
export async function importGameFile(file: File): Promise<Game> {
  if (/\.(gamezip|zip)$/i.test(file.name)) return importGameZip(file)
  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error(t('system.errors.notGameFile'))
  }
  const game = withFreshIds(parseGame(data))
  for (const item of mediaItems(game)) {
    if (item.url.startsWith('data:')) item.url = await putMedia(dataUrlToBlob(item.url))
  }
  return game
}

/** JSON export is self-contained: stored attachments are inlined as data URLs. */
async function toPortableJson(game: Game): Promise<string> {
  const copy = plainCopy(game)
  for (const item of mediaItems(copy)) {
    if (!isStoredMedia(item.url)) continue
    const blob = await getMedia(item.url)
    item.url = blob ? await blobToDataUrl(blob) : ''
  }
  return JSON.stringify(copy, null, 2)
}

/** Saves the game to a file in the given format; false when the user cancelled. */
export async function exportGameFile(game: Game, format: GameFileFormat): Promise<boolean> {
  const blob =
    format === 'gamezip'
      ? await exportGameZip(game)
      : new Blob([await toPortableJson(game)], { type: 'application/json' })
  return saveFile(blob, `${fileSlug(game.title)}.${format}`)
}

/** Loads the bundled sample game in the current interface language. */
export async function importSampleGame(): Promise<Game> {
  const res = await fetch(`${import.meta.env.BASE_URL}samples/sample-${currentLocale()}.gamezip`)
  if (!res.ok) throw new Error(t('system.errors.sampleFailed', { status: res.status }))
  return importGameZip(await res.blob())
}
