import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { makeEmptyRound } from '../../game/model'
import RoundStrip from './RoundStrip.vue'


function mountStrip() {
  const rounds = [makeEmptyRound('A', 1), makeEmptyRound('B', 1), makeEmptyRound('C', 1)]
  return mount(RoundStrip, { props: { rounds, modelValue: 0 } })
}

describe('RoundStrip', () => {
  it('emits reorder when a round is dropped on another', async () => {
    const w = mountStrip()
    const pills = w.findAll('.pill')

    await pills[0].trigger('dragstart')
    await pills[2].trigger('drop')

    expect(w.emitted('reorder')).toEqual([[0, 2]])
  })

  it('ignores a drop on the dragged round itself', async () => {
    const w = mountStrip()
    const pills = w.findAll('.pill')

    await pills[1].trigger('dragstart')
    await pills[1].trigger('drop')

    expect(w.emitted('reorder')).toBeUndefined()
  })

  it('keeps the final pill out of dragging', async () => {
    const w = mountStrip()
    const final = w.find('.pill.final')

    expect(final.attributes('draggable')).toBeUndefined()
    await w.findAll('.pill')[0].trigger('dragstart')
    await final.trigger('drop')

    expect(w.emitted('reorder')).toBeUndefined()
  })

  it('selects a round on click', async () => {
    const w = mountStrip()

    await w.findAll('.pill')[1].trigger('click')

    expect(w.emitted('update:modelValue')).toEqual([[1]])
  })
})
