// @vitest-environment node
import { describe, expect, it } from 'vitest'

function openV2(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('svoya-igra', 2)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('games', { keyPath: 'id' }).put({ id: 'g1', title: 'Старая' })
      req.result.createObjectStore('media', { keyPath: 'id' }).put({ id: 'm1', blob: new Blob(['x']) })
    }
    req.onsuccess = () => {
      req.result.close()
      resolve()
    }
    req.onerror = () => reject(req.error)
  })
}

describe('schema upgrade', () => {
  it('adds the snapshot store without touching games and media', async () => {
    await openV2()
    const db = await import('./db')

    expect(await db.dbGet<{ title: string }>('g1')).toMatchObject({ title: 'Старая' })
    expect(await db.dbGetAllKeys(db.STORE_MEDIA)).toEqual(['m1'])

    await db.dbPut({ id: 's1', gameId: 'g1' }, db.STORE_SNAPSHOTS)
    expect(await db.dbGetKeysByIndex(db.STORE_SNAPSHOTS, db.SNAPSHOT_BY_GAME, 'g1')).toEqual(['s1'])
  })
})
