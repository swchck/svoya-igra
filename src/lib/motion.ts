/** True when the viewer asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Bursts confetti from a point given in viewport pixels; loads the library on first use. */
export async function confettiAt(x: number, y: number, options: { big?: boolean } = {}): Promise<void> {
  if (prefersReducedMotion()) return
  const { default: confetti } = await import('canvas-confetti')
  const colors = ['#ffc531', '#ff3d9a', '#3fe0ff', '#ffffff']
  const origin = { x: x / innerWidth, y: y / innerHeight }
  confetti({ particleCount: options.big ? 160 : 70, spread: options.big ? 110 : 70, startVelocity: options.big ? 55 : 38, origin, colors, scalar: 1.1, disableForReducedMotion: true })
}
