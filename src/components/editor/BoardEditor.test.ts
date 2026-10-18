import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import type { Round } from '../../types'
import { makeEmptyRound } from '../../game/model'
import { TooltipProvider } from '../ui/tooltip'
import BoardEditor from './BoardEditor.vue'

function mountBoard(round: Round) {
  const model = ref(round)
  const selected = ref<string | null>(null)
  const Host = defineComponent(() => () =>
    h(TooltipProvider, () =>
      h(BoardEditor, {
        round: model.value,
        selected: selected.value,
        'onUpdate:selected': (v: string | null) => (selected.value = v),
      }),
    ),
  )
  return { w: mount(Host), model, selected }
}

describe('BoardEditor', () => {
  it('picks questions with Shift-click and changes them all at once', async () => {
    const { w, model, selected } = mountBoard(makeEmptyRound('R', 2))
    const tiles = w.findAll('.tile')
    await tiles[0].trigger('click', { shiftKey: true })
    await tiles[6].trigger('click', { metaKey: true })
    expect(selected.value).toBeNull()
    expect(w.find('.bulk').text()).toContain('2')

    await w.findAll('.bulk button').find((b) => b.text().includes('черновик'))!.trigger('click')
    expect(model.value.themes[0].questions[0].draft).toBe(true)
    expect(model.value.themes[1].questions[1].draft).toBe(true)
    expect(model.value.themes[0].questions[1].draft).toBeUndefined()

    await tiles[0].trigger('click', { shiftKey: true })
    await tiles[3].trigger('click')
    expect(selected.value).toBe(model.value.themes[0].questions[3].id)
    expect(w.find('.bulk').exists()).toBe(false)
  })

  it('walks between cells with the arrow keys', async () => {
    const { w } = mountBoard(makeEmptyRound('R', 2))
    document.body.appendChild(w.element)
    const tiles = w.findAll('.tile')
    await tiles[0].trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tiles[1].element)
    await tiles[1].trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(tiles[6].element)
    await tiles[6].trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(tiles[6].element)
    w.unmount()
  })

  it('moves a question to the cell it is dropped on', async () => {
    const { w, model } = mountBoard(makeEmptyRound('R', 2))
    const ids = model.value.themes[0].questions.map((q) => q.id)
    const tiles = w.findAll('.tile')

    await tiles[0].trigger('dragstart')
    await tiles[2].trigger('drop')

    expect(model.value.themes[0].questions.map((q) => q.id)).toEqual([ids[1], ids[2], ids[0], ids[3], ids[4]])
  })

  it('moves a question into another theme', async () => {
    const { w, model } = mountBoard(makeEmptyRound('R', 2))
    const moved = model.value.themes[0].questions[0].id
    const tiles = w.findAll('.tile')

    await tiles[0].trigger('dragstart')
    await tiles[6].trigger('drop')

    expect(model.value.themes[0].questions).toHaveLength(4)
    expect(model.value.themes[1].questions[1].id).toBe(moved)
  })

  it('selects a clicked cell', async () => {
    const { w, model, selected } = mountBoard(makeEmptyRound('R', 1))

    await w.findAll('.tile')[3].trigger('click')

    expect(selected.value).toBe(model.value.themes[0].questions[3].id)
  })
})
