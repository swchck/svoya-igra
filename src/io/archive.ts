import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'
import iconSvg from '../../assets/app-icon.svg?raw'
import type { Game } from '../types'
import { mediaItems, uid, withFreshIds } from '../game/model'
import { parseGame } from '../game/parse'

/*
 * .gamezip — a portable game archive:
 *   game.json    the game; attachments are referenced as media://<file>
 *   media/<file> attachments (pictures, sounds, clips)
 *   meta.json    { app, format, version, exportedAt }
 *   icon.svg     app icon, for file managers that preview archives
 * External http(s) links (YouTube and the like) stay links.
 */

const MEDIA_PROTO = 'media://'
const MEDIA_DIR = 'media/'

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
}

const EXT_BY_MIME: Record<string, string> = {
  ...Object.fromEntries(Object.entries(MIME_BY_EXT).map(([ext, mime]) => [mime, ext])),
  'image/jpg': 'jpg',
  'audio/mp3': 'mp3',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
}

function extFromMime(mime: string): string {
  const m = mime.split(';')[0].trim().toLowerCase()
  return EXT_BY_MIME[m] ?? (/^[a-z]+\/([a-z0-9]+)$/.exec(m)?.[1] || 'bin')
}

function mimeFromName(name: string): string {
  return MIME_BY_EXT[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream'
}

function dataUrlToBytes(url: string): { bytes: Uint8Array; mime: string } {
  const match = /^data:([^;,]+)?((?:;[^;,]+)*?)(;base64)?,(.*)$/s.exec(url)
  if (!match) throw new Error('Некорректный data URL')
  const payload = match[4]
  const bytes = match[3]
    ? Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
    : strToU8(decodeURIComponent(payload))
  return { bytes, mime: match[1] ?? 'application/octet-stream' }
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  // String.fromCharCode(...bytes) overflows the call stack on large files
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:${mime};base64,${btoa(bin)}`
}

async function fetchBytes(url: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      mime: res.headers.get('content-type') ?? 'application/octet-stream',
    }
  } catch {
    return null
  }
}

/** Packs the game with all embedded and same-origin attachments into a .gamezip. */
export async function exportGameZip(game: Game): Promise<Blob> {
  const g = JSON.parse(JSON.stringify(game)) as Game
  const files: Zippable = {}
  const nameByUrl = new Map<string, string>()

  for (const item of mediaItems(g)) {
    const url = item.url
    if (!url || url.startsWith(MEDIA_PROTO) || /^https?:\/\//i.test(url)) continue
    let name = nameByUrl.get(url)
    if (!name) {
      const media = url.startsWith('data:') ? dataUrlToBytes(url) : await fetchBytes(url)
      if (!media) continue
      name = `${uid('m_')}.${extFromMime(media.mime)}`
      nameByUrl.set(url, name)
      // pictures and clips are compressed already; deflating them again only burns time
      files[MEDIA_DIR + name] = [media.bytes, { level: 0 }]
    }
    item.url = MEDIA_PROTO + name
  }

  files['game.json'] = strToU8(JSON.stringify(g, null, 2))
  files['meta.json'] = strToU8(
    JSON.stringify({ app: 'svoya-igra', format: 'gamezip', version: 1, exportedAt: new Date().toISOString() }, null, 2),
  )
  files['icon.svg'] = strToU8(iconSvg)

  const zipped = zipSync(files, { level: 6 })
  return new Blob([zipped.slice().buffer], { type: 'application/x-svoya-igra+zip' })
}

/** Reads a .gamezip into a new game with fresh ids; attachments become data URLs. */
export async function importGameZip(file: Blob): Promise<Game> {
  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const json = entries['game.json']
  if (!json) throw new Error('В архиве нет game.json')
  const game = parseGame(JSON.parse(strFromU8(json)))

  const urlByName = new Map<string, string>()
  for (const item of mediaItems(game)) {
    if (!item.url.startsWith(MEDIA_PROTO)) continue
    const name = item.url.slice(MEDIA_PROTO.length)
    let url = urlByName.get(name)
    if (url === undefined) {
      const bytes = entries[MEDIA_DIR + name]
      url = bytes ? bytesToDataUrl(bytes, mimeFromName(name)) : ''
      urlByName.set(name, url)
    }
    item.url = url
  }
  return withFreshIds(game)
}
