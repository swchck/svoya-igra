import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate'
import type { FinalQuestion, Game, MediaItem, Question } from './types'
import { migrateGame, uid } from './storage'

/* === .gamezip — портативный архив игры === */
/* Состав:
 *  - game.json   — описание игры (см. ниже)
 *  - media/<file> — все медиа-файлы (картинки/аудио/видео)
 *  - meta.json   — { app, version, exportedAt }
 *  - icon.svg    — иконка формата (для красоты)
 *
 * В game.json все ссылки на media/ заменены на media://<file>.
 */

const MEDIA_PROTO = 'media://'
const MEDIA_DIR = 'media/'

function extFromMime(mime: string): string {
  if (!mime) return 'bin'
  const m = mime.split(';')[0].trim().toLowerCase()
  return (
    {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/m4a': 'm4a',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    }[m] || m.split('/')[1] || 'bin'
  )
}

function dataUrlToBytes(url: string): { bytes: Uint8Array; ext: string } {
  // data:[<mediatype>][;base64],<data>
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url)
  if (!match) throw new Error('Invalid data URL')
  const mime = match[1] || ''
  const isB64 = !!match[2]
  const payload = match[3]
  let bytes: Uint8Array
  if (isB64) {
    const bin = atob(payload)
    bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  } else {
    bytes = strToU8(decodeURIComponent(payload))
  }
  return { bytes, ext: extFromMime(mime) }
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return `data:${mime};base64,${btoa(bin)}`
}

function mimeFromExt(ext: string): string {
  return (
    {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/m4a',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
    }[ext.toLowerCase()] || 'application/octet-stream'
  )
}

const ICON_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3838FF"/>
      <stop offset="1" stop-color="#000091"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="36" fill="url(#bg)"/>
  <text x="128" y="120" font-family="Georgia, serif" font-size="56" font-weight="bold"
        text-anchor="middle" fill="#FFC000">СВОЯ</text>
  <text x="128" y="190" font-family="Georgia, serif" font-size="56" font-weight="bold"
        text-anchor="middle" fill="#FFC000">ИГРА</text>
  <rect x="36" y="206" width="184" height="6" fill="#FFC000" opacity="0.55"/>
</svg>
`

interface CollectedRef {
  /** path under media/ inside the archive */
  path: string
  bytes: Uint8Array
}

function isDataUrl(u: string | undefined): boolean {
  return !!u && u.startsWith('data:')
}

async function fetchToBytes(url: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    const mime = res.headers.get('content-type') || 'application/octet-stream'
    return { bytes: buf, mime }
  } catch {
    return null
  }
}

async function processMedia(
  url: string | undefined,
  collected: Map<string, CollectedRef>,
): Promise<string | undefined> {
  if (!url) return url
  // External http(s) — leave alone (e.g., YouTube)
  if (/^https?:\/\//i.test(url)) return url
  // Already wrapped in media://
  if (url.startsWith(MEDIA_PROTO)) return url
  // Data URL — embed
  if (isDataUrl(url)) {
    const { bytes, ext } = dataUrlToBytes(url)
    const name = `${uid('m_')}.${ext}`
    collected.set(name, { path: name, bytes })
    return MEDIA_PROTO + name
  }
  // Relative path or absolute path on the same origin → try to fetch and embed
  const fetched = await fetchToBytes(url)
  if (!fetched) return url
  const ext = extFromMime(fetched.mime) || (url.split('.').pop() || 'bin').toLowerCase()
  const name = `${uid('m_')}.${ext}`
  collected.set(name, { path: name, bytes: fetched.bytes })
  return MEDIA_PROTO + name
}

async function processItems(items: MediaItem[] | undefined, collected: Map<string, CollectedRef>) {
  if (!items) return
  for (const it of items) {
    const newUrl = await processMedia(it.url, collected)
    if (newUrl !== undefined) it.url = newUrl
  }
}

async function processQuestion(q: Question, collected: Map<string, CollectedRef>) {
  await processItems(q.media, collected)
  await processItems(q.answerMedia, collected)
  // also process legacy single-fields if present
  q.mediaUrl = await processMedia(q.mediaUrl, collected)
  q.answerMediaUrl = await processMedia(q.answerMediaUrl, collected)
}

async function processFinal(f: FinalQuestion | undefined, collected: Map<string, CollectedRef>) {
  if (!f) return
  await processItems(f.media, collected)
  f.mediaUrl = await processMedia(f.mediaUrl, collected)
}

export async function exportGameZip(game: Game): Promise<Blob> {
  // Deep-clone so we don't mutate the live game
  const g: Game = JSON.parse(JSON.stringify(game))
  const collected = new Map<string, CollectedRef>()

  for (const r of g.rounds) {
    for (const t of r.themes) {
      for (const q of t.questions) {
        await processQuestion(q, collected)
      }
    }
  }
  await processFinal(g.finalRound, collected)

  const files: Record<string, Uint8Array> = {
    'game.json': strToU8(JSON.stringify(g, null, 2)),
    'meta.json': strToU8(
      JSON.stringify(
        {
          app: 'svoya-igra',
          format: 'gamezip',
          version: 1,
          exportedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    ),
    'icon.svg': strToU8(ICON_SVG),
  }
  for (const [name, ref] of collected) {
    files[MEDIA_DIR + name] = ref.bytes
  }

  const zipped = zipSync(files, { level: 6 })
  // Custom MIME — некоторые ОС позволят ассоциировать с приложением
  const ab = new ArrayBuffer(zipped.byteLength)
  new Uint8Array(ab).set(zipped)
  return new Blob([ab], { type: 'application/x-svoya-igra+zip' })
}

export async function importGameZip(file: File | Blob): Promise<Game> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const entries = unzipSync(buf)
  const jsonBytes = entries['game.json']
  if (!jsonBytes) throw new Error('В архиве нет game.json')
  const game = JSON.parse(strFromU8(jsonBytes)) as Game

  // Resolve media:// refs back to data URLs
  function resolveRef(u: string | undefined): string | undefined {
    if (!u || !u.startsWith(MEDIA_PROTO)) return u
    const name = u.slice(MEDIA_PROTO.length)
    const bytes = entries[MEDIA_DIR + name]
    if (!bytes) return undefined
    const ext = (name.split('.').pop() || '').toLowerCase()
    return bytesToDataUrl(bytes, mimeFromExt(ext))
  }
  function resolveItems(items: MediaItem[] | undefined) {
    if (!items) return
    for (const it of items) {
      const r = resolveRef(it.url)
      if (r !== undefined) it.url = r
    }
  }

  for (const r of game.rounds) {
    for (const t of r.themes) {
      for (const q of t.questions) {
        resolveItems(q.media)
        resolveItems(q.answerMedia)
        q.mediaUrl = resolveRef(q.mediaUrl)
        q.answerMediaUrl = resolveRef(q.answerMediaUrl)
      }
    }
  }
  if (game.finalRound) {
    resolveItems(game.finalRound.media)
    game.finalRound.mediaUrl = resolveRef(game.finalRound.mediaUrl)
  }

  // Re-id everything to avoid collisions with existing games
  game.id = uid('g_')
  game.rounds = game.rounds.map((r) => ({
    ...r,
    id: uid('r_'),
    themes: r.themes.map((t) => ({
      ...t,
      id: uid('t_'),
      questions: t.questions.map((q) => ({ ...q, id: uid('q_') })),
    })),
  }))
  if (game.finalRound) game.finalRound.id = uid('f_')
  game.createdAt = game.createdAt || Date.now()
  game.updatedAt = Date.now()
  return migrateGame(game)
}
