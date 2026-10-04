import type { Router } from 'vue-router'
import type { useGamesStore } from '@/stores/games'
import { findSample, loadSample } from '@/io/sample'
import { clearSession, loadSession } from '@/play/savedSession'
import type { Page, TourHost } from './engine'

/** Lets the tour move through the app: pages of the sample game, loading it when it is missing. */
export function createTourHost(router: Router, store: ReturnType<typeof useGamesStore>): TourHost {
  let sampleId: string | null = null
  let playedSample = false

  async function ensureGame() {
    try {
      await store.refresh()
      sampleId = (findSample(store.games) ?? (await loadSample(store)).game).id
      return true
    } catch {
      return false
    }
  }

  const moved = async (to: Parameters<Router['push']>[0]) => !(await router.push(to))

  return {
    page() {
      const name = router.currentRoute.value.name
      return name === 'home' || name === 'editor' || name === 'play' ? (name as Page) : null
    },
    ensureGame,
    async goTo(page) {
      if (page === 'home') return moved({ name: 'home' })
      if (!sampleId && !(await ensureGame())) return false
      // a game of the sample left half-played is the user's, and the tour must not touch it
      if (page === 'play' && loadSession(sampleId!)) return false
      const ok = await moved({ name: page, params: { id: sampleId! } })
      if (ok && page === 'play') playedSample = true
      return ok
    },
    async finish() {
      if (router.currentRoute.value.name !== 'home') await router.push({ name: 'home' })
      if (playedSample && sampleId) clearSession(sampleId)
    },
  }
}
