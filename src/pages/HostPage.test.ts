import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { PlayChannel, PlayMessage } from '@/play/channel'
import type { SessionSnapshot } from '@/composables/usePlaySession'
import { i18n } from '@/i18n'
import { tour } from '@/tour/state'

const hoisted = vi.hoisted(() => ({ onMessage: null as null | ((m: PlayMessage) => void), post: vi.fn() }))

vi.mock('vue-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@/storage', () => ({
  getGame: vi.fn(async () => ({
    id: 'g',
    title: 'Game',
    settings: {},
    rounds: [{ id: 'r', name: 'Round', themes: [{ id: 't', name: 'Theme', questions: [{ id: 'q1', value: 100, text: 'Q?', answer: 'A!', kind: 'normal', media: [] }] }] }],
  })),
}))
vi.mock('@/play/channel', async (orig) => ({
  ...(await orig<typeof import('@/play/channel')>()),
  openPlayChannel: vi.fn(async (_id: string, onMessage: (m: PlayMessage) => void): Promise<PlayChannel> => {
    hoisted.onMessage = onMessage
    return { post: hoisted.post, close: vi.fn() }
  }),
}))

import HostPage from './HostPage.vue'

function snapshot(patch: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    phase: 'board',
    roundIndex: 0,
    activeQuestionId: null,
    played: {},
    stake: null,
    chooserId: 'p1',
    buzzArmed: false,
    finalBets: {},
    finalVerdicts: {},
    players: [{ id: 'p1', name: 'Ann', score: 0, color: 'rose' }, { id: 'p2', name: 'Bob', score: 0, color: 'amber' }],
    teams: false,
    stats: {},
    timer: { endsAt: null, left: 0 },
    history: [],
    ...patch,
  } as SessionSnapshot
}

async function mountHost() {
  const w = mount(HostPage, { props: { id: 'g' }, global: { plugins: [i18n], stubs: { SoundToggle: true } } })
  await flushPromises()
  return w
}

const commands = () => hoisted.post.mock.calls.map(([m]) => m).filter((m: PlayMessage) => m.type === 'command' || m.type === 'media-command')

beforeEach(() => {
  localStorage.clear()
  // the tour is not what most of these tests are about
  localStorage.setItem('svoya-igra:tour:host', '1')
  tour.active = false
  tour.demo = null
  hoisted.post.mockClear()
})

describe('HostPage tour demo', () => {
  it('shows a made-up question, marks it as a demo and sends nothing', async () => {
    const w = await mountHost()
    hoisted.onMessage!({ type: 'state', snapshot: snapshot() })
    await nextTick()
    expect(w.text()).not.toContain('Q?')

    tour.demo = 'question'
    await nextTick()
    expect(w.text()).toContain('Q?')
    expect(w.find('.demo').exists()).toBe(true)

    await w.findAll('button').find((b) => b.text().includes(i18n.global.t('host.showAnswer')))!.trigger('click')
    await w.findAll('button').find((b) => b.text().includes(i18n.global.t('host.undo')))!.trigger('click')
    expect(commands()).toEqual([])
  })

  it('ignores stage snapshots during the demo and shows the latest one afterwards', async () => {
    const w = await mountHost()
    hoisted.onMessage!({ type: 'state', snapshot: snapshot() })
    tour.demo = 'question'
    await nextTick()

    hoisted.onMessage!({ type: 'state', snapshot: snapshot({ phase: 'round-intro' }) })
    await nextTick()
    expect(w.text()).toContain('Q?')

    tour.demo = null
    await nextTick()
    expect(w.find('.demo').exists()).toBe(false)
    expect(w.text()).not.toContain('Q?')
    expect(w.find('.phase').text()).toBe(i18n.global.t('host.phase.roundIntro'))
  })

  it('sends commands again once the demo is over', async () => {
    const w = await mountHost()
    hoisted.onMessage!({ type: 'state', snapshot: snapshot() })
    tour.demo = 'question'
    await nextTick()
    tour.demo = null
    await nextTick()

    await w.find('.chooser-chip:not(.on)').trigger('click')
    expect(commands()).toEqual([expect.objectContaining({ type: 'command', name: 'setChooser', args: ['p2'] })])
  })

  it('offers the host tour when the stage first connects', async () => {
    localStorage.clear()
    await mountHost()
    expect(tour.active).toBe(false)
    hoisted.onMessage!({ type: 'state', snapshot: snapshot() })
    await nextTick()
    expect(tour).toMatchObject({ active: true, id: 'host' })
  })
})
