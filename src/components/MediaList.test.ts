import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import type { MediaItem } from '../types'
import MediaList from './MediaList.vue'
import MediaPicker from './MediaPicker.vue'

const item = (p: Partial<MediaItem> = {}): MediaItem => ({ id: 'mi_1', url: '', kind: 'image', ...p })

describe('MediaPicker', () => {
  it('emits a single complete item when a URL is typed', async () => {
    const w = mount(MediaPicker, { props: { modelValue: item() } })

    await w.find('input.si-input').setValue('https://example.com/a.mp3')

    const events = w.emitted('update:modelValue')!
    expect(events).toHaveLength(1)
    expect(events[0][0]).toMatchObject({ id: 'mi_1', url: 'https://example.com/a.mp3', kind: 'audio' })
  })

  it('switches YouTube links to video mode by default', async () => {
    const w = mount(MediaPicker, { props: { modelValue: item() } })

    await w.find('input.si-input').setValue('https://youtu.be/O4SacSbp-Rc')

    expect(w.emitted('update:modelValue')![0][0]).toMatchObject({ kind: 'youtube', mode: 'video' })
  })

  it('emits a single item for a picked file', async () => {
    const w = mount(MediaPicker, { props: { modelValue: item() } })
    const input = w.find('input[type=file]')
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    Object.defineProperty(input.element, 'files', { value: [file] })

    await input.trigger('change')
    await new Promise((r) => setTimeout(r, 10))

    const events = w.emitted('update:modelValue')!
    expect(events).toHaveLength(1)
    expect((events[0][0] as MediaItem).url).toMatch(/^data:image\/png;base64,/)
  })
})

describe('MediaList', () => {
  it('keeps the typed URL through the parent v-model', async () => {
    const model = ref<MediaItem[] | undefined>([item()])
    const Host = defineComponent(() => () =>
      h(MediaList, { modelValue: model.value, 'onUpdate:modelValue': (v?: MediaItem[]) => { model.value = v } }),
    )
    const w = mount(Host)

    await w.find('input.si-input').setValue('https://example.com/pic.png')
    await flushPromises()

    expect(model.value).toEqual([item({ url: 'https://example.com/pic.png', kind: 'image' })])
    expect(w.find('.preview img').exists()).toBe(true)
  })
})
