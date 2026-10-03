<script setup lang="ts">
import type { Theme } from '../../types'
import { makeEmptyQuestion } from '../../game/model'

const theme = defineModel<Theme>({ required: true })
defineProps<{ selected: number | null }>()
defineEmits<{ (e: 'select', questionIndex: number): void; (e: 'remove'): void }>()

function addQuestion() {
  const last = theme.value.questions.at(-1)
  theme.value.questions.push(makeEmptyQuestion(last ? last.value + 100 : 100))
}
</script>

<template>
  <article class="theme-card si-card">
    <div class="si-row">
      <input v-model="theme.name" class="si-input theme-name" placeholder="Название темы" />
      <button class="si-button danger ghost" title="Удалить тему" @click="$emit('remove')">×</button>
    </div>
    <div class="q-row">
      <button
        v-for="(q, qIdx) in theme.questions"
        :key="q.id"
        class="q-cell"
        :class="{
          active: selected === qIdx,
          empty: !q.text,
          auction: q.kind === 'auction',
          bag: q.kind === 'cat-in-bag',
        }"
        :title="q.text || 'Пустой вопрос'"
        @click="$emit('select', qIdx)"
      >
        {{ q.value }}
      </button>
      <button class="q-cell add" title="Добавить вопрос" @click="addQuestion">+</button>
    </div>
  </article>
</template>

<style scoped>
.theme-card { padding: 12px; }
.theme-card .si-row { flex-wrap: nowrap; }
.theme-name { font-family: var(--font-title); }
.q-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.q-cell {
  width: 64px;
  height: 56px;
  border-radius: 8px;
  border: 1px solid var(--si-cell-border);
  background: var(--si-cell-bg);
  color: var(--si-gold);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.1s, background 0.15s;
}
.q-cell:hover { transform: translateY(-1px); }
.q-cell.active {
  outline: 2px solid var(--si-gold);
  outline-offset: 2px;
}
.q-cell.empty {
  color: rgba(255, 192, 0, 0.4);
  font-style: italic;
}
.q-cell.auction { background: rgba(255, 192, 0, 0.18); }
.q-cell.bag { background: rgba(160, 80, 220, 0.25); }
.q-cell.add {
  width: 44px;
  color: var(--si-mute);
  font-size: 22px;
}
</style>
