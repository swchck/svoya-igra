import { afterEach, describe, expect, it } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import type { Issue } from '@/game/validate'
import IssuesDialog from './IssuesDialog.vue'

const base = { roundId: 'r1', roundName: 'Раунд 1', themeId: 't1', themeName: 'Кино' }
const q = (id: string, value: number, extra: Partial<Issue> = {}): Issue => ({
  code: 'empty-question', severity: 'error', ...base, questionId: id, value, ...extra,
})

let wrapper: VueWrapper
afterEach(() => wrapper?.unmount())

async function show(issues: Issue[]) {
  wrapper = mount(IssuesDialog, { props: { issues, open: true }, attachTo: document.body })
  await flushPromises()
  return new DOMWrapper(document.body)
}

describe('IssuesDialog', () => {
  it('says so when there is nothing to fix', async () => {
    const body = await show([])
    expect(body.text()).toContain('Проблем не найдено')
  })

  it('counts severities and folds one problem across a theme into a row of values', async () => {
    const body = await show([q('a', 100), q('b', 200), q('c', 300, { code: 'no-answer', severity: 'warning' })])

    expect(body.text()).toContain('2 ошибки, 1 предупреждение')
    expect(body.findAll('.entry')).toHaveLength(2)
    expect(body.findAll('.chip').map((c) => c.text())).toEqual(['100', '200', '300'])
  })

  it('groups by round and puts the final last under its own title', async () => {
    const body = await show([
      q('a', 100),
      { code: 'no-question', severity: 'error', roundId: 'r2', roundName: 'Раунд 2', themeId: 't9', themeName: 'Спорт', questionId: 'z', value: 500 },
      { code: 'no-answer', severity: 'warning', final: true },
    ])

    expect(body.findAll('.group-title').map((h) => h.text().slice(0, -h.find('.count').text().length))).toEqual(['Раунд 1', 'Раунд 2', 'Финал'])
  })

  it('jumps to a question from its value and closes', async () => {
    const body = await show([q('a', 100), q('b', 200)])

    await body.findAll('.chip')[1].trigger('click')

    expect(wrapper.emitted('goto')?.[0][0]).toMatchObject({ questionId: 'b' })
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })

  it('makes a row without a question clickable as a whole, with the problem named for assistive tech', async () => {
    const roundIssue: Issue = { code: 'empty-round', severity: 'error', roundId: 'r1', roundName: 'Раунд 1' }
    const body = await show([roundIssue])

    const row = body.find('button.issue')
    expect(row.text()).toContain('В раунде нет вопросов')
    expect(row.find('.sr-only').text()).toBe('Ошибка:')
    await row.trigger('click')
    expect(wrapper.emitted('goto')?.[0][0]).toEqual(roundIssue)
  })

  it('names the side of a media problem', async () => {
    const body = await show([q('a', 100, { code: 'missing-media', side: 'answer' })])
    expect(body.text()).toContain('Файл не найден в ответе')
  })
})
