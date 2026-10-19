import { ref, watchEffect, type Ref } from 'vue'
import type { GameSettings, MediaItem } from '@/types'
import { displayUrl } from '@/media/store'

/*
 * The brand style paints the stage in the logo's own color: the most common colorful part of
 * the picture, with greys, near-blacks and near-whites left out, since a logo's text and
 * background are usually those and say nothing about the brand.
 */

/** Side of the square the logo is shrunk to before counting, px; plenty for a color. */
const SAMPLE = 48

/** Saturation a color needs to count, tried in turn: a vivid one first, then a muted one. */
const SATURATION_STEPS = [0.3, 0.12]

function bucketed(pixels: Uint8ClampedArray, minSat: number): string | null {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number; weight: number }>()
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const [r, g, b, a] = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]]
    if (a < 200) continue
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const light = (max + min) / 510
    const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255))
    if (sat < minSat || light < 0.1 || light > 0.92) continue
    // 4 bits a channel: shades of one color land in one bucket
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, weight: 0 }
    bucket.n += 1
    bucket.r += r
    bucket.g += g
    bucket.b += b
    bucket.weight += sat
    buckets.set(key, bucket)
  }
  let best: { n: number; r: number; g: number; b: number; weight: number } | undefined
  for (const bucket of buckets.values()) if (!best || bucket.weight > best.weight) best = bucket
  if (!best) return null
  return `rgb(${Math.round(best.r / best.n)} ${Math.round(best.g / best.n)} ${Math.round(best.b / best.n)})`
}

/**
 * The logo's dominant color as `rgb(r g b)`, from RGBA pixels: a vivid one if the logo has
 * any, else a muted one; null for a logo of greys, black and white only.
 */
export function dominantColor(pixels: Uint8ClampedArray): string | null {
  for (const minSat of SATURATION_STEPS) {
    const found = bucketed(pixels, minSat)
    if (found) return found
  }
  return null
}

async function logoColor(logo: MediaItem): Promise<string | null> {
  const img = new Image()
  img.src = await displayUrl(logo.url)
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SAMPLE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE)
  return dominantColor(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data)
}

/** CSS variables that build the stage from one brand color; empty without one. */
export function brandStyle(color: string | null): Record<string, string> {
  if (!color) return {}
  const mix = (amount: number, other: string) => `color-mix(in oklch, ${color} ${amount}%, ${other})`
  return {
    '--stage-top': mix(55, 'black'),
    '--stage-bottom': mix(15, 'black'),
    '--set-glow': `color-mix(in oklch, ${color} 50%, transparent)`,
    '--tile': mix(80, 'black'),
    '--tile-deep': mix(55, 'black'),
    '--tile-glow': mix(90, 'white'),
    '--theme-top': mix(60, 'black'),
    '--theme-bottom': mix(40, 'black'),
  }
}

/**
 * The brand color of the game's logo while the game uses the brand style, or always with
 * `always`; null without a logo or when it has no color.
 */
export function useBrandColor(settings: () => GameSettings | undefined, always = false): Ref<string | null> {
  const color = ref<string | null>(null)
  watchEffect(async () => {
    const s = settings()
    const logo = always || s?.look === 'brand' ? s?.logo : undefined
    if (!logo) {
      color.value = null
      return
    }
    const found = await logoColor(logo).catch(() => null)
    if (settings()?.logo?.url === logo.url) color.value = found
  })
  return color
}
