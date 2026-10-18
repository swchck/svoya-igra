import type { Game } from '../types'
import { t } from '../i18n'
import { makeEmptyFinal, makeEmptyGame, makeEmptyRound } from './model'

/** Ready shapes a new game can start from; each gets a name and a hint in the home strings. */
export const TEMPLATES = ['blank', 'classic', 'quick', 'quiz'] as const
export type TemplateId = (typeof TEMPLATES)[number]

function ladder(game: Game, roundIndex: number, step: number) {
  for (const theme of game.rounds[roundIndex].themes) theme.questions.forEach((q, i) => (q.value = step * (i + 1)))
}

/** Builds an empty game in the template's shape: rounds, themes, values, kinds and a final. */
export function makeGameFromTemplate(id: TemplateId): Game {
  const game = makeEmptyGame()
  const round = (n: number, themes: number) => makeEmptyRound(t('system.defaults.round', { n }), themes)
  switch (id) {
    case 'classic':
      // the TV show: three rounds of six themes, values doubling and tripling, one final theme
      game.rounds = [round(1, 6), round(2, 6), round(3, 6)]
      ladder(game, 0, 100)
      ladder(game, 1, 200)
      ladder(game, 2, 300)
      game.rounds[0].themes[2].questions[2].kind = 'cat-in-bag'
      game.rounds[1].themes[4].questions[3].kind = 'auction'
      game.rounds[2].themes[1].questions[1].kind = 'no-risk'
      game.finalThemes = [makeEmptyFinal()]
      break
    case 'quick':
      // about twenty minutes: one round of four themes, four questions each
      game.rounds = [round(1, 4)]
      for (const theme of game.rounds[0].themes) theme.questions.splice(4)
      game.finalThemes = [makeEmptyFinal()]
      break
    case 'quiz':
      // everyone answers everything from their phones, picking one of four choices
      game.rounds = [round(1, 5)]
      for (const theme of game.rounds[0].themes) {
        for (const q of theme.questions) Object.assign(q, { kind: 'for-all', options: ['', '', '', ''] })
      }
      delete game.finalThemes
      break
    case 'blank':
      break
  }
  return game
}
