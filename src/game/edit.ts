import type { FinalQuestion, Game, MediaItem, Question, Round, Theme } from '../types'
import { markdownToPlain } from '../lib/markdown'
import { makeEmptyQuestion, uid } from './model'

/*
 * Bulk edits of the board: copies, value ladders, typed-in questions and search. Pure
 * functions over the game model, so the editor only decides where their results go.
 */

function copyMedia(items: MediaItem[] | undefined): MediaItem[] | undefined {
  return items?.map((m) => ({ ...m, id: uid('mi_') }))
}

/** Returns a deep copy of the question under new ids; stored files are shared, not duplicated. */
export function copyQuestion(q: Question): Question {
  const copy: Question = structuredClone(q)
  copy.id = uid('q_')
  copy.media = copyMedia(copy.media)
  copy.answerMedia = copyMedia(copy.answerMedia)
  if (!copy.media) delete copy.media
  if (!copy.answerMedia) delete copy.answerMedia
  copy.hints?.forEach((h) => {
    h.id = uid('h_')
    h.media = copyMedia(h.media)
    if (!h.media) delete h.media
  })
  return copy
}

/** Returns a deep copy of the theme and its questions under new ids. */
export function copyTheme(theme: Theme): Theme {
  return { id: uid('t_'), name: theme.name, questions: theme.questions.map(copyQuestion) }
}

/** Sets every question's value by its place in the theme: `first`, `first + step`, … */
export function setValueLadder(round: Round, first: number, step: number): void {
  for (const theme of round.themes) theme.questions.forEach((q, i) => (q.value = Math.max(1, first + step * i)))
}

/** Multiplies every question's value, cat prices included, rounding to whole points. */
export function scaleValues(round: Round, factor: number): void {
  for (const theme of round.themes) {
    for (const q of theme.questions) {
      q.value = Math.max(1, Math.round(q.value * factor))
      if (q.catValue) q.catValue = Math.max(1, Math.round(q.catValue * factor))
    }
  }
}

/** The value the next question of a theme gets: one step past the last one. */
export function nextValue(questions: Question[]): number {
  const last = questions.at(-1)
  if (!last) return 100
  const before = questions.at(-2)
  const step = before && last.value > before.value ? last.value - before.value : 100
  return last.value + step
}

/** A question typed as one line of text. */
export interface TypedQuestion {
  text: string
  answer: string
}

// tried in order: a tab is unambiguous, the rest may also appear inside a question
const SEPARATORS = ['\t', ' | ', ' — ', ' – ', ' - ']

/**
 * Splits pasted text into questions, one per line, each "question — answer". The answer is
 * after the last separator, since questions carry dashes far more often than answers do.
 * A line without a separator is a question still waiting for its answer.
 */
export function parseTypedQuestions(source: string): TypedQuestion[] {
  const out: TypedQuestion[] = []
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const sep = SEPARATORS.find((s) => line.includes(s))
    if (!sep) {
      out.push({ text: line, answer: '' })
      continue
    }
    const at = line.lastIndexOf(sep)
    out.push({ text: line.slice(0, at).trim(), answer: line.slice(at + sep.length).trim() })
  }
  return out
}

function isBlank(q: Question): boolean {
  return !q.text.trim() && !q.answer.trim() && !q.media?.length && !q.answerMedia?.length
}

/**
 * Puts typed questions into the theme: blank cells fill first, in order, and the rest are
 * appended with values continuing the ladder. Returns how many cells were filled and added.
 */
export function fillTheme(theme: Theme, typed: TypedQuestion[]): { filled: number; added: number } {
  let filled = 0
  let added = 0
  const queue = [...typed]
  for (const q of theme.questions) {
    if (!queue.length) break
    if (!isBlank(q)) continue
    Object.assign(q, queue.shift())
    filled += 1
  }
  for (const item of queue) {
    theme.questions.push({ ...makeEmptyQuestion(nextValue(theme.questions)), ...item })
    added += 1
  }
  return { filled, added }
}

/** Where a search hit sits, enough to open it in the editor. */
export interface SearchHit {
  /** Unset for the final. */
  roundIndex?: number
  roundName?: string
  themeName: string
  questionId?: string
  value?: number
  /** Which part matched, with a little context around the match. */
  field: 'theme' | 'text' | 'answer' | 'host'
  snippet: string
}

const SNIPPET_CONTEXT = 40

function snippet(plain: string, at: number, length: number): string {
  const from = Math.max(0, at - SNIPPET_CONTEXT)
  const to = Math.min(plain.length, at + length + SNIPPET_CONTEXT)
  return `${from > 0 ? '…' : ''}${plain.slice(from, to).replace(/\s+/g, ' ')}${to < plain.length ? '…' : ''}`
}

function matchIn(source: string, needle: string): string | null {
  const plain = markdownToPlain(source)
  const at = plain.toLowerCase().indexOf(needle)
  return at < 0 ? null : snippet(plain, at, needle.length)
}

function cardHit(card: Question | FinalQuestion, needle: string): Pick<SearchHit, 'field' | 'snippet'> | null {
  const fields: [SearchHit['field'], string][] = [
    ['text', [card.text, ...('hints' in card ? (card.hints ?? []).map((h) => h.text) : [])].join('\n\n')],
    ['answer', card.answer],
    ['host', [...(card.accepted ?? []), ...(card.rejected ?? []), card.notes ?? ''].join(' · ')],
  ]
  for (const [field, source] of fields) {
    const found = matchIn(source, needle)
    if (found !== null) return { field, snippet: found }
  }
  return null
}

/** Finds questions and themes whose text contains the query, ignoring case; at most `limit` hits. */
export function searchGame(game: Game, query: string, limit = 50): SearchHit[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const hits: SearchHit[] = []
  game.rounds.forEach((round, roundIndex) => {
    for (const theme of round.themes) {
      const place = { roundIndex, roundName: round.name, themeName: theme.name }
      const themeMatch = matchIn(theme.name, needle)
      if (themeMatch !== null) hits.push({ ...place, questionId: theme.questions[0]?.id, field: 'theme', snippet: themeMatch })
      for (const q of theme.questions) {
        const hit = cardHit(q, needle)
        if (hit) hits.push({ ...place, questionId: q.id, value: q.value, ...hit })
      }
    }
  })
  for (const final of game.finalThemes ?? []) {
    const themeMatch = matchIn(final.theme, needle)
    const hit = cardHit(final, needle) ?? (themeMatch !== null ? { field: 'theme' as const, snippet: themeMatch } : null)
    if (hit) hits.push({ themeName: final.theme, questionId: final.id, ...hit })
  }
  return hits.slice(0, limit)
}
