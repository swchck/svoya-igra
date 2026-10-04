import { describe, expect, it } from 'vitest'
import { IMAGE_LEVELS, MAX_IMAGE_SIDE, optimizeImage, targetSize } from './optimize'

describe('targetSize', () => {
  it('scales the longer side down to the limit', () => {
    expect(targetSize(6000, 4000)).toEqual({ width: MAX_IMAGE_SIDE, height: 1707 })
    expect(targetSize(3000, 5000)).toEqual({ width: 1536, height: MAX_IMAGE_SIDE })
  })

  it('never scales up', () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('honours a smaller limit', () => {
    expect(targetSize(6000, 4000, 1600)).toEqual({ width: 1600, height: 1067 })
  })
})

describe('IMAGE_LEVELS', () => {
  it('keeps the original, then shrinks harder at each level', () => {
    expect(IMAGE_LEVELS.original).toBeNull()
    expect(IMAGE_LEVELS.normal).toEqual({ maxSide: MAX_IMAGE_SIDE, quality: 0.85 })
    expect(IMAGE_LEVELS.strong).toEqual({ maxSide: 1600, quality: 0.75 })
  })
})

describe('optimizeImage', () => {
  it('passes through what it should not touch', async () => {
    for (const type of ['image/gif', 'image/svg+xml', 'audio/mpeg']) {
      const blob = new Blob(['x'], { type })
      expect(await optimizeImage(blob)).toBe(blob)
    }
  })

  it('leaves photos alone at the original level', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' })
    expect(await optimizeImage(blob, IMAGE_LEVELS.original)).toBe(blob)
  })
})
