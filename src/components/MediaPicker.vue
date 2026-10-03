<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MediaItem, MediaKind, MediaMode } from '../types'
import { parseYoutubeUrl } from '../game/youtube'
import { isStoredMedia } from '../media/ref'
import { putMedia } from '../media/store'
import MediaElement from './MediaElement.vue'

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
    alert('Поддерживаются изображения, аудио и видео.')
    return
  }
  try {
    patch({ url: await putMedia(file), kind, mode: undefined })
  } catch (err) {
    alert('Не удалось сохранить файл: ' + (err as Error).message)
  }
}

function setUrl(url: string) {
  const kind = detectKind({ url }) ?? props.modelValue.kind
  patch({ url, kind, mode: modeFor(kind) })
}

function setKind(v: MediaKind | '') {
  const kind = v || detectKind({ url: props.modelValue.url }) || 'image'
  patch({ kind, mode: modeFor(kind) })
}

function setMode(mode: MediaMode) { patch({ mode }) }

function clear() {
  patch({ url: '', mode: undefined, duration: undefined })
}

function setDuration(v: string) {
  const n = parseInt(v, 10)
  patch({ duration: isFinite(n) && n > 0 ? n : undefined })
}

const url = computed(() => props.modelValue.url)
const kind = computed(() => props.modelValue.kind)
const mode = computed(() => props.modelValue.mode)
const duration = computed(() => props.modelValue.duration)
const stored = computed(() => isStoredMedia(url.value))
const isYoutube = computed(() => kind.value === 'youtube' || parseYoutubeUrl(url.value) !== null)
</script>

<template>
  <div class="media-picker">
    <div class="si-row">
      <input
        class="si-input"
        :value="stored ? '' : url"
        :placeholder="stored ? 'Загруженный файл — введите URL, чтобы заменить' : 'URL картинки / аудио / видео / YouTube'"
        @input="setUrl(($event.target as HTMLInputElement).value)"
      />
      <select
        class="si-select"
        style="max-width:160px"
        :value="kind || ''"
        @change="setKind(($event.target as HTMLSelectElement).value as MediaKind | '')"
      >
        <option value="">авто</option>
        <option value="image">картинка</option>
        <option value="audio">аудио</option>
        <option value="video">видео</option>
        <option value="youtube">YouTube</option>
      </select>
      <button class="si-button" @click="pick">Файл…</button>
      <button v-if="url" class="si-button danger ghost" @click="clear">×</button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*,audio/*,video/*"
        style="display:none"
        @change="onFile"
      />
    </div>

    <!-- YouTube playback mode toggle -->
    <div v-if="isYoutube && url" class="mode-row">
      <span class="si-label" style="margin: 0;">Режим:</span>
      <label class="seg" :class="{ active: (mode || 'video') === 'video' }">
        <input
          type="radio"
          :checked="(mode || 'video') === 'video'"
          @change="setMode('video')"
        />
        Видео (без метаинформации)
      </label>
      <label class="seg" :class="{ active: mode === 'audio' }">
        <input
          type="radio"
          :checked="mode === 'audio'"
          @change="setMode('audio')"
        />
        Только аудио
      </label>
    </div>

    <div v-if="(isYoutube || kind === 'audio' || kind === 'video') && url" class="duration-row">
      <span class="si-label" style="margin: 0;">Длительность:</span>
      <input
        type="number"
        min="0"
        step="1"
        class="si-input duration-input"
        :value="duration ?? ''"
        placeholder="до конца"
        @input="setDuration(($event.target as HTMLInputElement).value)"
      />
      <span class="muted">сек (0 / пусто = играть до конца)</span>
    </div>

    <div v-if="url" class="preview">
      <MediaElement :item="modelValue" preview />
    </div>
  </div>
</template>

<style scoped>
.media-picker { display: flex; flex-direction: column; gap: 8px; }
.mode-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.seg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--si-cell-border);
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  cursor: pointer;
  font-size: 14px;
  color: var(--si-mute);
}
.seg.active {
  background: rgba(255, 192, 0, 0.18);
  color: var(--si-gold);
  border-color: var(--si-gold);
}
.seg input { accent-color: var(--si-gold); }
.duration-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.duration-input {
  max-width: 120px;
}

.preview {
  margin-top: 6px;
  display: flex;
  justify-content: center;
  background: rgba(0,0,0,0.25);
  padding: 8px;
  border-radius: 8px;
  max-height: 320px;
  overflow: hidden;
}
.preview :deep(img), .preview :deep(video) { max-height: 280px; max-width: 100%; }
.preview :deep(audio) { width: 100%; }
.muted { color: var(--si-mute); font-size: 13px; word-break: break-all; }
</style>
