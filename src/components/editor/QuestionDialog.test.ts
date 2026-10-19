import { afterEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import type { Question } from '../../types'
import { makeEmptyQuestion } from '../../game/model'
import { TooltipProvider } from '../ui/tooltip'
import QuestionDialog from './QuestionDialog.vue'

// the real editor loads lazily and brings a whole rich-text engine; a stub stands in for it
vi.mock('@/components/markdownEditorLoader', async () => {
  const { defineComponent, h } = await import('vue')
  const LazyMarkdownEditor = defineComponent({
    props: { modelValue: { type: String, default: '' }, label: { type: String, default: '' } },
    setup: (p) => () => h('div', { class: 'md-stub', 'data-label': p.label }),
  })
  return { LazyMarkdownEditor, preloadMarkdownEditor: () => {} }
})

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
  wrapper = mount(Host, { attachTo: document.body })
  await flushPromises()
  return { question, events, body: new DOMWrapper(document.body) }
}

describe('QuestionDialog', () => {
  it('picks a preset value from the value menu', async () => {
    const { question, body } = await mountDialog()

    await body.find('[aria-label="Обычные стоимости"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await body.findAll('.preset-item').find((b) => b.text() === '500')!.trigger('click')

    expect(question.value.value).toBe(500)
  })

  it('switches the kind from its menu and shows the cat price only for cat in a bag', async () => {
    const { question, body } = await mountDialog()
    expect(body.findAll('.value-input')).toHaveLength(1)

    await body.find('.kind-pick').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await body.findAll('[role="menuitemradio"]').find((b) => b.text().includes('Кот в мешке'))!.trigger('click')
    await flushPromises()

    expect(question.value.kind).toBe('cat-in-bag')
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
