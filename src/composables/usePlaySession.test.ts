import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { Game } from '../types'
import { makeEmptyFinal, makeEmptyGame, makeEmptyRound } from '../game/model'
import { usePlaySession } from './usePlaySession'

function tinyGame(withFinal = true): Game {
  const game = makeEmptyGame()
  game.rounds = [makeEmptyRound('R1', 1), makeEmptyRound('R2', 1)]
  for (const r of game.rounds) r.themes[0].questions.splice(2)
  game.finalRound = withFinal ? makeEmptyFinal() : undefined
  return game
}

describe('usePlaySession', () => {
  it('scores verdicts and marks questions played', () => {
    const game = tinyGame()
    const s = usePlaySession(ref(game))
    const [p1, p2] = s.players.value
    const [q100, q200] = game.rounds[0].themes[0].questions

    s.start()
    s.advance()
    s.pick(q200)
    s.advance()
    s.close({ player: p1, sign: 1 })
    s.pick(q100)
    s.close({ player: p2, sign: -1 })

    expect(p1.score).toBe(200)
    expect(p2.score).toBe(-100)
    expect(s.state.played).toEqual({ [q200.id]: true, [q100.id]: true })
  })

  it('moves to the next round, then the final, then results', () => {
    const game = tinyGame()
    const s = usePlaySession(ref(game))
    s.start()

    for (const round of game.rounds) {
      expect(s.state.phase).toBe('round-intro')
      s.advance()
      for (const q of round.themes[0].questions) {
        s.pick(q)
        s.close()
      }
    }
    expect(s.state.phase).toBe('final-intro')
    s.advance()
    s.advance()
    s.advance()
    expect(s.state.phase).toBe('results')
  })

  it('skips the final when there is none', () => {
    const s = usePlaySession(ref(tinyGame(false)))
    s.start()
    s.nextRound()
    s.nextRound()
    expect(s.state.phase).toBe('results')
  })

  it('ignores played questions and keeps at least one player', () => {
    const game = tinyGame()
    const s = usePlaySession(ref(game))
    const q = game.rounds[0].themes[0].questions[0]
    s.start()
    s.advance()
    s.pick(q)
    s.close()
    s.pick(q)
    expect(s.state.phase).toBe('board')

    s.removePlayer(s.players.value[0])
    s.removePlayer(s.players.value[0])
    expect(s.players.value).toHaveLength(1)
  })

  it('does not advance where a verdict is needed', () => {
    const s = usePlaySession(ref(tinyGame()))
    expect(s.advance()).toBe(false)
    s.start()
    s.advance()
    expect(s.advance()).toBe(false)
  })
})
