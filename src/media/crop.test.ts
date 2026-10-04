import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyRatio, cropBlob, fullRect, MIN_SIDE, moveRect, resizeRect, snapRect, type Rect } from './crop'

const bounds = { w: 1000, h: 600 }
const box: Rect = { x: 200, y: 100, w: 400, h: 300 }
const ratioOf = (r: Rect) => r.w / r.h

describe('fullRect', () => {
  it('covers the picture when free', () => {
    expect(fullRect(bounds)).toEqual({ x: 0, y: 0, w: 1000, h: 600 })
  })

  it('fits the largest centred box of a ratio', () => {
    expect(fullRect(bounds, 1)).toEqual({ x: 200, y: 0, w: 600, h: 600 })
    const wide = fullRect(bounds, 16 / 9)
    expect(wide.w).toBeCloseTo(1000)
    expect(wide.h).toBeCloseTo(562.5)
    expect(wide.y).toBeCloseTo(18.75)
  })
})

describe('moveRect', () => {
  it('moves and stops at every edge', () => {
    expect(moveRect(box, 50, -20, bounds)).toMatchObject({ x: 250, y: 80, w: 400, h: 300 })
    expect(moveRect(box, -999, -999, bounds)).toMatchObject({ x: 0, y: 0 })
    expect(moveRect(box, 999, 999, bounds)).toMatchObject({ x: 600, y: 300 })
  })
})

describe('resizeRect, free', () => {
  it('moves only the dragged sides', () => {
    expect(resizeRect(box, 'e', 100, 50, bounds)).toEqual({ x: 200, y: 100, w: 500, h: 300 })
    expect(resizeRect(box, 'nw', -50, -40, bounds)).toEqual({ x: 150, y: 60, w: 450, h: 340 })
    expect(resizeRect(box, 's', 0, -100, bounds)).toEqual({ x: 200, y: 100, w: 400, h: 200 })
  })

  it('stays inside the picture', () => {
    expect(resizeRect(box, 'se', 9999, 9999, bounds)).toEqual({ x: 200, y: 100, w: 800, h: 500 })
    expect(resizeRect(box, 'nw', -9999, -9999, bounds)).toEqual({ x: 0, y: 0, w: 600, h: 400 })
  })

  it('never shrinks below the minimum or flips over', () => {
    expect(resizeRect(box, 'e', -9999, 0, bounds).w).toBe(MIN_SIDE)
    const w = resizeRect(box, 'w', 9999, 0, bounds)
    expect(w).toMatchObject({ x: 600 - MIN_SIDE, w: MIN_SIDE })
  })
})

describe('resizeRect, locked ratio', () => {
  const r = 4 / 3
  const locked: Rect = { x: 200, y: 100, w: 400, h: 300 }

  it('keeps the shape and the opposite corner on a corner drag', () => {
    const out = resizeRect(locked, 'se', 80, 10, bounds, r)
    expect(ratioOf(out)).toBeCloseTo(r)
    expect(out).toMatchObject({ x: 200, y: 100 })
    expect(out.w).toBeCloseTo(480)
  })

  it('anchors the south-east corner when dragging north-west', () => {
    const out = resizeRect(locked, 'nw', -40, 0, bounds, r)
    expect(out.x + out.w).toBeCloseTo(600)
    expect(out.y + out.h).toBeCloseTo(400)
    expect(ratioOf(out)).toBeCloseTo(r)
  })

  it('follows the vertical drag when it is the larger one', () => {
    const out = resizeRect(locked, 'se', 0, 90, bounds, r)
    expect(out.h).toBeCloseTo(390)
    expect(ratioOf(out)).toBeCloseTo(r)
  })

  it('stops at the picture edge with the shape intact', () => {
    const out = resizeRect(locked, 'se', 9999, 9999, bounds, r)
    expect(ratioOf(out)).toBeCloseTo(r)
    expect(out.x + out.w).toBeLessThanOrEqual(1000.001)
    expect(out.y + out.h).toBeLessThanOrEqual(600.001)
  })

  it('grows about the middle on an edge drag', () => {
    const out = resizeRect(locked, 'e', 80, 0, bounds, r)
    expect(out.x).toBe(200)
    expect(out.w).toBeCloseTo(480)
    expect(out.y + out.h / 2).toBeCloseTo(250)
    expect(ratioOf(out)).toBeCloseTo(r)

    const south = resizeRect(locked, 's', 0, 60, bounds, r)
    expect(south.y).toBe(100)
    expect(south.x + south.w / 2).toBeCloseTo(400)
    expect(ratioOf(south)).toBeCloseTo(r)
  })

  it('limits an edge drag by the room around the middle', () => {
    const out = resizeRect({ x: 0, y: 450, w: 200, h: 150 }, 'e', 9999, 0, bounds, r)
    expect(out.y).toBeGreaterThanOrEqual(0)
    expect(out.y + out.h).toBeLessThanOrEqual(600.001)
    expect(ratioOf(out)).toBeCloseTo(r)
  })

  it('has a minimum size', () => {
    const out = resizeRect(locked, 'se', -9999, -9999, bounds, r)
    expect(out.h).toBeGreaterThanOrEqual(MIN_SIDE - 0.001)
    expect(out.w).toBeGreaterThanOrEqual(MIN_SIDE - 0.001)
  })
})

describe('applyRatio', () => {
  it('keeps the centre and about the area', () => {
    const out = applyRatio(box, 1, bounds)
    expect(out.w).toBeCloseTo(out.h)
    expect(out.w * out.h).toBeCloseTo(box.w * box.h)
    expect(out.x + out.w / 2).toBeCloseTo(400)
    expect(out.y + out.h / 2).toBeCloseTo(250)
  })

  it('squeezes into the picture when the shape is too wide for it', () => {
    const out = applyRatio({ x: 0, y: 0, w: 1000, h: 600 }, 16 / 9, bounds)
    expect(out.w).toBeCloseTo(1000)
    expect(out.h).toBeCloseTo(562.5)
    const tall = applyRatio({ x: 0, y: 0, w: 1000, h: 600 }, 1 / 3, bounds)
    expect(tall.h).toBeCloseTo(600)
    expect(tall.w).toBeCloseTo(200)
  })

  it('shifts back inside when the centre sits near an edge', () => {
    const out = applyRatio({ x: 800, y: 0, w: 200, h: 150 }, 1, bounds)
    expect(out.x + out.w).toBeLessThanOrEqual(1000.001)
    expect(out.y).toBeGreaterThanOrEqual(0)
  })
})

describe('snapRect', () => {
  it('rounds to whole pixels inside the picture', () => {
    expect(snapRect({ x: 10.4, y: 20.6, w: 99.5, h: 50.2 }, bounds)).toEqual({ x: 10, y: 21, w: 100, h: 50 })
    expect(snapRect({ x: 900.4, y: 0, w: 99.9, h: 600 }, bounds)).toEqual({ x: 900, y: 0, w: 100, h: 600 })
  })
})

describe('cropBlob', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('draws the box region onto a canvas of its size and returns a PNG', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close })))
    const drawImage = vi.fn()
    const png = new Blob(['png'], { type: 'image/png' })
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob: (cb: (b: Blob | null) => void, type: string) => cb(type === 'image/png' ? png : null) }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas as unknown as HTMLCanvasElement)

    const out = await cropBlob(new Blob(['src']), { x: 10, y: 20, w: 300, h: 200 })

    expect(out).toBe(png)
    expect(canvas).toMatchObject({ width: 300, height: 200 })
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 10, 20, 300, 200, 0, 0, 300, 200)
    expect(close).toHaveBeenCalled()
  })

  it('fails when the canvas cannot encode, and still releases the bitmap', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close })))
    const canvas = { getContext: () => ({ drawImage: vi.fn() }), toBlob: (cb: (b: Blob | null) => void) => cb(null) }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas as unknown as HTMLCanvasElement)

    await expect(cropBlob(new Blob(['src']), { x: 0, y: 0, w: 5, h: 5 })).rejects.toThrow()
    expect(close).toHaveBeenCalled()
  })
})
