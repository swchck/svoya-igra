<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/vue'
import type { MediaItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import IconButton from '@/components/IconButton.vue'
import MediaPicker from '@/components/MediaPicker.vue'
import { uid } from '@/game/model'

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
  <section class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <Label v-if="label">{{ label }}</Label>
      <Button variant="outline" size="sm" @click="add"><Plus />Добавить медиа</Button>
    </div>
    <article
      v-for="(it, i) in items"
      :key="it.id"
      class="m-item flex flex-col gap-3 rounded-lg border border-dashed border-border bg-board/40 p-3"
    >
      <header class="flex items-center gap-1">
        <span class="mr-auto font-display text-sm text-gold">#{{ i + 1 }}</span>
        <IconButton label="Выше" size="icon-xs" :disabled="i === 0" @click="move(i, -1)"><ArrowUp /></IconButton>
        <IconButton label="Ниже" size="icon-xs" :disabled="i === items.length - 1" @click="move(i, 1)">
          <ArrowDown />
        </IconButton>
        <IconButton label="Убрать медиа" size="icon-xs" @click="remove(i)"><Trash2 /></IconButton>
      </header>
      <MediaPicker :model-value="it" @update:model-value="(v) => replace(i, v)" />
    </article>
  </section>
</template>
