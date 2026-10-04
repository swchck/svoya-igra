import { afterEach, describe, expect, it } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import type { Question } from '../../types'
import { makeEmptyQuestion } from '../../game/model'
import { TooltipProvider } from '../ui/tooltip'
import QuestionDialog from './QuestionDialog.vue'

const MarkdownEditor = defineComponent({ props: { modelValue: { type: String, default: '' }, label: { type: String, default: '' } }, setup: (p) => () => h('div', { class: 'md-stub', 'data-label': p.label }) })

let wrapper: VueWrapper | undefined
afterEach(() => wrapper?.unmount())

async function mountDialog(q: Question = makeEmptyQuestion(100)) {
  const question = ref(q)
  const events: string[] = []
  const Host = defineComponent(() => () =>
    h(TooltipProvider, () =>
      h(QuestionDialog, {
        modelValue: question.value,
        'onUpdate:modelValue': (v: Question) => (question.value = v),
        open: true,
        themeName: 'History',
        hasPrev: true,
        hasNext: true,
        first: false,
        last: false,
        onPrev: () => events.push('prev'),
        onNext: () => events.push('next'),
      }),
    ),
  )
  wrapper = mount(Host, { attachTo: document.body, global: { stubs: { MarkdownEditor } } })
  await flushPromises()
  return { question, events, body: new DOMWrapper(document.body) }
}

describe('QuestionDialog', () => {
  it('picks a preset value', async () => {
    const { question, body } = await mountDialog()

    await body.findAll('.preset').find((b) => b.text() === '500')!.trigger('click')

    expect(question.value.value).toBe(500)
  })

  it('shows the cat price only for cat in a bag', async () => {
    const { body } = await mountDialog()
    expect(body.findAll('.value-input')).toHaveLength(1)

    await body.find('.kind.cat-in-bag').trigger('click')

    expect(body.findAll('.value-input')).toHaveLength(2)
  })

  it('edits question and answer as two columns', async () => {
    const { body } = await mountDialog()

    expect(body.findAll('.col')).toHaveLength(2)
    expect(body.findAll('.md-stub')).toHaveLength(2)
  })

  it('steps with Alt+arrows outside a text field only', async () => {
    const { events, body } = await mountDialog()

    await body.find('.col-title').trigger('keydown', { key: 'ArrowRight', altKey: true })
    await body.find('.value-input input').trigger('keydown', { key: 'ArrowLeft', altKey: true })
    await body.find('.value-input input').trigger('keydown', { key: 'ArrowLeft', altKey: true, ctrlKey: true })

    expect(events).toEqual(['next', 'prev'])
  })
})
