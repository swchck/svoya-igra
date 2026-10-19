import { describe, expect, it, vi } from 'vitest'
import type { MediaItem } from '../types'
import { makeEmptyGame } from '../game/model'
import { probeGame } from './probe'

const item = (url: string, kind: MediaItem['kind'] = 'audio'): MediaItem => ({ id: url, url, kind })

describe('probeGame', () => {
  it('tries each URL once and reports every place it sits', async () => {
    const game = makeEmptyGame('G')
    const [a, b] = game.rounds[0].themes[0].questions
    a.media = [item('media://song'), item('https://x/ok.png', 'image')]
    b.answerMedia = [item('media://song')]
    b.hints = [{ id: 'h', text: '', media: [item('https://youtu.be/abcdefghijk', 'youtube')] }]
    game.finalThemes![0].media = [item('media://gone', 'video')]
    const probe = vi.fn(async (m: MediaItem) => (m.url === 'media://song' ? ('unsupported' as const) : m.url === 'media://gone' ? ('missing' as const) : null))
    const progress: number[] = []

    const problems = await probeGame(game, (done) => progress.push(done), probe)

    expect(probe).toHaveBeenCalledTimes(4)
    expect(progress).toEqual([0, 1, 2, 3, 4])
    expect(problems.map((p) => [p.failure, p.questionId ?? 'final'])).toEqual([
      ['unsupported', a.id],
      ['unsupported', b.id],
      ['missing', 'final'],
    ])
    expect(problems[0].where).toBe('Раунд 1 · Тема 1 · 100')
  })

  it('has nothing to do for a game without media', async () => {
    const probe = vi.fn()
    expect(await probeGame(makeEmptyGame(), undefined, probe)).toEqual([])
    expect(probe).not.toHaveBeenCalled()
  })
})
