import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { Game } from '@/types'
import type { DemoPhase } from '@/tour/state'
import type { SessionSnapshot } from './usePlaySession'
import { useHostDemo } from './useHostDemo'

const game = {
  settings: { answerSeconds: 30 },
  rounds: [{ id: 'r1', name: 'R', themes: [{ id: 't1', name: 'T', questions: [{ id: 'q1', value: 100 }, { id: 'q2', value: 200 }] }] }],
} as unknown as Game

function snapshot(patch: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    phase: 'board',
    roundIndex: 0,
    activeQuestionId: null,
    played: { q9: true },
    stake: null,
    chooserId: null,
    buzzArmed: false,
    finalBets: {},
    finalVerdicts: {},
    players: [{ id: 'p1', name: 'A', score: 300 }, { id: 'p2', name: 'B', score: 0 }],
    teams: false,
    stats: {},
    timer: { endsAt: null, left: 0 },
    history: [],
    ...patch,
  } as SessionSnapshot
}

function setup() {
  const wanted = ref<DemoPhase | null>(null)
  const apply = vi.fn()
  const demo = useHostDemo({ game: ref(game), wanted: () => wanted.value, current: () => snapshot({ phase: 'title' }), apply })
  return { wanted, apply, demo }
}

describe('useHostDemo', () => {
  it('shows stage snapshots as they come when no demo runs', () => {
    const { apply, demo } = setup()
    const s = snapshot()
    demo.receive(s)
    expect(apply).toHaveBeenCalledWith(s)
    expect(demo.active.value).toBe(false)
  })

  it('plays the first question of the round during a demo, with the real players', async () => {
    const { wanted, apply, demo } = setup()
    demo.receive(snapshot())
    wanted.value = 'question'
    await nextTick()
    expect(demo.active.value).toBe(true)
    expect(apply).toHaveBeenLastCalledWith(
      expect.objectContaining({
        phase: 'question',
        activeQuestionId: 'q1',
        chooserId: 'p1',
        played: { q9: true },
        timer: { endsAt: null, left: 30000 },
        players: snapshot().players,
      }),
    )
    wanted.value = 'answer'
    await nextTick()
    expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'answer', activeQuestionId: 'q1' }))
    wanted.value = 'board'
    await nextTick()
    expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'board', activeQuestionId: null }))
  })

  it('lets undo look available without touching the real history', async () => {
    const { wanted, apply, demo } = setup()
    const real = snapshot()
    demo.receive(real)
    wanted.value = 'answer'
    await nextTick()
    expect(apply.mock.lastCall![0].history).toHaveLength(1)
    expect(real.history).toHaveLength(0)
  })

  it('ignores stage snapshots during a demo and brings the latest back afterwards', async () => {
    const { wanted, apply, demo } = setup()
    demo.receive(snapshot())
    wanted.value = 'question'
    await nextTick()
    apply.mockClear()

    const later = snapshot({ phase: 'answer', activeQuestionId: 'q2' })
    demo.receive(later)
    expect(apply).not.toHaveBeenCalled()

    wanted.value = null
    await nextTick()
    expect(demo.active.value).toBe(false)
    expect(apply).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledWith(later)
  })

  it('demos from the console state when the stage never connected, and goes back to offline', async () => {
    const { wanted, apply } = setup()
    wanted.value = 'board'
    await nextTick()
    expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'board', chooserId: 'p1' }))
    wanted.value = null
    await nextTick()
    expect(apply).toHaveBeenLastCalledWith(null)
  })

  it('falls back to the board when the round has no questions', async () => {
    const empty = { ...game, rounds: [{ id: 'r', name: 'R', themes: [] }] } as unknown as Game
    const wanted = ref<DemoPhase | null>(null)
    const apply = vi.fn()
    useHostDemo({ game: ref(empty), wanted: () => wanted.value, current: () => snapshot(), apply })
    wanted.value = 'question'
    await nextTick()
    expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'board', activeQuestionId: null }))
  })
})
