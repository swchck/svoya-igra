import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ConfirmHost from './ConfirmHost.vue'
import { confirmAction } from '@/composables/useConfirm'

async function ask() {
  const w = mount(ConfirmHost, { attachTo: document.body })
  const answer = confirmAction({ title: 'Удалить?', confirmLabel: 'Удалить', cancelLabel: 'Оставить' })
  await flushPromises()
  const button = (label: string) =>
    [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!
  return { w, answer, button }
}

const wait = () => new Promise((r) => setTimeout(r, 10))

describe('ConfirmHost', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('resolves true when the action is clicked', async () => {
    const { w, answer, button } = await ask()
    button('Удалить').click()
    await wait()
    expect(await answer).toBe(true)
    w.unmount()
  })

  it('resolves false when cancelled', async () => {
    const { w, answer, button } = await ask()
    button('Оставить').click()
    await wait()
    expect(await answer).toBe(false)
    w.unmount()
  })
})
