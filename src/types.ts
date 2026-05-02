export type QuestionKind = 'normal' | 'auction' | 'cat-in-bag'
export type MediaKind = 'image' | 'audio' | 'video' | 'youtube'
export type MediaMode = 'video' | 'audio'

export interface MediaItem {
  id: string
  url: string
  kind: MediaKind
  /** For YouTube embeds */
  mode?: MediaMode
  /** Auto-stop after N seconds */
  duration?: number
}

export interface Question {
  id: string
  value: number
  kind: QuestionKind
  catValue?: number
  text: string
  /** Несколько медиа к вопросу */
  media?: MediaItem[]
  answer: string
  /** Несколько медиа к ответу */
  answerMedia?: MediaItem[]

  /* === legacy fields (для совместимости со старыми играми / JSON) === */
  mediaUrl?: string
  mediaKind?: MediaKind
  mediaMode?: MediaMode
  mediaDuration?: number
  answerMediaUrl?: string
  answerMediaKind?: MediaKind
  answerMediaMode?: MediaMode
  answerMediaDuration?: number
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

  /* legacy */
  mediaUrl?: string
  mediaKind?: MediaKind
  mediaMode?: MediaMode
  mediaDuration?: number
}

export interface Game {
  id: string
  title: string
  subtitle?: string
  rounds: Round[]
  finalRound?: FinalQuestion
  createdAt: number
  updatedAt: number
}

export interface Player {
  id: string
  name: string
  score: number
}

/** Runtime state of a play-through (kept in memory) */
export interface PlayState {
  gameId: string
  players: Player[]
  currentRoundIndex: number
  /** Set of question ids already played */
  played: Record<string, true>
  /** Currently picked question id, if any */
  activeQuestionId: string | null
  phase: 'title' | 'round-intro' | 'board' | 'question' | 'answer' | 'final-intro' | 'final-question' | 'final-answer' | 'results'
}
