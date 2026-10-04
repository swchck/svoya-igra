import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Player, Round } from '@/types'

const invoke = vi.fn()
const listen = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args), isTauri: () => false }))
vi.mock('@tauri-apps/api/event', () => ({ listen: (...args: unknown[]) => listen(...args) }))

const lan = await import('./lan')
const { PLAYER_COLORS } = await import('./palette')

const players: Player[] = [
  { id: 'a', name: 'Аня', score: 300 },
  { id: 'b', name: 'Боря', score: 0, avatar: '🦉' },
  { id: 'c', name: 'Вера', score: -100, color: 'violet' },
]

beforeEach(() => {
  invoke.mockReset().mockResolvedValue(undefined)
  listen.mockReset()
})

describe('stageInfo', () => {
  const base = { players, teams: false, played: {} as Record<string, true>, chooserId: null as string | null }

  it('lets phones join by name only while players are set up', () => {
    expect(lan.stageInfo({ ...base, phase: 'title' }, 'Quiz')).toEqual({
      title: 'Quiz',
      roster: [
        { id: 'a', name: 'Аня', score: 300, color: PLAYER_COLORS[0].css, avatar: null },
        { id: 'b', name: 'Боря', score: 0, color: PLAYER_COLORS[1].css, avatar: '🦉' },
        { id: 'c', name: 'Вера', score: -100, color: PLAYER_COLORS[5].css, avatar: null },
      ],
      allowJoin: true,
      teams: false,
      finalMode: null,
      caps: {},
      board: null,
      chooser: null,
      vibrate: true,
    })
    expect(lan.stageInfo({ ...base, phase: 'board' }, 'Quiz').allowJoin).toBe(false)
    expect(lan.stageInfo({ ...base, phase: 'board' }, 'Quiz', undefined, false).vibrate).toBe(false)
  })

  it('shows the board and whose pick it is only while the board is up', () => {
    const round = {
      id: 'r1',
      name: 'Раунд 1',
      themes: [{ id: 't1', name: 'Флаги', questions: [{ id: 'q1', value: 100 }, { id: 'q2', value: 200 }] }],
    } as unknown as Round
    const info = lan.stageInfo({ ...base, phase: 'board', played: { q1: true }, chooserId: 'b' }, '', round)
    expect(info.chooser).toBe('b')
    expect(info.board).toEqual({
      round: 'Раунд 1',
      themes: [{ name: 'Флаги', questions: [{ id: 'q1', value: 100, played: true }, { id: 'q2', value: 200, played: false }] }],
    })
    expect(lan.stageInfo({ ...base, phase: 'question' }, '', round).board).toBeNull()
  })

  it('names the person behind a press, with their team when the seat is shared', () => {
    const status = { ...lan.emptyLanStatus(), buzz: { state: 'locked' as const, order: ['a', 'b'], by: ['Петя', null], excluded: [] } }
    expect(lan.pressedBy(status, 0, 'Совы')).toBe('Петя (Совы)')
    expect(lan.pressedBy(status, 1, 'Лисы')).toBe('Лисы')
  })

  it('asks for bets and answers in the final from players with points only', () => {
    const bets = lan.stageInfo({ ...base, phase: 'final-bets' }, '')
    expect(bets.finalMode).toBe('bet')
    expect(bets.caps).toEqual({ a: 300 })
    expect(lan.stageInfo({ ...base, phase: 'final-question' }, '').finalMode).toBe('answer')
    expect(lan.stageInfo({ ...base, phase: 'final-answer' }, '')).toMatchObject({ finalMode: null, caps: {} })
  })
})

describe('buzzWindow', () => {
  it('opens for an armed question anyone may answer', () => {
    const open = { phase: 'question' as const, activeQuestionId: 'q1', stake: null, buzzArmed: true }
    expect(lan.buzzWindow(open)).toBe('q1')
    expect(lan.buzzWindow({ ...open, buzzArmed: false })).toBeNull()
    expect(lan.buzzWindow({ ...open, stake: { playerId: 'a', amount: 200 } })).toBeNull()
    expect(lan.buzzWindow({ ...open, phase: 'answer' })).toBeNull()
    expect(lan.buzzWindow({ ...open, phase: 'board', activeQuestionId: null })).toBeNull()
    expect(lan.buzzable({ phase: 'question', stake: null })).toBe(true)
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
      ['lan_start', { code: null }],
      ['lan_buzz_arm', { key: 'q1' }],
      ['lan_buzz_reopen', { exclude: true }],
      ['lan_buzz_close'],
      ['lan_stop'],
    ])
  })

  it('passes a kept room code to the server', async () => {
    await lan.startLan('0427')
    expect(invoke).toHaveBeenCalledWith('lan_start', { code: '0427' })
  })

  it('makes up a four-digit room code once and keeps it', () => {
    localStorage.removeItem('svoya-igra:room-code')
    const code = lan.fixedRoomCode()
    expect(code).toMatch(/^\d{4}$/)
    expect(lan.fixedRoomCode()).toBe(code)
    localStorage.setItem('svoya-igra:room-code', 'oops')
    expect(lan.fixedRoomCode()).toMatch(/^\d{4}$/)
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
