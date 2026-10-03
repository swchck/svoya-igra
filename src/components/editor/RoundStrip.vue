<script setup lang="ts">
import { Plus, Trophy } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import type { FinalQuestion, Round } from '@/types'
import { isQuestionReady } from '@/game/model'

const { t } = useI18n()
defineProps<{ rounds: Round[]; final?: FinalQuestion }>()
/** Index of the open round, or 'final'. */
const active = defineModel<number | 'final'>({ required: true })
defineEmits<{ (e: 'add'): void }>()

function progress(r: Round) {
  const all = r.themes.flatMap((t) => t.questions)
  return { ready: all.filter(isQuestionReady).length, total: all.length }
}
</script>

<template>
  <nav class="strip" :aria-label="t('editor.strip.label')">
    <button
      v-for="(r, i) in rounds"
      :key="r.id"
      class="pill"
      :class="{ active: active === i }"
      :aria-current="active === i ? 'page' : undefined"
      @click="active = i"
    >
      <span class="name">{{ r.name || t('editor.strip.defaultRound', { n: i + 1 }) }}</span>
      <span class="count">{{ progress(r).ready }}/{{ progress(r).total }}</span>
      <span class="bar" aria-hidden="true">
        <span :style="{ width: `${progress(r).total ? (progress(r).ready / progress(r).total) * 100 : 0}%` }" />
      </span>
    </button>
    <button class="pill add" @click="$emit('add')"><Plus class="size-4" />{{ t('editor.strip.addRound') }}</button>
    <span class="flex-1" />
    <button
      class="pill final"
      :class="{ active: active === 'final', missing: !final }"
      :aria-current="active === 'final' ? 'page' : undefined"
      @click="active = 'final'"
    >
      <Trophy class="size-4" /><span class="name">{{ t('editor.strip.final') }}</span>
    </button>
  </nav>
</template>

<style scoped>
.strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid oklch(1 0 0 / 0.12);
  background: oklch(0.2 0.14 272 / 0.6);
  color: var(--muted-foreground);
  cursor: pointer;
  overflow: hidden;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.pill:hover {
  color: var(--foreground);
}
.pill.active {
  border-color: color-mix(in oklch, var(--gold) 70%, transparent);
  background: linear-gradient(180deg, var(--tile), var(--tile-deep));
  color: var(--gold);
}
.name {
  font-family: var(--font-display);
  font-size: 16px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.count {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}
.bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: oklch(1 0 0 / 0.08);
}
.bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--cyan), var(--gold));
  transition: width 0.3s ease;
}
.pill.add {
  border-style: dashed;
  background: transparent;
  gap: 6px;
}
.pill.final.missing:not(.active) {
  border-style: dashed;
  background: transparent;
}
</style>
