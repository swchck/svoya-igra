import { describe, expect, it } from 'vitest'
import type { Player, Question, Round } from '@/types'
import { buildHostConsole, type ConsoleInput } from './hostConsole'

const q = (id: string, value: number, extra: Partial<Question> = {}): Question => ({ id, value, text: '**Флаг?**', answer: 'Япония', ...extra }) as Question
const round: Round = { id: 'r', name: 'Раунд 1', themes: [{ id: 't', name: 'Флаги', questions: [q('q1', 100, { hints: [{ id: 'h', text: 'Восток' }], notes: 'Нихон тоже' }), q('q2', 200)] }] }
const players: Player[] = [
  { id: 'a', name: 'Аня', score: 300 },
  { id: 'b', name: 'Боря', score: 0 },
]

function input(over: Partial<ConsoleInput['state']>, rest: Partial<ConsoleInput> = {}): ConsoleInput {
  return {
    state: { phase: 'board', pause: null, played: {}, hintsShown: 0, stake: null, chooserId: 'a', groupVerdicts: null, timer: { endsAt: null, left: 0 }, ...over },
    players,
    round,
    question: null,
    topic: 'Флаги',
    value: 100,
    loss: 100,
    canUndo: false,
    timed: false,
    ...rest,
  }
}

describe('host console', () => {
  it('shows the board with what is played and who picks', () => {
    const c = buildHostConsole(input({ played: { q2: true } }))
    expect(c.status).toContain('Аня')
    expect(c.board?.themes[0].cells.map((x) => x.played)).toEqual([false, true])
    expect(c.tools.map((a) => a.name)).toEqual(['pause'])
  })

  it('gives the host the question, the answer and the next steps', () => {
    const c = buildHostConsole(input({ phase: 'question' }, { question: round.themes[0].questions[0], timed: true, firstPress: 'Боря', canUndo: true }))
    expect(c.question).toMatchObject({ text: 'Флаг?', answer: 'Япония', notes: 'Нихон тоже' })
    expect(c.status).toContain('Боря')
    expect(c.actions.map((a) => a.name)).toEqual(['revealHint', 'timerStart', 'advance'])
    expect(c.tools.map((a) => a.name)).toEqual(['undo', 'pause'])
  })

  it('judges only the stake holder when there is one', () => {
    const c = buildHostConsole(input({ phase: 'answer', stake: { playerId: 'b', amount: 500 } }, { question: round.themes[0].questions[0], value: 500, loss: 500 }))
    expect(c.rows.find((r) => r.id === 'a')!.actions).toEqual([])
    expect(c.rows.find((r) => r.id === 'b')!.actions.map((a) => [a.label, a.args])).toEqual([
      ['+500', [{ playerId: 'b', sign: 1 }]],
      ['−500', [{ playerId: 'b', sign: -1 }]],
    ])
    expect(c.actions.map((a) => a.name)).toEqual(['close'])
  })

  it('sends the rest to the stage and offers resume while paused', () => {
    const c = buildHostConsole(input({ phase: 'final-themes', pause: { until: null, resumeTimer: false } }))
    expect(c.note).not.toBe('')
    expect(c.paused).toBe(true)
    expect(c.tools.map((a) => a.name)).toEqual(['resume'])
  })
})
