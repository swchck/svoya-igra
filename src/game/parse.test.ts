import { describe, expect, it } from 'vitest'
import { parseGame } from './parse'

const legacy = {
  id: 'g_1',
  title: 'Old',
  createdAt: 1,
  updatedAt: 1,
  rounds: [{
    id: 'r_1',
    name: 'R',
    themes: [{
      id: 't_1',
      name: 'T',
      questions: [{
        id: 'q_1', value: 100, kind: 'normal', text: 'Q', answer: 'A',
        mediaUrl: 'https://youtu.be/abcdef', mediaKind: 'youtube', mediaMode: 'audio', mediaDuration: 10,
        answerMediaUrl: 'data:image/png;base64,AA==', answerMediaKind: 'image',
        media: [{ id: 'mi_x', url: 'x.png', kind: 'image' }],
      }],
    }],
  }],
  finalRound: { id: 'f_1', theme: 'F', text: 'q', answer: 'a', mediaUrl: 'y.png' },
}

describe('parseGame', () => {
  it('keeps question timers, round rules and theme comments that make sense', () => {
    const game = structuredClone(legacy) as never as { rounds: Record<string, unknown>[] & { themes: Record<string, unknown>[] }[] }
    const round = game.rounds[0] as unknown as { rules: unknown; themes: { comment: unknown; questions: Record<string, unknown>[] }[] }
    round.rules = { answerSeconds: 9999, wrongPenalty: 'yes' }
    round.themes[0].comment = 'Всё о кино'
    round.themes[0].questions[0].seconds = -5
    const parsed = parseGame(game)
    expect(parsed.rounds[0].rules).toEqual({ answerSeconds: 600 })
    expect(parsed.rounds[0].themes[0].comment).toBe('Всё о кино')
    expect(parsed.rounds[0].themes[0].questions[0]).not.toHaveProperty('seconds')
    round.rules = 'x'
    round.themes[0].questions[0].seconds = 0
    const again = parseGame(game)
    expect(again.rounds[0]).not.toHaveProperty('rules')
    expect(again.rounds[0].themes[0].questions[0].seconds).toBe(0)
  })

  it('keeps choices and hints in shape', () => {
    const game = structuredClone(legacy) as never as { rounds: { themes: { questions: Record<string, unknown>[] }[] }[] }
    Object.assign(game.rounds[0].themes[0].questions[0], {
      options: ['A', 2, 'B', 'C', 'D', 'E', 'F', 'G'],
      correctOption: 9,
      hints: [{ text: 'один' }, 'мусор', { id: 'h_2', text: 5, media: [{ url: 'x.png', kind: 'image' }] }],
    })
    const q = parseGame(game).rounds[0].themes[0].questions[0]
    expect(q.options).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    expect(q).not.toHaveProperty('correctOption')
    expect(q.hints).toHaveLength(2)
    expect(q.hints![0]).toMatchObject({ text: 'один' })
    expect(q.hints![0].id).toMatch(/^h_/)
    expect(q.hints![1]).toMatchObject({ id: 'h_2', text: '', media: [{ url: 'x.png', kind: 'image' }] })
  })

  it('keeps well-formed host info and drops the rest', () => {
    const game = structuredClone(legacy) as never as { rounds: { themes: { questions: Record<string, unknown>[] }[] }[]; finalRound: Record<string, unknown> }
    Object.assign(game.rounds[0].themes[0].questions[0], { accepted: ['Пётр I', 7, ' '], rejected: 'Павел', notes: 'Источник: БСЭ' })
    Object.assign(game.finalRound, { accepted: [], notes: '  ' })
    const parsed = parseGame(game)
    const q = parsed.rounds[0].themes[0].questions[0]
    expect(q.accepted).toEqual(['Пётр I'])
    expect(q).not.toHaveProperty('rejected')
    expect(q.notes).toBe('Источник: БСЭ')
    expect(parsed.finalThemes![0]).not.toHaveProperty('accepted')
    expect(parsed.finalThemes![0]).not.toHaveProperty('notes')
  })

  it('turns an old play length into an end time after the link start', () => {
    const game = structuredClone(legacy)
    game.rounds[0].themes[0].questions[0].media = [
      { id: 'mi_y', url: 'https://youtu.be/abcdefg?t=8', kind: 'youtube', duration: 5 },
    ] as never
    const media = parseGame(game).rounds[0].themes[0].questions[0].media!
    expect(media.find((m) => m.id === 'mi_y')).toEqual({ id: 'mi_y', url: 'https://youtu.be/abcdefg?t=8', kind: 'youtube', end: 13 })
  })

  it('moves single-media fields into media lists', () => {
    const q = parseGame(structuredClone(legacy)).rounds[0].themes[0].questions[0]

    expect(q.media?.map((m) => m.url)).toEqual(['https://youtu.be/abcdef', 'x.png'])
    expect(q.media?.[0]).toMatchObject({ kind: 'youtube', mode: 'audio', end: 10 })
    expect(q.answerMedia).toEqual([expect.objectContaining({ url: 'data:image/png;base64,AA==', kind: 'image' })])
    expect(q).not.toHaveProperty('mediaUrl')
    expect(q).not.toHaveProperty('answerMediaUrl')
  })

  it('turns the single final of older games into the one final theme', () => {
    const parsed = parseGame(structuredClone(legacy))
    expect(parsed).not.toHaveProperty('finalRound')
    const [f] = parsed.finalThemes!
    expect(f).toMatchObject({ id: 'f_1', theme: 'F' })
    expect(f.media).toEqual([expect.objectContaining({ url: 'y.png', kind: 'image' })])
    expect(f).not.toHaveProperty('mediaUrl')
  })

  it('keeps final themes and drops an empty list', () => {
    const data = { ...structuredClone(legacy), finalRound: undefined, finalThemes: [{ id: 'a', theme: 'A', text: '', answer: '' }, { id: 'b', theme: 'B', text: '', answer: '' }] }
    expect(parseGame(data).finalThemes?.map((f) => f.theme)).toEqual(['A', 'B'])
    expect(parseGame({ ...data, finalThemes: [] })).not.toHaveProperty('finalThemes', expect.anything())
    expect(() => parseGame({ ...data, finalThemes: ['x'] })).toThrow()
  })

  it('does not duplicate a legacy URL already in the list', () => {
    const data = structuredClone(legacy)
    data.rounds[0].themes[0].questions[0].mediaUrl = 'x.png'
    expect(parseGame(data).rounds[0].themes[0].questions[0].media).toHaveLength(1)
  })

  it('round-trips valid settings and leaves old games without any', () => {
    const settings = {
      answerSeconds: 30,
      timerAutoStart: true,
      accent: 'ruby',
      logo: { id: 'mi_l', url: 'media://m_1', kind: 'image' },
      introText: 'Welcome',
    }
    expect(parseGame({ ...structuredClone(legacy), settings }).settings).toEqual(settings)
    expect(parseGame(structuredClone(legacy))).not.toHaveProperty('settings')
  })

  it('drops invalid settings', () => {
    const bad = { answerSeconds: -3, timerAutoStart: 'yes', accent: 'pink', logo: { url: 5 }, introText: '  ' }
    expect(parseGame({ ...structuredClone(legacy), settings: bad })).not.toHaveProperty('settings')
    expect(parseGame({ ...structuredClone(legacy), settings: 'x' })).not.toHaveProperty('settings')
  })

  it('caps the answer time', () => {
    const game = parseGame({ ...structuredClone(legacy), settings: { answerSeconds: 99999 } })
    expect(game.settings?.answerSeconds).toBe(600)
  })

  it.each([null, 'game', { id: 'g' }, { id: 'g', rounds: [{ themes: 'no' }] }])('rejects %j', (data) => {
    expect(() => parseGame(data)).toThrow('Файл повреждён или это не игра')
  })
})
