import { watchEffect } from 'vue'
import { prefs } from '@/prefs'

const REDUCE_CLASS = 'reduce-motion'

/** True when the viewer asked for less motion, in the app's settings or the system's. */
export function prefersReducedMotion(): boolean {
  return prefs.reducedMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
}

/** Keeps the `reduce-motion` class on <html> in step with the app's setting, for the CSS. */
export function syncMotionClass(): void {
  watchEffect(() => document.documentElement.classList.toggle(REDUCE_CLASS, prefs.reducedMotion))
}

/** Bursts confetti from a point given in viewport pixels; loads the library on first use. */
export async function confettiAt(x: number, y: number, options: { big?: boolean } = {}): Promise<void> {
  if (prefersReducedMotion()) return
  const { default: confetti } = await import('canvas-confetti')
  const colors = ['#ffc531', '#ff3d9a', '#3fe0ff', '#ffffff']
  const origin = { x: x / innerWidth, y: y / innerHeight }
  confetti({ particleCount: options.big ? 160 : 70, spread: options.big ? 110 : 70, startVelocity: options.big ? 55 : 38, origin, colors, scalar: 1.1, disableForReducedMotion: true })
}
