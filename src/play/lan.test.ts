import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Player } from '@/types'

const invoke = vi.fn()
const listen = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args), isTauri: () => false }))
vi.mock('@tauri-apps/api/event', () => ({ listen: (...args: unknown[]) => listen(...args) }))

const lan = await import('./lan')

const players: Player[] = [
  { id: 'a', name: 'Аня', score: 300 },
  { id: 'b', name: 'Боря', score: 0 },
  { id: 'c', name: 'Вера', score: -100 },
]

beforeEach(() => {
  invoke.mockReset().mockResolvedValue(undefined)
  listen.mockReset()
})

describe('stageInfo', () => {
  it('lets phones join by name only while players are set up', () => {
    expect(lan.stageInfo({ phase: 'title', players }, 'Quiz')).toEqual({
      title: 'Quiz',
      roster: [
        { id: 'a', name: 'Аня', score: 300 },
        { id: 'b', name: 'Боря', score: 0 },
        { id: 'c', name: 'Вера', score: -100 },
      ],
      allowJoin: true,
      finalMode: null,
      caps: {},
    })
    expect(lan.stageInfo({ phase: 'board', players }, 'Quiz').allowJoin).toBe(false)
  })

  it('asks for bets and answers in the final from players with points only', () => {
    const bets = lan.stageInfo({ phase: 'final-bets', players }, '')
    expect(bets.finalMode).toBe('bet')
    expect(bets.caps).toEqual({ a: 300 })
    expect(lan.stageInfo({ phase: 'final-question', players }, '').finalMode).toBe('answer')
    expect(lan.stageInfo({ phase: 'final-answer', players }, '')).toMatchObject({ finalMode: null, caps: {} })
  })
})

describe('buzzWindow', () => {
  it('opens for a question anyone may answer', () => {
    expect(lan.buzzWindow({ phase: 'question', activeQuestionId: 'q1', stake: null })).toBe('q1')
    expect(lan.buzzWindow({ phase: 'question', activeQuestionId: 'q1', stake: { playerId: 'a', amount: 200 } })).toBeNull()
    expect(lan.buzzWindow({ phase: 'answer', activeQuestionId: 'q1', stake: null })).toBeNull()
    expect(lan.buzzWindow({ phase: 'board', activeQuestionId: null, stake: null })).toBeNull()
  })

  it('names the winner only while the buttons are locked', () => {
    const status = lan.emptyLanStatus()
    status.buzz.order = ['b', 'a']
    expect(lan.buzzWinner(status)).toBeUndefined()
    status.buzz.state = 'locked'
    expect(lan.buzzWinner(status)).toBe('b')
  })
})

describe('commands', () => {
  it('maps calls onto the shell commands', async () => {
    invoke.mockResolvedValueOnce({ url: 'http://192.168.1.2:47800/?r=1234', code: '1234' })
    await expect(lan.startLan()).resolves.toEqual({ url: 'http://192.168.1.2:47800/?r=1234', code: '1234' })
    await lan.armBuzz('q1')
    await lan.reopenBuzz(true)
    await lan.closeBuzz()
    await lan.stopLan()
    expect(invoke.mock.calls).toEqual([
      ['lan_start'],
      ['lan_buzz_arm', { key: 'q1' }],
      ['lan_buzz_reopen', { exclude: true }],
      ['lan_buzz_close'],
      ['lan_stop'],
    ])
  })

  it('sends a shared file as a raw body with its name in an ASCII header', async () => {
    const bytes = new Uint8Array([80, 75, 3, 4])
    await lan.shareFile(bytes, 'моя игра.gamezip')
    expect(invoke).toHaveBeenCalledWith('lan_share_start', bytes, {
      headers: { 'x-file-name': '%D0%BC%D0%BE%D1%8F%20%D0%B8%D0%B3%D1%80%D0%B0.gamezip' },
    })
  })

  it('delivers room events', async () => {
    const off = vi.fn()
    listen.mockResolvedValue(off)
    const seen: unknown[] = []
    const unlisten = await lan.onLanStatus((s) => seen.push(s))
    expect(listen).toHaveBeenCalledWith('lan://status', expect.any(Function))
    const status = lan.emptyLanStatus()
    listen.mock.calls[0][1]({ payload: status })
    expect(seen).toEqual([status])
    expect(unlisten).toBe(off)
  })
})

it('renders a QR code as SVG without the network', async () => {
  const svg = await lan.qrSvg('http://192.168.1.2:47800/?r=1234')
  expect(svg).toContain('<svg')
  expect(svg).toContain('<path')
})
