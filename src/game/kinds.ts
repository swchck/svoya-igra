import type { Component } from 'vue'
import { Cat, CircleHelp, Flame, Gavel, ShieldCheck, Users } from '@lucide/vue'
import type { MediaItem, Question, QuestionKind } from '../types'
import { markdownToPlain } from '../lib/markdown'

/** How a question kind looks across the app; `key` names its strings in every locale section. */
export interface KindInfo {
  kind: QuestionKind
  key: string
  icon: Component
}

/** Every question kind in the order the editor offers them. */
export const KINDS: readonly KindInfo[] = [
  { kind: 'normal', key: 'normal', icon: CircleHelp },
  { kind: 'auction', key: 'auction', icon: Gavel },
  { kind: 'cat-in-bag', key: 'catInBag', icon: Cat },
  { kind: 'no-risk', key: 'noRisk', icon: ShieldCheck },
  { kind: 'all-in', key: 'allIn', icon: Flame },
  { kind: 'for-all', key: 'forAll', icon: Users },
]

const BY_KIND = new Map(KINDS.map((k) => [k.kind, k]))

/** Returns how a kind looks; unknown kinds from newer files fall back to a normal question. */
export function kindInfo(kind: QuestionKind): KindInfo {
  return BY_KIND.get(kind) ?? KINDS[0]
}

/** Reports whether the kind gets its own announcement before the question is shown. */
export function isSpecial(kind: QuestionKind): boolean {
  return kind !== 'normal'
}

/** The most choices a question may offer; the phone keeps a row of big buttons per choice. */
export const MAX_OPTIONS = 6

/** The letter a choice goes by: A, B, C… */
export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

/** Reports whether the question offers choices with one marked right. */
export function hasChoice(q: Pick<Question, 'options' | 'correctOption'>): boolean {
  return !!q.options?.length && q.correctOption !== undefined && q.correctOption >= 0 && q.correctOption < q.options.length
}

/** What the stage reveals as the answer: the written one, or else the right choice. */
export function revealedAnswer(q: Pick<Question, 'answer' | 'options' | 'correctOption'>): string {
  if (q.answer.trim() || !hasChoice(q)) return q.answer
  return `${optionLetter(q.correctOption!)}. ${q.options![q.correctOption!]}`
}

/** Folds case, ё and everything but letters and digits, so «Пётр I» matches «петр i». */
function folded(text: string): string {
  return text.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, '')
}

/**
 * Reports whether a typed answer is one the card accepts: the answer itself or one listed as
 * also right. Only an exact match after folding counts; anything looser is the host's call.
 */
export function matchesAnswer(card: Pick<Question, 'answer' | 'accepted'>, typed: string): boolean {
  const said = folded(typed)
  if (!said) return false
  return [card.answer, ...(card.accepted ?? [])].some((a) => folded(markdownToPlain(a)) === said)
}

/**
 * What the question is worth with `shown` hints open: the value falls in even steps, so with
 * four hints 500 goes 500, 400, 300, 200, 100. Rounded to tens, never below ten.
 */
export function hintedValue(value: number, hintCount: number, shown: number): number {
  if (!hintCount || shown <= 0) return value
  const steps = hintCount + 1
  const left = steps - Math.min(shown, hintCount)
  return Math.max(10, Math.round((value * left) / steps / 10) * 10)
}

/**
 * What the answer card shows: the answer's own media, or else the question's blurred pictures,
 * now clear, since revealing them is the point of blurring.
 */
export function answerMedia(q: Pick<Question, 'media' | 'answerMedia'>): MediaItem[] {
  if (q.answerMedia?.length) return q.answerMedia
  return (q.media ?? []).filter((m) => m.blur).map((m) => ({ ...m, blur: false }))
}

/** What the stage shows with `shown` hints open: their texts in order, and the media of the question and of each. */
export function withHints(q: Pick<Question, 'media' | 'hints'>, shown: number): { hints: string[]; media: MediaItem[] } {
  const open = q.hints?.slice(0, Math.max(0, shown)) ?? []
  return {
    hints: open.map((h) => h.text).filter((x) => x.trim()),
    media: [...(q.media ?? []), ...open.flatMap((h) => h.media ?? [])],
  }
}
