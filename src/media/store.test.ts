// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { deleteUnreferencedMedia, getMedia, putMedia } from './store'

describe('media store', () => {
  it('keeps blobs behind media:// URLs', async () => {
    const url = await putMedia(new Blob(['abc'], { type: 'audio/mpeg' }))

    expect(url).toMatch(/^media:\/\//)
    const blob = await getMedia(url)
    expect(blob?.type).toBe('audio/mpeg')
    expect(await blob?.text()).toBe('abc')
  })

  it('deletes only unreferenced blobs', async () => {
    const kept = await putMedia(new Blob(['1']))
    const orphan = await putMedia(new Blob(['2']))

    await deleteUnreferencedMedia([kept, 'https://example.com/x.png'])

    expect(await getMedia(kept)).not.toBeNull()
    expect(await getMedia(orphan)).toBeNull()
  })
})
