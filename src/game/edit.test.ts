import { describe, expect, it } from 'vitest'
import { makeEmptyGame, makeEmptyFinal, makeEmptyTheme } from './model'
import { copyQuestion, copyTheme, fillTheme, nextValue, parseTypedQuestions, scaleValues, searchGame, setValueLadder } from './edit'

describe('copies', () => {
  it('gives a question and its media new ids but keeps the stored files', () => {
    const theme = makeEmptyTheme('T')
    const q = theme.questions[0]
    Object.assign(q, { text: 'Q', accepted: ['A2'], media: [{ id: 'mi_1', url: 'media://m1', kind: 'image' }] })
    const copy = copyQuestion(q)
    expect(copy.id).not.toBe(q.id)
    expect(copy.media?.[0].id).not.toBe('mi_1')
    expect(copy.media?.[0].url).toBe('media://m1')
    q.hints = [{ id: 'h_1', text: 'h', media: [{ id: 'mi_2', url: 'media://m2', kind: 'image' }] }]
    const withHint = copyQuestion(q)
    expect(withHint.hints![0].id).not.toBe('h_1')
    expect(withHint.hints![0].media![0]).toMatchObject({ url: 'media://m2' })
    expect(withHint.hints![0].media![0].id).not.toBe('mi_2')
    copy.accepted!.push('A3')
    expect(q.accepted).toEqual(['A2'])
    expect(copy).not.toHaveProperty('answerMedia')
  })

  it('copies a theme with every question', () => {
    const theme = makeEmptyTheme('T')
    const copy = copyTheme(theme)
    expect(copy.name).toBe('T')
    expect(copy.questions.map((q) => q.value)).toEqual([100, 200, 300, 400, 500])
    expect(copy.questions.some((q, i) => q.id === theme.questions[i].id)).toBe(false)
  })
})

describe('values', () => {
  it('sets a ladder by place and scales with cat prices', () => {
    const round = makeEmptyGame().rounds[0]
    setValueLadder(round, 200, 200)
    expect(round.themes[1].questions.map((q) => q.value)).toEqual([200, 400, 600, 800, 1000])
    round.themes[0].questions[0].catValue = 150
    scaleValues(round, 0.5)
    expect(round.themes[0].questions.map((q) => q.value)).toEqual([100, 200, 300, 400, 500])
    expect(round.themes[0].questions[0].catValue).toBe(75)
  })

  it('continues the ladder the theme already has', () => {
    const theme = makeEmptyTheme()
    expect(nextValue(theme.questions)).toBe(600)
    theme.questions.splice(0, 5)
    expect(nextValue(theme.questions)).toBe(100)
  })
})

describe('typed questions', () => {
  it('splits at the last separator and keeps lines without an answer', () => {
    expect(parseTypedQuestions('Столица Франции — Париж\n\n  Год — дата — 1812 \nБез ответа\nA\tB - C')).toEqual([
      { text: 'Столица Франции', answer: 'Париж' },
      { text: 'Год — дата', answer: '1812' },
      { text: 'Без ответа', answer: '' },
      { text: 'A', answer: 'B - C' },
    ])
  })

  it('fills blank cells first and appends the rest up the ladder', () => {
    const theme = makeEmptyTheme()
    theme.questions[0].text = 'kept'
    theme.questions.splice(3)
    const result = fillTheme(theme, parseTypedQuestions('a — 1\nb — 2\nc — 3\nd — 4'))
    expect(result).toEqual({ filled: 2, added: 2 })
    expect(theme.questions.map((q) => [q.value, q.text, q.answer])).toEqual([
      [100, 'kept', ''],
      [200, 'a', '1'],
      [300, 'b', '2'],
      [400, 'c', '3'],
      [500, 'd', '4'],
    ])
  })
})

describe('searchGame', () => {
  it('finds themes, questions, answers, host notes and the final, ignoring case and markdown', () => {
    const game = makeEmptyGame()
    const [theme] = game.rounds[1].themes
    theme.name = 'Наполеон'
    Object.assign(theme.questions[2], { text: 'Кто **проиграл** при Ватерлоо?', answer: 'Наполеон' })
    Object.assign(theme.questions[3], { text: 'x', answer: 'y', notes: 'спросить про ватерлоо' })
    game.finalThemes = [{ ...makeEmptyFinal(), theme: 'Битвы', text: 'Где был Ватерлоо?' }]

    const hits = searchGame(game, 'ВАТЕРЛОО')
    expect(hits.map((h) => [h.roundIndex, h.field, h.value])).toEqual([
      [1, 'text', 300],
      [1, 'host', 400],
      [undefined, 'text', undefined],
    ])
    expect(hits[0].snippet).toBe('Кто проиграл при Ватерлоо?')
    expect(searchGame(game, 'наполеон').map((h) => h.field)).toEqual(['theme', 'answer'])
    expect(searchGame(game, '   ')).toEqual([])
  })
})
