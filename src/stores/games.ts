import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Game } from '../types'
import { deleteGame, loadGames, upsertGame } from '../storage'

export const useGamesStore = defineStore('games', () => {
  const games = ref<Game[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function refresh() {
    loading.value = true
    try {
      games.value = await loadGames()
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function save(game: Game) {
    await upsertGame(game)
    await refresh()
  }

  async function remove(id: string) {
    await deleteGame(id)
    await refresh()
  }

  // первичная загрузка
  refresh()

  return { games, loaded, loading, refresh, save, remove }
})
