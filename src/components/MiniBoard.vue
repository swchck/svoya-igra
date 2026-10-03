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
  background: oklch(0.14 0.1 274 / 0.7);
  border: 1px solid oklch(1 0 0 / 0.08);
}
.theme {
  border-radius: 4px;
  background: linear-gradient(135deg, oklch(0.34 0.2 290), oklch(0.26 0.18 275));
}
.cell {
  border-radius: 4px;
  background: linear-gradient(180deg, var(--tile), var(--tile-deep));
  box-shadow: inset 0 0 0 1px oklch(1 0 0 / 0.08);
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
  background: oklch(0.2 0.12 272 / 0.5);
}
.cell.empty::after {
  display: none;
}
</style>
