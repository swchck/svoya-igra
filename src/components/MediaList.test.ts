import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import type { MediaItem } from '../types'
import MediaList from './MediaList.vue'
import MediaPicker from './MediaPicker.vue'
import { TooltipProvider } from './ui/tooltip'

const item = (p: Partial<MediaItem> = {}): MediaItem => ({ id: 'mi_1', url: '', kind: 'image', ...p })

describe('MediaPicker', () => {
  it('emits a single complete item when a URL is typed', async () => {
    const w = mount(MediaPicker, { props: { modelValue: item() } })

    await w.find('input[name=media-url]').setValue('https://example.com/a.mp3')

    const events = w.emitted('update:modelValue')!
    expect(events).toHaveLength(1)
    expect(events[0][0]).toMatchObject({ id: 'mi_1', url: 'https://example.com/a.mp3', kind: 'audio' })
  })

  it('switches YouTube links to video mode by default', async () => {
    const w = mount(MediaPicker, { props: { modelValue: item() } })

    await w.find('input[name=media-url]').setValue('https://youtu.be/O4SacSbp-Rc')

    expect(w.emitted('update:modelValue')![0][0]).toMatchObject({ kind: 'youtube', mode: 'video' })
  })

  it('emits a single item for a picked file', async () => {
    const w = mount(MediaPicker, { props: { modelValue: item() } })
    const input = w.find('input[type=file]')
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    Object.defineProperty(input.element, 'files', { value: [file] })

    await input.trigger('change')
    // storing the file is async, so wait for the emit rather than for a guessed delay
    await vi.waitFor(() => expect(w.emitted('update:modelValue')).toBeTruthy())

    const events = w.emitted('update:modelValue')!
    expect(events).toHaveLength(1)
    expect(events[0][0]).toMatchObject({ kind: 'image', url: expect.stringMatching(/^media:\/\//) })
  })
})

describe('MediaList', () => {
  it('keeps the typed URL through the parent v-model', async () => {
    const model = ref<MediaItem[] | undefined>([item()])
    const Host = defineComponent(() => () =>
      h(TooltipProvider, () =>
        h(MediaList, { modelValue: model.value, 'onUpdate:modelValue': (v?: MediaItem[]) => { model.value = v } }),
      ),
    )
    const w = mount(Host)

    await w.find('input[name=media-url]').setValue('https://example.com/pic.png')
    await flushPromises()

    expect(model.value).toEqual([item({ url: 'https://example.com/pic.png', kind: 'image' })])
    expect(w.find('.preview img').exists()).toBe(true)
  })
})
