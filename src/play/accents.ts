import type { AccentName, GameSettings } from '@/types'

/** The stage's gold in each curated palette: the bright tone and the deep one under it. */
export const ACCENTS: Record<AccentName, { gold: string; deep: string }> = {
  gold: { gold: 'oklch(0.86 0.17 85)', deep: 'oklch(0.7 0.16 65)' },
  ruby: { gold: 'oklch(0.76 0.18 12)', deep: 'oklch(0.58 0.2 20)' },
  emerald: { gold: 'oklch(0.82 0.17 155)', deep: 'oklch(0.62 0.15 160)' },
  sapphire: { gold: 'oklch(0.8 0.12 250)', deep: 'oklch(0.6 0.15 255)' },
}

/** Inline CSS variables that recolor the gold accents under an element; empty for the default. */
export function accentStyle(settings: GameSettings | undefined): Record<string, string> {
  const accent = settings?.accent && settings.accent !== 'gold' ? ACCENTS[settings.accent] : undefined
  if (!accent) return {}
  // Tailwind's --color-* copies were resolved at the root, so they need the override too
  const { gold, deep } = accent
  return { '--gold': gold, '--gold-deep': deep, '--color-gold': gold, '--primary': gold, '--color-primary': gold, '--ring': gold, '--color-ring': gold }
}
