import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useAutosave } from './useAutosave'

interface Doc { title: string; updatedAt: number }

function setup(save: (d: Doc) => Promise<unknown>) {
  const source = ref<Doc | null>(null)
  const scope = effectScope()
  const autosave = scope.run(() => useAutosave(source, save, 100))!
  return { source, autosave, scope }
}

describe('useAutosave', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('does not save when the document is loaded', async () => {
    const save = vi.fn(async () => {})
    const { source } = setup(save)

    source.value = { title: 'a', updatedAt: 0 }
    await nextTick()
    await vi.advanceTimersByTimeAsync(1000)

    expect(save).not.toHaveBeenCalled()
  })

  it('debounces a burst of edits into one save', async () => {
    const save = vi.fn(async () => {})
    const { source, autosave } = setup(save)
    source.value = { title: 'a', updatedAt: 0 }
    await nextTick()

    source.value.title = 'ab'
    await nextTick()
    source.value.title = 'abc'
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)

    expect(save).toHaveBeenCalledTimes(1)
    expect(autosave.status.value).toBe('saved')
  })

  it('goes quiet after a save', async () => {
    const save = vi.fn(async () => {})
    const { source } = setup(save)
    source.value = { title: 'a', updatedAt: 0 }
    await nextTick()

    source.value.title = 'b'
    await nextTick()
    await vi.advanceTimersByTimeAsync(5000)

    expect(save).toHaveBeenCalledTimes(1)
  })

  it('reports failures', async () => {
    const { source, autosave } = setup(async () => { throw new Error('quota') })
    source.value = { title: 'a', updatedAt: 0 }
    await nextTick()

    source.value.title = 'b'
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)

    expect(autosave.status.value).toBe('error')
    expect(autosave.error.value?.message).toBe('quota')
  })

  it('flushes a pending save when the owner goes away', async () => {
    const save = vi.fn(async () => {})
    const { source, scope } = setup(save)
    source.value = { title: 'a', updatedAt: 0 }
    await nextTick()

    source.value.title = 'b'
    await nextTick()
    scope.stop()

    expect(save).toHaveBeenCalledTimes(1)
  })
})
