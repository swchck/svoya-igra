import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import type { Phase } from '@/composables/usePlaySession'
import type { Player } from '@/types'
import { prefs, resetPrefs } from '@/prefs'
import resultsUrl from '@/assets/sounds/results.mp3'
import correctUrl from '@/assets/sounds/correct.mp3'
import tickUrl from '@/assets/sounds/tick.mp3'
import timeupUrl from '@/assets/sounds/timeup.mp3'
import { playSound, setSoundEffects, setSoundVolume, soundEffectsOn, soundVolume, useStageSounds, useTimerSounds } from './sounds'

const played: { src: string; volume: number }[] = []
const Audio = vi.fn(function (this: Record<string, unknown>, src: string) {
  this.preload = ''
  this.cloneNode = () => {
    const clone = { volume: 1, play: vi.fn(() => Promise.resolve()) }
    clone.play.mockImplementation(() => {
      played.push({ src, volume: clone.volume })
      return Promise.resolve()
    })
    return clone
  }
})

/** Lets the microtask that flushes queued effects run. */
const settle = () => new Promise<void>((r) => queueMicrotask(r))

beforeEach(() => {
  played.length = 0
  localStorage.clear()
  vi.stubGlobal('Audio', Audio)
  setSoundEffects(true)
  setSoundVolume(55)
})
afterEach(() => vi.unstubAllGlobals())

describe('playSound', () => {
  it('plays at the chosen volume', async () => {
    setSoundVolume(30)
    playSound('correct')
    await settle()
    expect(played).toEqual([{ src: correctUrl, volume: 0.3 }])
  })

  it('stays silent when switched off', async () => {
    setSoundEffects(false)
    playSound('correct')
    await settle()
    expect(played).toEqual([])
  })

  it('plays only the highest-priority effect asked for in one tick', async () => {
    playSound('tick')
    playSound('wrong')
    playSound('results')
    playSound('correct')
    await settle()
    expect(played.map((p) => p.src)).toEqual([resultsUrl])
  })

  it('keeps effects from separate ticks apart', async () => {
    playSound('tick')
    await settle()
    playSound('timeup')
    await settle()
    expect(played.map((p) => p.src)).toEqual([tickUrl, timeupUrl])
  })
})

describe('settings', () => {
  it('stores the volume clamped and the on/off switch', () => {
    setSoundVolume(250)
    expect(soundVolume.value).toBe(100)
    expect(localStorage.getItem('svoya-igra:sound-volume')).toBe('100')
    setSoundVolume(-5)
    expect(soundVolume.value).toBe(0)
    setSoundEffects(false)
    expect(soundEffectsOn.value).toBe(false)
    expect(localStorage.getItem('svoya-igra:sound-effects')).toBe('off')
  })

  it('follows changes made in another window', () => {
    window.dispatchEvent(new StorageEvent('storage', { key: 'svoya-igra:sound-volume', newValue: '80' }))
    expect(soundVolume.value).toBe(80)
    window.dispatchEvent(new StorageEvent('storage', { key: 'svoya-igra:sound-effects', newValue: 'off' }))
    expect(soundEffectsOn.value).toBe(false)
  })
})

describe('useStageSounds', () => {
  it('rings only the results fanfare when scoring the final also changes the phase', async () => {
    const phase = ref<Phase>('final-answer')
    const players = ref<Player[]>([{ id: 'a', name: 'A', score: 100 }])
    const scope = effectScope()
    scope.run(() => useStageSounds(() => phase.value, players))

    players.value[0].score = 400
    phase.value = 'results'
    await nextTick()
    await settle()

    expect(played.map((p) => p.src)).toEqual([resultsUrl])
    scope.stop()
  })

  it('plays one verdict sound when a closed question also returns to the board', async () => {
    const phase = ref<Phase>('answer')
    const players = ref<Player[]>([{ id: 'a', name: 'A', score: 0 }])
    const scope = effectScope()
    scope.run(() => useStageSounds(() => phase.value, players))

    players.value[0].score = 200
    phase.value = 'board'
    await nextTick()
    await settle()

    expect(played.map((p) => p.src)).toEqual([correctUrl])
    scope.stop()
  })
})

describe('useTimerSounds', () => {
  function setup(startMs: number) {
    const remaining = ref(startMs)
    const running = ref(true)
    const scope = effectScope()
    scope.run(() => useTimerSounds(remaining, () => running.value))
    return { remaining, running, scope }
  }

  it('ticks through the last seconds and rings at zero', async () => {
    const { remaining, scope } = setup(7000)
    for (const ms of [6500, 5900, 4900, 3000, 1000, 0]) {
      remaining.value = ms
      await nextTick()
      await settle()
    }
    expect(played.map((p) => p.src)).toEqual([tickUrl, tickUrl, tickUrl, timeupUrl])
    scope.stop()
  })

  it('rings without ticking when the tick is turned off', async () => {
    prefs.tickSound = false
    const { remaining, scope } = setup(3000)
    for (const ms of [2000, 1000, 0]) {
      remaining.value = ms
      await nextTick()
      await settle()
    }
    expect(played.map((p) => p.src)).toEqual([timeupUrl])
    scope.stop()
    resetPrefs()
  })

  it('is silent while paused or when the clock is reset', async () => {
    const { remaining, running, scope } = setup(4000)
    running.value = false
    remaining.value = 3000
    await nextTick()
    running.value = true
    remaining.value = 30_000
    await nextTick()
    await settle()
    expect(played).toEqual([])
    scope.stop()
  })
})
