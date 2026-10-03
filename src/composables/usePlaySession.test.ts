import { afterEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import type { Game, QuestionKind } from '../types'
import { makeEmptyFinal, makeEmptyGame, makeEmptyRound } from '../game/model'
import { fitsGame, timerRemaining, usePlaySession } from './usePlaySession'

function tinyGame(withFinal = true): Game {
  const game = makeEmptyGame()
  game.rounds = [makeEmptyRound('R1', 1), makeEmptyRound('R2', 1)]
  for (const r of game.rounds) r.themes[0].questions.splice(2)
  game.finalRound = withFinal ? makeEmptyFinal() : undefined
  return game
}

function onBoard(kind: QuestionKind = 'normal', extra: { catValue?: number } = {}) {
  const game = tinyGame()
  const q = game.rounds[0].themes[0].questions[1]
  Object.assign(q, { kind, ...extra })
  const s = usePlaySession(ref(game))
  s.start()
  s.advance()
  const [p1, p2] = s.players.value
  return { game, s, q, p1, p2 }
}

describe('usePlaySession', () => {
  it('hands the pick to whoever answers right, and the next round to whoever trails', () => {
    const { game, s, p1, p2 } = onBoard()
    const [q100, q200] = game.rounds[0].themes[0].questions
    expect([p1.id, p2.id]).toContain(s.state.chooserId)
    s.setChooser(p1.id)
    s.pick(q100.id)
    s.advance()
    s.close({ playerId: p2.id, sign: -1 })
    expect(s.state.chooserId).toBe(p1.id)
    s.pick(q200.id)
    s.adjustScore(p2.id, 200)
    expect(s.state.chooserId).toBe(p2.id)
    s.undo()
    expect(s.state.chooserId).toBe(p1.id)
    s.adjustScore(p2.id, 400)
    s.advance()
    s.close()
    expect(s.state.phase).toBe('round-intro')
    expect(s.state.chooserId).toBe(p1.id)
  })

  it('scores verdicts and marks questions played', () => {
    const { game, s, p1, p2 } = onBoard()
    const [q100, q200] = game.rounds[0].themes[0].questions

    s.pick(q200.id)
    s.advance()
    s.close({ playerId: p1.id, sign: 1 })
    s.pick(q100.id)
    s.advance()
    s.close({ playerId: p2.id, sign: -1 })

    expect(p1.score).toBe(200)
    expect(p2.score).toBe(-100)
    expect(s.state.played).toEqual({ [q200.id]: true, [q100.id]: true })
  })

  it('moves through rounds, final bets and results', () => {
    const game = tinyGame()
    const s = usePlaySession(ref(game))
    const [p1, p2] = s.players.value
    s.start()
    for (const round of game.rounds) {
      expect(s.state.phase).toBe('round-intro')
      s.advance()
      for (const q of round.themes[0].questions) {
        s.pick(q.id)
        s.advance()
        s.close({ playerId: p1.id, sign: 1 })
      }
    }
    expect(s.state.phase).toBe('final-intro')
    expect(p1.score).toBe(600)

    s.advance()
    expect(s.state.phase).toBe('final-bets')
    s.setFinalBet(p1.id, 10_000)
    s.setFinalBet(p2.id, 50)
    expect(s.state.finalBets).toEqual({ [p1.id]: 600, [p2.id]: 0 })

    s.advance()
    s.advance()
    expect(s.state.phase).toBe('final-answer')
    s.setFinalVerdict(p1.id, -1)
    s.scoreFinal()
    expect(s.state.phase).toBe('results')
    expect(p1.score).toBe(0)
  })

  it('skips the final when there is none', () => {
    const s = usePlaySession(ref(tinyGame(false)))
    s.start()
    s.advance()
    s.nextRound()
    s.advance()
    s.nextRound()
    expect(s.state.phase).toBe('results')
  })

  it('runs an auction for the winning bid, clamped to the rules', () => {
    const { s, q, p1, p2 } = onBoard('auction')
    p1.score = 1000

    s.pick(q.id)
    expect(s.state.phase).toBe('auction')
    s.setAuctionStake(p1.id, 5000)
    expect(s.state.stake).toEqual({ playerId: p1.id, amount: 1000 })
    s.advance()
    s.close({ playerId: p2.id, sign: 1 })

    expect(p2.score).toBe(0)
  })

  it('lets a broke player bid the question value', () => {
    const { s, q, p2 } = onBoard('auction')

    s.pick(q.id)
    s.setAuctionStake(p2.id, 0)
    s.advance()
    s.close({ playerId: p2.id, sign: -1 })

    expect(p2.score).toBe(-200)
  })

  it('hands the cat to a player for its own price', () => {
    const { s, q, p2 } = onBoard('cat-in-bag', { catValue: 750 })

    s.pick(q.id)
    expect(s.state.phase).toBe('cat')
    s.giveCat(p2.id)
    expect(s.activeValue.value).toBe(750)
    s.advance()
    s.close({ playerId: p2.id, sign: 1 })

    expect(p2.score).toBe(750)
  })

  it('ignores played questions and keeps at least one player', () => {
    const { s, q } = onBoard()
    s.pick(q.id)
    s.advance()
    s.close()
    s.pick(q.id)
    expect(s.state.phase).toBe('board')

    s.removePlayer(s.players.value[0].id)
    s.removePlayer(s.players.value[0].id)
    expect(s.players.value).toHaveLength(1)
  })

  it('resumes from a snapshot', () => {
    const { game, s, q, p1 } = onBoard()
    s.pick(q.id)
    s.advance()
    s.close({ playerId: p1.id, sign: 1 })

    // the page keeps the saved snapshot in a ref, so it arrives reactive
    const resumed = usePlaySession(ref(game), reactive(s.snapshot()))

    expect(resumed.state.phase).toBe('board')
    expect(resumed.state.played).toEqual({ [q.id]: true })
    expect(resumed.players.value[0].score).toBe(200)
  })

  it('does not advance where a decision is needed', () => {
    const { s, q } = onBoard('auction')
    expect(s.advance()).toBe(false)
    s.pick(q.id)
    expect(s.advance()).toBe(false)
  })

  it('ignores repeated and out-of-place commands', () => {
    const { game, s, p1 } = onBoard()
    const [q100, q200] = game.rounds[0].themes[0].questions

    s.pick(game.rounds[1].themes[0].questions[0].id)
    expect(s.state.phase).toBe('board')

    s.pick(q100.id)
    s.advance()
    s.close({ playerId: p1.id, sign: 1 })
    s.close({ playerId: p1.id, sign: 1 })
    s.pick(q200.id)
    s.advance()
    s.close()
    s.close()

    expect(p1.score).toBe(100)
    expect(s.state.phase).toBe('round-intro')
    expect(s.state.roundIndex).toBe(1)
  })

  it('tells whether a saved session still fits the game', () => {
    const { game, s, q } = onBoard()
    s.pick(q.id)
    const snapshot = s.snapshot()
    expect(fitsGame(snapshot, game)).toBe(true)

    game.rounds[0].themes[0].questions.splice(1)
    expect(fitsGame(snapshot, game)).toBe(false)
    expect(fitsGame({ ...snapshot, phase: 'board', activeQuestionId: null, roundIndex: 5 }, game)).toBe(false)
  })

  it('undoes a verdict along with the closed question', () => {
    const { s, q, p1 } = onBoard()
    s.pick(q.id)
    s.advance()
    s.close({ playerId: p1.id, sign: 1 })
    expect(s.canUndo.value).toBe(true)

    expect(s.undo()).toBe(true)

    expect(p1.score).toBe(0)
    expect(s.state.phase).toBe('answer')
    expect(s.state.activeQuestionId).toBe(q.id)
    expect(s.state.played).toEqual({})
    expect(s.state.stats[p1.id]).toBeUndefined()
    expect(s.canUndo.value).toBe(false)
    expect(s.undo()).toBe(false)
  })

  it('undoes a question closed with nobody answering', () => {
    const { s, q } = onBoard()
    s.pick(q.id)
    s.close()
    expect(s.state.phase).toBe('board')

    s.undo()

    expect(s.state.phase).toBe('question')
    expect(s.state.played).toEqual({})
  })

  it('brings back the stake and the round that a verdict closed', () => {
    const game = tinyGame()
    const q = game.rounds[0].themes[0].questions[1]
    q.kind = 'auction'
    game.rounds[0].themes[0].questions.splice(0, 1)
    const s = usePlaySession(ref(game))
    s.start()
    s.advance()
    const [p1] = s.players.value
    p1.score = 500
    s.pick(q.id)
    s.setAuctionStake(p1.id, 300)
    s.advance()
    s.close({ playerId: p1.id, sign: -1 })
    expect(s.state.phase).toBe('round-intro')

    s.undo()

    expect(s.state.roundIndex).toBe(0)
    expect(s.state.phase).toBe('answer')
    expect(s.state.stake).toEqual({ playerId: p1.id, amount: 300 })
    expect(p1.score).toBe(500)
  })

  it('undoes a manual adjustment without touching the phase', () => {
    const { s, q, p1 } = onBoard()
    s.adjustScore(p1.id, 150)
    s.pick(q.id)
    s.adjustScore(p1.id, -50)
    s.adjustScore(p1.id, 0)

    s.undo()

    expect(p1.score).toBe(150)
    expect(s.state.phase).toBe('question')
    s.undo()
    expect(p1.score).toBe(0)
  })

  it('undoes the final scoring', () => {
    const game = tinyGame()
    const s = usePlaySession(ref(game))
    const [p1] = s.players.value
    p1.score = 400
    s.state.phase = 'final-bets'
    s.setFinalBet(p1.id, 300)
    s.advance()
    s.advance()
    s.setFinalVerdict(p1.id, 1)
    s.scoreFinal()
    expect(p1.score).toBe(700)
    expect(s.state.stats[p1.id]).toMatchObject({ correct: 1, won: 300 })

    s.undo()

    expect(p1.score).toBe(400)
    expect(s.state.phase).toBe('final-answer')
    expect(s.state.stats[p1.id]).toBeUndefined()
  })

  it('keeps a bounded history that survives a snapshot', () => {
    const { s, p1 } = onBoard()
    for (let i = 0; i < 40; i++) s.adjustScore(p1.id, 10)
    expect(s.state.history).toHaveLength(30)

    const resumed = usePlaySession(ref(tinyGame()), reactive(s.snapshot()))
    resumed.undo()

    expect(resumed.players.value[0].score).toBe(390)
    expect(resumed.state.history).toHaveLength(29)
  })

  it('tracks answers, points, streaks and the best answer', () => {
    const { game, s, p1, p2 } = onBoard()
    const [q100, q200] = game.rounds[0].themes[0].questions
    s.pick(q200.id)
    s.advance()
    s.close({ playerId: p1.id, sign: 1 })
    s.pick(q100.id)
    s.advance()
    s.close({ playerId: p1.id, sign: 1 })

    expect(s.state.stats[p1.id]).toEqual({ correct: 2, wrong: 0, won: 300, lost: 0, streak: 2, bestStreak: 2, best: 200 })
    expect(s.state.stats[p2.id]).toBeUndefined()
  })

  it('resets the streak on a wrong answer and keeps the best run', () => {
    const game = tinyGame()
    game.rounds[0].themes[0].questions.push(...makeEmptyRound('X', 1).themes[0].questions.slice(0, 1))
    const s = usePlaySession(ref(game))
    s.start()
    s.advance()
    const [p1] = s.players.value
    const verdicts: (1 | -1)[] = [1, 1, -1]
    for (const [i, sign] of verdicts.entries()) {
      s.pick(game.rounds[0].themes[0].questions[i].id)
      s.advance()
      s.close({ playerId: p1.id, sign })
    }

    expect(s.state.stats[p1.id]).toMatchObject({ correct: 2, wrong: 1, lost: 100, streak: 0, bestStreak: 2 })
  })

  it('does not count verdicts for a player outside the stake', () => {
    const { s, q, p1, p2 } = onBoard('cat-in-bag')
    s.pick(q.id)
    s.giveCat(p2.id)
    s.advance()
    s.close({ playerId: p1.id, sign: 1 })

    expect(s.state.stats).toEqual({})
    expect(p1.score).toBe(0)
  })

  it('renames default names when switching to teams and back', () => {
    const { s } = onBoard()
    const fresh = usePlaySession(ref(tinyGame()))
    fresh.players.value[1].name = 'Anna'

    fresh.setTeams(true)
    expect(fresh.players.value.map((p) => p.name)).toEqual(['Команда 1', 'Anna'])
    fresh.addPlayer()
    expect(fresh.players.value[2].name).toBe('Команда 3')
    fresh.setTeams(false)
    expect(fresh.players.value.map((p) => p.name)).toEqual(['Игрок 1', 'Anna', 'Игрок 3'])

    s.setTeams(true)
    expect(s.state.teams).toBe(false)
  })

  it('gives every competitor a different color', () => {
    const s = usePlaySession(ref(tinyGame()))
    s.addPlayer()
    s.addPlayer()
    const colors = s.players.value.map((p) => p.color)
    expect(new Set(colors).size).toBe(4)
  })
})

describe('answer timer', () => {
  afterEach(() => vi.useRealTimers())

  function withTimer(settings: { timerAutoStart?: boolean } = {}) {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    const game = tinyGame()
    game.settings = { answerSeconds: 30, ...settings }
    const s = usePlaySession(ref(game))
    s.start()
    s.advance()
    s.pick(game.rounds[0].themes[0].questions[0].id)
    return s
  }
  const left = (s: ReturnType<typeof withTimer>) => timerRemaining(s.state.timer, Date.now())

  it('waits for the host unless it starts by itself', () => {
    const s = withTimer()
    vi.advanceTimersByTime(5000)
    expect(left(s)).toBe(30_000)
    expect(withTimer({ timerAutoStart: true }).state.timer.endsAt).not.toBeNull()
  })

  it('runs, pauses and resets', () => {
    const s = withTimer()
    s.timerStart()
    vi.advanceTimersByTime(10_000)
    expect(left(s)).toBe(20_000)

    s.timerPause()
    vi.advanceTimersByTime(5000)
    expect(left(s)).toBe(20_000)

    s.timerStart()
    vi.advanceTimersByTime(25_000)
    expect(left(s)).toBe(0)

    s.timerStart()
    expect(left(s)).toBe(30_000)
    s.timerReset()
    expect(s.state.timer).toEqual({ endsAt: null, left: 30_000 })
  })

  it('rearms on a new question and stops at the answer', () => {
    const s = withTimer({ timerAutoStart: true })
    vi.advanceTimersByTime(4000)
    s.advance()
    expect(s.state.timer).toEqual({ endsAt: null, left: 30_000 })
    s.timerStart()
    expect(s.state.timer.endsAt).toBeNull()
  })

  it('does nothing when the game has no timer', () => {
    const s = usePlaySession(ref(tinyGame()))
    s.start()
    s.advance()
    s.pick(s.round.value!.themes[0].questions[0].id)
    s.timerStart()
    expect(s.state.timer.endsAt).toBeNull()
  })

  it('times the final question too', () => {
    vi.useFakeTimers()
    const game = tinyGame()
    game.settings = { answerSeconds: 20, timerAutoStart: true }
    const s = usePlaySession(ref(game))
    s.state.phase = 'final-bets'
    s.advance()
    expect(s.state.timer.endsAt).not.toBeNull()
  })
})
