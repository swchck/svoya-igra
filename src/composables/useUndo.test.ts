import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import type { Game } from '../types'
import { makeEmptyGame } from '../game/model'
import { useUndo } from './useUndo'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

async function settle() {
  await nextTick()
  vi.advanceTimersByTime(1000)
}

function setup() {
  const game = ref<Game | null>(makeEmptyGame('Игра'))
  const scope = effectScope()
  const undo = scope.run(() => useUndo(game, 500))!
  return { game, undo }
}

describe('useUndo', () => {
  it('groups quick edits into one step and walks back and forth', async () => {
    const { game, undo } = setup()
    const q = () => game.value!.rounds[0].themes[0].questions[0]
    q().text = 'В'
    await nextTick()
    q().text = 'Во'
    await nextTick()
    q().text = 'Вопрос'
    await settle()
    game.value!.rounds[0].name = 'Первый'
    await settle()

    expect(undo.undo()).toBe(true)
    expect(game.value!.rounds[0].name).toBe('Раунд 1')
    expect(q().text).toBe('Вопрос')
    await settle()
    expect(undo.undo()).toBe(true)
    expect(q().text).toBe('')
    expect(undo.undo()).toBe(false)

    expect(undo.redo()).toBe(true)
    expect(q().text).toBe('Вопрос')
    await settle()
    expect(undo.canRedo.value).toBe(true)
    q().answer = 'Ответ'
    await settle()
    expect(undo.canRedo.value).toBe(false)
  })

  it('undoes an edit that has not settled yet, and brings back removed fields', async () => {
    const { game, undo } = setup()
    delete game.value!.finalThemes
    await nextTick()
    expect(undo.canUndo.value).toBe(true)
    expect(undo.undo()).toBe(true)
    expect(game.value!.finalThemes).toHaveLength(1)
  })

  it('keeps the same object, so autosave sees the undo as an edit', async () => {
    const { game, undo } = setup()
    const object = game.value
    game.value!.title = 'Новое'
    await settle()
    undo.undo()
    expect(game.value).toBe(object)
    expect(game.value!.title).toBe('Игра')
  })

  it('starts afresh when another game loads', async () => {
    const { game, undo } = setup()
    game.value!.title = 'x'
    await settle()
    game.value = makeEmptyGame('Другая')
    await settle()
    expect(undo.canUndo.value).toBe(false)
  })
})
