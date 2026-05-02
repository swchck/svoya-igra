import sampleJson from './sample-1996.json'
import type { Game, MediaItem } from '../types'

// Vite glob: импортирует все картинки как URL'ы. С большим assetsInlineLimit
// они станут data-URL'ами и попадут прямо в бандл — портативная сборка
// не зависит от сторонних файлов.
const imageUrls = import.meta.glob('../assets/sample-1996/*.{png,jpg,jpeg,gif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byName: Record<string, string> = {}
for (const [key, url] of Object.entries(imageUrls)) {
  const name = key.split('/').pop()!
  byName[name] = url
}

const PREFIX = 'images/sample-1996/'
function resolveUrl(u: string | undefined): string | undefined {
  if (!u) return u
  if (!u.startsWith(PREFIX)) return u
  const name = u.slice(PREFIX.length)
  return byName[name] ?? u
}

function fixItems(items: MediaItem[] | undefined) {
  if (!items) return
  for (const it of items) {
    const r = resolveUrl(it.url)
    if (r) it.url = r
  }
}

export function getSampleGame(): Game {
  const g = JSON.parse(JSON.stringify(sampleJson)) as Game
  for (const r of g.rounds) {
    for (const t of r.themes) {
      for (const q of t.questions) {
        q.mediaUrl = resolveUrl(q.mediaUrl)
        q.answerMediaUrl = resolveUrl(q.answerMediaUrl)
        fixItems(q.media)
        fixItems(q.answerMedia)
      }
    }
  }
  if (g.finalRound) {
    g.finalRound.mediaUrl = resolveUrl(g.finalRound.mediaUrl)
    fixItems(g.finalRound.media)
  }
  return g
}
