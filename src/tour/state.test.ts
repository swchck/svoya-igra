import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const platform = vi.hoisted(() => ({ main: true }))
vi.mock('@/platform', () => ({ isMainWindow: () => platform.main }))

import { endTour, isTourDone, offerTour, startTour, tour } from './state'

beforeEach(() => {
  localStorage.clear()
  tour.active = false
  platform.main = true
})

afterEach(() => vi.restoreAllMocks())

describe('tour state', () => {
  it('offers the tour once to a newcomer', () => {
    offerTour()
    expect(tour).toMatchObject({ active: true, ask: true })
  })

  it('remembers that the tour was seen however it ended', () => {
    startTour()
    expect(isTourDone()).toBe(false)
    endTour()
    expect(tour.active).toBe(false)
    expect(isTourDone()).toBe(true)
    offerTour()
    expect(tour.active).toBe(false)
  })

  it('does not offer the tour in a host window', () => {
    platform.main = false
    offerTour()
    expect(tour.active).toBe(false)
  })

  it('does not restart a tour that is running', () => {
    startTour()
    tour.ask = false
    offerTour()
    expect(tour.ask).toBe(false)
  })

  it('restarts on request even after it was done, without asking', () => {
    endTour()
    startTour()
    expect(tour).toMatchObject({ active: true, ask: false })
  })

  it('treats unreadable storage as done, so it never nags', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('blocked')
      }),
    })
    expect(isTourDone()).toBe(true)
    vi.unstubAllGlobals()
  })
})
