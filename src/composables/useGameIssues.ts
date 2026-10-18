import { computed, shallowRef, watch, type Ref } from 'vue'
import type { Game } from '../types'
import { mediaItems } from '../game/model'
import { estimateDuration, inspectMedia, validateGame, type MediaFacts } from '../game/validate'
import { isStoredMedia } from '../media/ref'

/** Live pre-flight issues of the game being edited; stored files are re-checked when they change. */
export function useGameIssues(game: Ref<Game | null>) {
  const facts = shallowRef<MediaFacts>({ missing: new Set(), sizes: new Map() })

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
      const empty: MediaFacts = { missing: new Set(), sizes: new Map() }
      const found = current ? await inspectMedia(current).catch(() => empty) : empty
      if (mine === run) facts.value = found
    },
    { immediate: true },
  )

  const issues = computed(() => (game.value ? validateGame(game.value, facts.value) : []))
  const duration = computed(() => (game.value ? estimateDuration(game.value) : 0))
  const errors = computed(() => issues.value.filter((i) => i.severity === 'error').length)
  const warnings = computed(() => issues.value.length - errors.value)

  return { issues, errors, warnings, duration }
}
