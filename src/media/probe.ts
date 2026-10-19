import type { Game, MediaItem } from '../types'
import { parseYoutubeUrl } from '../game/youtube'
import { isStoredMedia } from './ref'
import { displayUrl, getMedia } from './store'
import { t } from '../i18n'

/*
 * Plays every attachment of a game just far enough to know it will play on the night: a
 * stored file this webview can't decode, a dead link or a removed YouTube video shows up
 * here instead of in the middle of a round.
 */

/** Why an attachment won't play: gone from the store, a format this webview can't play, or out of reach. */
export type ProbeFailure = 'missing' | 'unsupported' | 'unreachable'

/** How long one attachment may take to answer before it counts as out of reach, ms. */
export const PROBE_TIMEOUT_MS = 8000

function withTimeout<T>(work: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([work, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), PROBE_TIMEOUT_MS))])
}

function loadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = src
  })
}

function loadClip(src: string, kind: 'audio' | 'video'): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.createElement(kind)
    el.preload = 'metadata'
    el.muted = true
    const done = (ok: boolean) => {
      el.removeAttribute('src')
      el.load()
      resolve(ok)
    }
    el.onloadedmetadata = () => done(true)
    el.onerror = () => done(false)
    el.src = src
  })
}

async function youtubeAlive(url: string): Promise<boolean> {
  const link = parseYoutubeUrl(url)
  if (!link) return false
  // oEmbed answers 401/404 for private and removed videos, without loading a player
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${link.id}`)}`)
  return res.ok
}

/** Tries one attachment; null when it will play. */
export async function probeMedia(item: MediaItem): Promise<ProbeFailure | null> {
  try {
    if (item.kind === 'youtube') return (await withTimeout(youtubeAlive(item.url), false)) ? null : 'unreachable'
    const stored = isStoredMedia(item.url)
    if (stored && !(await getMedia(item.url))) return 'missing'
    const src = await displayUrl(item.url)
    const ok = await withTimeout(item.kind === 'image' ? loadImage(src) : loadClip(src, item.kind === 'audio' || item.mode === 'audio' ? 'audio' : 'video'), false)
    if (ok) return null
    return stored ? 'unsupported' : 'unreachable'
  } catch {
    return 'unreachable'
  }
}

/** One attachment that won't play, and where it sits. */
export interface ProbeProblem {
  item: MediaItem
  failure: ProbeFailure
  /** Unset for the final. */
  roundIndex?: number
  questionId?: string
  where: string
}

/** Every attachment of the game with where it sits, one entry per placement. */
export function placedMedia(game: Game): Omit<ProbeProblem, 'failure'>[] {
  const out: Omit<ProbeProblem, 'failure'>[] = []
  game.rounds.forEach((round, roundIndex) => {
    for (const theme of round.themes) {
      for (const q of theme.questions) {
        const where = `${round.name} · ${theme.name} · ${q.value}`
        const items = [...(q.media ?? []), ...(q.hints ?? []).flatMap((h) => h.media ?? []), ...(q.answerMedia ?? [])]
        for (const item of items) out.push({ item, roundIndex, questionId: q.id, where })
      }
    }
  })
  for (const f of game.finalThemes ?? []) {
    for (const item of [...(f.media ?? []), ...(f.answerMedia ?? [])]) out.push({ item, where: f.theme })
  }
  const { logo, background } = game.settings ?? {}
  if (logo) out.push({ item: logo, where: t('settings.look.logo') })
  if (background) out.push({ item: background, where: t('settings.look.background') })
  return out
}

/**
 * Probes every attachment of the game, each URL once, a few at a time. Reports progress as
 * attachments are done and returns the ones that won't play.
 */
export async function probeGame(
  game: Game,
  onProgress: (done: number, total: number) => void = () => {},
  probe: (item: MediaItem) => Promise<ProbeFailure | null> = probeMedia,
): Promise<ProbeProblem[]> {
  const placed = placedMedia(game)
  const byUrl = new Map<string, MediaItem>()
  for (const { item } of placed) if (!byUrl.has(item.url)) byUrl.set(item.url, item)
  const urls = [...byUrl.keys()]
  const results = new Map<string, ProbeFailure | null>()
  let done = 0
  onProgress(0, urls.length)
  const queue = [...urls]
  // a handful at once: fast enough for a big game, gentle enough for a slow network
  await Promise.all(
    Array.from({ length: Math.min(4, urls.length) }, async () => {
      for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
        results.set(url, await probe(byUrl.get(url)!))
        onProgress(++done, urls.length)
      }
    }),
  )
  return placed.flatMap((p) => {
    const failure = results.get(p.item.url)
    return failure ? [{ ...p, failure }] : []
  })
}
