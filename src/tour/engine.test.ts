import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTour, type Page, type Scene, type TourHost, type TourStep } from './engine'

const SCENES: Record<string, Scene> = {
  dialog: { marker: '#dialog', open: ['#opener'], close: '#dialog .close' },
}

function render(html: string) {
  document.body.insertAdjacentHTML('beforeend', html)
}

function makeHost(page: Page = 'home', overrides: Partial<TourHost> = {}) {
  let at: Page | null = page
  const host = {
    page: vi.fn(() => at),
    goTo: vi.fn(async (to: Page) => {
      at = to
      return true
    }),
    ensureGame: vi.fn(async () => true),
    finish: vi.fn(async () => {}),
    ...overrides,
  }
  return host
}

function setup(steps: TourStep[], host = makeHost(), desktop = true) {
  const onEnd = vi.fn()
  const tour = createTour({ steps, scenes: SCENES, host, desktop, onEnd, waitMs: 120 })
  return { tour, host, onEnd }
}

beforeEach(() => {
  // happy-dom lays nothing out, so every element gets a size
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 10, 10))
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('createTour', () => {
  it('shows the first step and moves forward and back', async () => {
    render('<i data-tour="a"></i><i data-tour="b"></i>')
    const { tour } = setup([
      { id: 'one', page: 'home', target: 'a' },
      { id: 'two', page: 'home', target: 'b' },
    ])
    await tour.start()
    expect(tour.current.value?.id).toBe('one')
    await tour.next()
    expect(tour.current.value?.id).toBe('two')
    expect(tour.canBack.value).toBe(true)
    await tour.back()
    expect(tour.current.value?.id).toBe('one')
    expect(tour.canBack.value).toBe(false)
  })

  it('ends after the last step, telling the host once', async () => {
    const { tour, host, onEnd } = setup([{ id: 'only', page: 'home' }])
    await tour.start()
    expect(tour.isLast.value).toBe(true)
    await tour.next()
    await tour.end()
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(host.finish).toHaveBeenCalledTimes(1)
    expect(tour.current.value).toBeNull()
  })

  it('does not go back past a step that cannot be undone', async () => {
    const { tour } = setup([
      { id: 'one', page: 'home' },
      { id: 'two', page: 'home', noBack: true },
    ])
    await tour.start()
    await tour.next()
    expect(tour.canBack.value).toBe(false)
    await tour.back()
    expect(tour.current.value?.id).toBe('two')
  })

  it('skips a step whose target never renders', async () => {
    render('<i data-tour="b"></i>')
    const { tour } = setup([
      { id: 'one', page: 'home' },
      { id: 'gone', page: 'home', target: 'missing' },
      { id: 'three', page: 'home', target: 'b' },
    ])
    await tour.start()
    await tour.next()
    expect(tour.current.value?.id).toBe('three')
  })

  it('waits for a target that renders late', async () => {
    const { tour } = setup([{ id: 'late', page: 'home', target: 'late' }])
    const started = tour.start()
    setTimeout(() => render('<i data-tour="late"></i>'), 40)
    await started
    expect(tour.current.value?.id).toBe('late')
  })

  it('ignores a target that has no size', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 0, 0))
    render('<i data-tour="hidden"></i>')
    const { tour, onEnd } = setup([{ id: 'hidden', page: 'home', target: 'hidden' }])
    await tour.start()
    expect(onEnd).toHaveBeenCalled()
  })

  it('finishes when every remaining step is missing', async () => {
    const { tour, onEnd } = setup([{ id: 'gone', page: 'home', target: 'missing' }])
    await tour.start()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('stays on the current step when no earlier one can be shown', async () => {
    render('<i data-tour="b"></i>')
    const steps: TourStep[] = [
      { id: 'one', page: 'home', target: 'a' },
      { id: 'two', page: 'home', target: 'b' },
    ]
    render('<i data-tour="a"></i>')
    const { tour } = setup(steps)
    await tour.start()
    await tour.next()
    document.querySelector('[data-tour="a"]')?.remove()
    await tour.back()
    expect(tour.current.value?.id).toBe('two')
  })

  it('spotlights whichever of several targets is rendered', async () => {
    render('<i data-tour="b"></i>')
    const { tour } = setup([{ id: 'pair', page: 'home', target: ['a', 'b'] }])
    await tour.start()
    expect(tour.current.value?.id).toBe('pair')
  })

  it('leaves out steps for the desktop app on the web', async () => {
    const { tour } = setup(
      [
        { id: 'one', page: 'home' },
        { id: 'phones', page: 'home', desktopOnly: true },
        { id: 'three', page: 'home' },
      ],
      makeHost(),
      false,
    )
    expect(tour.steps.map((s) => s.id)).toEqual(['one', 'three'])
  })

  it('navigates when a step belongs to another page, and skips it when that fails', async () => {
    const host = makeHost('home', { goTo: vi.fn(async (to: Page) => to !== 'play') })
    render('<i data-tour="a"></i>')
    const { tour } = setup(
      [
        { id: 'one', page: 'home' },
        { id: 'stage', page: 'play', target: 'a' },
        { id: 'three', page: 'home', target: 'a' },
      ],
      host,
    )
    await tour.start()
    await tour.next()
    expect(host.goTo).toHaveBeenCalledWith('play')
    expect(tour.current.value?.id).toBe('three')
  })

  it('does not navigate when already on the page', async () => {
    const { tour, host } = setup([{ id: 'one', page: 'home' }])
    await tour.start()
    expect(host.goTo).not.toHaveBeenCalled()
  })

  it('makes sure the sample exists for steps that need it, and skips them without it', async () => {
    render('<i data-tour="card"></i><i data-tour="after"></i>')
    const host = makeHost('home', { ensureGame: vi.fn(async () => false) })
    const { tour } = setup(
      [
        { id: 'card', page: 'home', target: 'card', game: true },
        { id: 'after', page: 'home', target: 'after' },
      ],
      host,
    )
    await tour.start()
    expect(host.ensureGame).toHaveBeenCalled()
    expect(tour.current.value?.id).toBe('after')
  })

  it('opens a scene by clicking its opener and closes it for steps that do not need it', async () => {
    render('<button id="opener" data-tour="cell"></button><i data-tour="in"></i><i data-tour="out"></i>')
    document.getElementById('opener')!.addEventListener('click', () => {
      render('<div id="dialog"><button class="close"></button></div>')
      document.querySelector('#dialog .close')!.addEventListener('click', () => document.getElementById('dialog')?.remove())
    })
    const { tour } = setup([
      { id: 'in', page: 'home', target: 'in', scene: 'dialog' },
      { id: 'out', page: 'home', target: 'out' },
    ])
    await tour.start()
    expect(document.getElementById('dialog')).not.toBeNull()
    await tour.next()
    expect(document.getElementById('dialog')).toBeNull()
    expect(tour.current.value?.id).toBe('out')
    await tour.back()
    expect(document.getElementById('dialog')).not.toBeNull()
  })

  it('skips a step whose scene cannot be opened', async () => {
    render('<i data-tour="in"></i><i data-tour="out"></i>')
    const { tour } = setup([
      { id: 'in', page: 'home', target: 'in', scene: 'dialog' },
      { id: 'out', page: 'home', target: 'out' },
    ])
    await tour.start()
    expect(tour.current.value?.id).toBe('out')
  })

  it('moves on by itself after the highlighted element is clicked', async () => {
    render('<button data-tour="go"></button><i data-tour="next"></i>')
    const { tour } = setup([
      { id: 'go', page: 'home', target: 'go', click: true },
      { id: 'next', page: 'home', target: 'next' },
    ])
    await tour.start()
    document.querySelector<HTMLElement>('[data-tour="go"]')!.click()
    await vi.waitFor(() => expect(tour.current.value?.id).toBe('next'))
  })

  it('does not advance on a click once the step has changed', async () => {
    render('<button data-tour="go"></button><i data-tour="a"></i><i data-tour="b"></i>')
    const { tour } = setup([
      { id: 'go', page: 'home', target: 'go', click: true },
      { id: 'a', page: 'home', target: 'a' },
      { id: 'b', page: 'home', target: 'b' },
    ])
    await tour.start()
    await tour.next()
    document.querySelector<HTMLElement>('[data-tour="go"]')!.click()
    await new Promise((r) => setTimeout(r, 300))
    expect(tour.current.value?.id).toBe('a')
  })

  it('ignores moves while a step is loading and after the tour ended', async () => {
    render('<i data-tour="a"></i>')
    const { tour, onEnd } = setup([
      { id: 'one', page: 'home', target: 'a' },
      { id: 'two', page: 'home' },
    ])
    await tour.start()
    await tour.end()
    await tour.end()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('drops a slow move when the tour ends meanwhile', async () => {
    const { tour, onEnd } = setup([
      { id: 'one', page: 'home' },
      { id: 'two', page: 'home', target: 'never' },
    ])
    await tour.start()
    const moving = tour.next()
    await tour.end()
    await moving
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(tour.current.value).toBeNull()
  })
})
