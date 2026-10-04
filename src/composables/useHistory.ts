import { watch, type Ref } from 'vue'
import type { Game } from '../types'
import { takeSnapshot, type SnapshotReason } from '../history'
import type { SaveStatus } from './useAutosave'

/** Minimum gap between snapshots taken on their own while editing. */
export const AUTO_SNAPSHOT_MS = 5 * 60_000

/**
 * Takes history snapshots of the game being edited: once it is loaded, then after a save
 * once the last one is old enough. `snapshot` is for moments the caller picks, such as
 * right before something destructive. A failed snapshot never gets in the way of editing.
 */
export function useHistory(game: Ref<Game | null>, saveStatus: Ref<SaveStatus>) {
  let lastAt = 0

  async function snapshot(reason: SnapshotReason): Promise<void> {
    if (!game.value) return
    lastAt = Date.now()
    try {
      await takeSnapshot(game.value, reason)
    } catch {
      // history is a safety net: a full disk must not stop the edit it was meant to protect
    }
  }

  // the id only changes when another game loads; a restore keeps it
  watch(
    () => game.value?.id,
    (id) => {
      if (id) void snapshot('open')
    },
    { immediate: true },
  )
  watch(saveStatus, (status) => {
    if (status === 'saved' && Date.now() - lastAt >= AUTO_SNAPSHOT_MS) void snapshot('auto')
  })

  return { snapshot }
}
