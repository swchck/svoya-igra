<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { prefersReducedMotion } from '@/lib/motion'

const props = defineProps<{ value: number; ms?: number }>()
const shown = ref(props.value)
let frame = 0

watch(
  () => props.value,
  (to, from) => {
    cancelAnimationFrame(frame)
    if (prefersReducedMotion()) {
      shown.value = to
      return
    }
    const begin = performance.now()
    const span = props.ms ?? 700
    const tick = (now: number) => {
      const t = Math.min(1, (now - begin) / span)
      const eased = 1 - (1 - t) ** 3
      shown.value = Math.round(from + (to - from) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
  },
)
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <span class="tabular-nums">{{ shown }}</span>
</template>
