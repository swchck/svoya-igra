import { mediaItems, uid } from '../game/model'
import { parseGame } from '../game/parse'
import { dataUrlToBlob } from './dataUrl'
import { mediaRef } from './ref'

/**
 * Schema v1 → v2: moves data: URLs embedded in games into the media store.
 * Runs inside the versionchange transaction, so the move is all-or-nothing.
 */
export function migrateInlineMedia(tx: IDBTransaction): void {
  const games = tx.objectStore('games')
  const media = tx.objectStore('media')
  const cursorReq = games.openCursor()
  cursorReq.onsuccess = () => {
    const cursor = cursorReq.result
    if (!cursor) return
    let game
    try {
      game = parseGame(cursor.value)
    } catch {
      cursor.continue()
      return
    }
    const idByDataUrl = new Map<string, string>()
    for (const item of mediaItems(game)) {
      if (!item.url.startsWith('data:')) continue
      let id = idByDataUrl.get(item.url)
      if (!id) {
        let blob
        try {
          blob = dataUrlToBlob(item.url)
        } catch {
          // a throw here aborts the upgrade and locks every game out, so leave the bad one inline
          continue
        }
        id = uid('m_')
        media.put({ id, blob })
        idByDataUrl.set(item.url, id)
      }
      item.url = mediaRef(id)
    }
    cursor.update(game)
    cursor.continue()
  }
}
