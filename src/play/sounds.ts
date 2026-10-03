import { ref, watch, type Ref } from 'vue'
import type { Phase } from '@/composables/usePlaySession'
import type { Player } from '@/types'
import roundUrl from '@/assets/sounds/round.mp3'
import pickUrl from '@/assets/sounds/pick.mp3'
import specialUrl from '@/assets/sounds/special.mp3'
import revealUrl from '@/assets/sounds/reveal.mp3'
import correctUrl from '@/assets/sounds/correct.mp3'
import wrongUrl from '@/assets/sounds/wrong.mp3'
import finalUrl from '@/assets/sounds/final.mp3'
import resultsUrl from '@/assets/sounds/results.mp3'

/*
 * Game show sound effects, all CC0: the jingles and UI sounds are Kenney's (kenney.nl), taken
 * from the soundcn collection; the round horn ("War Horn Blast" by jocmusic) and the final gong
 * ("Gong.wav" by cdiupe) come from Freesound, trimmed to 7 s with a fade-out.
 * Only the stage plays them; the host window just flips the setting.
 */

const SOUNDS = {
  round: roundUrl,
  pick: pickUrl,
  special: specialUrl,
  reveal: revealUrl,
  correct: correctUrl,
  wrong: wrongUrl,
  final: finalUrl,
  results: resultsUrl,
}
export type SoundName = keyof typeof SOUNDS

// effects sit under question audio and video rather than on top of them
const VOLUME = 0.55
const STORAGE_KEY = 'svoya-igra:sound-effects'

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

/** Whether game sound effects are on; shared by the stage and the host window. */
export const soundEffectsOn = ref(readEnabled())

/** Turns game sound effects on or off in every window of the app. */
export function setSoundEffects(on: boolean): void {
  soundEffectsOn.value = on
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    // applies to this window only
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) soundEffectsOn.value = e.newValue !== 'off'
  })
}

const cache = new Map<SoundName, HTMLAudioElement>()

/** Plays a sound effect unless they are switched off. Never throws. */
export function playSound(name: SoundName): void {
  if (!soundEffectsOn.value || typeof Audio === 'undefined') return
  let base = cache.get(name)
  if (!base) {
    base = new Audio(SOUNDS[name])
    base.preload = 'auto'
    cache.set(name, base)
  }
  // a clone lets the same effect overlap itself, e.g. two scores changing at once
  const audio = base.cloneNode() as HTMLAudioElement
  audio.volume = VOLUME
  audio.play().catch(() => {})
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
