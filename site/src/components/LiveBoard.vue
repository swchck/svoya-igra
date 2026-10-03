<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Cat, Gavel, RotateCcw } from '@lucide/vue'
import type { Question } from '@/types'
import BoardGrid from '@/components/play/BoardGrid.vue'
import FitText from '@/components/play/FitText.vue'
import { prefersReducedMotion } from '@/lib/motion'
import { demoRound } from '~site/demo'
import type { Locale } from '@/i18n'

const { t, locale } = useI18n()
const round = computed(() => demoRound(locale.value as Locale))
const played = ref<Record<string, true>>({})
const open = ref<Question | null>(null)
const revealed = ref(false)
const frame = ref<HTMLElement | null>(null)
const card = ref<HTMLElement | null>(null)

const themeOf = (q: Question) => round.value.themes.find((th) => th.questions.some((x) => x.id === q.id))?.name ?? ''
const finished = computed(() => round.value.themes.every((th) => th.questions.every((q) => played.value[q.id])))
const KIND = { auction: { label: 'site.board.auction', icon: Gavel }, 'cat-in-bag': { label: 'site.board.cat', icon: Cat } } as const

// ids are the same in every language, so a language switch keeps which cells were played;
// an open card follows along with its translated twin
watch(round, (r) => {
  if (open.value) open.value = r.themes.flatMap((th) => th.questions).find((q) => q.id === open.value?.id) ?? null
})

function cellRect(q: Question) {
  const cell = frame.value?.querySelector<HTMLElement>(`[data-question-id="${q.id}"]`)
  const box = frame.value?.getBoundingClientRect()
  const r = cell?.getBoundingClientRect()
  return box && r ? { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height, box } : null
}

// the card grows out of the picked cell and shrinks back into it, like on the stage
function fly(q: Question, reverse: boolean) {
  const from = cellRect(q)
  if (!card.value || !from || prefersReducedMotion()) return Promise.resolve()
  const sx = from.w / from.box.width
  const sy = from.h / from.box.height
  const frames = [
    { transform: `translate(${from.x}px, ${from.y}px) scale(${sx}, ${sy})`, opacity: 0.4, borderRadius: '40px' },
    { transform: 'none', opacity: 1, borderRadius: '18px' },
  ]
  return card.value.animate(reverse ? frames.reverse() : frames, {
    duration: reverse ? 320 : 480,
    easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
    fill: 'both',
  }).finished
}

async function pick(q: Question) {
  stopHint()
  open.value = q
  revealed.value = false
  await nextTick()
  await fly(q, false)
}

async function close() {
  const q = open.value
  if (!q) return
  await fly(q, true)
  played.value = { ...played.value, [q.id]: true }
  open.value = null
}

function reset() {
  played.value = {}
}

// until someone clicks, a random cell glows now and then as a hint that the board is live
let hintTimer: ReturnType<typeof setInterval> | undefined
function stopHint() {
  clearInterval(hintTimer)
  frame.value?.querySelector('.hint')?.classList.remove('hint')
}
onMounted(() => {
  if (prefersReducedMotion()) return
  hintTimer = setInterval(() => {
    frame.value?.querySelector('.hint')?.classList.remove('hint')
    const cells = frame.value?.querySelectorAll<HTMLElement>('[data-question-id]:not(:disabled)')
    if (cells?.length) cells[Math.floor(Math.random() * cells.length)].classList.add('hint')
  }, 2200)
})
onBeforeUnmount(stopHint)
</script>

<template>
  <div ref="frame" class="live-board">
    <BoardGrid :round="round" :played="played" cascade compact @pick="pick" />
    <div v-if="finished && !open" class="done">
      <p>{{ t('site.board.played') }}</p>
      <button class="again" @click="reset"><RotateCcw class="size-4" />{{ t('site.board.again') }}</button>
    </div>
    <div v-if="open" ref="card" class="card" role="dialog" :aria-label="`${themeOf(open)}, ${open.value}`">
      <div class="plate">
        <span class="theme">{{ themeOf(open) }}</span>
        <span class="value">{{ open.value }}</span>
        <span v-if="open.kind !== 'normal'" class="kind" :class="open.kind">
          <component :is="KIND[open.kind].icon" class="size-3.5" />{{ t(KIND[open.kind].label) }}
        </span>
      </div>
      <div class="body">
        <FitText :text="open.text" :share="revealed ? 0.4 : 0.75" :max="40" :min="14" class="question" />
        <Transition name="answer">
          <p v-if="revealed" class="answer">{{ open.answer }}</p>
        </Transition>
      </div>
      <div class="actions">
        <button v-if="!revealed" class="primary" @click="revealed = true">{{ t('site.board.revealAnswer') }}</button>
        <button v-else class="primary" @click="close">{{ t('site.board.backToBoard') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-board {
  position: relative;
  aspect-ratio: 16 / 10.5;
  padding: 10px;
  border-radius: 24px;
  background: oklch(0.14 0.1 274 / 0.7);
  border: 1px solid oklch(1 0 0 / 0.12);
  box-shadow:
    0 0 0 6px oklch(0.2 0.14 272 / 0.5),
    0 40px 90px -30px oklch(0.05 0.12 280),
    0 0 80px -20px color-mix(in oklch, var(--magenta) 45%, transparent);
}
.live-board :deep(.board-frame) {
  min-height: 0;
  padding: 0;
}
.live-board :deep(.theme) {
  font-size: clamp(11px, 1.3vw, 17px);
}
.live-board :deep(.cell.hint) {
  filter: brightness(1.35);
  box-shadow:
    inset 0 -6px 0 oklch(0.15 0.15 270 / 0.6),
    0 0 0 2px var(--gold),
    0 0 28px -4px color-mix(in oklch, var(--gold) 70%, transparent);
}
.card {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: clamp(14px, 3%, 26px);
  border-radius: 18px;
  transform-origin: 0 0;
  background:
    radial-gradient(90% 70% at 50% 0%, oklch(0.5 0.25 268 / 0.7), transparent 70%),
    linear-gradient(180deg, var(--tile), var(--tile-deep));
  border: 1px solid color-mix(in oklch, var(--gold) 50%, transparent);
  box-shadow: inset 0 0 60px oklch(0.6 0.25 300 / 0.25);
}
.plate {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.plate .theme {
  color: var(--gold);
  font-size: 15px;
}
.plate .value {
  padding: 1px 10px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--night);
  font-weight: 700;
  font-size: 15px;
}
.plate .kind {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 12px;
  background: oklch(0.78 0.15 70);
  color: var(--night);
}
.plate .kind.cat-in-bag {
  background: var(--magenta);
  color: white;
}
.body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
}
.question {
  font-family: var(--font-serif);
  line-height: 1.25;
}
.answer {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(22px, 3vw, 40px);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--gold);
  text-shadow: 0 0 24px color-mix(in oklch, var(--gold) 45%, transparent);
}
.actions {
  display: flex;
  justify-content: center;
}
.primary,
.again {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  border: 0;
  background: var(--gold);
  color: var(--night);
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.15s ease;
}
.primary:hover,
.again:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.done {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 24px;
  background: oklch(0.14 0.1 274 / 0.55);
  backdrop-filter: blur(4px);
}
.done p {
  margin: 0;
  font-family: var(--font-display);
  font-size: 28px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--gold);
}
.answer-enter-active {
  transition: opacity 0.35s ease, transform 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.4);
}
.answer-enter-from {
  opacity: 0;
  transform: scale(0.7);
}
@media (prefers-reduced-motion: reduce) {
  .answer-enter-active { transition: none; }
}
</style>
