import { computed, onScopeDispose, ref, watch } from 'vue'
import type { PlaySession } from '@/composables/usePlaySession'
import { playSound } from './sounds'
import { prefs } from '@/prefs'
import {
  armBuzz,
  buzzWindow,
  buzzWinner,
  closeBuzz,
  emptyLanStatus,
  fixedRoomCode,
  onLanJoin,
  onLanPick,
  onLanStatus,
  reopenBuzz,
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

/**
 * Runs the phone buzzers for a stage: keeps the phones in step with the session, opens and
 * closes the buttons with each question, adds players who join by name and fills in final
 * bets sent from phones. The room stops with the stage.
 */
export function useLanRoom(session: PlaySession, title: () => string, pick: (questionId: string) => void = session.pick) {
  const { state, players, round } = session
  const info = ref<LanInfo | null>(null)
  const status = ref<LanStatus>(emptyLanStatus())
  const starting = ref(false)
  let unlisten: (() => void)[] = []
  let lastSync = ''
  // bets already copied into the session, so the host's own edits are not overwritten
  let appliedBets: Record<string, number> = {}

  const winnerId = computed(() => (buzzWindow(state) ? buzzWinner(status.value) : undefined))
  /** Phones online per player id, while the room runs. */
  const phones = computed(() => (info.value ? status.value.phones : {}))

  function sync() {
    if (!info.value) return
    const stage = stageInfo(
      { phase: state.phase, players: players.value, teams: state.teams, played: state.played, chooserId: state.chooserId },
      title(),
      round.value,
      prefs.phoneVibration,
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
        }),
      )
      info.value = await startLan(prefs.fixedRoomCode ? fixedRoomCode() : null)
      lastSync = ''
      sync()
      syncBuzz()
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

  watch([() => state.phase, players, title, () => state.teams, () => state.chooserId, () => state.played, round, () => prefs.phoneVibration], sync, {
    deep: true,
  })
  watch(() => buzzWindow(state), syncBuzz)
  watch(() => state.phase, (phase) => phase === 'final-bets' && takeBets(status.value.bets))
  watch(winnerId, (id) => id && playSound('pick'))
  onScopeDispose(stop)

  return { info, status, starting, winnerId, phones, start, stop, reopen }
}
