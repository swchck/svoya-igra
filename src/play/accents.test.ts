import { describe, expect, it } from 'vitest'
import { ACCENTS, accentStyle, lookAttrs } from './accents'

describe('stage looks', () => {
  it('marks only the light style with the light palette', () => {
    expect(lookAttrs(undefined)).toEqual({ 'data-look': 'studio', class: { 'light-surface': false } })
    expect(lookAttrs({ look: 'neon' }).class['light-surface']).toBe(false)
    expect(lookAttrs({ look: 'minimal' })).toEqual({ 'data-look': 'minimal', class: { 'light-surface': true } })
  })

  it('leaves the default gold alone', () => {
    expect(accentStyle(undefined)).toEqual({})
    expect(accentStyle({ accent: 'gold', look: 'minimal' })).toEqual({})
  })

  it('writes text in the deep tone on the light stage and keeps the board bright', () => {
    const { gold, deep } = ACCENTS.ruby
    expect(accentStyle({ accent: 'ruby' })['--gold']).toBe(gold)
    const light = accentStyle({ accent: 'ruby', look: 'minimal' })
    expect(light['--gold']).toBe(deep)
    expect(light['--value']).toBe(gold)
  })
})
