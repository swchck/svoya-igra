import type { Player } from '@/types'

/** Competitor colors: light enough for the navy stage, far enough apart to tell at a glance. */
export const PLAYER_COLORS = [
  { id: 'coral', css: 'oklch(0.74 0.16 25)' },
  { id: 'orange', css: 'oklch(0.78 0.15 55)' },
  { id: 'lime', css: 'oklch(0.83 0.17 130)' },
  { id: 'mint', css: 'oklch(0.82 0.13 175)' },
  { id: 'sky', css: 'oklch(0.78 0.12 235)' },
  { id: 'violet', css: 'oklch(0.72 0.17 295)' },
  { id: 'pink', css: 'oklch(0.75 0.18 345)' },
  { id: 'sand', css: 'oklch(0.85 0.06 85)' },
] as const

export const PLAYER_AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐙', '🦉', '🐯', '🐧', '🦄', '🐲', '🚀', '⚡', '🎯', '🔥', '👑', '🍀'] as const

/** The color a player is drawn in: their own pick, or one by their place in the list. */
export function playerColor(player: Pick<Player, 'color'>, index: number): string {
  const own = PLAYER_COLORS.find((c) => c.id === player.color)
  return (own ?? PLAYER_COLORS[index % PLAYER_COLORS.length]).css
}

/** The first palette color nobody uses yet; the palette starts over once it runs out. */
export function nextColorId(players: Pick<Player, 'color'>[]): string {
  const used = new Set(players.map((p) => p.color))
  return (PLAYER_COLORS.find((c) => !used.has(c.id)) ?? PLAYER_COLORS[players.length % PLAYER_COLORS.length]).id
}
