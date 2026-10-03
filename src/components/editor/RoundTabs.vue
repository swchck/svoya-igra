<script setup lang="ts">
import type { Round } from '../../types'

defineProps<{ rounds: Round[] }>()
const active = defineModel<number>({ required: true })
defineEmits<{ (e: 'add'): void }>()
</script>

<template>
  <nav class="round-tabs">
    <button
      v-for="(r, i) in rounds"
      :key="r.id"
      class="round-tab"
      :class="{ active: i === active }"
      @click="active = i"
    >
      {{ r.name || `РАУНД ${i + 1}` }}
    </button>
    <button class="round-tab add" @click="$emit('add')">+ раунд</button>
  </nav>
</template>

<style scoped>
.round-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.round-tab {
  padding: 8px 16px;
  border-radius: 8px 8px 0 0;
  border: 1px solid var(--si-cell-border);
  border-bottom: none;
  background: rgba(255, 255, 255, 0.05);
  color: var(--si-mute);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 14px;
  letter-spacing: 0.05em;
}
.round-tab.active {
  background: rgba(255, 192, 0, 0.18);
  color: var(--si-gold);
  border-color: var(--si-gold);
}
</style>
