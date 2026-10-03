import { computed, reactive, ref, type Ref } from 'vue'
import type { Game, Player, Question, Round } from '../types'
import { uid } from '../game/model'
import { plainCopy } from '../lib/plain'
import { t } from '../i18n'

export type Phase =
  | 'title'
  | 'round-intro'
  | 'board'
  | 'auction'
  | 'cat'
  | 'question'
  | 'answer'
  | 'final-intro'
  | 'final-bets'
  | 'final-question'
  | 'final-answer'
  | 'results'

/** One player answers for a fixed amount: the auction winner or the cat's recipient. */
export interface Stake {
  playerId: string
  amount: number
}

/** Correct (+1) or wrong (−1). */
export type Sign = 1 | -1

/** Everything needed to resume or mirror a play-through; plain data only. */
export interface SessionSnapshot {
  phase: Phase
  roundIndex: number
  activeQuestionId: string | null
  played: Record<string, true>
  stake: Stake | null
  finalBets: Record<string, number>
  finalVerdicts: Record<string, Sign>
  players: Player[]
}

function isRoundDone(round: Round, played: Record<string, true>): boolean {
  return round.themes.every((t) => t.questions.every((q) => played[q.id]))
}

function initialSnapshot(): SessionSnapshot {
  return {
    phase: 'title',
    roundIndex: 0,
    activeQuestionId: null,
    played: {},
    stake: null,
    finalBets: {},
    finalVerdicts: {},
    players: [
      { id: uid('p_'), name: t('play.setup.defaultName', { n: 1 }), score: 0 },
      { id: uid('p_'), name: t('play.setup.defaultName', { n: 2 }), score: 0 },
    ],
  }
}

/** Reports whether a saved play-through still points at questions the game has. */
export function fitsGame(snapshot: SessionSnapshot, game: Game): boolean {
  const round = game.rounds[snapshot.roundIndex]
  if (!round || !Array.isArray(snapshot.players) || snapshot.players.length === 0) return false
  const questionIds = new Set(round.themes.flatMap((t) => t.questions.map((q) => q.id)))
  if (snapshot.activeQuestionId !== null && !questionIds.has(snapshot.activeQuestionId)) return false
  if (['auction', 'cat', 'question', 'answer'].includes(snapshot.phase) && snapshot.activeQuestionId === null) return false
  if (snapshot.phase.startsWith('final') && !game.finalRound) return false
  return !snapshot.stake || snapshot.players.some((p) => p.id === snapshot.stake!.playerId)
}

/** The most a player may stake: everything they have, but never less than the floor. */
export function maxStake(player: Player | undefined, floor: number): number {
  return Math.max(player?.score ?? 0, floor)
}

/** Runs one play-through of a game: phases, the board, stakes and the score. */
export function usePlaySession(game: Ref<Game | null>, restored?: SessionSnapshot) {
  const { players: initialPlayers, ...initialState } = plainCopy(restored ?? initialSnapshot())
  const state = reactive(initialState)
  const players = ref<Player[]>(initialPlayers)

  const round = computed(() => game.value?.rounds[state.roundIndex])
  const activeQuestion = computed<Question | null>(
    () =>
      round.value?.themes.flatMap((t) => t.questions).find((q) => q.id === state.activeQuestionId) ?? null,
  )
  const ranking = computed(() => [...players.value].sort((a, b) => b.score - a.score))
  const inProgress = computed(() => state.phase !== 'title' && state.phase !== 'results')
  /** What the open question is worth to whoever answers it. */
  const activeValue = computed(() => {
    const q = activeQuestion.value
    if (!q) return 0
    if (state.stake) return state.stake.amount
    return q.value
  })

  function player(id: string): Player | undefined {
    return players.value.find((p) => p.id === id)
  }

  function snapshot(): SessionSnapshot {
    return plainCopy({ ...state, players: players.value })
  }

  function start() {
    if (state.phase === 'title') state.phase = 'round-intro'
  }

  function finishRound() {
    if (!game.value) return
    if (state.roundIndex < game.value.rounds.length - 1) {
      state.roundIndex += 1
      state.phase = 'round-intro'
    } else {
      state.phase = game.value.finalRound ? 'final-intro' : 'results'
    }
  }

  /** Skips the rest of the round on the board. */
  function nextRound() {
    if (state.phase === 'board') finishRound()
  }

  function pick(questionId: string) {
    const inRound = round.value?.themes.some((t) => t.questions.some((q) => q.id === questionId))
    if (state.phase !== 'board' || !inRound || state.played[questionId]) return
    state.activeQuestionId = questionId
    state.stake = null
    const kind = activeQuestion.value?.kind
    state.phase = kind === 'auction' ? 'auction' : kind === 'cat-in-bag' ? 'cat' : 'question'
  }

  /** Auction: the winner and their bid, at least the question's value. */
  function setAuctionStake(playerId: string, amount: number) {
    const q = activeQuestion.value
    if (!q || state.phase !== 'auction' || !player(playerId) || !Number.isFinite(amount)) return
    const bid = Math.min(Math.max(amount, q.value), maxStake(player(playerId), q.value))
    state.stake = { playerId, amount: bid }
    state.phase = 'question'
  }

  /** Cat in the bag: who gets the question; it is worth its cat price. */
  function giveCat(playerId: string) {
    const q = activeQuestion.value
    if (!q || state.phase !== 'cat' || !player(playerId)) return
    state.stake = { playerId, amount: q.catValue ?? q.value }
    state.phase = 'question'
  }

  /** Closes the open question, scoring the verdict if there is one. */
  function close(verdict?: { playerId: string; sign: Sign }) {
    const q = activeQuestion.value
    if (state.phase !== 'answer' || !q) return
    state.played[q.id] = true
    // with a stake on the table only its holder can win or lose points
    const allowed = verdict && (!state.stake || state.stake.playerId === verdict.playerId)
    const target = allowed ? player(verdict.playerId) : undefined
    if (target && (verdict!.sign === 1 || verdict!.sign === -1)) target.score += verdict!.sign * activeValue.value
    state.activeQuestionId = null
    state.stake = null
    if (round.value && isRoundDone(round.value, state.played)) finishRound()
    else state.phase = 'board'
  }

  function setFinalBet(playerId: string, amount: number) {
    const p = player(playerId)
    if (!p || state.phase !== 'final-bets' || !Number.isFinite(amount)) return
    state.finalBets[playerId] = Math.min(Math.max(0, Math.round(amount)), Math.max(p.score, 0))
  }

  function setFinalVerdict(playerId: string, sign: Sign) {
    if (state.phase !== 'final-answer' || !player(playerId) || (sign !== 1 && sign !== -1)) return
    state.finalVerdicts[playerId] = sign
  }

  /** Applies final bets by the marked verdicts and shows the results. */
  function scoreFinal() {
    if (state.phase !== 'final-answer') return
    for (const p of players.value) {
      const sign = state.finalVerdicts[p.id]
      if (sign) p.score += sign * (state.finalBets[p.id] ?? 0)
    }
    state.phase = 'results'
  }

  /** Advances the click-through phases; returns false where a decision is needed instead. */
  function advance(): boolean {
    const next: Partial<Record<Phase, Phase>> = {
      'round-intro': 'board',
      question: 'answer',
      'final-intro': 'final-bets',
      'final-bets': 'final-question',
      'final-question': 'final-answer',
    }
    const phase = next[state.phase]
    if (!phase) return false
    state.phase = phase
    return true
  }

  function adjustScore(playerId: string, delta: number) {
    const p = player(playerId)
    if (p && Number.isFinite(delta)) p.score += delta
  }

  function addPlayer() {
    players.value.push({ id: uid('p_'), name: t('play.setup.defaultName', { n: players.value.length + 1 }), score: 0 })
  }

  function removePlayer(playerId: string) {
    if (players.value.length > 1) players.value = players.value.filter((x) => x.id !== playerId)
  }

  return {
    state,
    players,
    round,
    activeQuestion,
    activeValue,
    ranking,
    inProgress,
    player,
    snapshot,
    start,
    pick,
    setAuctionStake,
    giveCat,
    close,
    advance,
    nextRound,
    setFinalBet,
    setFinalVerdict,
    scoreFinal,
    adjustScore,
    addPlayer,
    removePlayer,
  }
}

export type PlaySession = ReturnType<typeof usePlaySession>
