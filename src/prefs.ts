import { reactive, watch } from 'vue'
import type { AccentName } from './types'

/*
 * App-wide preferences: how this copy of the app behaves, as opposed to a game's own
 * settings. Kept in localStorage and mirrored across windows, so the stage and the host
 * window always agree.
 */

/** Who picks the first question of the game. */
export type FirstChooser = 'random' | 'first' | 'host'
/** When the phone buttons open on a question. */
export type BuzzOpen = 'question' | 'host' | 'timer'
/** How hard pictures are shrunk when added to a game. */
export type ImageQuality = 'original' | 'normal' | 'strong'

export interface Prefs {
  /** Seconds to answer in a new game; 0 means no timer. */
  answerSeconds: number
  /** A new game starts the timer as soon as a question appears. */
  timerAutoStart: boolean
  /** The look a new game starts with. */
  accent: AccentName
  /** A wrong answer costs the question's value; off means it costs nothing. */
  wrongPenalty: boolean
  firstChooser: FirstChooser
  buzzOpen: BuzzOpen
  /** No confetti, flying cells or shaking podiums, whatever the system says. */
  reducedMotion: boolean
  /** Stage text size as a factor of the default, 0.8 to 1.4. */
  stageScale: number
  /** Hide the pointer over the stage while the mouse rests. */
  hideCursor: boolean
  /** Desktop: the monitor's name the stage goes to; null keeps the current one. */
  stageMonitor: string | null
  /** Desktop: the stage window goes full screen when a game starts. */
  stageFullscreen: boolean
  /** Volume of question audio and video, 0 to 100. */
  mediaVolume: number
  /** The timer ticks through its last seconds. */
  tickSound: boolean
  /** The phone room keeps one code across games, so saved links keep working. */
  fixedRoomCode: boolean
  /** Phones buzz in the hand when their player is first. */
  phoneVibration: boolean
  imageQuality: ImageQuality
}

export const DEFAULT_PREFS: Readonly<Prefs> = Object.freeze({
  answerSeconds: 0,
  timerAutoStart: false,
  accent: 'gold',
  wrongPenalty: true,
  firstChooser: 'random',
  buzzOpen: 'question',
  reducedMotion: false,
  stageScale: 1,
  hideCursor: true,
  stageMonitor: null,
  stageFullscreen: false,
  mediaVolume: 100,
  tickSound: true,
  fixedRoomCode: false,
  phoneVibration: true,
  imageQuality: 'normal',
})

const STORAGE_KEY = 'svoya-igra:prefs'

/** Keeps known keys whose stored value has the default's type; drops the rest. */
export function parsePrefs(raw: string | null): Prefs {
  const out: Prefs = { ...DEFAULT_PREFS }
  let stored: unknown
  try {
    stored = raw ? JSON.parse(raw) : null
  } catch {
    return out
  }
  if (!stored || typeof stored !== 'object') return out
  const target = out as unknown as Record<string, unknown>
  for (const [key, value] of Object.entries(stored)) {
    if (!(key in DEFAULT_PREFS)) continue
    const fallback = (DEFAULT_PREFS as unknown as Record<string, unknown>)[key]
    if (fallback === null ? value === null || typeof value === 'string' : typeof value === typeof fallback) target[key] = value
  }
  return out
}

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** The live preferences; assign to a field to change and remember it. */
export const prefs = reactive<Prefs>(parsePrefs(read()))

let applying = false
watch(
  prefs,
  (value) => {
    if (applying) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // this window keeps the change, the next start won't
    }
  },
  { deep: true },
)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return
    applying = true
    Object.assign(prefs, parsePrefs(e.newValue))
    // the watcher runs after this tick; let it see the flag first
    queueMicrotask(() => (applying = false))
  })
}

/** Puts every preference back to its default. */
export function resetPrefs(): void {
  Object.assign(prefs, DEFAULT_PREFS)
}
