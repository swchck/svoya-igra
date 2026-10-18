/**
 * Who answers and for how much: `normal` goes to the first buzzer, `auction` to the highest
 * bidder, `cat-in-bag` to whoever the chooser hands it, `no-risk` to the chooser with no loss
 * for a wrong answer, `all-in` to one player betting everything they have, `for-all` to every
 * player at once, each scored on their own.
 */
export type QuestionKind = 'normal' | 'auction' | 'cat-in-bag' | 'no-risk' | 'all-in' | 'for-all'
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
  /** Pictures only: blurred while the question is up, shown clear with the answer. */
  blur?: boolean
}

/** What only the host sees: other ways to give the answer and notes for judging. */
export interface HostInfo {
  /** Other answers that count, besides `answer`. */
  accepted?: string[]
  /** Close answers that do not count. */
  rejected?: string[]
  /** Plain text: sources, how to judge, a story to tell after the answer. */
  notes?: string
}

/** One more clue of a question asked in parts, shown when the host opens it. */
export interface Hint {
  id: string
  text: string
  media?: MediaItem[]
}

export interface Question extends HostInfo {
  id: string
  value: number
  kind: QuestionKind
  /** Points at stake for a cat-in-bag question, when they differ from `value`. */
  catValue?: number
  text: string
  media?: MediaItem[]
  answer: string
  answerMedia?: MediaItem[]
  /** The author marked it as still in the works, however complete it looks. */
  draft?: true
  /** Choices shown with the question, A, B, C…; unset for an open question. */
  options?: string[]
  /** Index into `options` of the right one. */
  correctOption?: number
  /** Clues opened one by one after the question; each one lowers what it is worth. */
  hints?: Hint[]
  /** Seconds to answer, overriding the round and the game; 0 means no timer. */
  seconds?: number
}

export interface Theme {
  id: string
  name: string
  questions: Question[]
  /** What the host says about the theme when the round opens; players see it on the intro. */
  comment?: string
}

/** A round's own rules; anything unset follows the game and the house rules. */
export interface RoundRules {
  /** Seconds to answer; 0 means no timer. */
  answerSeconds?: number
  wrongPenalty?: boolean
}

export interface Round {
  id: string
  name: string
  themes: Theme[]
  rules?: RoundRules
}

export interface FinalQuestion extends HostInfo {
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
  /** Themes of the final, one question each; players strike them out until one is left. Unset: no final. */
  finalThemes?: FinalQuestion[]
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
