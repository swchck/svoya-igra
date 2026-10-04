import { ref, watch, type Ref } from 'vue'
import type { Phase } from '@/composables/usePlaySession'
import type { Player } from '@/types'
import { prefs } from '@/prefs'
import roundUrl from '@/assets/sounds/round.mp3'
import pickUrl from '@/assets/sounds/pick.mp3'
import specialUrl from '@/assets/sounds/special.mp3'
import revealUrl from '@/assets/sounds/reveal.mp3'
import correctUrl from '@/assets/sounds/correct.mp3'
import wrongUrl from '@/assets/sounds/wrong.mp3'
import finalUrl from '@/assets/sounds/final.mp3'
import resultsUrl from '@/assets/sounds/results.mp3'
import tickUrl from '@/assets/sounds/tick.mp3'
import timeupUrl from '@/assets/sounds/timeup.mp3'

/*
 * Game show sound effects, all CC0: the jingles and UI sounds are Kenney's (kenney.nl), taken
 * from the soundcn collection; the round horn ("War Horn Blast" by jocmusic) and the final gong
 * ("Gong.wav" by cdiupe) come from Freesound, trimmed to 7 s with a fade-out.
 * The timer's tick ("tick-002") and time-up bell ("impact-bell-heavy-003") are Kenney's too, from
 * soundcn. Only the stage plays them; the host window just flips the settings.
 */

/** The clock ticks audibly from this many seconds left. */
export const TICK_FROM = 5

const SOUNDS = {
  round: roundUrl,
  pick: pickUrl,
  special: specialUrl,
  reveal: revealUrl,
  correct: correctUrl,
  wrong: wrongUrl,
  final: finalUrl,
  results: resultsUrl,
  tick: tickUrl,
  timeup: timeupUrl,
}
export type SoundName = keyof typeof SOUNDS

const STORAGE_KEY = 'svoya-igra:sound-effects'
const VOLUME_KEY = 'svoya-igra:sound-volume'
// effects sit under question audio and video rather than on top of them
const DEFAULT_VOLUME = 55

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // applies to this window only
  }
}

function parseVolume(raw: string | null): number {
  const n = raw === null ? NaN : Number(raw)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : DEFAULT_VOLUME
}

/** Whether game sound effects are on; shared by the stage and the host window. */
export const soundEffectsOn = ref(read(STORAGE_KEY) !== 'off')

/** Effects volume, 0 to 100; shared like the on/off setting. */
export const soundVolume = ref(parseVolume(read(VOLUME_KEY)))

/** Turns game sound effects on or off in every window of the app. */
export function setSoundEffects(on: boolean): void {
  soundEffectsOn.value = on
  write(STORAGE_KEY, on ? 'on' : 'off')
}

/** Sets the effects volume (0 to 100) in every window of the app. */
export function setSoundVolume(volume: number): void {
  soundVolume.value = parseVolume(String(volume))
  write(VOLUME_KEY, String(soundVolume.value))
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) soundEffectsOn.value = e.newValue !== 'off'
    else if (e.key === VOLUME_KEY) soundVolume.value = parseVolume(e.newValue)
  })
}

const cache = new Map<SoundName, HTMLAudioElement>()

// when effects collide in one tick the louder moment wins: the fanfare over the verdict under it
const PRIORITY: SoundName[] = ['results', 'final', 'round', 'special', 'correct', 'wrong', 'reveal', 'pick', 'timeup', 'tick']
let queued: SoundName | null = null

function flush(): void {
  const name = queued
  queued = null
  if (!name || typeof Audio === 'undefined') return
  let base = cache.get(name)
  if (!base) {
    base = new Audio(SOUNDS[name])
    base.preload = 'auto'
    cache.set(name, base)
  }
  // a clone lets the same effect overlap itself, e.g. two scores changing at once
  const audio = base.cloneNode() as HTMLAudioElement
  audio.volume = soundVolume.value / 100
  audio.play().catch(() => {})
}

/**
 * Plays a sound effect unless they are switched off. Effects asked for in the same tick
 * collapse into the highest-priority one. Never throws.
 */
export function playSound(name: SoundName): void {
  if (!soundEffectsOn.value) return
  if (queued === null) queueMicrotask(flush)
  if (queued === null || PRIORITY.indexOf(name) < PRIORITY.indexOf(queued)) queued = name
}

const ENTER_SOUND: Partial<Record<Phase, SoundName>> = {
  'round-intro': 'round',
  question: 'pick',
  auction: 'special',
  cat: 'special',
  answer: 'reveal',
  'final-intro': 'final',
  'final-answer': 'reveal',
  results: 'results',
}

/** Scores the stage with sound: phase changes and points won or lost. */
export function useStageSounds(phase: () => Phase, players: Ref<Player[]>): void {
  watch(phase, (now, before) => {
    // the auction and the cat already rang when they were picked
    if (now === 'question' && (before === 'auction' || before === 'cat')) return
    const name = ENTER_SOUND[now]
    if (name) playSound(name)
  })

  let scores = new Map(players.value.map((p) => [p.id, p.score]))
  watch(
    players,
    (list) => {
      let gained = false
      let lost = false
      for (const p of list) {
        const was = scores.get(p.id)
        if (was === undefined || was === p.score) continue
        if (p.score > was) gained = true
        else lost = true
      }
      scores = new Map(list.map((p) => [p.id, p.score]))
      // the final settles everyone at once: one sound for the outcome, not one per player
      if (gained) playSound('correct')
      else if (lost) playSound('wrong')
    },
    { deep: true },
  )
}

/** Ticks through the last seconds of the answer clock, unless turned off, and rings when it runs out. */
export function useTimerSounds(remainingMs: Ref<number>, running: () => boolean): void {
  watch(
    () => Math.ceil(remainingMs.value / 1000),
    (sec, before) => {
      if (!running() || sec >= before) return
      if (sec === 0) playSound('timeup')
      else if (sec <= TICK_FROM && prefs.tickSound) playSound('tick')
    },
  )
}
