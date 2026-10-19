<script setup lang="ts">
import { computed } from 'vue'
import type { Round } from '@/types'

const props = defineProps<{ round?: Round }>()
const rows = computed(() => (props.round?.themes ?? []).slice(0, 6).map((t) => Math.min(t.questions.length, 6)))
const cols = computed(() => Math.max(1, ...rows.value))
</script>

<template>
  <div class="mini" :style="{ '--cols': cols }" aria-hidden="true">
    <template v-for="(count, r) in rows" :key="r">
      <span class="theme" />
      <span v-for="c in cols" :key="c" class="cell" :class="{ empty: c > count }" :style="{ '--d': `${(r + c) * 40}ms` }" />
    </template>
  </div>
</template>

<style scoped>
.mini {
  display: grid;
  grid-template-columns: 1.6fr repeat(var(--cols), 1fr);
  gap: 3px;
  width: 100%;
  aspect-ratio: 16 / 10;
  padding: 8px;
  border-radius: 14px;
  background: var(--well);
  border: 1px solid oklch(var(--tint) 0 0 / 0.08);
}
.theme {
  border-radius: 4px;
  background: linear-gradient(135deg, var(--theme-top), var(--theme-bottom));
}
.cell {
  border-radius: 4px;
  background: linear-gradient(180deg, var(--tile), var(--tile-deep));
  box-shadow: inset 0 0 0 1px oklch(var(--tint) 0 0 / 0.08);
  position: relative;
}
.cell::after {
  content: '';
  position: absolute;
  inset: 35% 30%;
  border-radius: 2px;
  background: var(--gold);
  opacity: 0.85;
}
.cell.empty {
  background: var(--played);
}
.cell.empty::after {
  display: none;
}
</style>
