import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_SIDE, optimizeImage, targetSize } from './optimize'

describe('targetSize', () => {
  it('scales the longer side down to the limit', () => {
    expect(targetSize(6000, 4000)).toEqual({ width: MAX_IMAGE_SIDE, height: 1707 })
    expect(targetSize(3000, 5000)).toEqual({ width: 1536, height: MAX_IMAGE_SIDE })
  })

  it('never scales up', () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })
})

describe('optimizeImage', () => {
  it('passes through what it should not touch', async () => {
    for (const type of ['image/gif', 'image/svg+xml', 'audio/mpeg']) {
      const blob = new Blob(['x'], { type })
      expect(await optimizeImage(blob)).toBe(blob)
    }
  })
})
