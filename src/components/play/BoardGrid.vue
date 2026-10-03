<script setup lang="ts">
import { computed } from 'vue'
import type { Question, Round } from '@/types'

const props = defineProps<{
  round: Round
  played: Record<string, true>
  /** Light the cells up one by one, for the first look at a round. */
  cascade?: boolean
  /** Smaller type for the host window. */
  compact?: boolean
}>()
defineEmits<{ (e: 'pick', question: Question): void }>()

const columns = computed(() => Math.max(1, ...props.round.themes.map((t) => t.questions.length)))
</script>

<template>
  <div class="board-frame" :class="{ compact }">
    <div
      class="board"
      :class="{ cascade }"
      :style="{ '--cols': columns, '--rows': round.themes.length }"
    >
      <template v-for="(t, r) in round.themes" :key="t.id">
        <div class="theme" :style="{ '--r': r, '--c': 0 }">
          <span>{{ t.name }}</span>
        </div>
        <button
          v-for="(q, c) in t.questions"
          :key="q.id"
          class="cell"
          :class="{ played: played[q.id] }"
          :style="{ '--r': r, '--c': c + 1 }"
          :data-question-id="q.id"
          :disabled="!!played[q.id]"
          :aria-label="played[q.id] ? `${t.name}: сыгран` : `${t.name}, ${q.value}`"
          @click="$emit('pick', q)"
        >
          <span v-if="!played[q.id]" class="value">{{ q.value }}</span>
        </button>
        <span
          v-for="i in columns - t.questions.length"
          :key="`${t.id}-pad-${i}`"
          class="cell played"
          :style="{ '--r': r, '--c': t.questions.length + i }"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
/* the frame is a size container so type scales with the space the board actually gets */
.board-frame {
  container-type: size;
  width: 100%;
  height: 100%;
  min-height: 240px;
  padding: 6px;
}
.board {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(var(--cols), minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: clamp(4px, 0.9cqw, 12px);
  width: 100%;
  height: 100%;
  --cell-h: calc(100cqh / var(--rows));
  --cell-w: calc(100cqw / (var(--cols) + 1.6));
}
.theme {
  display: grid;
  place-items: center;
  padding: 4px 10px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.08), transparent 50%),
    linear-gradient(135deg, oklch(0.32 0.2 290), oklch(0.24 0.18 275));
  border: 1px solid color-mix(in oklch, var(--gold) 55%, transparent);
  box-shadow: inset 0 0 24px oklch(0.6 0.25 300 / 0.25);
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.1;
  color: var(--gold);
  font-size: clamp(11px, min(var(--cell-h) * 0.2, var(--cell-w) * 0.13), 30px);
  overflow: hidden;
}
.cell {
  position: relative;
  display: grid;
  place-items: center;
  border-radius: 14px;
  border: 1px solid oklch(1 0 0 / 0.18);
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.16), transparent 45%),
    radial-gradient(120% 100% at 50% 110%, oklch(0.55 0.26 262), transparent 70%),
    linear-gradient(180deg, var(--tile), var(--tile-deep));
  box-shadow: inset 0 -6px 0 oklch(0.15 0.15 270 / 0.6), 0 10px 24px -14px oklch(0.05 0.1 280 / 0.9);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}
.cell:not(.played):hover,
.cell:not(.played):focus-visible {
  transform: translateY(-3px);
  filter: brightness(1.15);
  box-shadow:
    inset 0 -6px 0 oklch(0.15 0.15 270 / 0.6),
    0 0 0 2px var(--gold),
    0 14px 30px -10px color-mix(in oklch, var(--gold) 55%, transparent);
}
.cell:not(.played):active {
  transform: translateY(0) scale(0.98);
}
.value {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1;
  color: var(--gold);
  font-size: clamp(16px, min(var(--cell-h) * 0.48, var(--cell-w) * 0.36), 88px);
  text-shadow: 0 0 22px color-mix(in oklch, var(--gold) 50%, transparent), 0 3px 0 oklch(0.3 0.12 60 / 0.8);
}
.cell.played {
  cursor: default;
  background: oklch(0.2 0.12 272 / 0.45);
  border-color: oklch(1 0 0 / 0.05);
  box-shadow: inset 0 2px 10px oklch(0 0 0 / 0.35);
}
.compact .cell,
.compact .theme {
  border-radius: 10px;
}
.cascade .cell,
.cascade .theme {
  animation: light-up 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.2) backwards;
  animation-delay: calc((var(--r) * 0.6 + var(--c)) * 55ms);
}
@keyframes light-up {
  0% { opacity: 0; transform: scale(0.6) rotateX(70deg); filter: brightness(2.2); }
  60% { opacity: 1; filter: brightness(1.6); }
  100% { transform: none; filter: none; }
}
@media (prefers-reduced-motion: reduce) {
  .cascade .cell, .cascade .theme { animation: none; }
  .cell { transition: none; }
}
</style>
