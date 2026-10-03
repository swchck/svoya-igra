<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/vue'
import type { MediaItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import IconButton from '@/components/IconButton.vue'
import MediaPicker from '@/components/MediaPicker.vue'
import { uid } from '@/game/model'
import { detectKind } from '@/media/kind'
import { putMedia } from '@/media/store'

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

const dropping = ref(false)
function hasFiles(e: DragEvent) {
  return !!e.dataTransfer?.types.includes('Files')
}
function onDragOver(e: DragEvent) {
  if (!hasFiles(e)) return
  e.preventDefault()
  dropping.value = true
}
async function onDrop(e: DragEvent) {
  if (!hasFiles(e)) return
  e.preventDefault()
  dropping.value = false
  const added: MediaItem[] = []
  for (const file of e.dataTransfer?.files ?? []) {
    const kind = detectKind({ file })
    if (!kind) {
      toast.error(`Не подходит: ${file.name}`, { description: 'Подойдут картинки, звук и видео.' })
      continue
    }
    try {
      added.push({ id: uid('mi_'), url: await putMedia(file), kind })
    } catch (err) {
      toast.error(`Не удалось сохранить ${file.name}`, { description: (err as Error).message })
    }
  }
  if (added.length) commit([...items.value, ...added])
}

function replace(i: number, item: MediaItem) {
  commit(items.value.map((it, j) => (j === i ? item : it)))
}
</script>

<template>
  <section
    class="media-list"
    :class="{ dropping }"
    @dragover="onDragOver"
    @dragleave.self="dropping = false"
    @drop="onDrop"
  >
    <div class="flex items-center justify-between gap-2">
      <Label v-if="label">{{ label }}</Label>
      <Button variant="ghost" size="sm" @click="add"><Plus />Добавить</Button>
    </div>
    <p v-if="!items.length" class="drop-hint" @click="add">
      Перетащите сюда картинку, звук или видео, или нажмите, чтобы вставить ссылку
    </p>
    <article v-for="(it, i) in items" :key="it.id" class="m-item">
      <header class="flex items-center gap-1">
        <span class="mr-auto font-display text-sm text-gold">{{ i + 1 }}</span>
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

<style scoped>
.media-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 16px;
  transition: box-shadow 0.15s ease, background 0.15s ease;
}
.media-list.dropping {
  background: color-mix(in oklch, var(--cyan) 10%, transparent);
  box-shadow: 0 0 0 2px var(--cyan);
}
.drop-hint {
  margin: 0;
  padding: 18px;
  border-radius: 14px;
  border: 1px dashed oklch(1 0 0 / 0.22);
  color: var(--muted-foreground);
  font-size: 13px;
  text-align: center;
  cursor: pointer;
}
.drop-hint:hover {
  border-color: var(--gold);
  color: var(--foreground);
}
.m-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid oklch(1 0 0 / 0.1);
  background: oklch(0.14 0.1 274 / 0.55);
}
</style>
