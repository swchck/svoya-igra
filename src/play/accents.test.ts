import { describe, expect, it } from 'vitest'
import { ACCENTS, accentStyle, lookAttrs } from './accents'

describe('stage looks', () => {
  it('names the stage style for the CSS, the studio when the game sets none', () => {
    expect(lookAttrs(undefined)).toEqual({ 'data-look': 'studio' })
    expect(lookAttrs({ look: 'neon' })).toEqual({ 'data-look': 'neon' })
  })

  it('recolors the gold only for another accent', () => {
    expect(accentStyle(undefined)).toEqual({})
    expect(accentStyle({ accent: 'gold' })).toEqual({})
    expect(accentStyle({ accent: 'ruby' })['--gold']).toBe(ACCENTS.ruby.gold)
  })
})
