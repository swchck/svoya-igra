import { computed, watch, type Ref } from 'vue'
import type { Game } from '@/types'
import type { DemoPhase } from '@/tour/state'
import type { SessionSnapshot } from './usePlaySession'

interface Options {
  game: Ref<Game | null>
  /** The demo the tour wants right now, or null for the real game. */
  wanted: () => DemoPhase | null
  /** The console's state as it is now, for when no real snapshot has arrived. */
  current: () => SessionSnapshot
  /** Shows a snapshot, or the "no connection" state for null. */
  apply: (snapshot: SessionSnapshot | null) => void
}

function demoSnapshot(game: Game, base: SessionSnapshot, phase: DemoPhase): SessionSnapshot {
  const round = game.rounds[base.roundIndex] ?? game.rounds[0]
  const question = round?.themes.flatMap((t) => t.questions)[0]
  const answering = phase !== 'board' && !!question
  return {
    ...base,
    phase: answering ? phase : 'board',
    roundIndex: Math.max(0, game.rounds.indexOf(round)),
    activeQuestionId: answering ? question.id : null,
    stake: null,
    chooserId: base.chooserId ?? base.players[0]?.id ?? null,
    buzzArmed: true,
    timer: { endsAt: null, left: (game.settings?.answerSeconds ?? 0) * 1000 },
    // one entry so the undo button looks alive; nothing ever applies it
    history: [{ kind: 'adjust', playerId: base.players[0]?.id ?? '', delta: 0 }],
  }
}

/**
 * Lets the host console show a made-up game while its tour runs: stage snapshots are kept
 * but not shown, commands must be dropped by the caller while `active`, and the latest real
 * snapshot comes back when the demo ends.
 */
export function useHostDemo({ game, wanted, current, apply }: Options) {
  let real: SessionSnapshot | null = null
  const active = computed(() => wanted() !== null)

  watch(wanted, (phase) => {
    if (phase === null) return apply(real)
    if (game.value) apply(demoSnapshot(game.value, real ?? current(), phase))
  })

  /** Takes a snapshot from the stage; shown unless a demo is running. */
  function receive(snapshot: SessionSnapshot) {
    real = snapshot
    if (!active.value) apply(snapshot)
  }

  return { active, receive }
}
