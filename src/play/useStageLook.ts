import { computed } from 'vue'
import type { GameSettings } from '@/types'
import { accentStyle, stageLook } from './accents'
import { brandStyle, useBrandColor } from './brandColor'

/**
 * Attributes for the element that holds a stage: the style's name for the CSS in styles.css
 * and the inline variables of the accent and, for the brand style, the logo's color.
 */
export function useStageLook(settings: () => GameSettings | undefined) {
  const brand = useBrandColor(settings)
  return computed(() => ({
    'data-look': stageLook(settings()),
    style: { ...brandStyle(brand.value), ...accentStyle(settings()) },
  }))
}
