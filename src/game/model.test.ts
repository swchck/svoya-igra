import { describe, expect, it } from 'vitest'
import { isQuestionReady, makeEmptyGame, makeEmptyQuestion, mediaItems, moveItem, moveItemTo, withFreshIds } from './model'

describe('moveItem', () => {
  it('swaps with the neighbour and reports the new index', () => {
    const list = ['a', 'b', 'c']
    expect(moveItem(list, 1, -1)).toBe(0)
    expect(list).toEqual(['b', 'a', 'c'])
  })

  it('stays put at the edges', () => {
    const list = ['a', 'b']
    expect(moveItem(list, 0, -1)).toBe(0)
    expect(moveItem(list, 1, 1)).toBe(1)
    expect(list).toEqual(['a', 'b'])
  })
})

describe('mediaItems', () => {
  it('collects question, answer and final media by reference', () => {
    const game = makeEmptyGame()
    const q = game.rounds[1].themes[2].questions[3]
    q.media = [{ id: '1', url: 'a', kind: 'image' }]
    q.answerMedia = [{ id: '2', url: 'b', kind: 'image' }]
    game.finalRound!.answerMedia = [{ id: '3', url: 'c', kind: 'image' }]

    const items = mediaItems(game)
    items[0].url = 'changed'

    expect(items.map((m) => m.id)).toEqual(['1', '2', '3'])
    expect(q.media[0].url).toBe('changed')
  })
})

describe('withFreshIds', () => {
  it('re-ids every level and keeps content', () => {
    const game = makeEmptyGame('Копия')
    const copy = withFreshIds(game)
    const ids = (g: typeof game) => [g.id, g.rounds[0].id, g.rounds[0].themes[0].id, g.rounds[0].themes[0].questions[0].id, g.finalRound!.id]
    expect(ids(copy).every((id, i) => id !== ids(game)[i])).toBe(true)
    expect(copy.title).toBe('Копия')
  })
})

describe('moveItemTo', () => {
  it('drags an item over others, both ways', () => {
    const list = ['a', 'b', 'c', 'd']
    expect(moveItemTo(list, 0, 2)).toBe(2)
    expect(list).toEqual(['b', 'c', 'a', 'd'])
    moveItemTo(list, 3, 0)
    expect(list).toEqual(['d', 'b', 'c', 'a'])
  })

  it('ignores positions outside the list', () => {
    const list = ['a', 'b']
    expect(moveItemTo(list, 0, 5)).toBe(0)
    expect(list).toEqual(['a', 'b'])
  })
})

describe('isQuestionReady', () => {
  it('needs a question and an answer, as text or media', () => {
    const q = makeEmptyQuestion(100)
    expect(isQuestionReady(q)).toBe(false)
    q.media = [{ id: 'm', url: 'x.mp3', kind: 'audio' }]
    q.answer = 'Ответ'
    expect(isQuestionReady(q)).toBe(true)
  })
})
