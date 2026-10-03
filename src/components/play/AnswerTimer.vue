<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TICK_FROM } from '@/play/sounds'

const { t } = useI18n()
const props = defineProps<{ remainingMs: number; totalMs: number; running: boolean }>()

const RADIUS = 45
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const seconds = computed(() => Math.ceil(props.remainingMs / 1000))
const up = computed(() => props.remainingMs <= 0)
const urgent = computed(() => !up.value && seconds.value <= TICK_FROM)
const offset = computed(() => (up.value ? 0 : CIRCUMFERENCE * (1 - Math.min(1, props.remainingMs / props.totalMs))))
</script>

<template>
  <div
    class="timer"
    :class="{ urgent, up, running, paused: !running && !up && remainingMs < totalMs }"
    role="timer"
    :aria-label="`${t('play.timer.label')}: ${up ? t('play.timer.up') : t('play.timer.seconds', { n: seconds })}`"
  >
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="track" cx="50" cy="50" :r="RADIUS" />
      <circle class="arc" cx="50" cy="50" :r="RADIUS" :stroke-dasharray="CIRCUMFERENCE" :stroke-dashoffset="offset" />
    </svg>
    <span class="num" aria-hidden="true">{{ seconds }}</span>
  </div>
</template>

<style scoped>
.timer {
  --ring: var(--gold);
  position: relative;
  width: var(--timer-size, 96px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: radial-gradient(closest-side, oklch(0.16 0.12 274 / 0.75) 80%, transparent);
  filter: drop-shadow(0 8px 24px oklch(0.05 0.1 280 / 0.8));
}
.timer.urgent,
.timer.up {
  --ring: var(--magenta);
}
svg {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}
circle {
  fill: none;
  stroke-width: 8;
}
.track {
  stroke: oklch(1 0 0 / 0.16);
}
.arc {
  stroke: var(--ring);
  stroke-linecap: round;
  transition: stroke-dashoffset 0.12s linear, stroke 0.3s ease;
}
.num {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: calc(var(--timer-size, 96px) * 0.42);
  line-height: 1;
  color: var(--ring);
  text-shadow: 0 0 18px color-mix(in oklch, var(--ring) 55%, transparent);
  font-variant-numeric: tabular-nums;
}
.paused .num {
  opacity: 0.65;
}
.urgent.running .num {
  animation: beat 1s ease-in-out infinite;
}
.up {
  animation: alarm 0.6s ease-in-out 3;
}
@keyframes beat {
  50% { transform: scale(1.18); }
}
@keyframes alarm {
  50% { transform: scale(1.12); }
}
@media (prefers-reduced-motion: reduce) {
  .urgent.running .num, .up { animation: none; }
  .arc { transition: none; }
}
</style>
