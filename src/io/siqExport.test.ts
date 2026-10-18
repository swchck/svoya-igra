import { describe, expect, it } from 'vitest'
import type { Game } from '../types'
import { makeEmptyGame } from '../game/model'
import { exportSiq } from './siqExport'
import { importSiq } from './siq'

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

function sample(): Game {
  const game = makeEmptyGame('Пакет <тест>')
  game.subtitle = 'Автор'
  game.rounds = [game.rounds[0]]
  const [a, b] = game.rounds[0].themes
  a.name = 'Города & реки'
  a.comment = 'Только Европа'
  Object.assign(a.questions[0], {
    text: 'Столица **Франции**?',
    answer: 'Париж',
    accepted: ['Paris'],
    rejected: ['Лион'],
    notes: 'Источник: атлас',
    media: [{ id: 'm1', url: 'media://pic', kind: 'image' }],
  })
  Object.assign(a.questions[1], { kind: 'for-all', text: 'Самая длинная река?', answer: '', options: ['Нил', 'Волга'], correctOption: 0 })
  Object.assign(a.questions[2], { kind: 'cat-in-bag', catValue: 250, text: 'Кот', answer: 'К' })
  Object.assign(a.questions[3], { kind: 'all-in', text: 'Ва-банк', answer: 'В', hints: [{ id: 'h', text: 'Подсказка' }] })
  Object.assign(a.questions[4], { kind: 'no-risk', text: 'Без риска', answer: 'Б', answerMedia: [{ id: 'y', url: 'https://youtu.be/abcdefghijk', kind: 'youtube', mode: 'audio' }] })
  b.questions.forEach((q, i) => Object.assign(q, { text: `В${i}`, answer: `О${i}` }))
  game.rounds[0].themes = [a, b]
  game.finalThemes = [
    { id: 'f1', theme: 'Кино', text: 'Финал 1', answer: 'Ф1' },
    { id: 'f2', theme: 'Спорт', text: 'Финал 2', answer: 'Ф2', notes: 'Заметка' },
  ]
  return game
}

function fakeStore() {
  const blobs: Blob[] = []
  return { blobs, store: async (blob: Blob) => (blobs.push(blob), `media://m${blobs.length}`) }
}

describe('exportSiq', () => {
  it('survives a round trip through the importer', async () => {
    const siq = await exportSiq(sample(), async (url) => (url === 'media://pic' ? new Blob([PNG], { type: 'image/png' }) : null))
    const store = fakeStore()
    const game = await importSiq(siq, '', store.store)

    expect(game).toMatchObject({ title: 'Пакет <тест>', subtitle: 'Автор' })
    const [a, b] = game.rounds[0].themes
    expect(a).toMatchObject({ name: 'Города & реки', comment: 'Только Европа' })
    expect(b).not.toHaveProperty('comment')
    expect(a.questions.map((q) => [q.value, q.kind])).toEqual([
      [100, 'normal'],
      [200, 'for-all'],
      [300, 'cat-in-bag'],
      [400, 'all-in'],
      [500, 'no-risk'],
    ])
    expect(a.questions[0]).toMatchObject({ text: 'Столица Франции?', answer: 'Париж', accepted: ['Paris'], rejected: ['Лион'], notes: 'Источник: атлас' })
    expect(a.questions[0].media).toMatchObject([{ kind: 'image', url: 'media://m1' }])
    expect(new Uint8Array(await store.blobs[0].arrayBuffer())).toEqual(PNG)
    expect(a.questions[1].text).toBe('Самая длинная река?\nA. Нил\nB. Волга')
    expect(a.questions[1].answer).toBe('A. Нил')
    expect(a.questions[2]).toMatchObject({ catValue: 250, text: '**Тема: Города & реки**\n\nКот' })
    expect(a.questions[3].text).toBe('Ва-банк\nПодсказка')
    expect(a.questions[4].answerMedia).toMatchObject([{ kind: 'youtube', mode: 'audio', url: 'https://youtu.be/abcdefghijk' }])
    expect(b.questions.map((q) => q.answer)).toEqual(['О0', 'О1', 'О2', 'О3', 'О4'])
    expect(game.finalThemes).toMatchObject([
      { theme: 'Кино', text: 'Финал 1', answer: 'Ф1' },
      { theme: 'Спорт', answer: 'Ф2', notes: 'Заметка' },
    ])
  })

  it('leaves out stored files that are gone', async () => {
    const siq = await exportSiq(sample(), async () => null)
    const game = await importSiq(siq, '', fakeStore().store)
    expect(game.rounds[0].themes[0].questions[0].media).toBeUndefined()
  })
})
