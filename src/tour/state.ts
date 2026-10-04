import { reactive } from 'vue'

/** The screens that have a tour. */
export type TourId = 'home' | 'editor' | 'stage' | 'host'

/** What the host console pretends is happening while its tour runs. */
export type DemoPhase = 'board' | 'question' | 'answer'

const LEGACY_HOME_KEY = 'svoya-igra:tour-done'
const doneKey = (id: TourId) => `svoya-igra:tour:${id}`

/** What the app shell needs to know about the tour; the tour code itself loads only while it runs. */
export const tour = reactive({ active: false, id: 'home' as TourId, ask: false, demo: null as DemoPhase | null })

/** Reports whether a tour was finished or dismissed before. */
export function isTourDone(id: TourId): boolean {
  try {
    return localStorage.getItem(doneKey(id)) === '1' || (id === 'home' && localStorage.getItem(LEGACY_HOME_KEY) === '1')
  } catch {
    // without storage the tour would nag on every start
    return true
  }
}

function markTourDone(id: TourId): void {
  try {
    localStorage.setItem(doneKey(id), '1')
  } catch {
    // not remembered, the tour just shows again next time
  }
}

/** Starts a tour; `ask` makes the first card an invitation that can be declined. */
export function startTour(id: TourId, options: { ask?: boolean } = {}): void {
  tour.id = id
  tour.ask = !!options.ask
  tour.demo = null
  tour.active = true
}

/** Shows a tour once to someone who has not seen it. */
export function offerTour(id: TourId, options: { ask?: boolean } = {}): void {
  if (tour.active || isTourDone(id)) return
  startTour(id, options)
}

/** Closes a tour, finished or not, and remembers that it has been seen. */
export function endTour(id: TourId = tour.id): void {
  markTourDone(id)
  if (tour.id !== id) return
  tour.active = false
  tour.demo = null
}
