import type { FinalQuestion, Game, MediaItem, Question } from '../types'
import { isStoredMedia } from '../media/ref'
import { getMedia } from '../media/store'
import { hasChoice } from './kinds'
import { markdownToPlain } from '../lib/markdown'
import { mediaItems } from './model'
import { parseYoutubeUrl } from './youtube'

type IssueSeverity = 'error' | 'warning'

type IssueCode =
  | 'empty-round'
  | 'empty-theme-name'
  | 'empty-question'
  | 'no-question'
  | 'no-answer'
  | 'bad-youtube'
  | 'bad-segment'
  | 'missing-media'
  | 'draft'
  | 'bad-options'
  | 'empty-hint'
  | 'long-text'
  | 'heavy-media'
  | 'duplicate-question'

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
  draft: 'warning',
  'bad-options': 'error',
  'empty-hint': 'warning',
  'long-text': 'warning',
  'heavy-media': 'warning',
  'duplicate-question': 'warning',
}

/** Past this many characters the stage shrinks a question's text below comfortable reading. */
export const LONG_TEXT = 280
/** The same, with pictures or clips sharing the card. */
export const LONG_TEXT_WITH_MEDIA = 140
/** A single file this large bloats the game file and is slow to share; bytes. */
export const HEAVY_MEDIA_BYTES = 25 * 1024 * 1024
/** Texts shorter than this ("Кто это?") repeat by design and are not flagged. */
const DUPLICATE_MIN_CHARS = 12

/** What is known about the game's stored files: the ones gone and the size of the rest. */
export interface MediaFacts {
  missing: ReadonlySet<string>
  /** Bytes per stored URL. */
  sizes: ReadonlyMap<string, number>
}

const NO_FACTS: MediaFacts = { missing: new Set(), sizes: new Map() }

function issue(code: IssueCode, place: Place, side?: Issue['side']): Issue {
  return { code, severity: SEVERITY[code], ...place, ...(side && { side }) }
}

function mediaIssues(items: MediaItem[] | undefined, place: Place, side: 'question' | 'answer', facts: MediaFacts): Issue[] {
  const out: Issue[] = []
  for (const m of items ?? []) {
    if (facts.missing.has(m.url)) out.push(issue('missing-media', place, side))
    if ((facts.sizes.get(m.url) ?? 0) > HEAVY_MEDIA_BYTES) out.push(issue('heavy-media', place, side))
    const link = m.kind === 'youtube' ? parseYoutubeUrl(m.url) : null
    if (m.kind === 'youtube' && !link) out.push(issue('bad-youtube', place, side))
    // an end before the start is ignored on play, so the clip silently runs to its end
    if (m.kind !== 'image' && m.end !== undefined && m.end <= (m.start ?? link?.start ?? 0)) out.push(issue('bad-segment', place, side))
  }
  return out
}

function cardIssues(card: Question | FinalQuestion, place: Place, facts: MediaFacts): Issue[] {
  const hasQuestion = !!card.text.trim() || !!card.media?.length
  const hasAnswer = !!card.answer.trim() || !!card.answerMedia?.length || ('options' in card && hasChoice(card))
  const out: Issue[] = []
  // a choice nobody can see or none marked right can't be scored, by the phones or the host
  if ('options' in card && card.options && (card.options.filter((o) => o.trim()).length < 2 || !hasChoice(card))) {
    out.push(issue('bad-options', place))
  }
  if (!hasQuestion && !hasAnswer && !place.final) out.push(issue('empty-question', place))
  else {
    if (!hasQuestion) out.push(issue('no-question', place))
    if (!hasAnswer) out.push(issue('no-answer', place))
  }
  const hints = 'hints' in card ? (card.hints ?? []) : []
  if (hints.some((h) => !h.text.trim() && !h.media?.length)) out.push(issue('empty-hint', place))
  if (markdownToPlain(card.text).length > (card.media?.length ? LONG_TEXT_WITH_MEDIA : LONG_TEXT)) out.push(issue('long-text', place))
  return [
    ...out,
    ...mediaIssues(card.media, place, 'question', facts),
    ...hints.flatMap((h) => mediaIssues(h.media, place, 'question', facts)),
    ...mediaIssues(card.answerMedia, place, 'answer', facts),
  ]
}

function normalized(text: string): string {
  return markdownToPlain(text).toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

/** Lists the game's issues in reading order; `facts` is what inspectMedia found. */
export function validateGame(game: Game, facts: MediaFacts = NO_FACTS): Issue[] {
  const out: Issue[] = []
  const seen = new Set<string>()
  for (const round of game.rounds) {
    const roundPlace = { roundId: round.id, roundName: round.name }
    if (!round.themes.some((th) => th.questions.length)) {
      out.push(issue('empty-round', roundPlace))
      continue
    }
    for (const theme of round.themes) {
      const themePlace = { ...roundPlace, themeId: theme.id, themeName: theme.name }
      if (!theme.name.trim()) out.push(issue('empty-theme-name', themePlace))
      for (const q of theme.questions) {
        const place = { ...themePlace, questionId: q.id, value: q.value }
        if (q.draft) out.push(issue('draft', place))
        out.push(...cardIssues(q, place, facts))
        // the same words over different pictures ("Whose flag is this?") are different questions
        const text = normalized(q.text)
        const key = `${text}|${(q.media ?? []).map((m) => m.url).join('|')}`
        if (text.length >= DUPLICATE_MIN_CHARS) {
          if (seen.has(key)) out.push(issue('duplicate-question', place))
          seen.add(key)
        }
      }
    }
  }
  for (const f of game.finalThemes ?? []) {
    const place = { final: true, themeId: f.id, themeName: f.theme }
    if (!f.theme.trim()) out.push(issue('empty-theme-name', place))
    out.push(...cardIssues(f, place, facts))
  }
  return out
}

/** Looks up every stored file of the game: which are gone, and how big the rest are. */
export async function inspectMedia(game: Game, lookup: (url: string) => Promise<Blob | null> = getMedia): Promise<MediaFacts> {
  const urls = [...new Set(mediaItems(game).map((m) => m.url).filter(isStoredMedia))]
  const missing = new Set<string>()
  const sizes = new Map<string, number>()
  await Promise.all(
    urls.map(async (url) => {
      const blob = await lookup(url)
      if (blob) sizes.set(url, blob.size)
      else missing.add(url)
    }),
  )
  return { missing, sizes }
}

/** Seconds a round question takes on average: picking, reading, answering, the verdict. */
export const SECONDS_PER_QUESTION = 40
/** A clip of unknown length is counted as this long. */
const UNKNOWN_CLIP_SECONDS = 30
/** The final: bets, the question, the answers and the results. */
const FINAL_SECONDS = 150

function clipSeconds(items: MediaItem[] | undefined): number {
  let total = 0
  for (const m of items ?? []) {
    if (m.kind === 'image') continue
    total += m.end !== undefined ? Math.max(0, m.end - (m.start ?? 0)) : UNKNOWN_CLIP_SECONDS
  }
  return total
}

/** Roughly how long the game plays, in seconds; good for planning an evening, not a stopwatch. */
export function estimateDuration(game: Game): number {
  let total = 0
  for (const round of game.rounds) {
    for (const theme of round.themes) {
      for (const q of theme.questions) total += SECONDS_PER_QUESTION + clipSeconds(q.media) + clipSeconds(q.answerMedia)
    }
  }
  const finals = game.finalThemes?.length ?? 0
  if (finals) total += FINAL_SECONDS + (finals - 1) * 10
  return total
}
