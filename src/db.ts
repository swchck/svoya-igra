/* IndexedDB keeps the library: localStorage tops out at ~5 MB, far below a game with
 * pictures and sound. Games are small JSON documents; their attachments live as
 * Blobs in a separate store and are referenced as media://<id>. */

import { migrateInlineMedia } from './media/migrate'

const DB_NAME = 'svoya-igra'
const DB_VERSION = 2
export const STORE_GAMES = 'games'
export const STORE_MEDIA = 'media'
export type StoreName = typeof STORE_GAMES | typeof STORE_MEDIA

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_GAMES)) db.createObjectStore(STORE_GAMES, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(STORE_MEDIA)) db.createObjectStore(STORE_MEDIA, { keyPath: 'id' })
      if (e.oldVersion > 0 && e.oldVersion < 2) migrateInlineMedia(req.transaction!)
    }
    req.onsuccess = () => {
      // another window upgrading the schema has to be able to proceed
      req.result.onversionchange = () => {
        req.result.close()
        dbPromise = null
      }
      resolve(req.result)
    }
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open error'))
  })
  dbPromise.catch(() => {
    dbPromise = null
  })
  return dbPromise
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = run(t.objectStore(store))
        // QuotaExceededError arrives as a transaction abort while the request itself
        // already reported success, so only a committed transaction counts
        t.oncomplete = () => resolve(req.result)
        t.onabort = () => reject(t.error ?? req.error ?? new Error('IndexedDB transaction aborted'))
      }),
  )
}

export async function dbGetAll<T = unknown>(store: StoreName = STORE_GAMES): Promise<T[]> {
  return (await tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>)) ?? []
}

export async function dbGetAllKeys(store: StoreName): Promise<string[]> {
  return (await tx(store, 'readonly', (s) => s.getAllKeys())) as string[]
}

export function dbGet<T = unknown>(id: string, store: StoreName = STORE_GAMES): Promise<T | undefined> {
  return tx<T | undefined>(store, 'readonly', (s) => s.get(id) as IDBRequest<T | undefined>)
}

export async function dbPut<T extends { id: string }>(value: T, store: StoreName = STORE_GAMES): Promise<void> {
  await tx(store, 'readwrite', (s) => s.put(value))
}

export async function dbDelete(id: string, store: StoreName = STORE_GAMES): Promise<void> {
  await tx(store, 'readwrite', (s) => s.delete(id))
}
