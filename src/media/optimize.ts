import type { ImageQuality } from '../prefs'

/** Longest side, in px, a picture is stored at: enough for a 1440p projector. */
export const MAX_IMAGE_SIDE = 2560

/** How a picture is re-encoded: longest side in px and the encoder quality, 0 to 1. */
export interface ImageOptions {
  maxSide: number
  quality: number
}

/** The encoder settings behind each compression level; null keeps the file as added. */
export const IMAGE_LEVELS: Readonly<Record<ImageQuality, ImageOptions | null>> = Object.freeze({
  original: null,
  normal: { maxSide: MAX_IMAGE_SIDE, quality: 0.85 },
  strong: { maxSide: 1600, quality: 0.75 },
})

// animation and vectors would be flattened into a single raster frame
const KEEP_AS_IS = new Set(['image/gif', 'image/svg+xml'])

/** Returns the size a picture is stored at: scaled down to fit MAX_IMAGE_SIDE, never up. */
export function targetSize(width: number, height: number, maxSide = MAX_IMAGE_SIDE): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

async function encode(canvas: OffscreenCanvas | HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type, quality }).catch(() => null)
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Shrinks a picture the user adds: scales photos down to the options' longest side and
 * re-encodes them as WebP. Returns the original when options are null, it is not a raster
 * picture, can't be decoded here, or would not get smaller.
 */
export async function optimizeImage(file: Blob, options: ImageOptions | null = IMAGE_LEVELS.normal): Promise<Blob> {
  if (!options || !file.type.startsWith('image/') || KEEP_AS_IS.has(file.type) || typeof createImageBitmap !== 'function') return file
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }
  try {
    const { width, height } = targetSize(bitmap.width, bitmap.height, options.maxSide)
    const shrunk = width < bitmap.width
    const canvas =
      typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : Object.assign(document.createElement('canvas'), { width, height })
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
    if (!ctx) return file
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)

    let out = await encode(canvas, 'image/webp', options.quality)
    // WebKit can't encode WebP and quietly hands back PNG; keep the source format instead,
    // so photos stay JPEG and transparent pictures stay PNG
    if (out?.type !== 'image/webp') out = await encode(canvas, file.type === 'image/png' ? 'image/png' : 'image/jpeg', options.quality)
    if (!out) return file
    return out.size < file.size || (shrunk && out.size <= file.size * 1.1) ? out : file
  } finally {
    bitmap.close()
  }
}
