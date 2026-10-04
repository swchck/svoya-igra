// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { listSnapshots, MAX_SNAPSHOTS, takeSnapshot } from './history'
import { deleteGame, pruneMedia, upsertGame } from './storage'
import { getMedia, putMedia } from './media/store'
import { makeEmptyGame, uid } from './game/model'

describe('history snapshots', () => {
  it('stores a copy that later edits do not touch', async () => {
    const game = reactive(makeEmptyGame('Первая'))
    await takeSnapshot(game, 'open')
    game.title = 'Правка'

    const [snap] = await listSnapshots(game.id)
    expect(snap.game.title).toBe('Первая')
    expect(snap).toMatchObject({ reason: 'open', rounds: 2, questions: 50 })
  })

  it('skips a snapshot identical to the newest one, whatever updatedAt says', async () => {
    const game = makeEmptyGame()
    expect(await takeSnapshot(game, 'open')).toBe(true)

    expect(await takeSnapshot({ ...game, updatedAt: game.updatedAt + 1000 }, 'auto')).toBe(false)
    game.rounds[0].themes.pop()
    expect(await takeSnapshot(game, 'before-delete')).toBe(true)
    expect(await listSnapshots(game.id)).toHaveLength(2)
  })

  it('lists newest first and keeps only the last MAX_SNAPSHOTS', async () => {
    const game = makeEmptyGame()
    for (let i = 0; i <= MAX_SNAPSHOTS + 4; i++) {
      game.title = `v${i}`
      await takeSnapshot(game, 'auto')
    }

    const list = await listSnapshots(game.id)
    expect(list).toHaveLength(MAX_SNAPSHOTS)
    expect(list[0].game.title).toBe(`v${MAX_SNAPSHOTS + 4}`)
    expect(list.at(-1)?.game.title).toBe('v5')
  })

  it('keeps games apart', async () => {
    const a = makeEmptyGame('A')
    const b = makeEmptyGame('B')
    await takeSnapshot(a, 'open')
    await takeSnapshot(b, 'open')

    expect((await listSnapshots(a.id)).map((s) => s.game.title)).toEqual(['A'])
  })
})

describe('history and stored media', () => {
  async function gameWithPicture() {
    const url = await putMedia(new Blob(['pic']))
    const game = makeEmptyGame()
    game.rounds[0].themes[0].questions[0].media = [{ id: uid('mi_'), url, kind: 'image' }]
    await upsertGame(game)
    await pruneMedia() // the picture now counts as claimed by the saved game
    return { game, url }
  }

  it('prunes a picture dropped from the game when no snapshot has it', async () => {
    const { game, url } = await gameWithPicture()
    game.rounds[0].themes[0].questions[0].media = undefined
    await upsertGame(game)

    await pruneMedia()

    expect(await getMedia(url)).toBeNull()
  })

  it('keeps a picture only a snapshot refers to', async () => {
    const { game, url } = await gameWithPicture()
    await takeSnapshot(game, 'before-delete')
    game.rounds[0].themes.shift()
    await upsertGame(game)

    await pruneMedia()

    expect(await getMedia(url)).not.toBeNull()
  })

  it('frees the picture once the game and its snapshots are deleted', async () => {
    const { game, url } = await gameWithPicture()
    await takeSnapshot(game, 'open')

    await deleteGame(game.id)
    await pruneMedia()

    expect(await listSnapshots(game.id)).toEqual([])
    expect(await getMedia(url)).toBeNull()
  })
})
