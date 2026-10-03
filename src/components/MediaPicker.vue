<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
import { FolderOpen, X } from '@lucide/vue'
import type { MediaItem, MediaKind, MediaMode } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import IconButton from '@/components/IconButton.vue'
import TimeInput from '@/components/TimeInput.vue'
import { parseYoutubeUrl } from '@/game/youtube'
import { isStoredMedia } from '@/media/ref'
import { putMedia } from '@/media/store'
import { detectKind } from '@/media/kind'
import { formatTime, segmentOf } from '@/media/segment'
import MediaElement from '@/components/MediaElement.vue'

const { t } = useI18n()
const props = defineProps<{ modelValue: MediaItem }>()

// one event per user action: separate url/kind/mode events would each be merged
// into the same stale props snapshot and overwrite one another
const emit = defineEmits<{ (e: 'update:modelValue', v: MediaItem): void }>()

const fileInput = ref<HTMLInputElement | null>(null)

function patch(p: Partial<MediaItem>) {
  emit('update:modelValue', { ...props.modelValue, ...p })
}

function pick() { fileInput.value?.click() }

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
    toast.error(t('media.picker.unsupportedTitle'), { description: t('media.picker.unsupportedHint') })
    return
  }
  try {
    patch({ url: await putMedia(file), kind, mode: undefined })
  } catch (err) {
    toast.error(t('media.picker.saveFailed'), { description: (err as Error).message })
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
  patch({ url: '', mode: undefined, start: undefined, end: undefined })
}

const url = computed(() => props.modelValue.url)
const kind = computed(() => props.modelValue.kind)
const mode = computed(() => props.modelValue.mode)
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
        :placeholder="stored ? t('media.picker.urlPlaceholderStored') : t('media.picker.urlPlaceholder')"
        :aria-label="t('media.picker.urlLabel')"
        @update:model-value="(v) => setUrl(String(v))"
      />
      <Select :model-value="kind" @update:model-value="(v) => setKind(v as MediaKind | 'auto')">
        <SelectTrigger class="w-36" :aria-label="t('media.picker.kindLabel')"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">{{ t('media.kind.auto') }}</SelectItem>
          <SelectItem value="image">{{ t('media.kind.image') }}</SelectItem>
          <SelectItem value="audio">{{ t('media.kind.audio') }}</SelectItem>
          <SelectItem value="video">{{ t('media.kind.video') }}</SelectItem>
          <SelectItem value="youtube">YouTube</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="secondary" @click="pick"><FolderOpen />{{ t('media.picker.file') }}</Button>
      <IconButton v-if="url" :label="t('media.picker.clear')" @click="clear"><X /></IconButton>
      <input ref="fileInput" type="file" class="hidden" accept="image/*,audio/*,video/*" @change="onFile" />
    </div>

    <div v-if="isYoutube && url" class="flex flex-wrap items-center gap-3">
      <Label>{{ t('media.mode.label') }}</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        :model-value="mode ?? 'video'"
        @update:model-value="(v) => v && setMode(v as MediaMode)"
      >
        <ToggleGroupItem value="video">{{ t('media.mode.video') }}</ToggleGroupItem>
        <ToggleGroupItem value="audio">{{ t('media.mode.audioOnly') }}</ToggleGroupItem>
      </ToggleGroup>
    </div>

    <div v-if="(isYoutube || kind === 'audio' || kind === 'video') && url" class="flex flex-wrap items-center gap-2">
      <Label>{{ t('media.picker.playFrom') }}</Label>
      <TimeInput
        :label="t('media.picker.startLabel')"
        :model-value="modelValue.start"
        :placeholder="isYoutube ? formatTime(segmentOf(modelValue).start) : '0:00'"
        @update:model-value="(v) => patch({ start: v })"
      />
      <Label>{{ t('media.picker.playTo') }}</Label>
      <TimeInput
        :label="t('media.picker.endLabel')"
        :model-value="modelValue.end"
        :placeholder="t('media.picker.endPlaceholder')"
        @update:model-value="(v) => patch({ end: v })"
      />
      <span class="text-sm text-muted-foreground">{{ t('media.picker.timeHint') }}</span>
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
