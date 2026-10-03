import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { makeEmptyGame } from '@/game/model'
import { listSnapshots, type Snapshot } from '@/history'
import HistoryDialog from './HistoryDialog.vue'

vi.mock('@/history', () => ({ listSnapshots: vi.fn() }))

const snap = (id: string, minutesAgo: number, reason: Snapshot['reason'] = 'auto'): Snapshot => ({
  id, gameId: 'g', createdAt: Date.now() - minutesAgo * 60_000, reason, game: makeEmptyGame(), rounds: 2, questions: 45, media: [],
})

let wrapper: VueWrapper
beforeEach(() => {
  vi.mocked(listSnapshots).mockReset()
})
afterEach(() => wrapper?.unmount())

async function openDialog() {
  wrapper = mount(HistoryDialog, { props: { gameId: 'g', open: false }, attachTo: document.body })
  await wrapper.setProps({ open: true })
  await flushPromises()
  return new DOMWrapper(document.body)
}

describe('HistoryDialog', () => {
  it('lists snapshots in the given order with relative time, reason and summary', async () => {
    vi.mocked(listSnapshots).mockResolvedValue([snap('a', 3, 'before-delete'), snap('b', 125, 'open')])

    const body = await openDialog()

    const rows = body.findAll('.row')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('3 минуты назад')
    expect(rows[0].text()).toContain('Перед удалением')
    expect(rows[0].text()).toContain('2 раунда, 45 вопросов')
    expect(rows[1].text()).toContain('2 часа назад')
    expect(listSnapshots).toHaveBeenCalledWith('g')
  })

  it('emits the chosen snapshot on restore', async () => {
    const second = snap('b', 20)
    vi.mocked(listSnapshots).mockResolvedValue([snap('a', 1), second])

    const body = await openDialog()
    await body.findAll('.row')[1].find('button').trigger('click')

    expect(wrapper.emitted('restore')?.[0]).toEqual([second])
  })

  it('shows an empty state', async () => {
    vi.mocked(listSnapshots).mockResolvedValue([])
    expect((await openDialog()).text()).toContain('Копий пока нет')
  })

  it('shows a readable error when the history cannot be read', async () => {
    vi.mocked(listSnapshots).mockImplementation(async () => {
      throw new Error('boom')
    })
    const body = await openDialog()
    expect(body.find('[role=alert]').text()).toContain('Не удалось прочитать историю')
  })

  it('reads again on every open', async () => {
    vi.mocked(listSnapshots).mockResolvedValue([snap('a', 1)])
    await openDialog()
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    expect(listSnapshots).toHaveBeenCalledTimes(2)
  })
})
