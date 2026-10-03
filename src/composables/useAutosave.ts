import { onScopeDispose, ref, watch, type Ref } from 'vue'

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

/**
 * Debounced deep autosave of the object held by `source`.
 *
 * Replacing the object (e.g. the initial load) is not an edit and does not save;
 * only mutations of the current object do. A pending save is flushed when the
 * owning component or scope is disposed. `save` must not mutate the value,
 * otherwise every save schedules the next one.
 */
export function useAutosave<T extends object>(
  source: Ref<T | null>,
  save: (value: T) => Promise<unknown>,
  delayMs = 400,
) {
  const status = ref<SaveStatus>('idle')
  const error = ref<Error | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  async function flush(): Promise<void> {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    const value = source.value
    if (!value) return
    status.value = 'saving'
    try {
      await save(value)
      if (timer === undefined) status.value = 'saved'
      error.value = null
    } catch (err) {
      status.value = 'error'
      error.value = err instanceof Error ? err : new Error(String(err))
    }
  }

  watch(
    source,
    (value, previous) => {
      if (!value || value !== previous) return
      status.value = 'pending'
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(flush, delayMs)
    },
    { deep: true },
  )

  onScopeDispose(() => {
    if (timer !== undefined) flush()
  })

  return { status, error, flush }
}
