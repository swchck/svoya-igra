import { reactive } from 'vue'
import { isMainWindow } from '@/platform'

const DONE_KEY = 'svoya-igra:tour-done'

/** What the app shell needs to know about the tour; the tour code itself loads only while it runs. */
export const tour = reactive({ active: false, ask: false })

/** Reports whether the tour was finished or dismissed before. */
export function isTourDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1'
  } catch {
    // without storage the tour would nag on every start
    return true
  }
}

function markTourDone(): void {
  try {
    localStorage.setItem(DONE_KEY, '1')
  } catch {
    // not remembered, the tour just shows again next time
  }
}

/** Starts the tour; `ask` makes the first card an invitation that can be declined. */
export function startTour(options: { ask?: boolean } = {}): void {
  tour.ask = !!options.ask
  tour.active = true
}

/** Offers the tour once to someone who has not seen it, in the library window only. */
export function offerTour(): void {
  if (tour.active || !isMainWindow() || isTourDone()) return
  startTour({ ask: true })
}

/** Closes the tour, finished or not, and remembers that it has been seen. */
export function endTour(): void {
  tour.active = false
  markTourDone()
}
