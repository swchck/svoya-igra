<script setup lang="ts">
import { computed } from 'vue'
import type { MediaItem } from '../types'
import { uid } from '../storage'
import MediaPicker from './MediaPicker.vue'

const props = defineProps<{
  label?: string
  modelValue?: MediaItem[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: MediaItem[] | undefined): void
}>()

const items = computed(() => props.modelValue ?? [])

function commit(list: MediaItem[]) {
  emit('update:modelValue', list.length ? list : undefined)
}

function add() {
  commit([...items.value, { id: uid('mi_'), url: '', kind: 'image' }])
}

function remove(i: number) {
  commit(items.value.filter((_, j) => j !== i))
}

function move(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= items.value.length) return
  const list = [...items.value]
  ;[list[i], list[j]] = [list[j], list[i]]
  commit(list)
}

function replace(i: number, item: MediaItem) {
  commit(items.value.map((it, j) => (j === i ? item : it)))
}
</script>

<template>
  <div class="media-list">
    <label v-if="label" class="si-label">{{ label }}</label>
    <div v-if="!items.length" class="empty">
      <button class="si-button" @click="add">+ Добавить медиа</button>
    </div>
    <template v-else>
      <article v-for="(it, i) in items" :key="it.id" class="m-item">
        <header class="m-head">
          <span class="m-num">#{{ i + 1 }}</span>
          <button class="si-button ghost" :disabled="i === 0" title="Вверх" @click="move(i, -1)">↑</button>
          <button class="si-button ghost" :disabled="i === items.length - 1" title="Вниз" @click="move(i, 1)">↓</button>
          <span class="si-spacer" />
          <button class="si-button danger ghost" title="Удалить" @click="remove(i)">×</button>
        </header>
        <MediaPicker :model-value="it" @update:model-value="(v) => replace(i, v)" />
      </article>
      <button class="si-button" @click="add">+ Ещё медиа</button>
    </template>
  </div>
</template>

<style scoped>
.media-list { display: flex; flex-direction: column; gap: 12px; }
.empty { display: flex; }
.m-item {
  border: 1px dashed var(--si-cell-border);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 80, 0.18);
}
.m-head {
  display: flex;
  gap: 8px;
  align-items: center;
}
.m-num {
  font-family: var(--font-title);
  color: var(--si-gold);
  font-size: 14px;
}
.m-head .si-button { padding: 4px 10px; font-size: 13px; }
</style>
