import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTour, type Scene, type TourStep } from './engine'

const SCENES: Record<string, Scene> = {
  dialog: { marker: '#dialog', open: ['#opener'], close: '#dialog .close' },
}

function render(html: string) {
  document.body.insertAdjacentHTML('beforeend', html)
}

function setup(steps: TourStep[], options: { desktop?: boolean; invited?: boolean; onStep?: (step: TourStep) => void } = {}) {
  const onEnd = vi.fn()
  const tour = createTour({ steps, scenes: SCENES, desktop: true, onEnd, waitMs: 120, ...options })
  return { tour, onEnd }
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
      { id: 'one', target: 'a' },
      { id: 'two', target: 'b' },
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
    const { tour, onEnd } = setup([{ id: 'only' }])
    await tour.start()
    expect(tour.isLast.value).toBe(true)
    await tour.next()
    await tour.end()
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(tour.current.value).toBeNull()
  })

  it('does not go back past a step that cannot be undone', async () => {
    const { tour } = setup([
      { id: 'one' },
      { id: 'two', noBack: true },
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
      { id: 'one' },
      { id: 'gone', target: 'missing' },
      { id: 'three', target: 'b' },
    ])
    await tour.start()
    await tour.next()
    expect(tour.current.value?.id).toBe('three')
  })

  it('gives up at once on a step that does not wait', async () => {
    const { tour } = setup([{ id: 'gone', target: 'missing', wait: 0 }, { id: 'two' }])
    const started = Date.now()
    await tour.start()
    expect(tour.current.value?.id).toBe('two')
    expect(Date.now() - started).toBeLessThan(100)
  })

  it('waits for a target that renders late', async () => {
    const { tour } = setup([{ id: 'late', target: 'late' }])
    const started = tour.start()
    setTimeout(() => render('<i data-tour="late"></i>'), 40)
    await started
    expect(tour.current.value?.id).toBe('late')
  })

  it('ignores a target that has no size', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 0, 0))
    render('<i data-tour="hidden"></i>')
    const { tour, onEnd } = setup([{ id: 'hidden', target: 'hidden' }])
    await tour.start()
    expect(onEnd).toHaveBeenCalled()
  })

  it('finishes when every remaining step is missing', async () => {
    const { tour, onEnd } = setup([{ id: 'gone', target: 'missing' }])
    await tour.start()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('stays on the current step when no earlier one can be shown', async () => {
    render('<i data-tour="b"></i>')
    const steps: TourStep[] = [
      { id: 'one', target: 'a' },
      { id: 'two', target: 'b' },
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
    const { tour } = setup([{ id: 'pair', target: ['a', 'b'] }])
    await tour.start()
    expect(tour.current.value?.id).toBe('pair')
  })

  it('leaves out steps for the desktop app on the web', () => {
    const { tour } = setup([{ id: 'one' }, { id: 'phones', desktopOnly: true }, { id: 'three' }], { desktop: false })
    expect(tour.steps.map((s) => s.id)).toEqual(['one', 'three'])
  })

  it('keeps the invitation card only when the tour was offered', () => {
    const steps: TourStep[] = [{ id: 'welcome', invite: true }, { id: 'one' }]
    expect(setup(steps, { invited: true }).tour.steps.map((s) => s.id)).toEqual(['welcome', 'one'])
    expect(setup(steps).tour.steps.map((s) => s.id)).toEqual(['one'])
  })

  it('tells the page which step is being prepared, before waiting for its target', async () => {
    const seen: string[] = []
    const onStep = (step: TourStep) => {
      seen.push(step.id)
      if (step.id === 'two') render('<i data-tour="b"></i>')
    }
    const { tour } = setup([{ id: 'one' }, { id: 'two', target: 'b' }], { onStep })
    await tour.start()
    await tour.next()
    expect(seen).toEqual(['one', 'two'])
    expect(tour.current.value?.id).toBe('two')
  })

  it('opens a scene by clicking its opener and closes it for steps that do not need it', async () => {
    render('<button id="opener" data-tour="cell"></button><i data-tour="in"></i><i data-tour="out"></i>')
    document.getElementById('opener')!.addEventListener('click', () => {
      render('<div id="dialog"><button class="close"></button></div>')
      document.querySelector('#dialog .close')!.addEventListener('click', () => document.getElementById('dialog')?.remove())
    })
    const { tour } = setup([
      { id: 'in', target: 'in', scene: 'dialog' },
      { id: 'out', target: 'out' },
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
      { id: 'in', target: 'in', scene: 'dialog' },
      { id: 'out', target: 'out' },
    ])
    await tour.start()
    expect(tour.current.value?.id).toBe('out')
  })

  it('moves on by itself after the highlighted element is clicked', async () => {
    render('<button data-tour="go"></button><i data-tour="next"></i>')
    const { tour } = setup([
      { id: 'go', target: 'go', click: true },
      { id: 'next', target: 'next' },
    ])
    await tour.start()
    document.querySelector<HTMLElement>('[data-tour="go"]')!.click()
    await vi.waitFor(() => expect(tour.current.value?.id).toBe('next'))
  })

  it('does not advance on a click once the step has changed', async () => {
    render('<button data-tour="go"></button><i data-tour="a"></i><i data-tour="b"></i>')
    const { tour } = setup([
      { id: 'go', target: 'go', click: true },
      { id: 'a', target: 'a' },
      { id: 'b', target: 'b' },
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
      { id: 'one', target: 'a' },
      { id: 'two' },
    ])
    await tour.start()
    await tour.end()
    await tour.end()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('drops a slow move when the tour ends meanwhile', async () => {
    const { tour, onEnd } = setup([
      { id: 'one' },
      { id: 'two', target: 'never' },
    ])
    await tour.start()
    const moving = tour.next()
    await tour.end()
    await moving
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(tour.current.value).toBeNull()
  })
})
