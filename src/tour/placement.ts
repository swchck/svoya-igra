import type { Box } from './dom'

interface Size {
  width: number
  height: number
}

interface Spacing {
  /** Space between the target and the card. */
  gap: number
  /** Space kept free along the viewport edges. */
  margin: number
}

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top)
  return w > 0 && h > 0 ? w * h : 0
}

/**
 * Positions the card next to the target, inside the viewport. Sides are tried in the order
 * below-above-right-left; the first that leaves the target uncovered wins, otherwise the
 * spot covering the least of it.
 */
export function placeCard(target: Box | null, card: Size, viewport: Size, { gap, margin }: Spacing = { gap: 14, margin: 12 }): { left: number; top: number } {
  const clampX = (x: number) => Math.max(margin, Math.min(x, viewport.width - card.width - margin))
  const clampY = (y: number) => Math.max(margin, Math.min(y, viewport.height - card.height - margin))
  if (!target) return { left: clampX((viewport.width - card.width) / 2), top: clampY((viewport.height - card.height) / 2) }

  const midX = target.left + target.width / 2 - card.width / 2
  const midY = target.top + target.height / 2 - card.height / 2
  const candidates = [
    { left: midX, top: target.top + target.height + gap },
    { left: midX, top: target.top - gap - card.height },
    { left: target.left + target.width + gap, top: midY },
    { left: target.left - gap - card.width, top: midY },
    // the target is too big for any side: tuck the card into a corner
    { left: viewport.width, top: viewport.height },
    { left: 0, top: viewport.height },
    { left: viewport.width, top: 0 },
    { left: 0, top: 0 },
  ].map((c) => ({ left: clampX(c.left), top: clampY(c.top) }))

  let best = candidates[0]
  let bestCover = Infinity
  for (const c of candidates) {
    const cover = overlap({ ...c, ...card }, target)
    if (cover < bestCover) {
      best = c
      bestCover = cover
    }
    if (cover === 0) break
  }
  return best
}
