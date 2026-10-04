// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { strToU8, unzipSync, zipSync } from 'fflate'
import type { Game } from '../types'
import { makeEmptyGame, mediaItems } from '../game/model'
import { backupFileName, exportBackup, importBackup, isBackupFileName } from './backup'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 4, 5, 6])

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

// ids and stored-media urls are expected to change on restore; everything else must not
function shape(game: Game) {
  return {
    title: game.title,
    settings: { ...game.settings, logo: undefined },
    rounds: game.rounds.map((r) => ({
      name: r.name,
      themes: r.themes.map((th) => ({ name: th.name, questions: th.questions.map((q) => [q.value, q.text, q.answer]) })),
    })),
    final: game.finalRound?.text,
  }
}

describe('gamebackup', () => {
  it('round-trips every game with its attachments, in order', async () => {
    const source = fakeStore()
    const stored = await source.store(new Blob([PNG], { type: 'image/png' }))
    const first = makeEmptyGame('Первая')
    first.settings = { answerSeconds: 20, accent: 'ruby' }
    first.rounds[0].themes[0].questions[0].text = 'Вопрос'
    first.rounds[0].themes[0].questions[0].media = [{ id: 'a', url: stored, kind: 'image' }]
    const second = makeEmptyGame('Вторая')
    second.finalRound!.text = 'Финал'

    const progress: number[] = []
    const blob = await exportBackup([first, second], (done) => progress.push(done), source.load)
    expect(progress).toEqual([1, 2])

    const target = fakeStore()
    const { games, failed } = await importBackup(blob, undefined, target.store)

    expect(failed).toBe(0)
    expect(games.map(shape)).toEqual([first, second].map(shape))
    expect(games.map((g) => g.id)).not.toContain(first.id)
    const [url] = mediaItems(games[0]).map((m) => m.url)
    expect(new Uint8Array(await target.blobs.get(url)!.arrayBuffer())).toEqual(PNG)
  })

  it('restores an empty library to nothing', async () => {
    const { games, failed } = await importBackup(await exportBackup([], undefined, fakeStore().load), undefined, fakeStore().store)
    expect(games).toEqual([])
    expect(failed).toBe(0)
  })

  it('skips a broken game and keeps the rest', async () => {
    const good = await exportBackup([makeEmptyGame('Целая')], undefined, fakeStore().load)
    const entries = unzipSync(new Uint8Array(await good.arrayBuffer()))
    entries['games/0-broken.gamezip'] = new Uint8Array([1, 2, 3])
    const { games, failed } = await importBackup(new Blob([zipSync(entries).slice().buffer]), undefined, fakeStore().store)
    expect(games.map((g) => g.title)).toEqual(['Целая'])
    expect(failed).toBe(1)
  })

  it('rejects files that are not a backup', async () => {
    const gamezip = new Blob([zipSync({ 'game.json': strToU8('{}') }).slice().buffer])
    await expect(importBackup(gamezip, undefined, fakeStore().store)).rejects.toThrow()
    await expect(importBackup(new Blob(['nope']), undefined, fakeStore().store)).rejects.toThrow()
  })
})

describe('backup file names', () => {
  it('dates the file and recognises the extension', () => {
    const name = backupFileName(new Date(2026, 0, 5))
    expect(name).toBe('svoya-igra-2026-01-05.gamebackup')
    expect(isBackupFileName(name)).toBe(true)
    expect(isBackupFileName('Game.GAMEBACKUP')).toBe(true)
    expect(isBackupFileName('game.gamezip')).toBe(false)
  })
})
