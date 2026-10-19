import { beforeEach, describe, expect, it } from 'vitest'
import type { SessionSnapshot } from '@/composables/usePlaySession'
import { clearSession, inProgress, lastSession, saveSession } from './savedSession'

const snap = (phase: SessionSnapshot['phase']) => ({ phase }) as SessionSnapshot

describe('saved sessions', () => {
  beforeEach(() => localStorage.clear())

  it('points at the play-through saved last until it is cleared', () => {
    saveSession('a', snap('board'))
    saveSession('b', snap('board'))
    expect(lastSession()?.gameId).toBe('b')
    clearSession('b')
    expect(lastSession()?.gameId).toBe('a')
    clearSession('a')
    expect(lastSession()).toBeNull()
  })

  it('finds play-throughs saved before the pointer existed', () => {
    localStorage.setItem('svoya-igra:session:old', JSON.stringify(snap('board')))
    expect(lastSession()).toEqual({ gameId: 'old', at: 0 })
  })

  it('goes on only from the middle of a game', () => {
    expect(inProgress(snap('board'))).toBe(true)
    expect(inProgress(snap('title'))).toBe(false)
    expect(inProgress(snap('results'))).toBe(false)
  })
})
