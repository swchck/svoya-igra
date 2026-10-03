/* === Тонкая обёртка над IndexedDB ===
 * localStorage ограничен ~5–10 МБ, поэтому игры с картинками туда не влезут.
 * Здесь храним всё в IndexedDB (квота — десятки/сотни МБ, в Chromium ~60% диска).
 */

const DB_NAME = 'svoya-igra'
const DB_VERSION = 1
const STORE_GAMES = 'games'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_GAMES)) {
        db.createObjectStore(STORE_GAMES, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('IndexedDB open error'))
  })
  dbPromise.catch(() => { dbPromise = null })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE_GAMES, mode)
        const req = run(t.objectStore(STORE_GAMES))
        // QuotaExceededError arrives as a transaction abort while the request itself
        // already reported success, so only a committed transaction counts
        t.oncomplete = () => resolve(req.result)
        t.onabort = () => reject(t.error ?? req.error ?? new Error('IndexedDB transaction aborted'))
      }),
  )
}

export async function dbGetAll<T = unknown>(): Promise<T[]> {
  return (await tx<T[]>('readonly', (s) => s.getAll() as IDBRequest<T[]>)) ?? []
}

export async function dbGet<T = unknown>(id: string): Promise<T | undefined> {
  return await tx<T | undefined>('readonly', (s) => s.get(id) as IDBRequest<T | undefined>)
}

export async function dbPut<T extends { id: string }>(value: T): Promise<void> {
  await tx<IDBValidKey>('readwrite', (s) => s.put(value) as IDBRequest<IDBValidKey>)
}

export async function dbDelete(id: string): Promise<void> {
  await tx<undefined>('readwrite', (s) => s.delete(id) as IDBRequest<undefined>)
}

export async function dbClear(): Promise<void> {
  await tx<undefined>('readwrite', (s) => s.clear() as IDBRequest<undefined>)
}
