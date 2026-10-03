import { computed, reactive, ref, type Ref } from 'vue'
import type { Game, Player, Question, Round } from '../types'
import { uid } from '../game/model'
import { plainCopy } from '../lib/plain'
import { t } from '../i18n'
import { nextColorId } from '../play/palette'

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

/** How one competitor has done so far. */
export interface PlayerStats {
  correct: number
  wrong: number
  /** Points gained by correct answers. */
  won: number
  /** Points lost by wrong answers. */
  lost: number
  streak: number
  bestStreak: number
  /** The most valuable correct answer. */
  best: number
}

/** The answer clock: `endsAt` while it runs, otherwise `left` ms are frozen. */
export interface TimerState {
  endsAt: number | null
  left: number
}

/** Milliseconds left on the clock at `now`. */
export function timerRemaining(timer: TimerState, now: number): number {
  return timer.endsAt === null ? timer.left : Math.max(0, timer.endsAt - now)
}

/** What undo needs to put the game back before a question was closed or the final scored. */
interface TurnState {
  phase: Phase
  roundIndex: number
  activeQuestionId: string | null
  played: Record<string, true>
  stake: Stake | null
  scores: Record<string, number>
  stats: Record<string, PlayerStats>
}

export type HistoryEntry = { kind: 'turn'; before: TurnState } | { kind: 'adjust'; playerId: string; delta: number }

const MAX_HISTORY = 30

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
  /** Competitors are teams rather than people; only labels differ. */
  teams: boolean
  stats: Record<string, PlayerStats>
  timer: TimerState
  /** Score-affecting actions, oldest first, for undo. */
  history: HistoryEntry[]
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
    players: [],
    teams: false,
    stats: {},
    timer: { endsAt: null, left: 0 },
    history: [],
  }
}

function defaultName(teams: boolean, n: number): string {
  return t(teams ? 'play.setup.teamName' : 'play.setup.defaultName', { n })
}

function newPlayer(players: Player[], teams: boolean): Player {
  return { id: uid('p_'), name: defaultName(teams, players.length + 1), score: 0, color: nextColorId(players) }
}

function emptyStats(): PlayerStats {
  return { correct: 0, wrong: 0, won: 0, lost: 0, streak: 0, bestStreak: 0, best: 0 }
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
  const base = initialSnapshot()
  const { players: initialPlayers, ...initialState } = plainCopy({ ...base, ...restored })
  if (!restored) for (let i = 0; i < 2; i++) initialPlayers.push(newPlayer(initialPlayers, false))
  // sessions saved before colors existed get theirs now
  for (const p of initialPlayers) p.color ??= nextColorId(initialPlayers)
  const state = reactive(initialState)
  const players = ref<Player[]>(initialPlayers)
  const answerMs = computed(() => (game.value?.settings?.answerSeconds ?? 0) * 1000)
  // sessions saved before the timer existed carry none
  if (!restored?.timer) state.timer = { endsAt: null, left: answerMs.value }

  const round = computed(() => game.value?.rounds[state.roundIndex])
  const activeQuestion = computed<Question | null>(
    () =>
      round.value?.themes.flatMap((t) => t.questions).find((q) => q.id === state.activeQuestionId) ?? null,
  )
  const ranking = computed(() => [...players.value].sort((a, b) => b.score - a.score))
  const canUndo = computed(() => state.history.length > 0)
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

  function turnState(): TurnState {
    return plainCopy({
      phase: state.phase,
      roundIndex: state.roundIndex,
      activeQuestionId: state.activeQuestionId,
      played: state.played,
      stake: state.stake,
      scores: Object.fromEntries(players.value.map((p) => [p.id, p.score])),
      stats: state.stats,
    })
  }

  function record(entry: HistoryEntry) {
    state.history.push(entry)
    if (state.history.length > MAX_HISTORY) state.history.splice(0, state.history.length - MAX_HISTORY)
  }

  function recordAnswer(playerId: string, sign: Sign, points: number) {
    const s = (state.stats[playerId] ??= emptyStats())
    if (sign === 1) {
      s.correct += 1
      s.won += points
      s.streak += 1
      s.bestStreak = Math.max(s.bestStreak, s.streak)
      s.best = Math.max(s.best, points)
    } else {
      s.wrong += 1
      s.lost += points
      s.streak = 0
    }
  }

  /** Puts the clock back to the full time, running at once when the game starts it by itself. */
  function armTimer() {
    state.timer = { endsAt: null, left: answerMs.value }
    if (game.value?.settings?.timerAutoStart) timerStart()
  }

  const timerPhase = () => (state.phase === 'question' || state.phase === 'final-question') && answerMs.value > 0

  function timerStart() {
    if (!timerPhase()) return
    const now = Date.now()
    const remaining = timerRemaining(state.timer, now)
    if (state.timer.endsAt !== null && remaining > 0) return
    const left = remaining > 0 ? remaining : answerMs.value
    state.timer = { endsAt: now + left, left }
  }

  function timerPause() {
    if (!timerPhase() || state.timer.endsAt === null) return
    state.timer = { endsAt: null, left: timerRemaining(state.timer, Date.now()) }
  }

  function timerReset() {
    if (timerPhase()) state.timer = { endsAt: null, left: answerMs.value }
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
    if (state.phase === 'question') armTimer()
  }

  /** Auction: the winner and their bid, at least the question's value. */
  function setAuctionStake(playerId: string, amount: number) {
    const q = activeQuestion.value
    if (!q || state.phase !== 'auction' || !player(playerId) || !Number.isFinite(amount)) return
    const bid = Math.min(Math.max(amount, q.value), maxStake(player(playerId), q.value))
    state.stake = { playerId, amount: bid }
    state.phase = 'question'
    armTimer()
  }

  /** Cat in the bag: who gets the question; it is worth its cat price. */
  function giveCat(playerId: string) {
    const q = activeQuestion.value
    if (!q || state.phase !== 'cat' || !player(playerId)) return
    state.stake = { playerId, amount: q.catValue ?? q.value }
    state.phase = 'question'
    armTimer()
  }

  /** Closes the open question, scoring the verdict if there is one; only an answered question takes a verdict. */
  function close(verdict?: { playerId: string; sign: Sign }) {
    const q = activeQuestion.value
    if (!q || !['auction', 'cat', 'question', 'answer'].includes(state.phase) || (verdict && state.phase !== 'answer')) return
    record({ kind: 'turn', before: turnState() })
    state.played[q.id] = true
    // with a stake on the table only its holder can win or lose points
    const allowed = verdict && (!state.stake || state.stake.playerId === verdict.playerId)
    const target = allowed ? player(verdict.playerId) : undefined
    if (target && (verdict!.sign === 1 || verdict!.sign === -1)) {
      target.score += verdict!.sign * activeValue.value
      recordAnswer(target.id, verdict!.sign, activeValue.value)
    }
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
    record({ kind: 'turn', before: turnState() })
    for (const p of players.value) {
      const sign = state.finalVerdicts[p.id]
      if (!sign) continue
      const bet = state.finalBets[p.id] ?? 0
      p.score += sign * bet
      recordAnswer(p.id, sign, bet)
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
    if (phase === 'final-question') armTimer()
    else if (phase === 'answer') state.timer = { endsAt: null, left: answerMs.value }
    return true
  }

  function adjustScore(playerId: string, delta: number) {
    const p = player(playerId)
    if (!p || !Number.isFinite(delta) || delta === 0) return
    record({ kind: 'adjust', playerId, delta })
    p.score += delta
  }

  /** Takes back the last scoring action, with the board state it changed. */
  function undo(): boolean {
    const entry = state.history.pop()
    if (!entry) return false
    if (entry.kind === 'adjust') {
      const p = player(entry.playerId)
      if (p) p.score -= entry.delta
      return true
    }
    const { scores, ...before } = plainCopy(entry.before)
    Object.assign(state, before)
    for (const p of players.value) if (p.id in scores) p.score = scores[p.id]
    state.timer = { endsAt: null, left: answerMs.value }
    return true
  }

  /** Switches the competitors between people and teams, renaming the ones still on default names. */
  function setTeams(on: boolean) {
    if (state.phase !== 'title' || state.teams === on) return
    players.value.forEach((p, i) => {
      if (p.name === defaultName(state.teams, i + 1)) p.name = defaultName(on, i + 1)
    })
    state.teams = on
  }

  /** Adds a competitor under a default name, or the one a phone joined as. */
  function addPlayer(from?: Pick<Player, 'id' | 'name'>) {
    if (from && player(from.id)) return
    players.value.push({ ...newPlayer(players.value, state.teams), ...from })
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
    canUndo,
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
    undo,
    setTeams,
    timerStart,
    timerPause,
    timerReset,
    addPlayer,
    removePlayer,
  }
}

export type PlaySession = ReturnType<typeof usePlaySession>
