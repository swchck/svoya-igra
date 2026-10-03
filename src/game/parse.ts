import type { FinalQuestion, Game, MediaItem, MediaKind, MediaMode, Question } from '../types'
import { uid } from './model'

/** Single-attachment fields that predate media lists; old saves and exports still carry them. */
interface LegacyMedia {
  mediaUrl?: string
  mediaKind?: MediaKind
  mediaMode?: MediaMode
  mediaDuration?: number
}

interface LegacyAnswerMedia {
  answerMediaUrl?: string
  answerMediaKind?: MediaKind
  answerMediaMode?: MediaMode
  answerMediaDuration?: number
}

type StoredQuestion = Question & LegacyMedia & LegacyAnswerMedia
type StoredFinal = FinalQuestion & LegacyMedia

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function mergeMedia(
  list: MediaItem[] | undefined,
  url: string | undefined,
  kind: MediaKind | undefined,
  mode: MediaMode | undefined,
  duration: number | undefined,
): MediaItem[] | undefined {
  const items = (list ?? []).map((m) => ({ ...m, id: m.id || uid('mi_') }))
  if (url && !items.some((m) => m.url === url)) {
    items.unshift({ id: uid('mi_'), url, kind: kind ?? 'image', mode, duration })
  }
  return items.length ? items : undefined
}

function normalizeQuestion(q: StoredQuestion): Question {
  const {
    mediaUrl, mediaKind, mediaMode, mediaDuration,
    answerMediaUrl, answerMediaKind, answerMediaMode, answerMediaDuration,
    ...question
  } = q
  return {
    ...question,
    media: mergeMedia(q.media, mediaUrl, mediaKind, mediaMode, mediaDuration),
    answerMedia: mergeMedia(q.answerMedia, answerMediaUrl, answerMediaKind, answerMediaMode, answerMediaDuration),
  }
}

function normalizeFinal(f: StoredFinal): FinalQuestion {
  const { mediaUrl, mediaKind, mediaMode, mediaDuration, ...final } = f
  return { ...final, media: mergeMedia(f.media, mediaUrl, mediaKind, mediaMode, mediaDuration) }
}

/**
 * Validates the shape of a game read from storage or a file and brings it to the
 * current format.
 *
 * @throws Error with a user-facing message when the data is not a game.
 */
export function parseGame(data: unknown): Game {
  const invalid = () => new Error('Файл повреждён или это не игра')
  if (!isObject(data) || typeof data.id !== 'string' || !Array.isArray(data.rounds)) throw invalid()
  for (const r of data.rounds) {
    if (!isObject(r) || !Array.isArray(r.themes)) throw invalid()
    for (const t of r.themes) {
      if (!isObject(t) || !Array.isArray(t.questions) || !t.questions.every(isObject)) throw invalid()
    }
  }
  if (data.finalRound !== undefined && !isObject(data.finalRound)) throw invalid()

  const game = data as unknown as Game & { rounds: { themes: { questions: StoredQuestion[] }[] }[]; finalRound?: StoredFinal }
  return {
    ...game,
    rounds: game.rounds.map((r) => ({
      ...r,
      themes: r.themes.map((t) => ({ ...t, questions: t.questions.map(normalizeQuestion) })),
    })),
    finalRound: game.finalRound && normalizeFinal(game.finalRound),
  }
}
