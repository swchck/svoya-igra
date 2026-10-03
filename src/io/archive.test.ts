import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import { makeEmptyGame, mediaItems } from '../game/model'
import { exportGameZip, importGameZip } from './archive'

const PNG = 'data:image/png;base64,iVBORw0KGgo='

function gameWithMedia() {
  const game = makeEmptyGame('Архив')
  const [q1, q2] = game.rounds[0].themes[0].questions
  q1.media = [{ id: 'a', url: PNG, kind: 'image' }]
  q1.answerMedia = [{ id: 'b', url: 'https://youtu.be/O4SacSbp-Rc', kind: 'youtube', mode: 'audio' }]
  q2.media = [{ id: 'c', url: PNG, kind: 'image' }]
  return game
}

describe('gamezip', () => {
  it('round-trips media and keeps links as links', async () => {
    const game = gameWithMedia()

    const restored = await importGameZip(await exportGameZip(game))

    expect(mediaItems(restored).map((m) => m.url)).toEqual(mediaItems(game).map((m) => m.url))
    expect(restored.id).not.toBe(game.id)
    expect(restored.title).toBe('Архив')
  })

  it('stores identical attachments once and leaves the source untouched', async () => {
    const game = gameWithMedia()

    const entries = unzipSync(new Uint8Array(await (await exportGameZip(game)).arrayBuffer()))

    expect(Object.keys(entries).filter((n) => n.startsWith('media/'))).toHaveLength(1)
    expect(Object.keys(entries)).toEqual(expect.arrayContaining(['game.json', 'meta.json', 'icon.svg']))
    expect(game.rounds[0].themes[0].questions[0].media![0].url).toBe(PNG)
  })

  it('rejects archives without a game', async () => {
    const { zipSync } = await import('fflate')
    await expect(importGameZip(new Blob([zipSync({ 'x.txt': new Uint8Array([1]) }).slice().buffer]))).rejects.toThrow('game.json')
  })
})
