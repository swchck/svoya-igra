import { beforeEach, describe, expect, it } from 'vitest'
import type { Player } from '@/types'
import { deleteResult, findResult, loadResults, MAX_RESULTS, rankRows, recordResult } from './history'

const players = (scores: number[]): Player[] => scores.map((score, i) => ({ id: `p${i}`, name: `P${i}`, score }))

describe('results history', () => {
  beforeEach(() => localStorage.clear())

  it('ranks by score and lets ties share a place', () => {
    expect(rankRows(players([100, 300, 100, 50])).map((r) => [r.name, r.place])).toEqual([
      ['P1', 1],
      ['P0', 2],
      ['P2', 2],
      ['P3', 4],
    ])
  })

  it('rewrites a play-through instead of adding it, keeping when it was first played', () => {
    const base = { id: 's1', gameId: 'g', title: 'G', teams: false }
    recordResult({ ...base, playedAt: 1000, players: players([1]) })
    recordResult({ ...base, playedAt: 5000, players: players([7]) })
    expect(loadResults()).toHaveLength(1)
    expect(findResult('s1')).toMatchObject({ playedAt: 1000, rows: [{ score: 7 }] })
  })

  it('keeps the newest results first and forgets the oldest past the limit', () => {
    for (let i = 0; i < MAX_RESULTS + 2; i++) recordResult({ id: `s${i}`, gameId: 'g', title: 'G', teams: false, playedAt: i, players: [] })
    const all = loadResults()
    expect(all).toHaveLength(MAX_RESULTS)
    expect(all[0].id).toBe(`s${MAX_RESULTS + 1}`)
    deleteResult(all[0].id)
    expect(findResult(all[0].id)).toBeUndefined()
  })

  it('reads damaged storage as empty', () => {
    localStorage.setItem('svoya-igra:results', '{oops')
    expect(loadResults()).toEqual([])
  })
})
