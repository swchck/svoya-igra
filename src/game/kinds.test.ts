import { describe, expect, it } from 'vitest'
import { answerMedia, hasChoice, hintedValue, kindInfo, matchesAnswer, revealedAnswer, withHints } from './kinds'
import type { QuestionKind } from '../types'

describe('kinds', () => {
  it('falls back to a normal question for kinds it does not know', () => {
    expect(kindInfo('from-the-future' as QuestionKind).kind).toBe('normal')
  })

  it('reveals the right choice when no answer is written', () => {
    expect(revealedAnswer({ answer: '', options: ['Лион', 'Париж'], correctOption: 1 })).toBe('B. Париж')
    expect(revealedAnswer({ answer: 'Париж', options: ['Лион', 'Париж'], correctOption: 1 })).toBe('Париж')
    expect(hasChoice({ options: ['Лион'], correctOption: 3 })).toBe(false)
  })

  it('matches typed answers ignoring case, ё, spacing and punctuation, but nothing looser', () => {
    const card = { answer: '**Пётр I**', accepted: ['Пётр Великий'] }
    expect(matchesAnswer(card, 'петр i')).toBe(true)
    expect(matchesAnswer(card, ' Пётр  Великий! ')).toBe(true)
    expect(matchesAnswer(card, 'Петр')).toBe(false)
    expect(matchesAnswer(card, '  ')).toBe(false)
  })
  it('lowers the value in even steps as hints open, in tens and never to nothing', () => {
    expect([0, 1, 2, 3, 4, 9].map((n) => hintedValue(500, 4, n))).toEqual([500, 400, 300, 200, 100, 100])
    expect(hintedValue(100, 2, 1)).toBe(70)
    expect(hintedValue(10, 5, 5)).toBe(10)
    expect(hintedValue(300, 0, 3)).toBe(300)
  })

  it('lists the open hints and adds their media after the question’s', () => {
    const q = {
      media: [{ id: 'a', url: 'a.png', kind: 'image' as const }],
      hints: [{ id: 'h1', text: 'Поэт' }, { id: 'h2', text: '', media: [{ id: 'b', url: 'b.png', kind: 'image' as const }] }, { id: 'h3', text: 'Пушкин?' }],
    }
    expect(withHints(q, 0)).toEqual({ hints: [], media: q.media })
    expect(withHints(q, 2)).toEqual({ hints: ['Поэт'], media: [q.media[0], q.hints[1].media![0]] })
  })
  it('reveals blurred pictures clear on the answer, unless the answer brings its own media', () => {
    const blurred = { id: 'a', url: 'a.png', kind: 'image' as const, blur: true }
    const plain = { id: 'b', url: 'b.png', kind: 'image' as const }
    expect(answerMedia({ media: [blurred, plain] })).toEqual([{ ...blurred, blur: false }])
    expect(answerMedia({ media: [blurred], answerMedia: [plain] })).toEqual([plain])
    expect(answerMedia({ media: [plain] })).toEqual([])
  })
})
