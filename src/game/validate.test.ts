import { describe, expect, it, vi } from 'vitest'
import type { Game, MediaItem } from '../types'
import { makeEmptyGame } from './model'
import { estimateDuration, HEAVY_MEDIA_BYTES, inspectMedia, LONG_TEXT, validateGame } from './validate'

const item = (p: Partial<MediaItem>): MediaItem => ({ id: 'mi', url: 'https://example.com/a.mp3', kind: 'audio', ...p })

/** One filled round with two themes, no final. */
function filledGame(): Game {
  const game = makeEmptyGame('Игра')
  delete game.finalThemes
  game.rounds = [game.rounds[0]]
  game.rounds[0].themes = game.rounds[0].themes.slice(0, 2)
  for (const th of game.rounds[0].themes) {
    for (const q of th.questions) {
      q.text = 'Вопрос'
      q.answer = 'Ответ'
    }
  }
  return game
}

const codes = (game: Game) => validateGame(game).map((i) => i.code)
const firstQuestion = (game: Game) => game.rounds[0].themes[0].questions[0]

describe('validateGame', () => {
  it('finds nothing in a filled game', () => {
    expect(validateGame(filledGame())).toEqual([])
  })

  it('takes a marked choice for the answer and wants two choices with one right', () => {
    const game = filledGame()
    const q = firstQuestion(game)
    q.answer = ''
    q.options = ['Париж', 'Лион']
    q.correctOption = 0
    expect(codes(game)).toEqual([])
    delete q.correctOption
    expect(codes(game)).toEqual(['bad-options', 'no-answer'])
    q.options = ['Париж', ' ']
    q.correctOption = 0
    expect(codes(game)).toEqual(['bad-options'])
  })

  it('warns about an empty hint and checks hint media', () => {
    const game = filledGame()
    firstQuestion(game).hints = [{ id: 'h', text: '' }, { id: 'h2', text: '', media: [item({ kind: 'youtube', url: 'https://example.com' })] }]
    expect(codes(game)).toEqual(['empty-hint', 'bad-youtube'])
  })

  it('reminds about questions marked as drafts', () => {
    const game = filledGame()
    firstQuestion(game).draft = true
    expect(codes(game)).toEqual(['draft'])
  })

  it('reports a wholly empty question once, not as two gaps', () => {
    const game = filledGame()
    Object.assign(firstQuestion(game), { text: '', answer: '' })

    expect(validateGame(game)).toEqual([
      expect.objectContaining({
        code: 'empty-question',
        severity: 'error',
        roundId: game.rounds[0].id,
        themeId: game.rounds[0].themes[0].id,
        questionId: firstQuestion(game).id,
        value: firstQuestion(game).value,
      }),
    ])
  })

  it('accepts media in place of text and answer text', () => {
    const game = filledGame()
    Object.assign(firstQuestion(game), { text: ' ', answer: '', media: [item({})], answerMedia: [item({})] })

    expect(codes(game)).toEqual([])
  })

  it('tells a missing question from a missing answer', () => {
    const game = filledGame()
    firstQuestion(game).text = '  '
    game.rounds[0].themes[1].questions[0].answer = ''

    expect(validateGame(game).map((i) => [i.code, i.severity])).toEqual([
      ['no-question', 'error'],
      ['no-answer', 'warning'],
    ])
  })

  it('flags an empty round and skips its questions', () => {
    const game = filledGame()
    game.rounds.push({ id: 'r2', name: 'Пустой', themes: [{ id: 't', name: 'Тема', questions: [] }] })

    expect(validateGame(game)).toEqual([expect.objectContaining({ code: 'empty-round', severity: 'error', roundId: 'r2', roundName: 'Пустой' })])
  })

  it('warns about a nameless theme', () => {
    const game = filledGame()
    game.rounds[0].themes[1].name = '  '

    expect(validateGame(game)).toEqual([expect.objectContaining({ code: 'empty-theme-name', severity: 'warning', themeId: game.rounds[0].themes[1].id })])
  })

  it('rejects a YouTube item whose link is not YouTube', () => {
    const game = filledGame()
    firstQuestion(game).media = [item({ kind: 'youtube', url: 'https://example.com/x' }), item({ kind: 'youtube', url: 'https://youtu.be/O4SacSbp-Rc' })]

    expect(validateGame(game)).toEqual([expect.objectContaining({ code: 'bad-youtube', severity: 'error', side: 'question' })])
  })

  it('warns when a segment ends at or before its start', () => {
    const game = filledGame()
    const q = firstQuestion(game)
    q.answerMedia = [item({ start: 30, end: 30 }), item({ start: 30, end: 20 }), item({ start: 10, end: 20 }), item({ end: 0 })]

    expect(validateGame(game).map((i) => [i.code, i.side])).toEqual([
      ['bad-segment', 'answer'],
      ['bad-segment', 'answer'],
      ['bad-segment', 'answer'],
    ])
  })

  it('counts a YouTube link start as the segment start', () => {
    const game = filledGame()
    firstQuestion(game).media = [item({ kind: 'youtube', url: 'https://youtu.be/O4SacSbp-Rc?t=40', end: 30 })]

    expect(codes(game)).toEqual(['bad-segment'])
  })

  it('does not judge segments of pictures', () => {
    const game = filledGame()
    firstQuestion(game).media = [item({ kind: 'image', start: 5, end: 1 })]

    expect(codes(game)).toEqual([])
  })

  it('checks every final theme: name, question and answer', () => {
    const game = filledGame()
    game.finalThemes = [{ id: 'f', theme: 'Финал', text: '', answer: '' }, { id: 'f2', theme: '', text: 'Т', answer: 'О' }]

    expect(validateGame(game)).toEqual([
      expect.objectContaining({ code: 'no-question', severity: 'error', final: true }),
      expect.objectContaining({ code: 'no-answer', severity: 'warning', final: true }),
      expect.objectContaining({ code: 'empty-theme-name', final: true, themeId: 'f2' }),
    ])
  })

  it('checks media of the final', () => {
    const game = filledGame()
    game.finalThemes = [{ id: 'f', theme: 'Финал', text: 'Т', answer: 'О', media: [item({ kind: 'youtube', url: 'nope' })] }]

    expect(validateGame(game)).toEqual([expect.objectContaining({ code: 'bad-youtube', final: true })])
  })
})

describe('readability and size', () => {
  it('warns about text too long for the stage, sooner when media share the card', () => {
    const game = filledGame()
    firstQuestion(game).text = 'а'.repeat(LONG_TEXT + 1)
    expect(codes(game)).toEqual(['long-text'])
    firstQuestion(game).text = 'а'.repeat(200)
    expect(codes(game)).toEqual([])
    firstQuestion(game).media = [item({ url: 'https://example.com/a.png', kind: 'image' })]
    expect(codes(game)).toEqual(['long-text'])
  })

  it('flags heavy files and repeated questions', () => {
    const game = filledGame()
    const big = item({ url: 'media://big', kind: 'video' })
    firstQuestion(game).media = [big]
    const [q1, q2, q3] = game.rounds[0].themes[1].questions
    q1.text = 'Кто написал «Войну и мир»?'
    q2.text = 'кто написал войну и мир'
    q3.text = 'Кто написал «Войну и мир»?'
    q3.media = [item({ url: 'https://example.com/tolstoy.png', kind: 'image' })]
    const found = validateGame(game, { missing: new Set(), sizes: new Map([['media://big', HEAVY_MEDIA_BYTES + 1]]) })
    expect(found.map((i) => [i.code, i.questionId])).toEqual([
      ['heavy-media', firstQuestion(game).id],
      ['duplicate-question', q2.id],
    ])
  })

  it('estimates the playing time from questions, clips and the final', () => {
    const game = filledGame()
    const base = estimateDuration(game)
    expect(base).toBe(10 * 40)
    firstQuestion(game).media = [item({ start: 10, end: 40 }), item({ id: 'x', kind: 'image' })]
    game.finalThemes = [{ id: 'f', theme: 'Ф', text: 'Т', answer: 'О' }]
    expect(estimateDuration(game)).toBe(base + 30 + 150)
  })
})

describe('missing media', () => {
  it('finds stored files the lookup cannot return, once per URL', async () => {
    const game = filledGame()
    const present = item({ id: 'a', url: 'media://present', kind: 'image' })
    const gone = item({ id: 'b', url: 'media://gone', kind: 'image' })
    firstQuestion(game).media = [present, gone]
    firstQuestion(game).answerMedia = [gone]
    game.finalThemes = [{ id: 'f', theme: 'Ф', text: 'Т', answer: 'О', media: [gone] }]
    const lookup = vi.fn(async (url: string) => (url === 'media://present' ? new Blob(['x']) : null))

    const facts = await inspectMedia(game, lookup)

    expect([...facts.missing]).toEqual(['media://gone'])
    expect(facts.sizes).toEqual(new Map([['media://present', 1]]))
    expect(lookup).toHaveBeenCalledTimes(2)
  })

  it('leaves web links alone without asking the store', async () => {
    const game = filledGame()
    firstQuestion(game).media = [item({ url: 'https://example.com/a.mp3' })]
    const lookup = vi.fn()

    expect((await inspectMedia(game, lookup)).missing.size).toBe(0)
    expect(lookup).not.toHaveBeenCalled()
  })

  it('turns missing files into issues on the right side of the right card', () => {
    const game = filledGame()
    const gone = item({ url: 'media://gone', kind: 'image' })
    firstQuestion(game).media = [gone]
    firstQuestion(game).answerMedia = [gone]
    game.finalThemes = [{ id: 'f', theme: 'Ф', text: 'Т', answer: 'О', media: [gone] }]

    const found = validateGame(game, { missing: new Set(['media://gone']), sizes: new Map() })

    expect(found.map((i) => [i.code, i.severity, i.side, i.final ?? false])).toEqual([
      ['missing-media', 'error', 'question', false],
      ['missing-media', 'error', 'answer', false],
      ['missing-media', 'error', 'question', true],
    ])
    expect(found[0].questionId).toBe(firstQuestion(game).id)
  })
})
