<script setup lang="ts">
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

function items(): MediaItem[] {
  return props.modelValue ? [...props.modelValue] : []
}

function commit(list: MediaItem[]) {
  emit('update:modelValue', list.length ? list : undefined)
}

function add() {
  const list = items()
  list.push({ id: uid('mi_'), url: '', kind: 'image' })
  commit(list)
}

function remove(i: number) {
  const list = items()
  list.splice(i, 1)
  commit(list)
}

function move(i: number, dir: -1 | 1) {
  const list = items()
  const j = i + dir
  if (j < 0 || j >= list.length) return
  const [it] = list.splice(i, 1)
  list.splice(j, 0, it)
  commit(list)
}

function update(i: number, patch: Partial<MediaItem>) {
  const list = items()
  list[i] = { ...list[i], ...patch }
  // Drop empty entries
  if (!list[i].url) {
    // Allow blank picker but keep entry
  }
  commit(list)
}
</script>

<template>
  <div class="media-list">
    <label v-if="label" class="si-label">{{ label }}</label>
    <div v-if="!items().length" class="empty">
      <button class="si-button" @click="add">+ Добавить медиа</button>
    </div>
    <template v-else>
      <article v-for="(it, i) in items()" :key="it.id" class="m-item">
        <header class="m-head">
          <span class="m-num">#{{ i + 1 }}</span>
          <button class="si-button ghost" :disabled="i === 0" @click="move(i, -1)" title="Вверх">↑</button>
          <button class="si-button ghost" :disabled="i === items().length - 1" @click="move(i, 1)" title="Вниз">↓</button>
          <span class="si-spacer" />
          <button class="si-button danger ghost" @click="remove(i)" title="Удалить">×</button>
        </header>
        <MediaPicker
          :url="it.url"
          :kind="it.kind"
          :mode="it.mode"
          :duration="it.duration"
          @update:url="(v) => update(i, { url: v ?? '' })"
          @update:kind="(v) => update(i, { kind: v as any })"
          @update:mode="(v) => update(i, { mode: v as any })"
          @update:duration="(v) => update(i, { duration: v })"
        />
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
