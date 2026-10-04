import { describe, expect, it, vi } from 'vitest'
import type { Game, MediaItem } from '../types'
import { makeEmptyGame } from './model'
import { findMissingMedia, validateGame } from './validate'

const item = (p: Partial<MediaItem>): MediaItem => ({ id: 'mi', url: 'https://example.com/a.mp3', kind: 'audio', ...p })

/** One filled round with two themes, no final. */
function filledGame(): Game {
  const game = makeEmptyGame('Игра')
  game.finalRound = undefined
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

  it('checks the final: question and answer', () => {
    const game = filledGame()
    game.finalRound = { id: 'f', theme: 'Финал', text: '', answer: '' }

    expect(validateGame(game)).toEqual([
      expect.objectContaining({ code: 'no-question', severity: 'error', final: true }),
      expect.objectContaining({ code: 'no-answer', severity: 'warning', final: true }),
    ])
  })

  it('checks media of the final', () => {
    const game = filledGame()
    game.finalRound = { id: 'f', theme: 'Финал', text: 'Т', answer: 'О', media: [item({ kind: 'youtube', url: 'nope' })] }

    expect(validateGame(game)).toEqual([expect.objectContaining({ code: 'bad-youtube', final: true })])
  })
})

describe('missing media', () => {
  it('finds stored files the lookup cannot return, once per URL', async () => {
    const game = filledGame()
    const present = item({ id: 'a', url: 'media://present', kind: 'image' })
    const gone = item({ id: 'b', url: 'media://gone', kind: 'image' })
    firstQuestion(game).media = [present, gone]
    firstQuestion(game).answerMedia = [gone]
    game.finalRound = { id: 'f', theme: 'Ф', text: 'Т', answer: 'О', media: [gone] }
    const lookup = vi.fn(async (url: string) => (url === 'media://present' ? new Blob(['x']) : null))

    const missing = await findMissingMedia(game, lookup)

    expect([...missing]).toEqual(['media://gone'])
    expect(lookup).toHaveBeenCalledTimes(2)
  })

  it('leaves web links alone without asking the store', async () => {
    const game = filledGame()
    firstQuestion(game).media = [item({ url: 'https://example.com/a.mp3' })]
    const lookup = vi.fn()

    expect((await findMissingMedia(game, lookup)).size).toBe(0)
    expect(lookup).not.toHaveBeenCalled()
  })

  it('turns missing files into issues on the right side of the right card', () => {
    const game = filledGame()
    const gone = item({ url: 'media://gone', kind: 'image' })
    firstQuestion(game).media = [gone]
    firstQuestion(game).answerMedia = [gone]
    game.finalRound = { id: 'f', theme: 'Ф', text: 'Т', answer: 'О', media: [gone] }

    const found = validateGame(game, new Set(['media://gone']))

    expect(found.map((i) => [i.code, i.severity, i.side, i.final ?? false])).toEqual([
      ['missing-media', 'error', 'question', false],
      ['missing-media', 'error', 'answer', false],
      ['missing-media', 'error', 'question', true],
    ])
    expect(found[0].questionId).toBe(firstQuestion(game).id)
  })
})
