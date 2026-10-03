// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getGame } from '../storage'
import { getMedia } from './store'

function seedV1(game: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('svoya-igra', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('games', { keyPath: 'id' })
    req.onsuccess = () => {
      const t = req.result.transaction('games', 'readwrite')
      t.objectStore('games').put(game)
      t.oncomplete = () => {
        req.result.close()
        resolve()
      }
      t.onabort = () => reject(t.error)
    }
  })
}

describe('schema v1 → v2', () => {
  it('moves inline data URLs into the media store', async () => {
    const dataUrl = 'data:image/png;base64,' + btoa('png-bytes')
    await seedV1({
      id: 'g_old',
      title: 'Old',
      createdAt: 1,
      updatedAt: 1,
      rounds: [{ id: 'r', name: 'R', themes: [{ id: 't', name: 'T', questions: [
        { id: 'q1', value: 100, kind: 'normal', text: '', answer: '', mediaUrl: dataUrl, mediaKind: 'image' },
        { id: 'q2', value: 200, kind: 'normal', text: '', answer: '', media: [{ id: 'm', url: dataUrl, kind: 'image' }] },
      ] }] }],
    })

    const game = await getGame('g_old')

    const [q1, q2] = game!.rounds[0].themes[0].questions
    expect(q1.media![0].url).toMatch(/^media:\/\//)
    expect(q2.media![0].url).toBe(q1.media![0].url)
    const blob = await getMedia(q1.media![0].url)
    expect(blob?.type).toBe('image/png')
    expect(await blob?.text()).toBe('png-bytes')
  })
})
