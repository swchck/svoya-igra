import { describe, expect, it } from 'vitest'
import { brandStyle, dominantColor } from './brandColor'

function pixels(...colors: [number, number, number, number, number][]): Uint8ClampedArray {
  const out: number[] = []
  for (const [r, g, b, a, n] of colors) for (let i = 0; i < n; i++) out.push(r, g, b, a)
  return new Uint8ClampedArray(out)
}

describe('brand color', () => {
  it('takes the vivid color over white background, black text and transparency', () => {
    const logo = pixels([255, 255, 255, 255, 500], [10, 10, 10, 255, 200], [220, 30, 40, 0, 300], [20, 120, 220, 255, 60])
    expect(dominantColor(logo)).toBe('rgb(20 120 220)')
  })

  it('finds nothing in a grey logo', () => {
    expect(dominantColor(pixels([128, 128, 128, 255, 100], [255, 255, 255, 255, 10]))).toBeNull()
  })

  it('builds the stage from the color, and nothing without one', () => {
    expect(brandStyle(null)).toEqual({})
    expect(brandStyle('rgb(20 120 220)')['--tile']).toContain('rgb(20 120 220)')
  })
})
