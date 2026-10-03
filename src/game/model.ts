import type { FinalQuestion, Game, MediaItem, Question, Round, Theme } from '../types'

/** Returns a short random id with an optional prefix. */
export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

const DEFAULT_VALUES = [100, 200, 300, 400, 500]

export function makeEmptyQuestion(value: number): Question {
  return { id: uid('q_'), value, kind: 'normal', text: '', answer: '' }
}

export function makeEmptyTheme(name = 'Тема'): Theme {
  return { id: uid('t_'), name, questions: DEFAULT_VALUES.map(makeEmptyQuestion) }
}

export function makeEmptyRound(name = 'Раунд 1', themeCount = 5): Round {
  return {
    id: uid('r_'),
    name,
    themes: Array.from({ length: themeCount }, (_, i) => makeEmptyTheme(`Тема ${i + 1}`)),
  }
}

export function makeEmptyFinal(): FinalQuestion {
  return { id: uid('f_'), theme: 'Финал', text: '', answer: '' }
}

export function makeEmptyGame(title = 'Новая игра'): Game {
  const now = Date.now()
  return {
    id: uid('g_'),
    title,
    subtitle: '',
    rounds: [makeEmptyRound('Раунд 1'), makeEmptyRound('Раунд 2')],
    finalRound: makeEmptyFinal(),
    createdAt: now,
    updatedAt: now,
  }
}

/** Returns every media item of the game; mutating an item mutates the game. */
export function mediaItems(game: Game): MediaItem[] {
  const items: MediaItem[] = []
  for (const round of game.rounds) {
    for (const theme of round.themes) {
      for (const q of theme.questions) items.push(...(q.media ?? []), ...(q.answerMedia ?? []))
    }
  }
  if (game.finalRound) items.push(...(game.finalRound.media ?? []), ...(game.finalRound.answerMedia ?? []))
  return items
}

/** Gives the game and everything in it new ids, so a copy can live next to its source. */
export function withFreshIds(game: Game): Game {
  const now = Date.now()
  return {
    ...game,
    id: uid('g_'),
    rounds: game.rounds.map((r) => ({
      ...r,
      id: uid('r_'),
      themes: r.themes.map((t) => ({
        ...t,
        id: uid('t_'),
        questions: t.questions.map((q) => ({ ...q, id: uid('q_') })),
      })),
    })),
    finalRound: game.finalRound && { ...game.finalRound, id: uid('f_') },
    createdAt: game.createdAt || now,
    updatedAt: now,
  }
}

/** Swaps the item with its neighbour in place; returns the new index, or the old one at an edge. */
export function moveItem<T>(list: T[], index: number, offset: -1 | 1): number {
  const target = index + offset
  if (index < 0 || target < 0 || target >= list.length) return index
  ;[list[index], list[target]] = [list[target], list[index]]
  return target
}

/** Moves `list[from]` so it ends up at index `to`, shifting the items in between; returns `to`. */
export function moveItemTo<T>(list: T[], from: number, to: number): number {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return from
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
  return to
}

/** True when the question has something to ask and something to reveal. */
export function isQuestionReady(q: Question): boolean {
  return (!!q.text.trim() || !!q.media?.length) && (!!q.answer.trim() || !!q.answerMedia?.length)
}
