import type { MediaItem } from '../types'
import { parseYoutubeUrl } from '../game/youtube'

/** The part of a clip to play: from `start` to `end` seconds, `end` unset meaning to the end. */
export interface Segment {
  start: number
  end?: number
}

/** Returns the clip's segment; a YouTube link's own `t=` counts as the start. */
export function segmentOf(item: MediaItem): Segment {
  const linkStart = item.kind === 'youtube' ? parseYoutubeUrl(item.url)?.start ?? 0 : 0
  const start = item.start ?? linkStart
  const end = item.end !== undefined && item.end > start ? item.end : undefined
  return { start, end }
}

/** Formats seconds as `m:ss` or `h:mm:ss`. */
export function formatTime(total: number): string {
  const s = Math.max(0, Math.round(total))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Parses `90`, `1:30` or `1:02:03` into seconds; returns undefined for blank or malformed input. */
export function parseTime(raw: string): number | undefined {
  const text = raw.trim()
  if (!text) return undefined
  if (!/^\d+(:\d{1,2}){0,2}$/.test(text)) return undefined
  return text.split(':').reduce((acc, part) => acc * 60 + Number(part), 0)
}
