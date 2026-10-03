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
  it('moves single-media fields into media lists', () => {
    const q = parseGame(structuredClone(legacy)).rounds[0].themes[0].questions[0]

    expect(q.media?.map((m) => m.url)).toEqual(['https://youtu.be/abcdef', 'x.png'])
    expect(q.media?.[0]).toMatchObject({ kind: 'youtube', mode: 'audio', duration: 10 })
    expect(q.answerMedia).toEqual([expect.objectContaining({ url: 'data:image/png;base64,AA==', kind: 'image' })])
    expect(q).not.toHaveProperty('mediaUrl')
    expect(q).not.toHaveProperty('answerMediaUrl')
  })

  it('normalizes the final round', () => {
    const f = parseGame(structuredClone(legacy)).finalRound!
    expect(f.media).toEqual([expect.objectContaining({ url: 'y.png', kind: 'image' })])
    expect(f).not.toHaveProperty('mediaUrl')
  })

  it('does not duplicate a legacy URL already in the list', () => {
    const data = structuredClone(legacy)
    data.rounds[0].themes[0].questions[0].mediaUrl = 'x.png'
    expect(parseGame(data).rounds[0].themes[0].questions[0].media).toHaveLength(1)
  })

  it.each([null, 'game', { id: 'g' }, { id: 'g', rounds: [{ themes: 'no' }] }])('rejects %j', (data) => {
    expect(() => parseGame(data)).toThrow('Файл повреждён или это не игра')
  })
})
