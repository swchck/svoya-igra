import { describe, expect, it } from 'vitest'
import { validateGame } from './validate'
import { makeGameFromTemplate, TEMPLATES } from './templates'

describe('templates', () => {
  it('shape each game as promised', () => {
    const classic = makeGameFromTemplate('classic')
    expect(classic.rounds.map((r) => r.themes.length)).toEqual([6, 6, 6])
    expect(classic.rounds.map((r) => r.themes[0].questions.map((q) => q.value).at(-1))).toEqual([500, 1000, 1500])
    expect(classic.rounds.flatMap((r) => r.themes.flatMap((th) => th.questions.map((q) => q.kind))).filter((k) => k !== 'normal')).toEqual(['cat-in-bag', 'auction', 'no-risk'])
    expect(makeGameFromTemplate('quick').rounds[0].themes.map((th) => th.questions.length)).toEqual([4, 4, 4, 4])
    const quiz = makeGameFromTemplate('quiz')
    expect(quiz).not.toHaveProperty('finalThemes')
    expect(quiz.rounds[0].themes[0].questions[0]).toMatchObject({ kind: 'for-all', options: ['', '', '', ''] })
  })

  it('give every game fresh ids and no issues beyond the blanks waiting to be filled', () => {
    const blanks = ['empty-question', 'bad-options', 'no-question', 'no-answer']
    for (const id of TEMPLATES) {
      const codes = new Set(validateGame(makeGameFromTemplate(id)).map((i) => i.code))
      for (const code of blanks) codes.delete(code)
      expect([...codes], id).toEqual([])
    }
    expect(makeGameFromTemplate('blank').id).not.toBe(makeGameFromTemplate('blank').id)
  })
})
