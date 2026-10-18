import { beforeEach, describe, expect, it } from 'vitest'
import { clearQuestionRecords, MAX_SESSIONS, questionRecords, recordOutcome } from './questionStats'

beforeEach(() => localStorage.clear())

describe('question records', () => {
  it('sums plays across play-throughs, and a replay overwrites its own entry', () => {
    recordOutcome('g', 's1', 'q1', { right: 0, wrong: 2 })
    recordOutcome('g', 's1', 'q1', { right: 1, wrong: 1 })
    recordOutcome('g', 's2', 'q1', { right: 0, wrong: 0 })
    recordOutcome('g', 's2', 'q2', { right: 1, wrong: 0 })
    expect(questionRecords('g')).toEqual({ q1: { plays: 2, answered: 1, wrong: 1 }, q2: { plays: 1, answered: 1, wrong: 0 } })
    expect(questionRecords('other')).toEqual({})
    clearQuestionRecords('g')
    expect(questionRecords('g')).toEqual({})
  })

  it('keeps only the latest play-throughs', () => {
    for (let i = 0; i < MAX_SESSIONS + 5; i++) recordOutcome('g', `s${i}`, 'q', { right: 1, wrong: 0 })
    expect(questionRecords('g').q.plays).toBe(MAX_SESSIONS)
  })

  it('survives broken storage', () => {
    localStorage.setItem('svoya-igra:question-stats:g', '{oops')
    expect(questionRecords('g')).toEqual({})
  })
})
