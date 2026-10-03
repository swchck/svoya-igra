import { computed, reactive, ref, type Ref } from 'vue'
import type { Game, Player, Question, Round } from '../types'
import { uid } from '../game/model'

export type Phase =
  | 'title'
  | 'round-intro'
  | 'board'
  | 'question'
  | 'answer'
  | 'final-intro'
  | 'final-question'
  | 'final-answer'
  | 'results'

/** Who got the question right (+1) or wrong (−1). */
export interface Verdict {
  player: Player
  sign: 1 | -1
}

function isRoundDone(round: Round, played: Record<string, true>): boolean {
  return round.themes.every((t) => t.questions.every((q) => played[q.id]))
}

/** Runs one play-through of a game: phases, the board and the score. */
export function usePlaySession(game: Ref<Game | null>) {
  const state = reactive({
    phase: 'title' as Phase,
    roundIndex: 0,
    activeQuestionId: null as string | null,
    played: {} as Record<string, true>,
  })
  const players = ref<Player[]>([
    { id: uid('p_'), name: 'Игрок 1', score: 0 },
    { id: uid('p_'), name: 'Игрок 2', score: 0 },
  ])

  const round = computed(() => game.value?.rounds[state.roundIndex])
  const activeQuestion = computed<Question | null>(
    () =>
      round.value?.themes.flatMap((t) => t.questions).find((q) => q.id === state.activeQuestionId) ?? null,
  )
  const ranking = computed(() => [...players.value].sort((a, b) => b.score - a.score))
  const inProgress = computed(() => state.phase !== 'title' && state.phase !== 'results')

  function nextRound() {
    if (!game.value) return
    if (state.roundIndex < game.value.rounds.length - 1) {
      state.roundIndex += 1
      state.phase = 'round-intro'
    } else {
      state.phase = game.value.finalRound ? 'final-intro' : 'results'
    }
  }

  function pick(q: Question) {
    if (state.played[q.id]) return
    state.activeQuestionId = q.id
    state.phase = 'question'
  }

  /** Closes the open question, scoring the verdict if there is one. */
  function close(verdict?: Verdict) {
    const q = activeQuestion.value
    if (q) {
      state.played[q.id] = true
      if (verdict) verdict.player.score += verdict.sign * q.value
    }
    state.activeQuestionId = null
    if (round.value && isRoundDone(round.value, state.played)) nextRound()
    else state.phase = 'board'
  }

  /** Advances the click-through phases; returns false where a decision is needed instead. */
  function advance(): boolean {
    const next: Partial<Record<Phase, Phase>> = {
      'round-intro': 'board',
      question: 'answer',
      'final-intro': 'final-question',
      'final-question': 'final-answer',
      'final-answer': 'results',
    }
    const phase = next[state.phase]
    if (!phase) return false
    state.phase = phase
    return true
  }

  function addPlayer() {
    players.value.push({ id: uid('p_'), name: `Игрок ${players.value.length + 1}`, score: 0 })
  }

  function removePlayer(p: Player) {
    if (players.value.length > 1) players.value = players.value.filter((x) => x.id !== p.id)
  }

  return {
    state,
    players,
    round,
    activeQuestion,
    ranking,
    inProgress,
    start: () => (state.phase = 'round-intro'),
    pick,
    close,
    advance,
    nextRound,
    addPlayer,
    removePlayer,
  }
}
