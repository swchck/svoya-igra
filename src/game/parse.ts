import { ACCENT_NAMES, type FinalQuestion, type Game, type GameSettings, type MediaItem, type MediaKind, type MediaMode, type Question } from '../types'
import { t } from '../i18n'
import { uid } from './model'
import { parseYoutubeUrl } from './youtube'

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

/** `duration` counted seconds from the start before media got a free start and end. */
type StoredMediaItem = MediaItem & { duration?: number }

type StoredQuestion = Question & LegacyMedia & LegacyAnswerMedia
type StoredFinal = FinalQuestion & LegacyMedia

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function upgradeItem({ duration, ...item }: StoredMediaItem): MediaItem {
  if (!duration || item.end !== undefined) return item
  const from = item.start ?? (item.kind === 'youtube' ? parseYoutubeUrl(item.url)?.start ?? 0 : 0)
  return { ...item, end: from + duration }
}

function mergeMedia(
  list: StoredMediaItem[] | undefined,
  url: string | undefined,
  kind: MediaKind | undefined,
  mode: MediaMode | undefined,
  duration: number | undefined,
): MediaItem[] | undefined {
  const items = (list ?? []).map((m) => upgradeItem({ ...m, id: m.id || uid('mi_') }))
  if (url && !items.some((m) => m.url === url)) {
    items.unshift(upgradeItem({ id: uid('mi_'), url, kind: kind ?? 'image', mode, duration }))
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

export const MAX_ANSWER_SECONDS = 600

/** Keeps the settings that make sense and drops the rest; undefined when nothing is left. */
function normalizeSettings(raw: unknown): GameSettings | undefined {
  if (!isObject(raw)) return undefined
  const out: GameSettings = {}
  const seconds = typeof raw.answerSeconds === 'number' ? Math.round(raw.answerSeconds) : 0
  if (seconds > 0) out.answerSeconds = Math.min(seconds, MAX_ANSWER_SECONDS)
  if (raw.timerAutoStart === true) out.timerAutoStart = true
  if (ACCENT_NAMES.includes(raw.accent as never)) out.accent = raw.accent as GameSettings['accent']
  if (isObject(raw.logo) && typeof raw.logo.url === 'string' && raw.logo.url) {
    out.logo = { id: typeof raw.logo.id === 'string' ? raw.logo.id : uid('mi_'), url: raw.logo.url, kind: 'image' }
  }
  if (typeof raw.introText === 'string' && raw.introText.trim()) out.introText = raw.introText
  return Object.keys(out).length ? out : undefined
}

/**
 * Validates the shape of a game read from storage or a file and brings it to the
 * current format.
 *
 * @throws Error with a user-facing message when the data is not a game.
 */
export function parseGame(data: unknown): Game {
  const invalid = () => new Error(t('system.errors.invalidGame'))
  if (!isObject(data) || typeof data.id !== 'string' || !Array.isArray(data.rounds)) throw invalid()
  for (const r of data.rounds) {
    if (!isObject(r) || !Array.isArray(r.themes)) throw invalid()
    for (const t of r.themes) {
      if (!isObject(t) || !Array.isArray(t.questions) || !t.questions.every(isObject)) throw invalid()
    }
  }
  if (data.finalRound !== undefined && !isObject(data.finalRound)) throw invalid()

  const game = data as unknown as Game & { rounds: { themes: { questions: StoredQuestion[] }[] }[]; finalRound?: StoredFinal }
  const { settings: raw, ...rest } = game
  const settings = normalizeSettings(raw)
  return {
    ...rest,
    ...(settings && { settings }),
    rounds: game.rounds.map((r) => ({
      ...r,
      themes: r.themes.map((t) => ({ ...t, questions: t.questions.map(normalizeQuestion) })),
    })),
    finalRound: game.finalRound && normalizeFinal(game.finalRound),
  }
}
