import { uid } from '@/game/model'
import type { GameResult } from './history'

/*
 * A league runs over several evenings: the host collects finished games into it and the
 * table sums them up per competitor. People are matched across games by name, ignoring
 * case and spacing, since every evening sets its players up afresh.
 */

/** Points a place earns in the league table; places past the podium earn the last entry. */
export const PLACE_POINTS = [3, 2, 1, 0] as const

export interface League {
  id: string
  name: string
  /** Ids of the results in the league, from the results history. */
  resultIds: string[]
  /** Unix time, ms. */
  createdAt: number
}

/** One line of the league table. */
export interface Standing {
  name: string
  avatar?: string
  color: string
  games: number
  wins: number
  podiums: number
  /** League points by place, see PLACE_POINTS. */
  points: number
  /** Game points over every game. */
  total: number
  /** Mean place, 1 is best. */
  avgPlace: number
}

const STORAGE_KEY = 'svoya-igra:leagues'

export function loadLeagues(): League[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(data) ? data.filter((l): l is League => !!l && typeof l.id === 'string' && Array.isArray(l.resultIds)) : []
  } catch {
    return []
  }
}

/** Writes the leagues; false when storage refused. */
export function saveLeagues(leagues: League[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leagues))
    return true
  } catch {
    return false
  }
}

export function newLeague(name: string): League {
  return { id: uid('lg_'), name, resultIds: [], createdAt: Date.now() }
}

const key = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

/** Sums the results up per competitor: league points first, then wins, then game points. */
export function standings(results: GameResult[]): Standing[] {
  const by = new Map<string, Standing & { places: number }>()
  // oldest first, so a name's look (avatar, color) is the one it had most recently
  for (const result of [...results].sort((a, b) => a.playedAt - b.playedAt)) {
    for (const row of result.rows) {
      const name = row.name.trim().replace(/\s+/g, ' ')
      const s = by.get(key(name)) ?? { name, color: row.color, games: 0, wins: 0, podiums: 0, points: 0, total: 0, avgPlace: 0, places: 0 }
      s.name = name
      s.color = row.color
      if (row.avatar) s.avatar = row.avatar
      s.games += 1
      if (row.place === 1) s.wins += 1
      if (row.place <= 3) s.podiums += 1
      s.points += PLACE_POINTS[Math.min(row.place, PLACE_POINTS.length) - 1]
      s.total += row.score
      s.places += row.place
      by.set(key(name), s)
    }
  }
  return [...by.values()]
    .map(({ places, ...s }) => ({ ...s, avgPlace: Math.round((places / s.games) * 10) / 10 }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || b.total - a.total || a.name.localeCompare(b.name))
}
