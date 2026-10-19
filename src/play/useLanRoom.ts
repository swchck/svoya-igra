import { computed, onScopeDispose, ref, watch, type WatchStopHandle } from 'vue'
import type { PlaySession } from '@/composables/usePlaySession'
import { playSound } from './sounds'
import { prefs } from '@/prefs'
import { hasChoice, matchesAnswer } from '@/game/kinds'
import {
  armBuzz,
  buzzWindow,
  buzzWinner,
  closeBuzz,
  emptyLanStatus,
  fixedRoomCode,
  onLanHost,
  onLanJoin,
  onLanPick,
  onLanReaction,
  onLanStatus,
  reopenBuzz,
  setHostView,
  stageInfo,
  startLan,
  stopLan,
  syncLan,
  type LanInfo,
  type LanStatus,
} from './lan'

function quietly(p: Promise<unknown>): void {
  // the room only refuses once it is gone, and then the stage stops caring
  p.catch((err) => console.warn('LAN room:', err))
}

/** What the stage does with the host's phone and the spectators. */
export interface LanExtras {
  /** The console for the host's phone; read only while the room runs. */
  console?: () => unknown
  /** A command from the host's phone, unchecked: shaped like the host window's, or anything. */
  command?: (command: unknown) => void
  reaction?: (emoji: string) => void
}

/**
 * Runs the phone buzzers for a stage: keeps the phones in step with the session, opens and
 * closes the buttons with each question, adds players who join by name and fills in final
 * bets sent from phones. The host's phone gets its console and spectators' reactions come
 * through. The room stops with the stage.
 */
export function useLanRoom(
  session: PlaySession,
  title: () => string,
  pick: (questionId: string) => void = session.pick,
  extras: LanExtras = {},
) {
  const { state, players, round } = session
  const info = ref<LanInfo | null>(null)
  const status = ref<LanStatus>(emptyLanStatus())
  const starting = ref(false)
  let unlisten: (() => void)[] = []
  let lastSync = ''
  let stopConsole: WatchStopHandle | undefined
  // bets already copied into the session, so the host's own edits are not overwritten
  let appliedBets: Record<string, number> = {}

  const winnerId = computed(() => (buzzWindow(state) ? buzzWinner(status.value) : undefined))
  /** Phones online per player id, while the room runs. */
  const phones = computed(() => (info.value ? status.value.phones : {}))

  function sync() {
    if (!info.value) return
    const stage = stageInfo(
      {
        phase: state.phase,
        players: players.value,
        teams: state.teams,
        played: state.played,
        chooserId: state.chooserId,
        activeQuestionId: state.activeQuestionId,
        groupVerdicts: state.groupVerdicts,
        pause: state.pause,
      },
      title(),
      round.value,
      prefs.phoneVibration,
      { themes: session.finalLeft.value.map((f) => ({ id: f.id, theme: f.theme })), picker: session.finalPicker.value },
    )
    const key = JSON.stringify(stage)
    if (key === lastSync) return
    lastSync = key
    quietly(syncLan(stage))
  }

  function syncBuzz() {
    if (!info.value) return
    const key = buzzWindow(state)
    quietly(key ? armBuzz(key) : closeBuzz())
  }

  function takeBets(bets: Record<string, number>) {
    if (state.phase !== 'final-bets') return
    for (const [id, amount] of Object.entries(bets)) {
      if (appliedBets[id] === amount) continue
      appliedBets[id] = amount
      session.setFinalBet(id, amount)
    }
  }

  function onStatus(next: LanStatus) {
    status.value = next
    if (Object.keys(next.bets).length === 0) appliedBets = {}
    takeBets(next.bets)
  }

  /** Turns the buzzers on. Throws the server's error, e.g. `no-network`. */
  async function start(): Promise<void> {
    if (info.value || starting.value) return
    starting.value = true
    try {
      unlisten.push(await onLanStatus(onStatus))
      unlisten.push(await onLanJoin((j) => session.addPlayer({ id: j.playerId, name: j.name })))
      unlisten.push(
        await onLanPick((p) => {
          // the phone saw an older board if the turn has already moved on
          if (state.phase === 'board' && state.chooserId === p.playerId) pick(p.questionId)
          else if (state.phase === 'final-themes' && session.finalPicker.value === p.playerId) session.removeFinalTheme(p.questionId)
        }),
      )
      if (extras.command) unlisten.push(await onLanHost(extras.command))
      if (extras.reaction) unlisten.push(await onLanReaction(extras.reaction))
      info.value = await startLan(prefs.fixedRoomCode ? fixedRoomCode() : null)
      lastSync = ''
      sync()
      syncBuzz()
      // watched only from here: the getter reads stage state set up after this composable
      if (extras.console) {
        let last = ''
        stopConsole = watch(
          () => JSON.stringify(extras.console!()),
          (json) => {
            if (json === last || !info.value) return
            last = json
            quietly(setHostView(JSON.parse(json)))
          },
          { immediate: true },
        )
      }
    } catch (err) {
      unlisten.forEach((f) => f())
      unlisten = []
      throw err
    } finally {
      starting.value = false
    }
  }

  /** Turns the buzzers off and lets every phone go. */
  function stop() {
    unlisten.forEach((f) => f())
    unlisten = []
    stopConsole?.()
    stopConsole = undefined
    if (!info.value) return
    info.value = null
    status.value = emptyLanStatus()
    appliedBets = {}
    quietly(stopLan())
  }

  /**
   * Opens the buttons again; `wrong` shuts whoever pressed first out and, when the rules
   * charge for wrong answers, costs them the question's value.
   */
  function reopen(wrong: boolean) {
    if (!info.value) return
    const winner = winnerId.value
    if (wrong && winner) session.answerWrong(winner)
    quietly(reopenBuzz(wrong))
  }

  /**
   * A question for everyone: on reveal, choices are scored by the phones and typed answers
   * that match the card exactly are marked right. Anything else waits for the host.
   */
  function markGroup() {
    const q = session.activeQuestion.value
    if (!info.value || !q || state.phase !== 'answer' || !state.groupVerdicts) return
    for (const [id, raw] of Object.entries(status.value.answers)) {
      if (state.groupVerdicts[id]) continue
      if (hasChoice(q)) session.setGroupVerdict(id, Number(raw) === q.correctOption ? 1 : -1)
      else if (matchesAnswer(q, raw)) session.setGroupVerdict(id, 1)
    }
  }

  watch(
    [() => state.phase, players, title, () => state.teams, () => state.chooserId, () => state.played, () => state.activeQuestionId, () => !!state.groupVerdicts, () => state.finalRemoved, round, () => prefs.phoneVibration, () => !!state.pause],
    sync,
    { deep: true },
  )
  watch(() => state.phase, (phase) => phase === 'answer' && markGroup())
  watch(() => buzzWindow(state), syncBuzz)
  watch(() => state.phase, (phase) => phase === 'final-bets' && takeBets(status.value.bets))
  watch(winnerId, (id) => id && playSound('pick'))
  onScopeDispose(stop)

  return { info, status, starting, winnerId, phones, start, stop, reopen }
}
