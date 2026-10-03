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
  /** Seconds of playback before stopping; unset plays to the end. */
  duration?: number
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

export interface Game {
  id: string
  title: string
  subtitle?: string
  rounds: Round[]
  finalRound?: FinalQuestion
  /** Unix time, ms. */
  createdAt: number
  /** Unix time, ms. */
  updatedAt: number
}

export interface Player {
  id: string
  name: string
  score: number
}
