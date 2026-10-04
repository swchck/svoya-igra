import { computed, shallowRef, ref } from 'vue'
import { findVisible, targetSelector, waitFor, waitGone } from './dom'
import type { DemoPhase } from './state'

/** A piece of UI a step needs on screen, such as a dialog; selectors, not target ids. */
export interface Scene {
  /** Present while the scene is on screen. */
  marker: string
  /** Clicked in order, whichever is present, until the marker shows up. */
  open: string[]
  /** Clicked to dismiss the scene; absent when it cannot be undone. */
  close?: string
}

/** One card of the tour. */
export interface TourStep {
  id: string
  /** `data-tour` ids to spotlight; without one the card sits in the middle. */
  target?: string | string[]
  scene?: string
  /** The step waits for a click on the target; "next" gets there as well. */
  click?: boolean
  /** What the host console pretends is going on while the step shows. */
  demo?: DemoPhase
  /** Only part of the tour when it is offered as an invitation. */
  invite?: boolean
  /** How long to wait for the target, in ms; a short one for UI that is often simply absent. */
  wait?: number
  desktopOnly?: boolean
  /** Going back here is impossible: the session has moved on. */
  noBack?: boolean
}

export interface TourOptions {
  steps: TourStep[]
  scenes: Record<string, Scene>
  desktop: boolean
  /** The tour was offered as an invitation, so it opens with its invitation card. */
  invited?: boolean
  /** Called before each step is prepared. */
  onStep?(step: TourStep): void
  /** Called once when the tour ends, finished or not. */
  onEnd(): void
  /** How long to wait for a target to render, in ms. */
  waitMs?: number
}

const CLICK_ADVANCE_MS = 200

/** Drives the tour: which step is showing, opening scenes, skipping what is missing. */
export function createTour({ steps: all, scenes, desktop, invited = false, onStep, onEnd, waitMs = 3000 }: TourOptions) {
  const steps = all.filter((s) => (desktop || !s.desktopOnly) && (invited || !s.invite))
  const index = ref(0)
  const current = shallowRef<TourStep | null>(null)
  const busy = ref(false)
  // bumped by every move, so a slow one that lost the race stops quietly
  let run = 0
  let detach = () => {}
  let ended = false

  const isLast = computed(() => index.value === steps.length - 1)
  const canBack = computed(() => !busy.value && index.value > 0 && !current.value?.noBack)

  const click = (selector: string) => (findVisible(selector) as HTMLElement | null)?.click()

  async function openScene(scene: Scene): Promise<boolean> {
    for (let attempt = 0; attempt < scene.open.length + 1; attempt++) {
      if (findVisible(scene.marker)) return true
      const selector = scene.open.find((s) => findVisible(s))
      const trigger = selector && (findVisible(selector) as HTMLElement)
      if (!trigger) return !!(await waitFor(scene.marker, waitMs))
      trigger.click()
      // the trigger leaves with its page or goes on to the next one
      await Promise.race([waitFor(scene.marker, waitMs), waitGone(selector, waitMs)])
    }
    return !!findVisible(scene.marker)
  }

  async function alignScene(step: TourStep): Promise<boolean> {
    for (const [id, scene] of Object.entries(scenes)) {
      if (id === step.scene || !scene.close || !findVisible(scene.marker)) continue
      click(scene.close)
      await waitGone(scene.marker, waitMs)
    }
    const wanted = step.scene && scenes[step.scene]
    return !wanted || openScene(wanted)
  }

  // false when the step cannot be shown and should be skipped
  async function prepare(step: TourStep): Promise<boolean> {
    onStep?.(step)
    if (!(await alignScene(step))) return false
    if (!step.target) return true
    const ids = [step.target].flat()
    const found = await Promise.all(ids.map((id) => waitFor(targetSelector(id), step.wait ?? waitMs)))
    return found.some(Boolean)
  }

  function arm(step: TourStep, token: number) {
    if (!step.click || !step.target) return
    const el = findVisible(targetSelector([step.target].flat()[0]))
    if (!el) return
    const onClick = () => setTimeout(() => token === run && void next(), CLICK_ADVANCE_MS)
    el.addEventListener('click', onClick, { once: true })
    detach = () => el.removeEventListener('click', onClick)
  }

  async function show(from: number, direction: 1 | -1) {
    const token = ++run
    detach()
    busy.value = true
    for (let i = from; i >= 0 && i < steps.length; i += direction) {
      const ready = await prepare(steps[i])
      if (token !== run) return
      if (!ready) continue
      index.value = i
      current.value = steps[i]
      busy.value = false
      arm(steps[i], token)
      return
    }
    busy.value = false
    // nothing further to show: finish; nothing earlier: stay put on what was showing
    if (direction === 1) end()
    else if (current.value) await show(index.value, 1)
  }

  /** Shows the first step. */
  function start() {
    return show(0, 1)
  }

  /** Moves on, or ends the tour after the last step. */
  async function next() {
    if (busy.value) return
    if (isLast.value) return end()
    await show(index.value + 1, 1)
  }

  /** Moves to the previous step. */
  async function back() {
    if (canBack.value) await show(index.value - 1, -1)
  }

  /** Stops any move in flight and listeners, leaving the app as it is. */
  function destroy() {
    run++
    detach()
  }

  /** Ends the tour here. */
  function end() {
    if (ended) return
    ended = true
    destroy()
    busy.value = false
    current.value = null
    onEnd()
  }

  return { steps, index, current, busy, isLast, canBack, start, next, back, end, destroy }
}

/** The tour engine. */
export type Tour = ReturnType<typeof createTour>
