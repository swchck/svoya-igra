import { describe, expect, it } from 'vitest'
import { formatTime, parseTime, segmentOf } from './segment'

describe('media segment', () => {
  it('takes the start from a YouTube link unless set explicitly', () => {
    const url = 'https://youtu.be/O4SacSbp-Rc?t=8'
    expect(segmentOf({ id: 'a', kind: 'youtube', url })).toEqual({ start: 8, end: undefined })
    expect(segmentOf({ id: 'a', kind: 'youtube', url, start: 30, end: 45 })).toEqual({ start: 30, end: 45 })
  })

  it('drops an end that is not after the start', () => {
    expect(segmentOf({ id: 'a', kind: 'audio', url: 'x.mp3', start: 20, end: 10 })).toEqual({ start: 20, end: undefined })
  })

  it('reads and writes clock times', () => {
    expect(parseTime('90')).toBe(90)
    expect(parseTime('1:30')).toBe(90)
    expect(parseTime('1:02:03')).toBe(3723)
    expect(parseTime('')).toBeUndefined()
    expect(parseTime('1:3x')).toBeUndefined()
    expect(formatTime(90)).toBe('1:30')
    expect(formatTime(3723)).toBe('1:02:03')
  })
})
