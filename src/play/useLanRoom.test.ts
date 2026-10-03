import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import type { Game } from '@/types'
import { makeEmptyFinal, makeEmptyGame, makeEmptyRound } from '@/game/model'
import { usePlaySession } from '@/composables/usePlaySession'
import type { LanStageInfo, LanStatus } from './lan'

const invoke = vi.fn()
const handlers = new Map<string, (e: { payload: unknown }) => void>()
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args), isTauri: () => false }))
vi.mock('@tauri-apps/api/event', () => ({
  listen: async (name: string, handler: (e: { payload: unknown }) => void) => {
    handlers.set(name, handler)
    return () => handlers.delete(name)
  },
}))
const playSound = vi.fn()
vi.mock('./sounds', () => ({ playSound: (...args: unknown[]) => playSound(...args) }))

const { useLanRoom } = await import('./useLanRoom')

function game(): Game {
  const g = makeEmptyGame()
  g.rounds = [makeEmptyRound('R1', 1)]
  g.finalRound = makeEmptyFinal()
  return g
}

function setup() {
  const g = game()
  const scope = effectScope()
  const session = scope.run(() => usePlaySession(ref(g)))!
  const room = scope.run(() => useLanRoom(session, () => g.title))!
  return { g, scope, session, room }
}

function emit(name: string, payload: unknown) {
  handlers.get(name)?.({ payload })
}

function status(patch: Partial<LanStatus> & { buzz?: Partial<LanStatus['buzz']> } = {}): LanStatus {
  return {
    phones: {},
    bets: {},
    answers: {},
    ...patch,
    buzz: { state: 'closed', order: [], excluded: [], ...patch.buzz },
  }
}

const calls = (name: string) => invoke.mock.calls.filter((c) => c[0] === name).map((c) => c[1])
const synced = () => calls('lan_sync').map((args) => (args as { stage: LanStageInfo }).stage)

beforeEach(() => {
  invoke.mockReset().mockImplementation(async (cmd: string) =>
    cmd === 'lan_start' ? { url: 'http://192.168.1.2:47800/?r=1234', code: '1234' } : undefined,
  )
  handlers.clear()
  playSound.mockReset()
})

describe('useLanRoom', () => {
  it('stays silent until started, then pushes the players', async () => {
    const { session, room, scope } = setup()
    session.addPlayer()
    await nextTick()
    expect(invoke).not.toHaveBeenCalled()

    await room.start()
    expect(room.info.value?.code).toBe('1234')
    const [stage] = synced()
    expect(stage.roster).toHaveLength(3)
    expect(stage.allowJoin).toBe(true)
    expect(calls('lan_buzz_close')).toHaveLength(1)

    scope.stop()
    expect(calls('lan_stop')).toHaveLength(1)
  })

  it('adds players who join by name', async () => {
    const { session, room } = setup()
    await room.start()
    emit('lan://join', { playerId: 'p_lan_1', name: 'Гоша' })
    emit('lan://join', { playerId: 'p_lan_1', name: 'Гоша' })
    expect(session.players.value.map((p) => p.name)).toContain('Гоша')
    expect(session.players.value.filter((p) => p.id === 'p_lan_1')).toHaveLength(1)
    await nextTick()
    expect(synced().at(-1)!.roster.map((p) => p.id)).toContain('p_lan_1')
  })

  it('opens the buttons for a question and lets the host reopen after a wrong answer', async () => {
    const { g, session, room } = setup()
    await room.start()
    session.start()
    session.advance()
    const q = g.rounds[0].themes[0].questions[0]
    session.pick(q.id)
    await nextTick()
    expect(calls('lan_buzz_arm')).toEqual([{ key: q.id }])

    const [p1] = session.players.value
    emit('lan://status', status({ buzz: { state: 'locked', order: [p1.id] } }))
    await nextTick()
    expect(room.winnerId.value).toBe(p1.id)
    expect(playSound).toHaveBeenCalledWith('pick')

    room.reopen(true)
    expect(p1.score).toBe(-q.value)
    expect(calls('lan_buzz_reopen')).toEqual([{ exclude: true }])

    session.advance()
    await nextTick()
    expect(calls('lan_buzz_close').length).toBeGreaterThan(1)
    expect(room.winnerId.value).toBeUndefined()
  })

  it('fills final bets from phones without undoing the host’s corrections', async () => {
    const { g, session, room } = setup()
    await room.start()
    const [p1] = session.players.value
    p1.score = 500
    session.start()
    session.advance()
    for (const q of g.rounds[0].themes.flatMap((t) => t.questions)) {
      session.pick(q.id)
      session.close()
    }
    session.advance()
    expect(session.state.phase).toBe('final-bets')
    await nextTick()
    expect(synced().at(-1)).toMatchObject({ finalMode: 'bet', caps: { [p1.id]: 500 } })

    emit('lan://status', status({ bets: { [p1.id]: 300 } }))
    expect(session.state.finalBets[p1.id]).toBe(300)
    session.setFinalBet(p1.id, 100)
    emit('lan://status', status({ bets: { [p1.id]: 300 }, phones: { [p1.id]: 1 } }))
    expect(session.state.finalBets[p1.id]).toBe(100)
    emit('lan://status', status({ bets: { [p1.id]: 400 } }))
    expect(session.state.finalBets[p1.id]).toBe(400)
  })

  it('stops cleanly and forgets the room', async () => {
    const { room } = setup()
    await room.start()
    emit('lan://status', status({ phones: { a: 1 } }))
    expect(room.phones.value).toEqual({ a: 1 })
    room.stop()
    expect(room.info.value).toBeNull()
    expect(room.phones.value).toEqual({})
    expect(handlers.size).toBe(0)
  })
})
