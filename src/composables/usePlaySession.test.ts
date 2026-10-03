import { describe, expect, it } from 'vitest'
import { reactive, ref } from 'vue'
import type { Game, QuestionKind } from '../types'
import { makeEmptyFinal, makeEmptyGame, makeEmptyRound } from '../game/model'
import { fitsGame, usePlaySession } from './usePlaySession'

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
})
