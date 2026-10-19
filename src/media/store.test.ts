// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { dbPut, STORE_MEDIA } from '../db'
import { mediaRef } from './ref'
import { deleteUnreferencedMedia, displayUrl, getMedia, putMedia } from './store'

describe('media store', () => {
  it('shows a stored blob from a copy in memory, never the stored one itself', async () => {
    const url = await putMedia(new Blob(['png bytes'], { type: 'image/png' }))
    const stored = await getMedia(url)
    const made: Blob[] = []
    const spy = vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => (made.push(b as Blob), 'blob:copy'))

    expect(await displayUrl(url)).toBe('blob:copy')
    expect(made[0]).not.toBe(stored)
    expect(made[0].type).toBe('image/png')
    expect(await made[0].text()).toBe('png bytes')
    spy.mockRestore()
  })

  it('keeps blobs behind media:// URLs', async () => {
    const url = await putMedia(new Blob(['abc'], { type: 'audio/mpeg' }))

    expect(url).toMatch(/^media:\/\//)
    const blob = await getMedia(url)
    expect(blob?.type).toBe('audio/mpeg')
    expect(await blob?.text()).toBe('abc')
  })

  it('deletes only unreferenced blobs', async () => {
    const kept = await putMedia(new Blob(['1']))
    await dbPut({ id: 'm_from_last_launch', blob: new Blob(['2']) }, STORE_MEDIA)
    const orphan = mediaRef('m_from_last_launch')

    await deleteUnreferencedMedia([kept, 'https://example.com/x.png'])

    expect(await getMedia(kept)).not.toBeNull()
    expect(await getMedia(orphan)).toBeNull()
  })

  it('spares blobs stored this session until a game has referenced them', async () => {
    const pending = await putMedia(new Blob(['import in flight']))

    await deleteUnreferencedMedia([])
    expect(await getMedia(pending)).not.toBeNull()

    await deleteUnreferencedMedia([pending])
    await deleteUnreferencedMedia([])
    expect(await getMedia(pending)).toBeNull()
  })
})
