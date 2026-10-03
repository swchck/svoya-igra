import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { dbPut } from './db'
import { getGame, upsertGame } from './storage'
import { makeEmptyGame } from './game/model'

describe('upsertGame', () => {
  it('persists a reactive game', async () => {
    const game = reactive(makeEmptyGame('Реактивная'))
    game.rounds[0].themes[0].questions[0].text = 'Вопрос'

    await upsertGame(game)

    const stored = await getGame(game.id)
    expect(stored?.title).toBe('Реактивная')
    expect(stored?.rounds[0].themes[0].questions[0].text).toBe('Вопрос')
  })

  it('leaves the argument untouched and stamps the snapshot', async () => {
    const game = makeEmptyGame()
    game.updatedAt = 1

    const saved = await upsertGame(game)

    expect(game.updatedAt).toBe(1)
    expect(saved.updatedAt).toBeGreaterThan(1)
    expect((await getGame(game.id))?.updatedAt).toBe(saved.updatedAt)
  })
})

describe('dbPut', () => {
  it('rejects when the value cannot be stored', async () => {
    await expect(dbPut({ id: 'bad', fn: () => 1 })).rejects.toThrow()
  })
})
