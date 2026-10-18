import { beforeEach, describe, expect, it, vi } from 'vitest'

const findUpdate = vi.fn()
vi.mock('../platform', () => ({ canSelfUpdate: true, findUpdate: () => findUpdate() }))

const { APP_VERSION } = await import('./changelog')
const { checkForUpdates, installUpdate, markSeen, skipUpdate, startUpdates, updates } = await import('./state')

function offer(version = '9.9.9', install = vi.fn(async () => {})) {
  return { version, notes: '', install }
}

beforeEach(() => {
  localStorage.clear()
  findUpdate.mockReset()
  Object.assign(updates, { status: 'idle', available: null, progress: null, offerOpen: false, offerPending: false, whatsNew: [], whatsNewOpen: false, justUpdated: false })
})

describe('update checks', () => {
  it('flags a background find for the library, and remembers a skipped version', async () => {
    findUpdate.mockResolvedValue(offer())
    await checkForUpdates(true)
    expect(updates).toMatchObject({ status: 'available', offerPending: true })
    skipUpdate()
    expect(updates.available).toBeNull()

    await checkForUpdates(true)
    expect(updates).toMatchObject({ status: 'idle', available: null })
    await checkForUpdates()
    expect(updates.available?.version).toBe('9.9.9')
  })

  it('stays quiet about a failed background check but reports one asked for', async () => {
    findUpdate.mockRejectedValue(new Error('offline'))
    await checkForUpdates(true)
    expect(updates.status).toBe('idle')
    await checkForUpdates()
    expect(updates.status).toBe('failed')
    findUpdate.mockResolvedValue(null)
    await checkForUpdates()
    expect(updates.status).toBe('latest')
  })

  it('reports download progress and a failed install', async () => {
    const install = vi.fn(async (progress: (p: { done: number; total: number | null }) => void) => {
      progress({ done: 5, total: 10 })
      expect(updates.progress).toEqual({ done: 5, total: 10 })
      throw new Error('disk full')
    })
    findUpdate.mockResolvedValue(offer('9.9.9', install))
    await checkForUpdates()
    await installUpdate()
    expect(install).toHaveBeenCalled()
    expect(updates.status).toBe('failed')
    expect(updates.progress).toBeNull()
  })
})

describe("what's new", () => {
  it('stays silent on a fresh install and tells once after an update', () => {
    startUpdates()
    expect(updates.whatsNew).toEqual([])
    expect(localStorage.getItem('svoya-igra:seen-version')).toBe(APP_VERSION)

    localStorage.setItem('svoya-igra:seen-version', '0.0.1')
    startUpdates()
    expect(updates.justUpdated).toBe(true)
    expect(updates.whatsNew[0].version).toBe(APP_VERSION)
    markSeen()
    expect(updates.whatsNew).toEqual([])
    startUpdates()
    expect(updates.whatsNew).toEqual([])
  })
})
