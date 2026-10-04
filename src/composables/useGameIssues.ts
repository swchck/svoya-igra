import { computed, shallowRef, watch, type Ref } from 'vue'
import type { Game } from '../types'
import { mediaItems } from '../game/model'
import { findMissingMedia, validateGame } from '../game/validate'
import { isStoredMedia } from '../media/ref'

/** Live pre-flight issues of the game being edited; missing files are re-checked when its stored media change. */
export function useGameIssues(game: Ref<Game | null>) {
  const missing = shallowRef<ReadonlySet<string>>(new Set())

  const storedKey = computed(() =>
    game.value
      ? mediaItems(game.value)
          .map((m) => m.url)
          .filter(isStoredMedia)
          .join('|')
      : '',
  )

  let run = 0
  watch(
    storedKey,
    async () => {
      const mine = ++run
      const current = game.value
      const found = current ? await findMissingMedia(current).catch(() => new Set<string>()) : new Set<string>()
      if (mine === run) missing.value = found
    },
    { immediate: true },
  )

  const issues = computed(() => (game.value ? validateGame(game.value, missing.value) : []))
  const errors = computed(() => issues.value.filter((i) => i.severity === 'error').length)
  const warnings = computed(() => issues.value.length - errors.value)

  return { issues, errors, warnings }
}
