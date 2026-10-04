import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, parsePrefs } from './prefs'

describe('parsePrefs', () => {
  it('falls back to defaults on missing or broken data', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS)
    expect(parsePrefs('{nope')).toEqual(DEFAULT_PREFS)
  })

  it('keeps known keys of the right type only', () => {
    const p = parsePrefs(JSON.stringify({ answerSeconds: 30, wrongPenalty: 'no', stageMonitor: 'DELL', junk: 1 }))
    expect(p.answerSeconds).toBe(30)
    expect(p.wrongPenalty).toBe(true)
    expect(p.stageMonitor).toBe('DELL')
    expect('junk' in p).toBe(false)
  })
})
