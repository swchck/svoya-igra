import type { Tally } from '@/composables/usePlaySession'

/*
 * How each question fared over the games played with it, kept per game in localStorage so
 * the editor can point at questions nobody gets. Outcomes are stored per play-through: a
 * question replayed after an undo overwrites its own entry instead of counting twice.
 */

/** A question's record over every play-through that reached it. */
export interface QuestionRecord {
  plays: number
  /** Plays where someone answered right. */
  answered: number
  /** Wrong answers given, over all plays. */
  wrong: number
}

interface Sessions {
  [sessionId: string]: { at: number; outcomes: Record<string, Tally> }
}

/** Play-throughs kept per game; the oldest go first. */
export const MAX_SESSIONS = 30

const key = (gameId: string) => `svoya-igra:question-stats:${gameId}`

function load(gameId: string): Sessions {
  try {
    const data = JSON.parse(localStorage.getItem(key(gameId)) ?? '{}')
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

/** Writes down how a question went in one play-through. */
export function recordOutcome(gameId: string, sessionId: string, questionId: string, tally: Tally): void {
  const sessions = load(gameId)
  const session = (sessions[sessionId] ??= { at: Date.now(), outcomes: {} })
  session.outcomes[questionId] = { right: tally.right, wrong: tally.wrong }
  const ids = Object.keys(sessions).sort((a, b) => sessions[a].at - sessions[b].at)
  for (const old of ids.slice(0, Math.max(0, ids.length - MAX_SESSIONS))) delete sessions[old]
  try {
    localStorage.setItem(key(gameId), JSON.stringify(sessions))
  } catch {
    // the record is a nicety; a full storage must not get in the way of the game
  }
}

/** Sums up every recorded play-through of the game, per question id. */
export function questionRecords(gameId: string): Record<string, QuestionRecord> {
  const out: Record<string, QuestionRecord> = {}
  for (const { outcomes } of Object.values(load(gameId))) {
    for (const [id, t] of Object.entries(outcomes ?? {})) {
      const r = (out[id] ??= { plays: 0, answered: 0, wrong: 0 })
      r.plays += 1
      if (t.right > 0) r.answered += 1
      r.wrong += t.wrong
    }
  }
  return out
}

/** Forgets every record of the game. */
export function clearQuestionRecords(gameId: string): void {
  try {
    localStorage.removeItem(key(gameId))
  } catch {
    // nothing to forget then
  }
}
