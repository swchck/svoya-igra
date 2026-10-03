<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { FolderOpen, X } from '@lucide/vue'
import type { MediaItem, MediaKind, MediaMode } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import IconButton from '@/components/IconButton.vue'
import NumberInput from '@/components/NumberInput.vue'
import { parseYoutubeUrl } from '@/game/youtube'
import { isStoredMedia } from '@/media/ref'
import { putMedia } from '@/media/store'
import MediaElement from '@/components/MediaElement.vue'

const props = defineProps<{ modelValue: MediaItem }>()

// one event per user action: separate url/kind/mode events would each be merged
// into the same stale props snapshot and overwrite one another
const emit = defineEmits<{ (e: 'update:modelValue', v: MediaItem): void }>()

const fileInput = ref<HTMLInputElement | null>(null)

function patch(p: Partial<MediaItem>) {
  emit('update:modelValue', { ...props.modelValue, ...p })
}

function pick() { fileInput.value?.click() }

function detectKind(input: { file?: File; url?: string }): MediaKind | undefined {
  if (input.url && parseYoutubeUrl(input.url)) return 'youtube'
  if (input.file) {
    if (input.file.type.startsWith('image/')) return 'image'
    if (input.file.type.startsWith('audio/')) return 'audio'
    if (input.file.type.startsWith('video/')) return 'video'
  }
  if (input.url) {
    const lower = input.url.toLowerCase()
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(lower)) return 'image'
    if (/\.(mp3|wav|ogg|m4a)(\?|$)/.test(lower)) return 'audio'
    if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(lower)) return 'video'
  }
  return undefined
}

function modeFor(kind: MediaKind): MediaMode | undefined {
  return kind === 'youtube' ? props.modelValue.mode ?? 'video' : undefined
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const kind = detectKind({ file })
  if (!kind) {
    toast.error('Неподдерживаемый файл', { description: 'Подойдут картинки, звук и видео.' })
    return
  }
  try {
    patch({ url: await putMedia(file), kind, mode: undefined })
  } catch (err) {
    toast.error('Не удалось сохранить файл', { description: (err as Error).message })
  }
}

function setUrl(url: string) {
  const kind = detectKind({ url }) ?? props.modelValue.kind
  patch({ url, kind, mode: modeFor(kind) })
}

function setKind(v: MediaKind | 'auto') {
  const kind = (v !== 'auto' && v) || detectKind({ url: props.modelValue.url }) || 'image'
  patch({ kind, mode: modeFor(kind) })
}

function setMode(mode: MediaMode) { patch({ mode }) }

function clear() {
  patch({ url: '', mode: undefined, duration: undefined })
}

function setDuration(n: number | undefined) {
  patch({ duration: n && n > 0 ? Math.round(n) : undefined })
}

const url = computed(() => props.modelValue.url)
const kind = computed(() => props.modelValue.kind)
const mode = computed(() => props.modelValue.mode)
const duration = computed(() => props.modelValue.duration)
const stored = computed(() => isStoredMedia(url.value))
const isYoutube = computed(() => kind.value === 'youtube' || parseYoutubeUrl(url.value) !== null)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <Input
        name="media-url"
        class="min-w-48 flex-1"
        :model-value="stored ? '' : url"
        :placeholder="stored ? 'Файл загружен. Вставьте ссылку, чтобы заменить его' : 'Ссылка на картинку, звук, видео или YouTube'"
        aria-label="Ссылка на медиа"
        @update:model-value="(v) => setUrl(String(v))"
      />
      <Select :model-value="kind" @update:model-value="(v) => setKind(v as MediaKind | 'auto')">
        <SelectTrigger class="w-36" aria-label="Тип медиа"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Определить</SelectItem>
          <SelectItem value="image">Картинка</SelectItem>
          <SelectItem value="audio">Звук</SelectItem>
          <SelectItem value="video">Видео</SelectItem>
          <SelectItem value="youtube">YouTube</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="secondary" @click="pick"><FolderOpen />Файл…</Button>
      <IconButton v-if="url" label="Очистить" @click="clear"><X /></IconButton>
      <input ref="fileInput" type="file" class="hidden" accept="image/*,audio/*,video/*" @change="onFile" />
    </div>

    <div v-if="isYoutube && url" class="flex flex-wrap items-center gap-3">
      <Label>Режим</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        :model-value="mode ?? 'video'"
        @update:model-value="(v) => v && setMode(v as MediaMode)"
      >
        <ToggleGroupItem value="video">Видео</ToggleGroupItem>
        <ToggleGroupItem value="audio">Только звук</ToggleGroupItem>
      </ToggleGroup>
    </div>

    <div v-if="(isYoutube || kind === 'audio' || kind === 'video') && url" class="flex flex-wrap items-center gap-3">
      <Label>Длительность, с</Label>
      <NumberInput class="w-36" :model-value="duration" placeholder="до конца" @update:model-value="setDuration" />
      <span class="text-sm text-muted-foreground">Если пусто, играет до конца</span>
    </div>

    <div v-if="url" class="preview flex max-h-80 justify-center overflow-hidden rounded-lg bg-black/25 p-2">
      <MediaElement :item="modelValue" preview />
    </div>
  </div>
</template>

<style scoped>
.preview :deep(img),
.preview :deep(video) { max-height: 280px; max-width: 100%; border-radius: 8px; }
.preview :deep(audio) { width: 100%; }
</style>
