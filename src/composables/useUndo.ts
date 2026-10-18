import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'
import type { Game } from '../types'

/** Steps kept each way; a step is the whole game as JSON, a few KB without media. */
export const MAX_UNDO = 100
/** Edits closer together than this make one step, so typing a word undoes as a word. */
export const UNDO_SETTLE_MS = 600

/**
 * Undo and redo for the game being edited. Edits are recorded once they settle; undoing
 * writes the earlier state back into the same object, so autosave stores it like any edit.
 * Loading another game or restoring a snapshot replaces the object and starts afresh.
 */
export function useUndo(game: Ref<Game | null>, settleMs = UNDO_SETTLE_MS) {
  const past = ref<string[]>([])
  const future = ref<string[]>([])
  let current: string | null = null
  let applying = false
  let timer: ReturnType<typeof setTimeout> | undefined
  /** An edit is waiting to settle into a step. */
  const pending = ref(false)

  const serialize = (g: Game) => JSON.stringify({ ...g, updatedAt: 0 })

  function commit() {
    clearTimeout(timer)
    timer = undefined
    pending.value = false
    const g = game.value
    if (!g) return
    const next = serialize(g)
    if (current === null || next === current) {
      current = next
      return
    }
    past.value.push(current)
    if (past.value.length > MAX_UNDO) past.value.shift()
    future.value = []
    current = next
  }

  watch(
    game,
    (value, previous) => {
      if (!value) return
      if (value !== previous) {
        clearTimeout(timer)
        timer = undefined
        pending.value = false
        past.value = []
        future.value = []
        current = serialize(value)
        return
      }
      if (applying) return
      clearTimeout(timer)
      timer = setTimeout(commit, settleMs)
      pending.value = true
    },
    { deep: true, immediate: true },
  )

  function apply(state: string) {
    const g = game.value
    if (!g) return
    const data = JSON.parse(state) as Record<string, unknown>
    const target = g as unknown as Record<string, unknown>
    applying = true
    for (const key of Object.keys(target)) if (!(key in data) && key !== 'updatedAt') delete target[key]
    for (const [key, value] of Object.entries(data)) if (key !== 'updatedAt' && key !== 'id') target[key] = value
    current = state
    // the deep watcher runs after this tick; it must see the flag still up
    queueMicrotask(() => (applying = false))
  }

  /** Takes back the last step; returns false when there is none. */
  function undo(): boolean {
    commit()
    const state = past.value.pop()
    if (state === undefined || current === null) return false
    future.value.push(current)
    apply(state)
    return true
  }

  /** Does again what undo took back; returns false when there is nothing to redo. */
  function redo(): boolean {
    commit()
    const state = future.value.pop()
    if (state === undefined || current === null) return false
    past.value.push(current)
    apply(state)
    return true
  }

  onScopeDispose(() => clearTimeout(timer))

  return {
    undo,
    redo,
    canUndo: computed(() => past.value.length > 0 || pending.value),
    canRedo: computed(() => future.value.length > 0),
  }
}
