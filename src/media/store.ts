import { dbDelete, dbGet, dbGetAllKeys, dbPut, STORE_MEDIA } from '../db'
import { uid } from '../game/model'
import { isStoredMedia, mediaId, mediaRef } from './ref'

/** A stored attachment. */
export interface MediaRecord {
  id: string
  blob: Blob
}

/** Stores the blob and returns its media:// URL. */
export async function putMedia(blob: Blob): Promise<string> {
  const id = uid('m_')
  await dbPut<MediaRecord>({ id, blob }, STORE_MEDIA)
  return mediaRef(id)
}

/** Returns the blob behind a media:// URL, or null when it is gone. */
export async function getMedia(url: string): Promise<Blob | null> {
  const record = await dbGet<MediaRecord>(mediaId(url), STORE_MEDIA)
  return record?.blob ?? null
}

const objectUrls = new Map<string, Promise<string>>()

/**
 * Returns a URL an <img>/<audio>/<video> can load. media:// URLs become object URLs,
 * cached for the session; anything else passes through.
 */
export function displayUrl(url: string): Promise<string> {
  if (!isStoredMedia(url)) return Promise.resolve(url)
  let cached = objectUrls.get(url)
  if (!cached) {
    cached = getMedia(url).then((blob) => (blob ? URL.createObjectURL(blob) : ''))
    objectUrls.set(url, cached)
  }
  return cached
}

/** Deletes stored attachments that none of the given URLs refer to. */
export async function deleteUnreferencedMedia(referenced: Iterable<string>): Promise<number> {
  const keep = new Set([...referenced].filter(isStoredMedia).map(mediaId))
  const orphans = (await dbGetAllKeys(STORE_MEDIA)).filter((id) => !keep.has(id))
  for (const id of orphans) {
    await dbDelete(id, STORE_MEDIA)
    const url = mediaRef(id)
    objectUrls.get(url)?.then((u) => u && URL.revokeObjectURL(u))
    objectUrls.delete(url)
  }
  return orphans.length
}
