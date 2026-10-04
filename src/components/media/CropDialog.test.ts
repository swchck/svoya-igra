import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import type { MediaItem } from '@/types'
import { getMedia, putMedia } from '@/media/store'
import { IMAGE_LEVELS, optimizeImage } from '@/media/optimize'
import { cropBlob } from '@/media/crop'
import CropDialog from './CropDialog.vue'

vi.mock('@/media/store', () => ({ getMedia: vi.fn(), putMedia: vi.fn() }))
vi.mock('@/media/optimize', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/media/optimize')>()), optimizeImage: vi.fn() }))
vi.mock('@/media/crop', async (orig) => ({ ...(await orig<typeof import('@/media/crop')>()), cropBlob: vi.fn() }))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }))

const item: MediaItem = { id: 'mi', url: 'media://m1', kind: 'image' }
let wrapper: VueWrapper

beforeEach(() => {
  vi.mocked(getMedia).mockReset()
  vi.mocked(putMedia).mockReset().mockResolvedValue('media://m2')
  vi.mocked(optimizeImage).mockReset().mockImplementation(async (b) => b)
  vi.mocked(cropBlob).mockReset().mockResolvedValue(new Blob(['cut'], { type: 'image/png' }))
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => wrapper?.unmount())

/** Opens the dialog on a 1000x500 picture, as the browser would report it after loading. */
async function openDialog(blob: Blob | null = new Blob(['x'], { type: 'image/png' })) {
  vi.mocked(getMedia).mockResolvedValue(blob)
  wrapper = mount(CropDialog, { props: { item, open: true }, attachTo: document.body })
  await flushPromises()
  const body = new DOMWrapper(document.body)
  if (!blob) return body
  const img = body.find('img').element as HTMLImageElement
  Object.defineProperty(img, 'naturalWidth', { value: 1000 })
  Object.defineProperty(img, 'naturalHeight', { value: 500 })
  await body.find('img').trigger('load')
  return body
}

const size = (body: DOMWrapper<HTMLElement>) => body.find('.size').text()
const button = (body: DOMWrapper<HTMLElement>, name: string) => body.findAll('button').find((b) => b.text() === name)!

describe('CropDialog', () => {
  it('starts with a box on 80% of the picture', async () => {
    expect(size(await openDialog())).toBe('800 × 400')
  })

  it('tells when the picture cannot be opened', async () => {
    const body = await openDialog(null)
    expect(body.find('[role=alert]').exists()).toBe(true)
    expect(body.find('.box').exists()).toBe(false)
    expect(button(body, 'Обрезать').attributes('disabled')).toBeDefined()
  })

  it('moves the box and resizes it from the keyboard', async () => {
    const body = await openDialog()
    const box = body.find('.box')

    await box.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    expect(size(body)).toBe('810 × 400')

    await box.trigger('keydown', { key: 'ArrowLeft', shiftKey: true, altKey: true })
    expect(size(body)).toBe('809 × 400')

    await box.trigger('keydown', { key: 'ArrowDown' })
    expect(size(body)).toBe('809 × 400')
    expect(box.attributes('style')).toContain('top: 12%')
  })

  it('reshapes the box to a preset ratio', async () => {
    const body = await openDialog()

    await button(body, '1:1').trigger('click')

    const [w, h] = size(body).split(' × ').map(Number)
    expect(w).toBe(h)
    expect(body.find('[role=group][aria-label]').exists()).toBe(true)
  })

  it('stores the cut picture and hands its URL back', async () => {
    const body = await openDialog()

    await button(body, 'Обрезать').trigger('click')
    await flushPromises()

    expect(cropBlob).toHaveBeenCalledWith(expect.any(Blob), { x: 100, y: 50, w: 800, h: 400 })
    expect(optimizeImage).toHaveBeenCalledWith(expect.any(Blob), IMAGE_LEVELS.normal)
    expect(wrapper.emitted('apply')).toEqual([['media://m2']])
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('keeps the dialog open and reports when cutting fails', async () => {
    const { toast } = await import('vue-sonner')
    vi.mocked(cropBlob).mockRejectedValue(new Error('no canvas'))
    const body = await openDialog()

    await button(body, 'Обрезать').trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalled()
    expect(wrapper.emitted('apply')).toBeUndefined()
    expect(button(body, 'Обрезать').attributes('disabled')).toBeUndefined()
  })

  it('warns that an animation keeps one frame', async () => {
    const body = await openDialog(new Blob(['x'], { type: 'image/gif' }))
    expect(body.find('.note').exists()).toBe(true)
  })

  it('releases the object URL on close', async () => {
    await openDialog()
    wrapper.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})
