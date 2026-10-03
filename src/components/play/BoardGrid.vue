<script setup lang="ts">
import { computed } from 'vue'
import type { Question, Round } from '../../types'

const props = defineProps<{ round: Round; played: Record<string, true> }>()
defineEmits<{ (e: 'pick', question: Question): void }>()

const columns = computed(() => Math.max(0, ...props.round.themes.map((t) => t.questions.length)))
</script>

<template>
  <div class="board-grid" :style="{ gridTemplateColumns: `minmax(160px, 1.6fr) repeat(${columns}, 1fr)` }">
    <template v-for="t in round.themes" :key="t.id">
      <div class="theme-name-cell">{{ t.name }}</div>
      <button
        v-for="q in t.questions"
        :key="q.id"
        class="board-cell"
        :class="{ played: played[q.id] }"
        :disabled="!!played[q.id]"
        :aria-label="played[q.id] ? 'Сыгран' : `${t.name}, ${q.value}`"
        @click="$emit('pick', q)"
      >
        <span v-if="!played[q.id]">{{ q.value }}</span>
      </button>
      <span v-for="i in columns - t.questions.length" :key="`${t.id}-pad-${i}`" class="board-cell pad" />
    </template>
  </div>
</template>

<style scoped>
.board-grid {
  display: grid;
  gap: 6px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}
.theme-name-cell {
  background: rgba(255, 192, 0, 0.18);
  color: var(--si-gold);
  border: 1px solid var(--si-gold);
  border-radius: 8px;
  padding: 18px 14px;
  font-family: var(--font-title);
  font-size: clamp(14px, 1.6vw, 22px);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-weight: 700;
  text-transform: uppercase;
}
.board-cell {
  border-radius: 8px;
  border: 1px solid var(--si-cell-border);
  background: var(--si-cell-bg);
  color: var(--si-gold);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: clamp(18px, 3vw, 36px);
  cursor: pointer;
  min-height: 80px;
  transition: transform 0.15s, background 0.15s;
}
.board-cell:hover:not(:disabled) { transform: scale(1.04); background: rgba(255, 192, 0, 0.12); }
.board-cell.played,
.board-cell.pad {
  background: var(--si-cell-played);
  color: transparent;
  cursor: default;
  border-color: rgba(255, 255, 255, 0.05);
}
.board-cell.pad { pointer-events: none; }
</style>
