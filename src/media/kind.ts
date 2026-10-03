import type { MediaKind } from '../types'
import { parseYoutubeUrl } from '../game/youtube'

/** Guesses the media kind from a file's type or a URL's host and extension. */
export function detectKind(input: { file?: File; url?: string }): MediaKind | undefined {
  if (input.url && parseYoutubeUrl(input.url)) return 'youtube'
  if (input.file) {
    if (input.file.type.startsWith('image/')) return 'image'
    if (input.file.type.startsWith('audio/')) return 'audio'
    if (input.file.type.startsWith('video/')) return 'video'
  }
  if (input.url) {
    const lower = input.url.toLowerCase()
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(lower)) return 'image'
    if (/\.(mp3|wav|ogg|m4a)(\?|$)/.test(lower)) return 'audio'
    if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(lower)) return 'video'
  }
  return undefined
}
