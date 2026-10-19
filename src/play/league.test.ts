import { describe, expect, it } from 'vitest'
import type { GameResult, ResultRow } from './history'
import { standings } from './league'

const row = (name: string, place: number, score: number): ResultRow => ({ name, place, score, color: '#fff' })
const game = (id: string, playedAt: number, rows: ResultRow[]): GameResult => ({ id, gameId: 'g', title: 'G', playedAt, teams: false, rows })

describe('league standings', () => {
  it('sums evenings per name, whatever the case and spacing', () => {
    const table = standings([
      game('1', 1, [row('Аня', 1, 900), row('Боря', 2, 400), row('Вера', 3, 100)]),
      game('2', 2, [row('боря ', 1, 700), row(' АНЯ', 2, 500)]),
    ])
    expect(table.map((s) => [s.name, s.points, s.wins, s.games, s.total, s.avgPlace])).toEqual([
      ['АНЯ', 5, 1, 2, 1400, 1.5],
      ['боря', 5, 1, 2, 1100, 1.5],
      ['Вера', 1, 0, 1, 100, 3],
    ])
  })

  it('gives places past the podium no points', () => {
    expect(standings([game('1', 1, [row('A', 1, 3), row('B', 2, 2), row('C', 3, 1), row('D', 4, 0)])]).at(-1)).toMatchObject({ name: 'D', points: 0, podiums: 0 })
  })
})
