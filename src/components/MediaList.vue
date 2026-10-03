<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MediaItem } from '@/types'
import { Label } from '@/components/ui/label'
import MediaAddZone from '@/components/media/MediaAddZone.vue'
import MediaCard from '@/components/media/MediaCard.vue'
import { isWebLink, useMediaIngest } from '@/components/media/useMediaIngest'

const props = defineProps<{
  label?: string
  modelValue?: MediaItem[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: MediaItem[] | undefined): void
}>()

const { fromFiles, fromLink } = useMediaIngest()
const items = computed(() => props.modelValue ?? [])
const expandedId = ref<string>()

function commit(list: MediaItem[]) {
  emit('update:modelValue', list.length ? list : undefined)
}

function append(added: MediaItem[]) {
  if (!added.length) return
  commit([...items.value, ...added])
  expandedId.value = added[0].id
}

function remove(i: number) {
  commit(items.value.filter((_, j) => j !== i))
}

function moveTo(from: number, to: number) {
  if (from === to || to < 0 || to >= items.value.length) return
  const list = [...items.value]
  list.splice(to, 0, ...list.splice(from, 1))
  commit(list)
}

function replace(i: number, item: MediaItem) {
  commit(items.value.map((it, j) => (j === i ? item : it)))
}

async function addFiles(files: Iterable<File>) {
  append(await fromFiles(files))
}

function addLink(url: string) {
  const item = fromLink(url)
  if (item) append([item])
}

const dropping = ref(false)
const dragId = ref<string>()
// slot between cards a dragged card would land in: 0 is before the first, length is after the last
const dropAt = ref<number>()

function hasFiles(e: DragEvent) {
  return !!e.dataTransfer?.types.includes('Files')
}
function onDragOver(e: DragEvent) {
  if (dragId.value) {
    e.preventDefault()
    return
  }
  if (!hasFiles(e)) return
  e.preventDefault()
  dropping.value = true
}
function onItemDragOver(e: DragEvent, i: number) {
  if (!dragId.value) return
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
  dropAt.value = e.clientY < box.top + box.height / 2 ? i : i + 1
}
function onDragLeave(e: DragEvent) {
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) {
    dropping.value = false
    dropAt.value = undefined
  }
}
function onDrop(e: DragEvent) {
  if (dragId.value) {
    e.preventDefault()
    const from = items.value.findIndex((it) => it.id === dragId.value)
    const slot = dropAt.value
    endDrag()
    if (from >= 0 && slot !== undefined) moveTo(from, slot > from ? slot - 1 : slot)
    return
  }
  if (!hasFiles(e)) return
  e.preventDefault()
  dropping.value = false
  void addFiles(e.dataTransfer?.files ?? [])
}
function endDrag() {
  dragId.value = undefined
  dropAt.value = undefined
}

function onPaste(e: ClipboardEvent) {
  const target = e.target as HTMLElement
  // typing fields keep their own paste
  if (target.closest('input, textarea, [contenteditable]')) return
  const files = [...(e.clipboardData?.files ?? [])]
  const text = e.clipboardData?.getData('text/plain').trim() ?? ''
  if (files.length) {
    e.preventDefault()
    void addFiles(files)
  } else if (isWebLink(text)) {
    e.preventDefault()
    addLink(text)
  }
}
</script>

<template>
  <section
    class="media-list"
    :class="{ dropping }"
    :aria-label="label"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @paste="onPaste"
  >
    <Label v-if="label">{{ label }}</Label>
    <ul v-if="items.length" class="flex flex-col gap-2" :data-dragging="dragId ? '' : undefined">
      <li
        v-for="(it, i) in items"
        :key="it.id"
        class="slot"
        :class="{ before: dropAt === i, after: dropAt === i + 1 && i === items.length - 1 }"
        @dragover="onItemDragOver($event, i)"
      >
        <MediaCard
          :item="it"
          :index="i"
          :count="items.length"
          :expanded="expandedId === it.id"
          :class="{ dragging: dragId === it.id }"
          @update="(v) => replace(i, v)"
          @toggle="expandedId = expandedId === it.id ? undefined : it.id"
          @remove="remove(i)"
          @move="(dir) => moveTo(i, i + dir)"
          @dragstart="dragId = it.id"
          @dragend="endDrag"
        />
      </li>
    </ul>
    <MediaAddZone :dropping="dropping" @files="addFiles" @link="addLink" />
  </section>
</template>

<style scoped>
.media-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px;
  margin: -2px;
  border-radius: 16px;
  transition: box-shadow 0.15s ease, background 0.15s ease;
}
.media-list.dropping {
  background: color-mix(in oklch, var(--cyan) 10%, transparent);
  box-shadow: 0 0 0 2px var(--cyan);
}
.slot {
  position: relative;
}
.slot.before::before,
.slot.after::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  height: 3px;
  border-radius: 2px;
  background: var(--gold);
  box-shadow: 0 0 10px var(--gold);
}
.slot.before::before { top: -6px; }
.slot.after::after { bottom: -6px; }
.slot :deep(.dragging) { opacity: 0.4; }
</style>
