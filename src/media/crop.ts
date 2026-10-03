/** A crop box in pixels of the source picture. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Size {
  w: number
  h: number
}

export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/** Smallest side a crop box can shrink to, in source pixels. */
export const MIN_SIDE = 24

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))

/** Returns the largest centred box of `ratio` (width over height), or the whole picture when free. */
export function fullRect(bounds: Size, ratio?: number): Rect {
  if (!ratio) return { x: 0, y: 0, w: bounds.w, h: bounds.h }
  const w = Math.min(bounds.w, bounds.h * ratio)
  const h = w / ratio
  return { x: (bounds.w - w) / 2, y: (bounds.h - h) / 2, w, h }
}

/** Shifts the box by (dx, dy), stopping at the picture's edges. */
export function moveRect(rect: Rect, dx: number, dy: number, bounds: Size): Rect {
  return { ...rect, x: clamp(rect.x + dx, 0, bounds.w - rect.w), y: clamp(rect.y + dy, 0, bounds.h - rect.h) }
}

/**
 * Drags one handle of the box by (dx, dy). The opposite side stays put; with a `ratio`
 * (width over height) the box keeps its shape, and an edge handle grows it about the middle.
 */
export function resizeRect(rect: Rect, handle: Handle, dx: number, dy: number, bounds: Size, ratio?: number): Rect {
  const west = handle.includes('w')
  const east = handle.includes('e')
  const north = handle.includes('n')
  const south = handle.includes('s')

  if (!ratio) {
    let left = rect.x
    let right = rect.x + rect.w
    let top = rect.y
    let bottom = rect.y + rect.h
    if (west) left = clamp(left + dx, 0, right - MIN_SIDE)
    if (east) right = clamp(right + dx, left + MIN_SIDE, bounds.w)
    if (north) top = clamp(top + dy, 0, bottom - MIN_SIDE)
    if (south) bottom = clamp(bottom + dy, top + MIN_SIDE, bounds.h)
    return { x: left, y: top, w: right - left, h: bottom - top }
  }

  const minW = Math.max(MIN_SIDE, MIN_SIDE * ratio)
  const right = rect.x + rect.w
  const bottom = rect.y + rect.h
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2

  if (north !== south && !west && !east) {
    // top or bottom edge: the width follows the height about the vertical axis
    const grow = south ? rect.h + dy : rect.h - dy
    const room = Math.min(south ? bounds.h - rect.y : bottom, (2 * Math.min(cx, bounds.w - cx)) / ratio)
    const h = clamp(grow, minW / ratio, room)
    const w = h * ratio
    return { x: cx - w / 2, y: south ? rect.y : bottom - h, w, h }
  }

  if (west !== east && !north && !south) {
    const grow = east ? rect.w + dx : rect.w - dx
    const room = Math.min(east ? bounds.w - rect.x : right, 2 * Math.min(cy, bounds.h - cy) * ratio)
    const w = clamp(grow, minW, room)
    const h = w / ratio
    return { x: east ? rect.x : right - w, y: cy - h / 2, w, h }
  }

  // corner: follow whichever axis the pointer moved further along
  const ax = east ? rect.x : right
  const ay = south ? rect.y : bottom
  const wantW = Math.max(east ? rect.w + dx : rect.w - dx, (south ? rect.h + dy : rect.h - dy) * ratio)
  const room = Math.min(east ? bounds.w - ax : ax, (south ? bounds.h - ay : ay) * ratio)
  const w = clamp(wantW, minW, room)
  const h = w / ratio
  return { x: east ? ax : ax - w, y: south ? ay : ay - h, w, h }
}

/** Reshapes the box to `ratio`, keeping its centre and about its area, inside the picture. */
export function applyRatio(rect: Rect, ratio: number, bounds: Size): Rect {
  let h = Math.sqrt((rect.w * rect.h) / ratio)
  let w = h * ratio
  if (w > bounds.w) {
    w = bounds.w
    h = w / ratio
  }
  if (h > bounds.h) {
    h = bounds.h
    w = h * ratio
  }
  const x = clamp(rect.x + rect.w / 2 - w / 2, 0, bounds.w - w)
  const y = clamp(rect.y + rect.h / 2 - h / 2, 0, bounds.h - h)
  return { x, y, w, h }
}

/** Rounds the box to whole pixels without leaving the picture. */
export function snapRect(rect: Rect, bounds: Size): Rect {
  const x = clamp(Math.round(rect.x), 0, bounds.w - 1)
  const y = clamp(Math.round(rect.y), 0, bounds.h - 1)
  return { x, y, w: clamp(Math.round(rect.w), 1, bounds.w - x), h: clamp(Math.round(rect.h), 1, bounds.h - y) }
}

/** Cuts the box out of the picture and returns it as a lossless PNG. */
export async function cropBlob(source: Blob, rect: Rect): Promise<Blob> {
  const bitmap = await createImageBitmap(source)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = rect.w
    canvas.height = rect.h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')
    ctx.drawImage(bitmap, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h)
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!out) throw new Error('Could not encode the cropped picture')
    return out
  } finally {
    bitmap.close()
  }
}
