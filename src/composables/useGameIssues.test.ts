import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import type { Game } from '../types'
import { makeEmptyGame } from '../game/model'
import { findMissingMedia } from '../game/validate'
import { useGameIssues } from './useGameIssues'

vi.mock('../game/validate', async (orig) => ({ ...(await orig<typeof import('../game/validate')>()), findMissingMedia: vi.fn(async () => new Set<string>()) }))

function filled(): Game {
  const game = makeEmptyGame()
  game.finalRound = undefined
  game.rounds = [game.rounds[0]]
  game.rounds[0].themes = [game.rounds[0].themes[0]]
  for (const q of game.rounds[0].themes[0].questions) Object.assign(q, { text: 'В', answer: 'О' })
  return game
}

const settle = async () => {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

beforeEach(() => {
  vi.mocked(findMissingMedia).mockReset().mockResolvedValue(new Set())
})

describe('useGameIssues', () => {
  it('is empty before the game loads and counts severities after', async () => {
    const game = ref<Game | null>(null)
    const scope = effectScope()
    const { issues, errors, warnings } = scope.run(() => useGameIssues(game))!
    expect(issues.value).toEqual([])

    const g = filled()
    g.rounds[0].themes[0].name = ''
    g.rounds[0].themes[0].questions[0].text = ''
    game.value = g
    await settle()

    expect(errors.value).toBe(1)
    expect(warnings.value).toBe(1)
    scope.stop()
  })

  it('follows edits live', async () => {
    const game = ref<Game | null>(filled())
    const scope = effectScope()
    const { issues } = scope.run(() => useGameIssues(game))!
    expect(issues.value).toEqual([])

    game.value!.rounds[0].themes[0].questions[1].answer = ''
    await nextTick()

    expect(issues.value.map((i) => i.code)).toEqual(['no-answer'])
    scope.stop()
  })

  it('reports files the media store lost, and re-checks only when stored media change', async () => {
    vi.mocked(findMissingMedia).mockResolvedValue(new Set(['media://gone']))
    const g = filled()
    g.rounds[0].themes[0].questions[0].media = [{ id: 'm', url: 'media://gone', kind: 'image' }]
    const game = ref<Game | null>(g)
    const scope = effectScope()
    const { issues } = scope.run(() => useGameIssues(game))!
    await settle()

    expect(issues.value.map((i) => i.code)).toEqual(['missing-media'])

    game.value!.title = 'Другое'
    game.value!.rounds[0].themes[0].questions[1].text = 'Ещё'
    await settle()
    expect(findMissingMedia).toHaveBeenCalledTimes(1)

    game.value!.rounds[0].themes[0].questions[0].media = []
    await settle()
    expect(findMissingMedia).toHaveBeenCalledTimes(2)
    scope.stop()
  })

  it('keeps the newest answer when checks finish out of order', async () => {
    const resolvers: ((v: Set<string>) => void)[] = []
    vi.mocked(findMissingMedia).mockImplementation(() => new Promise((r) => resolvers.push(r)))
    const g = filled()
    g.rounds[0].themes[0].questions[0].media = [{ id: 'm', url: 'media://a', kind: 'image' }]
    const game = ref<Game | null>(g)
    const scope = effectScope()
    const { issues } = scope.run(() => useGameIssues(game))!
    game.value!.rounds[0].themes[0].questions[0].media = [{ id: 'm', url: 'media://b', kind: 'image' }]
    await nextTick()

    resolvers[1](new Set())
    await settle()
    resolvers[0](new Set(['media://a']))
    await settle()

    expect(issues.value).toEqual([])
    scope.stop()
  })
})
