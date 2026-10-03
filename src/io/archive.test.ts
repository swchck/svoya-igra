// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { unzipSync, zipSync } from 'fflate'
import { makeEmptyGame, mediaItems } from '../game/model'
import { exportGameZip, importGameZip } from './archive'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])

function fakeStore() {
  const blobs = new Map<string, Blob>()
  return {
    blobs,
    load: async (url: string) => blobs.get(url) ?? null,
    store: async (blob: Blob) => {
      const url = `media://m${blobs.size}`
      blobs.set(url, blob)
      return url
    },
  }
}

function gameWithMedia(stored: string) {
  const game = makeEmptyGame('Архив')
  const [q1, q2] = game.rounds[0].themes[0].questions
  q1.media = [{ id: 'a', url: stored, kind: 'image' }]
  q1.answerMedia = [{ id: 'b', url: 'https://youtu.be/O4SacSbp-Rc', kind: 'youtube', mode: 'audio' }]
  q2.media = [{ id: 'c', url: stored, kind: 'image' }, { id: 'd', url: 'data:image/png;base64,iVBORw==', kind: 'image' }]
  return game
}

describe('gamezip', () => {
  it('round-trips stored and inline media, keeps links as links', async () => {
    const source = fakeStore()
    const stored = await source.store(new Blob([PNG], { type: 'image/png' }))
    const game = gameWithMedia(stored)

    const target = fakeStore()
    const restored = await importGameZip(await exportGameZip(game, source.load), target.store)

    const urls = mediaItems(restored).map((m) => m.url)
    expect(urls[1]).toBe('https://youtu.be/O4SacSbp-Rc')
    expect(urls[0]).toBe(urls[2])
    expect(target.blobs.size).toBe(2)
    const png = target.blobs.get(urls[0])!
    expect(png.type).toBe('image/png')
    expect(new Uint8Array(await png.arrayBuffer())).toEqual(PNG)
    expect(restored.id).not.toBe(game.id)
  })

  it('stores identical attachments once and leaves the source untouched', async () => {
    const source = fakeStore()
    const stored = await source.store(new Blob([PNG], { type: 'image/png' }))
    const game = gameWithMedia(stored)

    const entries = unzipSync(new Uint8Array(await (await exportGameZip(game, source.load)).arrayBuffer()))

    expect(Object.keys(entries).filter((n) => n.startsWith('media/'))).toHaveLength(2)
    expect(Object.keys(entries)).toEqual(expect.arrayContaining(['game.json', 'meta.json', 'icon.svg']))
    expect(game.rounds[0].themes[0].questions[0].media![0].url).toBe(stored)
  })

  it('rejects archives without a game', async () => {
    const blob = new Blob([zipSync({ 'x.txt': new Uint8Array([1]) }).slice().buffer])
    await expect(importGameZip(blob, fakeStore().store)).rejects.toThrow('game.json')
  })
})
