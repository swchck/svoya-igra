import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endTour, isTourDone, offerTour, startTour, tour } from './state'

beforeEach(() => {
  localStorage.clear()
  tour.active = false
  tour.demo = null
})

afterEach(() => vi.restoreAllMocks())

describe('tour state', () => {
  it('offers a tour once to a newcomer, asking only when told to', () => {
    offerTour('home', { ask: true })
    expect(tour).toMatchObject({ active: true, id: 'home', ask: true })
    endTour()
    offerTour('editor')
    expect(tour).toMatchObject({ active: true, id: 'editor', ask: false })
  })

  it('remembers each tour on its own, however it ended', () => {
    startTour('stage')
    expect(isTourDone('stage')).toBe(false)
    endTour()
    expect(tour.active).toBe(false)
    expect(isTourDone('stage')).toBe(true)
    expect(isTourDone('host')).toBe(false)
    offerTour('stage')
    expect(tour.active).toBe(false)
  })

  it('counts the old single flag as the home tour only', () => {
    localStorage.setItem('svoya-igra:tour-done', '1')
    expect(isTourDone('home')).toBe(true)
    expect(isTourDone('editor')).toBe(false)
    expect(isTourDone('stage')).toBe(false)
    expect(isTourDone('host')).toBe(false)
  })

  it('does not interrupt a tour that is running', () => {
    startTour('editor')
    offerTour('host', { ask: true })
    expect(tour).toMatchObject({ id: 'editor', ask: false })
  })

  it('restarts on request even after it was done, without asking', () => {
    endTour('home')
    startTour('home')
    expect(tour).toMatchObject({ active: true, id: 'home', ask: false })
  })

  it('drops the demo when the tour ends, and keeps a running tour when another one is dismissed', () => {
    startTour('host')
    tour.demo = 'question'
    endTour('home')
    expect(tour).toMatchObject({ active: true, demo: 'question' })
    endTour()
    expect(tour).toMatchObject({ active: false, demo: null })
  })

  it('treats unreadable storage as done, so it never nags', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('blocked')
      }),
    })
    expect(isTourDone('home')).toBe(true)
    vi.unstubAllGlobals()
  })
})
