<script setup lang="ts">
import { computed } from 'vue'
import { Pause, Play } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { formatTime } from '@/media/segment'

const { t } = useI18n()
const props = defineProps<{
  playing: boolean
  blocked?: boolean
  /** Seconds into the segment and its length; length 0 when unknown. */
  elapsed: number
  length: number
  label: string
  /** Clicks fall through to whatever lies underneath (the hidden YouTube player). */
  passive?: boolean
}>()
defineEmits<{ (e: 'toggle'): void }>()

const BARS = 28
const progress = computed(() => (props.length > 0 ? Math.min(1, props.elapsed / props.length) : 0))
</script>

<template>
  <component
    :is="passive ? 'div' : 'button'"
    class="sound-card"
    :class="{ playing, passive }"
    :aria-label="passive ? undefined : playing ? t('media.player.pause') : t('media.player.play')"
    @click="passive || $emit('toggle')"
  >
    <span class="sound-button" aria-hidden="true">
      <Pause v-if="playing" class="size-8" />
      <Play v-else class="size-8 translate-x-0.5" />
    </span>
    <span class="sound-body">
      <span class="sound-eq" aria-hidden="true">
        <span v-for="i in BARS" :key="i" class="bar" :style="{ '--i': i, '--h': 0.35 + ((i * 37) % 11) / 16 }" />
      </span>
      <span class="sound-meta">
        <span class="sound-label">{{ blocked ? t('media.player.tapToUnmute') : label }}</span>
        <span v-if="length" class="sound-time">{{ formatTime(elapsed) }} / {{ formatTime(length) }}</span>
      </span>
      <span class="sound-track" aria-hidden="true"><span class="sound-fill" :style="{ width: `${progress * 100}%` }" /></span>
    </span>
  </component>
</template>

<style scoped>
.sound-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(14px, 2vw, 28px);
  width: min(720px, 100%);
  padding: clamp(14px, 2vw, 24px) clamp(18px, 2.4vw, 32px);
  border-radius: 28px;
  background:
    radial-gradient(120% 140% at 0% 0%, color-mix(in oklch, var(--magenta) 32%, transparent), transparent 60%),
    radial-gradient(120% 140% at 100% 100%, color-mix(in oklch, var(--cyan) 26%, transparent), transparent 60%),
    var(--night);
  border: 1px solid color-mix(in oklch, var(--gold) 35%, transparent);
  box-shadow: 0 24px 60px -24px oklch(0.1 0.15 280 / 0.9), inset 0 1px 0 oklch(1 0 0 / 0.08);
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
}
.sound-card.passive {
  pointer-events: none;
}
.sound-button {
  flex: none;
  display: grid;
  place-items: center;
  width: clamp(56px, 6vw, 84px);
  aspect-ratio: 1;
  border-radius: 999px;
  background: var(--gold);
  color: var(--night);
  box-shadow: 0 0 0 0 color-mix(in oklch, var(--gold) 60%, transparent);
  transition: transform 0.2s ease;
}
.sound-card:not(.passive):hover .sound-button {
  transform: scale(1.06);
}
.playing .sound-button {
  animation: pulse 1.6s ease-out infinite;
}
.sound-body {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 10px;
}
.sound-eq {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: clamp(40px, 6vh, 64px);
}
.bar {
  flex: 1;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(to top, var(--magenta), var(--gold));
  transform-origin: bottom;
  transform: scaleY(0.12);
  transition: transform 0.4s ease;
}
.playing .bar {
  animation: eq calc(0.6s + var(--h) * 0.5s) ease-in-out calc(var(--i) * -0.07s) infinite alternate;
}
.sound-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-family: var(--font-display);
  font-size: clamp(16px, 1.6vw, 22px);
  letter-spacing: 0.03em;
}
.sound-label {
  color: var(--gold);
}
.sound-time {
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
.sound-track {
  height: 4px;
  border-radius: 2px;
  background: oklch(1 0 0 / 0.12);
  overflow: hidden;
}
.sound-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--cyan), var(--gold));
  transition: width 0.25s linear;
}
@keyframes eq {
  from { transform: scaleY(0.15); }
  to { transform: scaleY(var(--h)); }
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--gold) 55%, transparent); }
  100% { box-shadow: 0 0 0 22px transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .playing .bar { animation: none; transform: scaleY(var(--h)); }
  .playing .sound-button { animation: none; }
}
</style>
