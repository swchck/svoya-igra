import type { Game, Round, Theme } from '../types'
import { t } from '../i18n'
import { makeEmptyGame, makeEmptyQuestion, uid } from '../game/model'
import { escapeMarkdown } from './siq'

/*
 * A game typed up in a spreadsheet, saved as CSV or copied as tab-separated text: one row per
 * question with the round, the theme, the value, the question, the answer and, optionally,
 * a note for the host. A header row is recognised in any of the app's languages and skipped.
 * Rows keep their order; a new round or theme starts where its name first appears.
 */

const HEADER_WORDS = ['раунд', 'round', 'runda', 'тема', 'theme', 'category', 'tema', 'kategorija']

/** Splits delimited text into rows of cells, honouring double-quoted cells with line breaks. */
export function parseDelimited(source: string): string[][] {
  const text = source.replace(/^\uFEFF/, '')
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const count = (ch: string) => firstLine.split(ch).length - 1
  const delimiter = ['\t', ';', ','].reduce((best, ch) => (count(ch) > count(best) ? ch : best), '\t')

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean))
}

/**
 * Builds a game from spreadsheet rows.
 *
 * @throws Error with a user-facing message when no row holds a question.
 */
export function gameFromTable(source: string, title: string): Game {
  const rows = parseDelimited(source)
  if (rows[0] && HEADER_WORDS.includes(rows[0][0]?.toLowerCase() ?? '')) rows.shift()

  const game = makeEmptyGame(title || t('system.defaults.game'))
  delete game.finalThemes
  const rounds: Round[] = []
  for (const [roundName = '', themeName = '', rawValue = '', text = '', answer = '', notes = ''] of rows) {
    if (!text && !answer) continue
    let round = rounds.find((r) => r.name === roundName)
    if (!round) {
      round = { id: uid('r_'), name: roundName || t('system.defaults.round', { n: rounds.length + 1 }), themes: [] }
      rounds.push(round)
    }
    let theme: Theme | undefined = round.themes.find((th) => th.name === themeName)
    if (!theme) {
      theme = { id: uid('t_'), name: themeName, questions: [] }
      round.themes.push(theme)
    }
    const value = Number(rawValue.replace(/\s/g, '')) || (theme.questions.length + 1) * 100
    theme.questions.push({
      ...makeEmptyQuestion(value),
      text: escapeMarkdown(text),
      answer: escapeMarkdown(answer),
      ...(notes && { notes }),
    })
  }
  if (!rounds.length) throw new Error(t('system.errors.tableEmpty'))
  game.rounds = rounds
  return game
}
