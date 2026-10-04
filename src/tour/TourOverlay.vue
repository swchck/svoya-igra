<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { MousePointerClick } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { prefersReducedMotion } from '@/lib/motion'
import { isDesktop } from '@/platform'
import { useGamesStore } from '@/stores/games'
import { findVisible, targetSelector, unionBox, type Box } from './dom'
import { createTour } from './engine'
import { createTourHost } from './host'
import { placeCard } from './placement'
import { endTour, tour } from './state'
import { TOUR_SCENES, TOUR_STEPS } from './steps'

const { t, te } = useI18n()
const engine = createTour({
  steps: TOUR_STEPS,
  scenes: TOUR_SCENES,
  host: createTourHost(useRouter(), useGamesStore()),
  desktop: isDesktop,
  onEnd: endTour,
})
const { current, index, busy, isLast, canBack } = engine

const HOLE_PADDING = 6
const CARD_WIDTH = 360
const viewport = ref({ width: innerWidth, height: innerHeight })
const target = ref<Box | null>(null)
const cardSize = ref({ width: CARD_WIDTH, height: 220 })
const card = ref<HTMLElement | null>(null)
// transitions start after the first placement, so the spotlight does not fly in from the corner
const animate = ref(false)

const hole = computed<Box | null>(() => {
  const b = target.value
  if (!b) return null
  const left = Math.max(0, b.left - HOLE_PADDING)
  const top = Math.max(0, b.top - HOLE_PADDING)
  return {
    left,
    top,
    width: Math.min(viewport.value.width, b.left + b.width + HOLE_PADDING) - left,
    height: Math.min(viewport.value.height, b.top + b.height + HOLE_PADDING) - top,
  }
})
// without a target the "hole" is a point in the middle, which dims the whole screen
const spot = computed(() => hole.value ?? { left: viewport.value.width / 2, top: viewport.value.height / 2, width: 0, height: 0 })
const px = (b: Box) => ({ left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` })

// only the spotlight is clickable on a step that waits for a click, so the page is blocked around it
const blockers = computed(() => {
  const h = hole.value
  const { width, height } = viewport.value
  if (!current.value?.click || !h) return [{ left: 0, top: 0, width, height }]
  return [
    { left: 0, top: 0, width, height: h.top },
    { left: 0, top: h.top + h.height, width, height: height - h.top - h.height },
    { left: 0, top: h.top, width: h.left, height: h.height },
    { left: h.left + h.width, top: h.top, width: width - h.left - h.width, height: h.height },
  ]
})

const cardSpot = computed(() => {
  const width = Math.min(CARD_WIDTH, viewport.value.width - 24)
  const { left, top } = placeCard(hole.value, { width, height: cardSize.value.height }, viewport.value)
  return { left: `${left}px`, top: `${top}px`, width: `${width}px` }
})

const asking = computed(() => tour.ask && index.value === 0)
const key = computed(() => `tour.steps.${current.value?.id}`)
const title = computed(() => (current.value ? t(`${key.value}.title`) : ''))
const text = computed(() => (current.value ? t(isDesktop && te(`${key.value}.textDesktop`) ? `${key.value}.textDesktop` : `${key.value}.text`) : ''))

let frame = 0
function track() {
  viewport.value = { width: innerWidth, height: innerHeight }
  const ids = [current.value?.target ?? []].flat()
  const box = unionBox(ids.map((id) => findVisible(targetSelector(id))).filter((el): el is Element => !!el))
  const old = target.value
  if (box?.left !== old?.left || box?.top !== old?.top || box?.width !== old?.width || box?.height !== old?.height) target.value = box
  frame = requestAnimationFrame(track)
}

watch(current, async (step) => {
  if (!step) return
  if (step.target) {
    const el = findVisible(targetSelector([step.target].flat()[0]))
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }
  await nextTick()
  card.value?.querySelector<HTMLElement>('[data-primary]')?.focus({ preventScroll: true })
})

const TYPING = 'input, textarea, select, [contenteditable]'
const NATIVE_KEYS = 'button, a, input, textarea, select, [contenteditable]'

function onKeydown(e: KeyboardEvent) {
  const el = e.target instanceof Element ? e.target : null
  const stop = () => {
    e.preventDefault()
    e.stopPropagation()
  }
  if (e.key === 'Escape') {
    stop()
    void engine.end()
  } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.altKey && !e.ctrlKey && !e.metaKey && !el?.closest(TYPING)) {
    stop()
    void (e.key === 'ArrowRight' ? engine.next() : engine.back())
  } else if (!card.value?.contains(el) && !el?.closest(NATIVE_KEYS) && (e.key === ' ' || e.key === 'Enter' || e.code === 'KeyB' || e.code === 'KeyZ')) {
    // the stage's own hotkeys must not play the game while the tour talks about them
    stop()
  }
}

let resize: ResizeObserver | undefined
let opener: Element | null = null

onMounted(() => {
  opener = document.activeElement
  document.documentElement.setAttribute('data-touring', '')
  window.addEventListener('keydown', onKeydown, true)
  resize = new ResizeObserver(([entry]) => {
    cardSize.value = { width: entry.contentRect.width, height: card.value?.offsetHeight ?? entry.contentRect.height }
  })
  if (card.value) resize.observe(card.value)
  track()
  requestAnimationFrame(() => requestAnimationFrame(() => (animate.value = !prefersReducedMotion())))
  void engine.start()
})

onBeforeUnmount(() => {
  engine.destroy()
  cancelAnimationFrame(frame)
  resize?.disconnect()
  window.removeEventListener('keydown', onKeydown, true)
  document.documentElement.removeAttribute('data-touring')
  // the page may have been swapped under the tour, so the restart button is looked up again
  void nextTick(() => {
    const back = opener?.isConnected ? opener : document.querySelector('[data-tour="help"]')
    if (back instanceof HTMLElement && document.activeElement === document.body) back.focus({ preventScroll: true })
  })
})
</script>

<template>
  <Teleport to="body">
    <div class="tour" :class="{ animate }" @pointerdown.stop>
      <div class="spot" :class="{ pulse: current?.click && !busy, bare: !hole }" :style="px(spot)" aria-hidden="true" />
      <div v-for="(b, i) in blockers" :key="i" class="block" :style="px(b)" />
      <section
        ref="card"
        class="card glass"
        :class="{ busy }"
        role="dialog"
        aria-labelledby="tour-title"
        :aria-busy="busy"
        :style="cardSpot"
      >
        <div aria-live="polite" aria-atomic="true">
          <h2 id="tour-title" class="title">{{ title }}</h2>
          <p class="text">{{ text }}</p>
        </div>
        <p v-if="current?.click" class="hint"><MousePointerClick class="size-4" aria-hidden="true" />{{ t('tour.clickHint') }}</p>
        <div class="progress">
          <span class="dots" aria-hidden="true">
            <span v-for="(s, i) in engine.steps" :key="s.id" class="dot" :class="{ on: i === index, past: i < index }" />
          </span>
          <span class="count">{{ t('tour.progress', { n: index + 1, total: engine.steps.length }) }}</span>
        </div>
        <div class="buttons">
          <template v-if="asking">
            <Button variant="ghost" @click="engine.end()">{{ t('tour.later') }}</Button>
            <span class="flex-1" />
            <Button data-primary :disabled="busy" @click="engine.next()">{{ t('tour.show') }}</Button>
          </template>
          <template v-else>
            <Button variant="ghost" size="sm" @click="engine.end()">{{ t('tour.skip') }}</Button>
            <span class="flex-1" />
            <Button v-if="canBack" variant="secondary" size="sm" :disabled="busy" @click="engine.back()">{{ t('tour.back') }}</Button>
            <Button data-primary size="sm" :disabled="busy" @click="engine.next()">{{ isLast ? t('tour.done') : t('tour.next') }}</Button>
          </template>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.tour {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
}
.spot {
  position: fixed;
  border-radius: 14px;
  box-shadow: 0 0 0 100vmax oklch(0.1 0.1 275 / 0.78), 0 0 0 2px var(--gold), 0 0 24px 2px color-mix(in oklch, var(--gold) 45%, transparent);
}
.spot.bare {
  box-shadow: 0 0 0 100vmax oklch(0.1 0.1 275 / 0.78);
}
.spot.pulse {
  animation: tour-pulse 1.6s ease-in-out infinite;
}
.block {
  position: fixed;
  pointer-events: auto;
}
.animate .spot,
.animate .card {
  transition: left 0.35s ease, top 0.35s ease, width 0.35s ease, height 0.35s ease;
}
.card {
  position: fixed;
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 18px;
  pointer-events: auto;
  box-shadow: 0 24px 60px -20px oklch(0.05 0.1 280 / 0.9);
}
.card.busy {
  opacity: 0.75;
}
.title {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--gold);
}
.text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}
.hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  color: var(--cyan);
}
.progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.dots {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: oklch(1 0 0 / 0.25);
}
.dot.past {
  background: color-mix(in oklch, var(--gold) 60%, transparent);
}
.dot.on {
  width: 16px;
  background: var(--gold);
}
.count {
  flex: none;
  font-size: 12px;
  color: var(--muted-foreground);
}
.buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}
@keyframes tour-pulse {
  50% {
    box-shadow: 0 0 0 100vmax oklch(0.1 0.1 275 / 0.78), 0 0 0 4px var(--gold), 0 0 34px 6px color-mix(in oklch, var(--gold) 60%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spot.pulse {
    animation: none;
  }
}
:global(html.reduce-motion) .spot.pulse {
  animation: none;
}
</style>
