import { strFromU8, strToU8, unzip, zip, type Unzipped, type Zippable } from 'fflate'
import { t } from '../i18n'
import iconSvg from '../../assets/app-icon.svg?raw'
import type { Game } from '../types'
import { mediaItems, uid, withFreshIds } from '../game/model'
import { parseGame } from '../game/parse'
import { plainCopy } from '../lib/plain'
import { dataUrlToBlob, extFromMime, mimeFromName } from '../media/dataUrl'
import { isStoredMedia } from '../media/ref'
import { getMedia, putMedia } from '../media/store'

/*
 * .gamezip — a portable game archive:
 *   game.json    the game; attachments are referenced as media://<file>
 *   media/<file> attachments (pictures, sounds, clips)
 *   meta.json    { app, format, version, exportedAt }
 *   icon.svg     app icon, for file managers that preview archives
 * External http(s) links (YouTube and the like) stay links.
 */

const ENTRY_PROTO = 'media://'
const MEDIA_DIR = 'media/'

function zipAsync(files: Zippable): Promise<Uint8Array> {
  return new Promise((resolve, reject) => zip(files, { level: 6 }, (err, data) => (err ? reject(err) : resolve(data))))
}

function unzipAsync(bytes: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) => unzip(bytes, (err, data) => (err ? reject(err) : resolve(data))))
}

/** Packs the game and its stored or embedded attachments into a .gamezip. */
export async function exportGameZip(
  game: Game,
  loadMedia: (url: string) => Promise<Blob | null> = getMedia,
): Promise<Blob> {
  const g = plainCopy(game)
  const files: Zippable = {}
  const entryByUrl = new Map<string, string>()

  for (const item of mediaItems(g)) {
    const url = item.url
    let entry = entryByUrl.get(url)
    if (!entry) {
      const blob = isStoredMedia(url) ? await loadMedia(url) : url.startsWith('data:') ? dataUrlToBlob(url) : null
      if (!blob) continue
      entry = `${uid('m_')}.${extFromMime(blob.type)}`
      entryByUrl.set(url, entry)
      // pictures and clips are compressed already; deflating them again only burns time
      files[MEDIA_DIR + entry] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }]
    }
    item.url = ENTRY_PROTO + entry
  }

  files['game.json'] = strToU8(JSON.stringify(g, null, 2))
  files['meta.json'] = strToU8(
    JSON.stringify({ app: 'svoya-igra', format: 'gamezip', version: 1, exportedAt: new Date().toISOString() }, null, 2),
  )
  files['icon.svg'] = strToU8(iconSvg)

  const zipped = await zipAsync(files)
  return new Blob([zipped.slice().buffer], { type: 'application/x-svoya-igra+zip' })
}

/** Reads a .gamezip into a new game with fresh ids, storing its attachments. */
export async function importGameZip(
  file: Blob,
  storeMedia: (blob: Blob) => Promise<string> = putMedia,
): Promise<Game> {
  const entries = await unzipAsync(new Uint8Array(await file.arrayBuffer()))
  const json = entries['game.json']
  if (!json) throw new Error(t('system.errors.noGameJson'))
  const game = parseGame(JSON.parse(strFromU8(json)))

  const urlByEntry = new Map<string, string>()
  for (const item of mediaItems(game)) {
    if (!item.url.startsWith(ENTRY_PROTO)) continue
    const entry = item.url.slice(ENTRY_PROTO.length)
    let url = urlByEntry.get(entry)
    if (url === undefined) {
      const bytes = entries[MEDIA_DIR + entry]
      url = bytes ? await storeMedia(new Blob([bytes.slice().buffer], { type: mimeFromName(entry) })) : ''
      urlByEntry.set(entry, url)
    }
    item.url = url
  }
  return withFreshIds(game)
}
