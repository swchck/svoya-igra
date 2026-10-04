export type QuestionKind = 'normal' | 'auction' | 'cat-in-bag'
export type MediaKind = 'image' | 'audio' | 'video' | 'youtube'
export type MediaMode = 'video' | 'audio'

/** A picture, sound or clip attached to a question or an answer. */
export interface MediaItem {
  id: string
  /** data:, http(s): or same-origin URL. */
  url: string
  kind: MediaKind
  /** YouTube only: show the video or play its sound behind a cover. */
  mode?: MediaMode
  /** Where playback starts, in seconds; unset is the beginning (or a YouTube link's `t`). */
  start?: number
  /** Where playback stops, in seconds from the beginning; unset plays to the end. */
  end?: number
}

export interface Question {
  id: string
  value: number
  kind: QuestionKind
  /** Points at stake for a cat-in-bag question, when they differ from `value`. */
  catValue?: number
  text: string
  media?: MediaItem[]
  answer: string
  answerMedia?: MediaItem[]
}

export interface Theme {
  id: string
  name: string
  questions: Question[]
}

export interface Round {
  id: string
  name: string
  themes: Theme[]
}

export interface FinalQuestion {
  id: string
  theme: string
  text: string
  media?: MediaItem[]
  answer: string
  answerMedia?: MediaItem[]
}

export const ACCENT_NAMES = ['gold', 'ruby', 'emerald', 'sapphire'] as const
export type AccentName = (typeof ACCENT_NAMES)[number]

/** Per-game options for the timer and the look of the stage. */
export interface GameSettings {
  /** Seconds to answer; unset or 0 means no timer. */
  answerSeconds?: number
  /** Start the timer as soon as a question appears. */
  timerAutoStart?: boolean
  accent?: AccentName
  /** Shown on the title screen and small in a stage corner. */
  logo?: MediaItem
  /** Shown on the title screen under the title. */
  introText?: string
}

export interface Game {
  id: string
  title: string
  subtitle?: string
  rounds: Round[]
  finalRound?: FinalQuestion
  settings?: GameSettings
  /** Unix time, ms. */
  createdAt: number
  /** Unix time, ms. */
  updatedAt: number
}

export interface Player {
  id: string
  name: string
  score: number
  /** Id from the player palette; unset players get one by their place in the list. */
  color?: string
  /** An emoji shown by the name. */
  avatar?: string
}
