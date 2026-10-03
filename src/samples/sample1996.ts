import sampleJson from './sample-1996.json'
import type { Game } from '../types'
import { mediaItems } from '../game/model'
import { parseGame } from '../game/parse'

// eager glob turns every picture into a bundled asset URL; the portable build inlines
// them as data URLs, so the sample works without any files next to the page
const imageUrls = import.meta.glob<string>('../assets/sample-1996/*.{png,jpg,jpeg,gif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const PREFIX = 'images/sample-1996/'
const urlByName = new Map(Object.entries(imageUrls).map(([path, url]) => [path.split('/').pop()!, url]))

/** Returns a fresh copy of the bundled sample game with resolved picture URLs. */
export function getSampleGame(): Game {
  const game = parseGame(structuredClone(sampleJson))
  for (const item of mediaItems(game)) {
    if (item.url.startsWith(PREFIX)) item.url = urlByName.get(item.url.slice(PREFIX.length)) ?? item.url
  }
  return game
}
