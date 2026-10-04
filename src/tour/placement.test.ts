import { describe, expect, it } from 'vitest'
import { placeCard } from './placement'

const viewport = { width: 1000, height: 600 }
const card = { width: 300, height: 200 }

describe('placeCard', () => {
  it('centres the card when there is no target', () => {
    expect(placeCard(null, card, viewport)).toEqual({ left: 350, top: 200 })
  })

  it('puts the card below the target, centred on it', () => {
    const pos = placeCard({ left: 400, top: 50, width: 200, height: 40 }, card, viewport)
    expect(pos).toEqual({ left: 350, top: 104 })
  })

  it('goes above a target at the bottom of the viewport', () => {
    const pos = placeCard({ left: 400, top: 520, width: 200, height: 40 }, card, viewport)
    expect(pos.top).toBe(520 - 14 - 200)
  })

  it('goes beside a tall target that leaves no room above or below', () => {
    const pos = placeCard({ left: 20, top: 20, width: 100, height: 560 }, card, viewport)
    expect(pos.left).toBe(134)
  })

  it('keeps the card inside the viewport next to an edge target', () => {
    const pos = placeCard({ left: 0, top: 10, width: 60, height: 30 }, card, viewport)
    expect(pos.left).toBe(12)
  })

  it('covers as little as possible of a target that fills the viewport', () => {
    const target = { left: 0, top: 0, width: 1000, height: 600 }
    const pos = placeCard(target, card, viewport)
    expect(pos.left).toBeGreaterThanOrEqual(12)
    expect(pos.left + card.width).toBeLessThanOrEqual(988)
    expect(pos.top + card.height).toBeLessThanOrEqual(588)
  })

  it('prefers a corner that leaves the target clear when no side fits', () => {
    // a wide, tall target with free space only in the bottom-right corner
    const target = { left: 0, top: 0, width: 1000, height: 380 }
    const pos = placeCard(target, { width: 300, height: 200 }, viewport)
    expect(pos.top).toBe(388)
  })

  it('shrinks to a narrow viewport without leaving it', () => {
    const pos = placeCard({ left: 10, top: 10, width: 100, height: 40 }, { width: 296, height: 200 }, { width: 320, height: 568 })
    expect(pos.left).toBe(12)
    expect(pos.left + 296).toBeLessThanOrEqual(308)
  })
})
