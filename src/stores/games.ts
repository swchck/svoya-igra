import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Game } from '../types'
import { deleteGame, loadGames, pruneMedia, upsertGame } from '../storage'

export const useGamesStore = defineStore('games', () => {
  const games = ref<Game[]>([])
  const loadError = ref<Error | null>(null)

  async function refresh() {
    games.value = await loadGames()
  }

  async function save(game: Game): Promise<Game> {
    await ready
    const saved = await upsertGame(game)
    games.value = [saved, ...games.value.filter((g) => g.id !== saved.id)]
    return saved
  }

  async function remove(id: string) {
    await ready
    await deleteGame(id)
    games.value = games.value.filter((g) => g.id !== id)
    await pruneMedia()
  }

  // a save landing before the initial load would otherwise be overwritten by its result
  const ready = refresh().catch((err: Error) => { loadError.value = err })

  return { games, loadError, refresh, save, remove, pruneMedia: () => ready.then(pruneMedia) }
})
