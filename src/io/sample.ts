import type { Game } from '@/types'
import type { useGamesStore } from '@/stores/games'

// the titles in assets/sample/content.mjs plus the pre-translation sample, so older copies get replaced
const SAMPLE_TITLES = ['Пример: всего понемногу', 'Sample: a bit of everything', 'Primer: od svega po malo', 'Своя игра — 1996 и не только']

/** Finds the sample game in the library, in any of its languages. */
export function findSample(games: Game[]): Game | undefined {
  return games.find((g) => SAMPLE_TITLES.includes(g.title))
}

/** Adds a fresh copy of the sample game to the library, replacing older copies. */
export async function loadSample(store: ReturnType<typeof useGamesStore>): Promise<{ game: Game; replaced: number }> {
  const previous = store.games.filter((g) => SAMPLE_TITLES.includes(g.title))
  // save before removing: removal prunes media, and the new copy's files must be referenced by then
  const { importSampleGame } = await import('./gameFile')
  const game = await store.save(await importSampleGame())
  for (const old of previous) await store.remove(old.id)
  return { game, replaced: previous.length }
}
