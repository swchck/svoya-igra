import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import type { Game } from '../types'
import { makeEmptyGame } from '../game/model'
import { takeSnapshot } from '../history'
import type { SaveStatus } from './useAutosave'
import { AUTO_SNAPSHOT_MS, useHistory } from './useHistory'

vi.mock('../history', () => ({ takeSnapshot: vi.fn(async () => true) }))

function setup() {
  const game = ref<Game | null>(null)
  const status = ref<SaveStatus>('idle')
  const scope = effectScope()
  const history = scope.run(() => useHistory(game, status))!
  return { game, status, history, scope }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(takeSnapshot).mockReset().mockResolvedValue(true)
})
afterEach(() => vi.useRealTimers())

describe('useHistory', () => {
  it('snapshots when the game loads, not before', async () => {
    const { game, scope } = setup()
    await nextTick()
    expect(takeSnapshot).not.toHaveBeenCalled()

    game.value = makeEmptyGame()
    await nextTick()

    expect(takeSnapshot).toHaveBeenCalledWith(game.value, 'open')
    scope.stop()
  })

  it('snapshots after a save only once the last one is old enough', async () => {
    const { game, status, scope } = setup()
    game.value = makeEmptyGame()
    await nextTick()
    vi.mocked(takeSnapshot).mockClear()

    vi.advanceTimersByTime(AUTO_SNAPSHOT_MS - 1000)
    status.value = 'saved'
    await nextTick()
    expect(takeSnapshot).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    status.value = 'pending'
    await nextTick()
    status.value = 'saved'
    await nextTick()
    expect(takeSnapshot).toHaveBeenCalledTimes(1)
    expect(takeSnapshot).toHaveBeenCalledWith(game.value, 'auto')

    status.value = 'pending'
    await nextTick()
    status.value = 'saved'
    await nextTick()
    expect(takeSnapshot).toHaveBeenCalledTimes(1)
    scope.stop()
  })

  it('ignores other save states', async () => {
    const { game, status, scope } = setup()
    game.value = makeEmptyGame()
    await nextTick()
    vi.mocked(takeSnapshot).mockClear()
    vi.advanceTimersByTime(AUTO_SNAPSHOT_MS * 2)

    for (const s of ['pending', 'saving', 'error'] as const) {
      status.value = s
      await nextTick()
    }

    expect(takeSnapshot).not.toHaveBeenCalled()
    scope.stop()
  })

  it('takes a snapshot on demand, whatever the interval', async () => {
    const { game, history, scope } = setup()
    game.value = makeEmptyGame()
    await nextTick()

    await history.snapshot('before-delete')

    expect(takeSnapshot).toHaveBeenLastCalledWith(game.value, 'before-delete')
    scope.stop()
  })

  it('does not rethrow when storing fails', async () => {
    const { game, history, scope } = setup()
    game.value = makeEmptyGame()
    await nextTick()
    vi.mocked(takeSnapshot).mockRejectedValueOnce(new Error('quota'))

    await expect(history.snapshot('before-delete')).resolves.toBeUndefined()
    scope.stop()
  })

  it('does nothing without a game', async () => {
    const { history, scope } = setup()

    await history.snapshot('before-delete')

    expect(takeSnapshot).not.toHaveBeenCalled()
    scope.stop()
  })
})
