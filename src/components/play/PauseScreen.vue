<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Coffee, Pause as PauseIcon, Play } from '@lucide/vue'
import type { Player } from '@/types'
import type { Pause } from '@/composables/usePlaySession'
import type { LanInfo } from '@/play/lan'
import { playerColor } from '@/play/palette'
import { Button } from '@/components/ui/button'
import LanQr from '@/components/lan/LanQr.vue'

const props = defineProps<{
  pause: Pause
  players: Player[]
  /** The phone room, so latecomers can join from the QR code. */
  lan?: LanInfo | null
  /** The stage runs the game itself and needs its own button to go on. */
  controls?: boolean
}>()
defineEmits<{ (e: 'resume'): void }>()
const { t } = useI18n()

const root = ref<HTMLElement>()
// focus leaves the stage's chrome underneath, which the overlay covers
onMounted(() => root.value?.focus())

const now = ref(Date.now())
const tick = setInterval(() => (now.value = Date.now()), 500)
onScopeDispose(() => clearInterval(tick))

const left = computed(() => (props.pause.until === null ? null : Math.max(0, props.pause.until - now.value)))
const clock = computed(() => {
  const s = Math.ceil((left.value ?? 0) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})
const ranking = computed(() =>
  props.players
    .map((p, i) => ({ p, color: playerColor(p, i) }))
    .sort((a, b) => b.p.score - a.p.score),
)
</script>

<template>
  <div ref="root" class="pause-screen" tabindex="-1" role="dialog" aria-modal="true" :aria-label="pause.until === null ? t('play.pause.title') : t('play.pause.breakTitle')">
    <component :is="pause.until === null ? PauseIcon : Coffee" class="icon" aria-hidden="true" />
    <h2 class="title-shine heading">{{ pause.until === null ? t('play.pause.title') : t('play.pause.breakTitle') }}</h2>
    <p v-if="left !== null" class="clock" :class="{ over: left === 0 }" role="timer">
      {{ left > 0 ? clock : t('play.pause.breakOver') }}
    </p>
    <div class="body">
      <ol class="ranking" :aria-label="t('play.pause.score')">
        <li v-for="({ p, color }, i) in ranking" :key="p.id" :style="{ '--pc': color }">
          <span class="place">{{ i + 1 }}</span>
          <span class="name">{{ p.avatar }} {{ p.name }}</span>
          <span class="score">{{ p.score }}</span>
        </li>
      </ol>
      <LanQr v-if="lan && pause.until !== null" class="qr" :url="lan.url" :code="lan.code" :caption="t('play.pause.join')" />
    </div>
    <Button v-if="controls" size="lg" class="h-12 px-8 text-lg" @click="$emit('resume')"><Play />{{ t('play.pause.resume') }}</Button>
  </div>
</template>

<style scoped>
.pause-screen {
  outline: none;
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 2.4vh, 26px);
  padding: 4vh 4vw;
  background: var(--scrim);
  backdrop-filter: blur(12px);
  text-align: center;
}
.icon {
  width: clamp(56px, 9vh, 110px);
  height: auto;
  color: var(--gold);
}
.heading {
  margin: 0;
  font-family: var(--font-display);
  font-size: calc(clamp(36px, 6vw, 96px) * var(--stage-scale, 1));
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.clock {
  margin: 0;
  font-family: var(--font-display);
  font-size: calc(clamp(48px, 10vw, 160px) * var(--stage-scale, 1));
  line-height: 1;
  color: var(--cyan);
  font-variant-numeric: tabular-nums;
}
.clock.over {
  font-size: calc(clamp(28px, 4vw, 64px) * var(--stage-scale, 1));
  color: var(--gold);
}
.body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: clamp(16px, 4vw, 64px);
}
.ranking {
  display: grid;
  gap: 8px;
  min-width: min(420px, 80vw);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: calc(clamp(16px, 2vw, 30px) * var(--stage-scale, 1));
}
.ranking li {
  display: grid;
  grid-template-columns: 2em minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 0.35em 0.8em;
  border-radius: 14px;
  border-left: 6px solid var(--pc);
  background: linear-gradient(180deg, var(--tile), var(--tile-deep));
  text-align: left;
}
.place {
  font-family: var(--font-display);
  color: var(--muted-foreground);
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.score {
  font-family: var(--font-display);
  color: var(--gold);
}
.qr {
  max-width: 420px;
}
</style>
