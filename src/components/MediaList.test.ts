import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import type { MediaItem } from '../types'
import MediaList from './MediaList.vue'
import { TooltipProvider } from './ui/tooltip'

// object URLs and the YouTube iframe have no jsdom-grade behavior to exercise here
vi.mock('@/media/store', async (orig) => ({ ...(await orig<typeof import('@/media/store')>()), displayUrl: vi.fn(async (u: string) => u) }))
vi.mock('@/components/YouTubeEmbed.vue', () => ({ default: { render: () => null } }))

const item = (p: Partial<MediaItem> = {}): MediaItem => ({ id: 'mi_1', url: 'https://example.com/pic.png', kind: 'image', ...p })

function mountList(initial?: MediaItem[]) {
  const model = ref<MediaItem[] | undefined>(initial)
  const Host = defineComponent(() => () =>
    h(TooltipProvider, () =>
      h(MediaList, { modelValue: model.value, 'onUpdate:modelValue': (v?: MediaItem[]) => { model.value = v } }),
    ),
  )
  return { model, w: mount(Host, { attachTo: document.body }) }
}

describe('MediaList', () => {
  it('shows only the add zone while empty', () => {
    const { w } = mountList()
    expect(w.find('.card').exists()).toBe(false)
    expect(w.find('input[name=media-link]').exists()).toBe(false)
    w.unmount()
  })

  it('adds a link as an expanded card with a detected kind', async () => {
    const { model, w } = mountList()

    await w.findAll('button').find((b) => b.text() === 'Ссылка')!.trigger('click')
    await w.find('input[name=media-link]').setValue('https://example.com/a.mp3')
    await w.find('form').trigger('submit')

    expect(model.value).toMatchObject([{ url: 'https://example.com/a.mp3', kind: 'audio' }])
    expect(w.find('.card').attributes('class')).toContain('open')
    w.unmount()
  })

  it('treats a YouTube link as video mode', async () => {
    const { model, w } = mountList()

    await w.findAll('button').find((b) => b.text() === 'Ссылка')!.trigger('click')
    await w.find('input[name=media-link]').setValue('https://youtu.be/O4SacSbp-Rc')
    await w.find('form').trigger('submit')

    expect(model.value).toMatchObject([{ kind: 'youtube', mode: 'video' }])
    w.unmount()
  })

  it('rejects a link that is not http(s)', async () => {
    const { model, w } = mountList()

    await w.findAll('button').find((b) => b.text() === 'Ссылка')!.trigger('click')
    await w.find('input[name=media-link]').setValue('javascript:alert(1)')
    await w.find('form').trigger('submit')

    expect(model.value).toBeUndefined()
    w.unmount()
  })

  it('expands one card at a time and collapses on a second click', async () => {
    const { w } = mountList([item(), item({ id: 'mi_2' })])
    const heads = () => w.findAll('.main')

    await heads()[0].trigger('click')
    expect(w.findAll('.card.open')).toHaveLength(1)
    expect(heads()[0].attributes('aria-expanded')).toBe('true')

    await heads()[1].trigger('click')
    expect(w.findAll('.card.open')).toHaveLength(1)
    expect(heads()[0].attributes('aria-expanded')).toBe('false')

    await heads()[1].trigger('click')
    expect(w.findAll('.card.open')).toHaveLength(0)
    w.unmount()
  })

  it('shows the picture preview for an expanded image', async () => {
    const { w } = mountList([item()])

    await w.find('.main').trigger('click')
    await flushPromises()

    expect(w.find('.image-preview img').exists()).toBe(true)
    w.unmount()
  })

  it('changes the link of an item in a single update and resets its segment', async () => {
    const { model, w } = mountList([item({ url: 'https://example.com/a.mp3', kind: 'audio', start: 5, end: 9 })])

    await w.find('.main').trigger('click')
    await w.findAll('button').find((b) => b.text() === 'Изменить ссылку')!.trigger('click')
    await w.find('input[name=media-url]').setValue('https://example.com/b.webm')
    await w.find('.panel form').trigger('submit')

    expect(model.value).toEqual([{ id: 'mi_1', url: 'https://example.com/b.webm', kind: 'video', mode: undefined, start: undefined, end: undefined }])
    w.unmount()
  })

  it('summarises the segment of a clip on its collapsed card', () => {
    const { w } = mountList([item({ kind: 'audio', url: 'https://example.com/a.mp3', start: 43, end: 58 })])
    expect(w.find('.chip.gold').text()).toBe('0:43 – 0:58')
    w.unmount()
  })

  it('removes a card', async () => {
    const { model, w } = mountList([item(), item({ id: 'mi_2' })])

    await w.find('button[aria-label="Убрать"]').trigger('click')

    expect(model.value?.map((i) => i.id)).toEqual(['mi_2'])
    w.unmount()
  })

  it('clears the model when the last card is removed', async () => {
    const { model, w } = mountList([item()])
    await w.find('button[aria-label="Убрать"]').trigger('click')
    expect(model.value).toBeUndefined()
    w.unmount()
  })

  it('reorders a card dropped below another', async () => {
    const { model, w } = mountList([item(), item({ id: 'mi_2' }), item({ id: 'mi_3' })])
    const cards = w.findAll('.card')
    const slots = w.findAll('.slot')
    const dt = { setData: () => {}, types: ['application/x-media-item'], effectAllowed: '' }

    await cards[0].trigger('dragstart', { dataTransfer: dt })
    // jsdom has no layout, so a click at clientY 0 over a zero-height box lands in the lower half of slot 2
    await slots[2].trigger('dragover', { clientY: 1, dataTransfer: dt })
    await w.find('section').trigger('drop', { dataTransfer: dt })

    expect(model.value?.map((i) => i.id)).toEqual(['mi_2', 'mi_3', 'mi_1'])
    w.unmount()
  })

  it('adds a pasted image file', async () => {
    const { model, w } = mountList()
    const file = new File(['x'], 'a.png', { type: 'image/png' })

    await w.find('.zone').trigger('paste', { clipboardData: { files: [file], getData: () => '' } })
    // storing the file is async, so wait for the model rather than for a guessed delay
    await vi.waitFor(() => expect(model.value).toBeDefined())

    expect(model.value).toMatchObject([{ kind: 'image', url: expect.stringMatching(/^media:\/\//) }])
    w.unmount()
  })

  it('adds a pasted link but leaves paste in a text field alone', async () => {
    const { model, w } = mountList([item()])
    const data = { files: [], getData: () => 'https://example.com/b.png' }

    await w.find('.zone').trigger('paste', { clipboardData: data })
    expect(model.value).toHaveLength(2)

    await w.find('.main').trigger('click')
    await w.findAll('button').find((b) => b.text() === 'Изменить ссылку')!.trigger('click')
    await w.find('input[name=media-url]').trigger('paste', { clipboardData: data })
    expect(model.value).toHaveLength(2)
    w.unmount()
  })

  it('stores a dropped file and ignores unsupported ones', async () => {
    const { model, w } = mountList()
    const files = [new File(['x'], 'a.png', { type: 'image/png' }), new File(['x'], 'a.txt', { type: 'text/plain' })]

    await w.find('section').trigger('drop', { dataTransfer: { types: ['Files'], files } })
    await vi.waitFor(() => expect(model.value).toBeDefined())

    expect(model.value).toHaveLength(1)
    expect(model.value![0].kind).toBe('image')
    w.unmount()
  })
})
