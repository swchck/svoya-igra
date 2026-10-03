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
