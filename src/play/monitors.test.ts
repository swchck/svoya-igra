import { describe, expect, it } from 'vitest'
import type { Monitor } from '@tauri-apps/api/window'
import { findScreen, fitCentered, pickHostScreen, sameScreen, toScreen, type Screen } from './monitors'

function screen(name: string | null, x: number, width = 1920, height = 1080): Screen {
  const bounds = { x, y: 0, width, height }
  return { name, bounds, workArea: { ...bounds, y: 50, height: height - 50 }, scaleFactor: 1 }
}

const laptop = screen('Built-in Retina Display', 0, 3024, 1964)
const tv = screen('LG TV', 3024)
const twin = screen('LG TV', 4944)

describe('toScreen', () => {
  it('flattens the Tauri monitor', () => {
    const m = {
      name: 'LG TV',
      position: { x: 10, y: 20 },
      size: { width: 1920, height: 1080 },
      workArea: { position: { x: 10, y: 45 }, size: { width: 1920, height: 1055 } },
      scaleFactor: 2,
    } as unknown as Monitor
    expect(toScreen(m)).toEqual({
      name: 'LG TV',
      bounds: { x: 10, y: 20, width: 1920, height: 1080 },
      workArea: { x: 10, y: 45, width: 1920, height: 1055 },
      scaleFactor: 2,
    })
  })
})

describe('findScreen', () => {
  it('finds a connected monitor by name', () => {
    expect(findScreen([laptop, tv], 'LG TV')).toBe(tv)
  })

  it('returns null for an unplugged monitor or no choice', () => {
    expect(findScreen([laptop], 'LG TV')).toBeNull()
    expect(findScreen([laptop, tv], null)).toBeNull()
  })
})

describe('sameScreen', () => {
  it('tells apart two monitors of one model by position', () => {
    expect(sameScreen(tv, { ...tv })).toBe(true)
    expect(sameScreen(tv, twin)).toBe(false)
    expect(sameScreen(tv, null)).toBe(false)
  })
})

describe('fitCentered', () => {
  const area = { x: 1000, y: 50, width: 1920, height: 1030 }

  it('centers a window that fits', () => {
    expect(fitCentered(1280, 820, area)).toEqual({ x: 1320, y: 155, width: 1280, height: 820 })
  })

  it('shrinks a window larger than the area', () => {
    expect(fitCentered(2560, 1600, area)).toEqual({ x: 1000, y: 50, width: 1920, height: 1030 })
  })
})

describe('pickHostScreen', () => {
  it('prefers the primary screen when the stage is elsewhere', () => {
    expect(pickHostScreen([laptop, tv, twin], tv, laptop)).toBe(laptop)
  })

  it('takes another screen when the stage is on the primary one', () => {
    expect(pickHostScreen([laptop, tv], laptop, laptop)).toBe(tv)
  })

  it('gives up with one screen or an unknown stage', () => {
    expect(pickHostScreen([laptop], laptop, laptop)).toBeNull()
    expect(pickHostScreen([laptop, tv], null, laptop)).toBeNull()
  })
})
