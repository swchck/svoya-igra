import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, reactive } from 'vue'
import type { TimerState } from '@/composables/usePlaySession'
import { useRemaining } from './timer'

afterEach(() => vi.useRealTimers())

describe('useRemaining', () => {
  it('counts down while running and freezes on pause', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const timer = reactive<TimerState>({ endsAt: null, left: 10_000 })
    const scope = effectScope()
    const remaining = scope.run(() => useRemaining(() => timer))!
    expect(remaining.value).toBe(10_000)

    timer.endsAt = 10_000
    await vi.advanceTimersByTimeAsync(3000)
    expect(remaining.value).toBe(7000)

    timer.left = 7000
    timer.endsAt = null
    await vi.advanceTimersByTimeAsync(2000)
    expect(remaining.value).toBe(7000)
    scope.stop()
  })

  it('stops at zero', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const timer = reactive<TimerState>({ endsAt: 1000, left: 1000 })
    const scope = effectScope()
    const remaining = scope.run(() => useRemaining(() => timer))!
    await vi.advanceTimersByTimeAsync(5000)
    expect(remaining.value).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    scope.stop()
  })
})
