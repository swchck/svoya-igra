import type { Player, Question, Round } from '@/types'
import type { Phase, SessionSnapshot } from '@/composables/usePlaySession'
import type { HostCommand } from './channel'
import { revealedAnswer } from '@/game/kinds'
import { markdownToPlain } from '@/lib/markdown'
import { playerColor } from './palette'
import { t } from '@/i18n'

/*
 * The host console on a phone, drawn by the stage: the phone page only shows the text and
 * buttons it is given and posts back the command of the button pressed, so the game's rules
 * live in one place. Steps that need more than a tap (auction stakes, the final's bets and
 * verdicts, questions for everyone) stay with the stage or the host window.
 */

export type ConsoleTone = 'primary' | 'good' | 'bad' | 'plain'

/** A button: what it says and the host command it sends. */
export interface ConsoleAction {
  label: string
  tone: ConsoleTone
  name: HostCommand
  args: unknown[]
}

/** A competitor with the buttons that act on them, if any. */
export interface ConsoleRow {
  id: string
  name: string
  score: number
  color: string
  actions: ConsoleAction[]
}

/** Everything the host's phone shows. */
export interface HostConsole {
  /** Sent back with each command; the stage ignores commands from a phase it has left. */
  phase: Phase
  paused: boolean
  heading: string
  /** The open question with the answer, for the host's eyes only. */
  question: { text: string; answer: string; notes: string; accepted: string[] } | null
  /** Who pressed first, or whose turn it is. */
  status: string
  rows: ConsoleRow[]
  actions: ConsoleAction[]
  /** The board while it waits for a pick; a tap sends `pick`. */
  board: { themes: { name: string; cells: { id: string; value: number; played: boolean }[] }[] } | null
  /** Shown when this step can't be done from the phone. */
  note: string
  /** Undo and pause, under everything else. */
  tools: ConsoleAction[]
}

/** What the console is built from. */
export interface ConsoleInput {
  state: Pick<SessionSnapshot, 'phase' | 'pause' | 'played' | 'hintsShown' | 'stake' | 'chooserId' | 'groupVerdicts' | 'timer'>
  players: Player[]
  round: Round | undefined
  question: Question | null
  topic: string
  value: number
  loss: number
  canUndo: boolean
  /** The question has a clock. */
  timed: boolean
  /** Who pressed first on a phone, if anyone. */
  firstPress?: string
}

const ADVANCE: Partial<Record<Phase, string>> = {
  'round-intro': 'lan.console.advance',
  'final-intro': 'lan.console.advance',
  'final-bets': 'lan.console.advance',
  'final-question': 'lan.console.showAnswer',
}

function act(name: HostCommand, label: string, tone: ConsoleTone = 'plain', args: unknown[] = []): ConsoleAction {
  return { name, label, tone, args }
}

/** Builds the console for the moment the session is in. */
export function buildHostConsole(input: ConsoleInput): HostConsole {
  const { state, players, round, question } = input
  const phase = state.phase
  const rows = players.map((p, i) => ({ id: p.id, name: p.name, score: p.score, color: playerColor(p, i), actions: [] as ConsoleAction[] }))
  const out: HostConsole = {
    phase,
    paused: !!state.pause,
    heading: round?.name ?? '',
    question: null,
    status: '',
    rows,
    actions: [],
    board: null,
    note: '',
    tools: [],
  }
  const inGame = phase !== 'title' && phase !== 'results'

  if (question && (phase === 'question' || phase === 'answer' || phase === 'cat' || phase === 'no-risk' || phase === 'auction')) {
    out.heading = `${input.topic} · ${input.value}`
    out.question = {
      text: markdownToPlain(question.text),
      answer: markdownToPlain(revealedAnswer(question)),
      notes: question.notes ?? '',
      accepted: question.accepted ?? [],
    }
  }

  if (phase === 'title') out.actions.push(act('start', t('lan.console.start'), 'primary'))
  else if (ADVANCE[phase]) out.actions.push(act('advance', t(ADVANCE[phase]!), 'primary'))
  else if (phase === 'board' && round) {
    const chooser = players.find((p) => p.id === state.chooserId)
    if (chooser) out.status = t('lan.console.chooser', { name: chooser.name })
    out.board = {
      themes: round.themes.map((th) => ({ name: th.name, cells: th.questions.map((q) => ({ id: q.id, value: q.value, played: !!state.played[q.id] })) })),
    }
    // skipping a round is one stray tap away on a phone and the stage asks first; it stays there
  } else if (phase === 'cat' || phase === 'no-risk') {
    const name = phase === 'cat' ? 'giveCat' : 'takeNoRisk'
    out.status = t(phase === 'cat' ? 'lan.console.giveCat' : 'lan.console.takeNoRisk')
    for (const row of rows) row.actions.push(act(name, t('lan.console.choose'), 'primary', [row.id]))
  } else if (phase === 'question' && !state.groupVerdicts) {
    if (input.firstPress) out.status = t('lan.console.firstPress', { name: input.firstPress })
    const hints = question?.hints?.length ?? 0
    if (state.hintsShown < hints) out.actions.push(act('revealHint', t('lan.console.hint', { n: state.hintsShown + 1, total: hints })))
    if (input.timed) {
      const running = state.timer.endsAt !== null
      out.actions.push(running ? act('timerPause', t('lan.console.timerPause')) : act('timerStart', t('lan.console.timerStart')))
    }
    out.actions.push(act('advance', t('lan.console.showAnswer'), 'primary'))
  } else if (phase === 'answer' && !state.groupVerdicts) {
    for (const row of rows) {
      if (state.stake && state.stake.playerId !== row.id) continue
      row.actions.push(act('close', `+${input.value}`, 'good', [{ playerId: row.id, sign: 1 }]))
      row.actions.push(act('close', input.loss ? `−${input.loss}` : '✗', 'bad', [{ playerId: row.id, sign: -1 }]))
    }
    out.actions.push(act('close', t('lan.console.nobody')))
  } else if (inGame) out.note = t('lan.console.elsewhere')

  if (inGame) {
    if (input.canUndo) out.tools.push(act('undo', t('lan.console.undo')))
    out.tools.push(state.pause ? act('resume', t('lan.console.resume'), 'primary') : act('pause', t('lan.console.pause')))
  }
  return out
}
