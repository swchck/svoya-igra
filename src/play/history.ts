import type { Player } from '@/types'
import { playerColor } from './palette'

/*
 * Finished games, newest first, kept in localStorage: the results card and the diplomas
 * are drawn from here, and the league sums evenings up from it. A play-through is one
 * entry however often its results screen is reached, so an undo after the end and a
 * second finish rewrite the entry instead of adding one.
 */

/** One competitor as the game ended. */
export interface ResultRow {
  name: string
  avatar?: string
  /** CSS color of the competitor on the stage. */
  color: string
  score: number
  /** 1-based; tied scores share a place. */
  place: number
}

/** One finished play-through. */
export interface GameResult {
  /** The play session's id. */
  id: string
  gameId: string
  title: string
  /** Unix time, ms. */
  playedAt: number
  teams: boolean
  /** Ordered by place. */
  rows: ResultRow[]
}

/** Results kept; the oldest go first. */
export const MAX_RESULTS = 300

const STORAGE_KEY = 'svoya-igra:results'

function isResult(x: unknown): x is GameResult {
  const r = x as GameResult
  return !!r && typeof r.id === 'string' && typeof r.gameId === 'string' && typeof r.playedAt === 'number' && Array.isArray(r.rows)
}

/** Every recorded result, newest first. */
export function loadResults(): GameResult[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(data) ? data.filter(isResult) : []
  } catch {
    return []
  }
}

function store(results: GameResult[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(0, MAX_RESULTS)))
  } catch {
    // the record is a nicety; a full storage must not get in the way of the game
  }
}

/** Ranks players by score; equal scores share the higher place (1, 2, 2, 4). */
export function rankRows(players: Player[]): ResultRow[] {
  const rows = players
    .map((p, i) => ({ name: p.name, ...(p.avatar && { avatar: p.avatar }), color: playerColor(p, i), score: p.score, place: 0 }))
    .sort((a, b) => b.score - a.score)
  rows.forEach((r, i) => (r.place = i > 0 && rows[i - 1].score === r.score ? rows[i - 1].place : i + 1))
  return rows
}

/**
 * Writes down how a play-through ended, replacing its earlier entry but keeping when it was
 * first played; returns the entry.
 */
export function recordResult(entry: Omit<GameResult, 'rows'> & { players: Player[] }): GameResult {
  const { players, ...rest } = entry
  const results = loadResults()
  const earlier = results.find((r) => r.id === rest.id)
  const result: GameResult = { ...rest, playedAt: earlier?.playedAt ?? rest.playedAt, rows: rankRows(players) }
  store([result, ...results.filter((r) => r.id !== result.id)])
  return result
}

/** The result with this id, if it is still kept. */
export function findResult(id: string): GameResult | undefined {
  return loadResults().find((r) => r.id === id)
}

/** Forgets one result. */
export function deleteResult(id: string): void {
  store(loadResults().filter((r) => r.id !== id))
}
