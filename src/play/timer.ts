import { computed, onScopeDispose, ref, watch, type ComputedRef } from 'vue'
import { timerRemaining, type TimerState } from '@/composables/usePlaySession'

const TICK_MS = 100

/** Milliseconds left on the answer clock, refreshed ten times a second while it runs. */
export function useRemaining(timer: () => TimerState): ComputedRef<number> {
  const now = ref(Date.now())
  let interval: ReturnType<typeof setInterval> | undefined
  watch(
    () => timer().endsAt,
    (endsAt) => {
      clearInterval(interval)
      now.value = Date.now()
      if (endsAt === null) return
      interval = setInterval(() => {
        now.value = Date.now()
        if (now.value >= endsAt) clearInterval(interval)
      }, TICK_MS)
    },
    { immediate: true },
  )
  onScopeDispose(() => clearInterval(interval))
  return computed(() => timerRemaining(timer(), now.value))
}
