import type { FinalQuestion, Game, MediaItem, Question } from '../types'
import { isStoredMedia } from '../media/ref'
import { getMedia } from '../media/store'
import { mediaItems } from './model'
import { parseYoutubeUrl } from './youtube'

export type IssueSeverity = 'error' | 'warning'

export type IssueCode =
  | 'empty-round'
  | 'empty-theme-name'
  | 'empty-question'
  | 'no-question'
  | 'no-answer'
  | 'bad-youtube'
  | 'bad-segment'
  | 'missing-media'

/** A problem found before playing, with where it sits in the game. */
export interface Issue {
  code: IssueCode
  severity: IssueSeverity
  /** Round, theme and question ids; all unset for the final. */
  roundId?: string
  themeId?: string
  questionId?: string
  final?: boolean
  roundName?: string
  themeName?: string
  value?: number
  /** Which side of the card a media problem is on. */
  side?: 'question' | 'answer'
}

type Place = Pick<Issue, 'roundId' | 'themeId' | 'questionId' | 'final' | 'roundName' | 'themeName' | 'value'>

const SEVERITY: Record<IssueCode, IssueSeverity> = {
  'empty-round': 'error',
  'empty-theme-name': 'warning',
  'empty-question': 'error',
  'no-question': 'error',
  'no-answer': 'warning',
  'bad-youtube': 'error',
  'bad-segment': 'warning',
  'missing-media': 'error',
}

function issue(code: IssueCode, place: Place, side?: Issue['side']): Issue {
  return { code, severity: SEVERITY[code], ...place, ...(side && { side }) }
}

function mediaIssues(items: MediaItem[] | undefined, place: Place, side: 'question' | 'answer', missing: ReadonlySet<string>): Issue[] {
  const out: Issue[] = []
  for (const m of items ?? []) {
    if (missing.has(m.url)) out.push(issue('missing-media', place, side))
    const link = m.kind === 'youtube' ? parseYoutubeUrl(m.url) : null
    if (m.kind === 'youtube' && !link) out.push(issue('bad-youtube', place, side))
    // an end before the start is ignored on play, so the clip silently runs to its end
    if (m.kind !== 'image' && m.end !== undefined && m.end <= (m.start ?? link?.start ?? 0)) out.push(issue('bad-segment', place, side))
  }
  return out
}

function cardIssues(card: Question | FinalQuestion, place: Place, missing: ReadonlySet<string>): Issue[] {
  const hasQuestion = !!card.text.trim() || !!card.media?.length
  const hasAnswer = !!card.answer.trim() || !!card.answerMedia?.length
  const out: Issue[] = []
  if (!hasQuestion && !hasAnswer && !place.final) out.push(issue('empty-question', place))
  else {
    if (!hasQuestion) out.push(issue('no-question', place))
    if (!hasAnswer) out.push(issue('no-answer', place))
  }
  return [...out, ...mediaIssues(card.media, place, 'question', missing), ...mediaIssues(card.answerMedia, place, 'answer', missing)]
}

/** Lists the game's issues in reading order; `missing` is what findMissingMedia returned. */
export function validateGame(game: Game, missing: ReadonlySet<string> = new Set()): Issue[] {
  const out: Issue[] = []
  for (const round of game.rounds) {
    const roundPlace = { roundId: round.id, roundName: round.name }
    if (!round.themes.some((th) => th.questions.length)) {
      out.push(issue('empty-round', roundPlace))
      continue
    }
    for (const theme of round.themes) {
      const themePlace = { ...roundPlace, themeId: theme.id, themeName: theme.name }
      if (!theme.name.trim()) out.push(issue('empty-theme-name', themePlace))
      for (const q of theme.questions) out.push(...cardIssues(q, { ...themePlace, questionId: q.id, value: q.value }, missing))
    }
  }
  if (game.finalRound) out.push(...cardIssues(game.finalRound, { final: true }, missing))
  return out
}

/** Returns the stored media URLs of the game whose file is gone; `lookup` reads the media store. */
export async function findMissingMedia(game: Game, lookup: (url: string) => Promise<Blob | null> = getMedia): Promise<Set<string>> {
  const urls = [...new Set(mediaItems(game).map((m) => m.url).filter(isStoredMedia))]
  const found = await Promise.all(urls.map(async (url) => ((await lookup(url)) ? null : url)))
  return new Set(found.filter((url) => url !== null))
}
