<script setup lang="ts">
import { computed, ref } from 'vue'
import YouTubeEmbed from './YouTubeEmbed.vue'

type Kind = 'image' | 'audio' | 'video' | 'youtube'
type Mode = 'video' | 'audio'

const props = defineProps<{
  label?: string
  url?: string
  kind?: Kind
  mode?: Mode
  duration?: number
}>()

const emit = defineEmits<{
  (e: 'update:url', v: string | undefined): void
  (e: 'update:kind', v: Kind | undefined): void
  (e: 'update:mode', v: Mode | undefined): void
  (e: 'update:duration', v: number | undefined): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function pick() { fileInput.value?.click() }

function isYoutubeUrl(u: string): boolean {
  return /(?:^|\.)youtube\.com|youtu\.be/.test(u)
}

function detectKind(input: { file?: File; url?: string }): Kind | undefined {
  if (input.url && isYoutubeUrl(input.url)) return 'youtube'
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

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const kind = detectKind({ file })
  if (!kind) {
    alert('Поддерживаются изображения, аудио и видео.')
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    emit('update:url', reader.result as string)
    emit('update:kind', kind)
    emit('update:mode', undefined)
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function setUrl(v: string) {
  if (!v) {
    emit('update:url', undefined)
    emit('update:kind', undefined)
    emit('update:mode', undefined)
    return
  }
  emit('update:url', v)
  const kind = detectKind({ url: v })
  if (kind) emit('update:kind', kind)
  if (kind === 'youtube' && !props.mode) emit('update:mode', 'video')
}

function setKind(v: Kind | '') {
  emit('update:kind', (v || undefined) as Kind | undefined)
  if (v !== 'youtube') emit('update:mode', undefined)
  else if (!props.mode) emit('update:mode', 'video')
}

function setMode(v: Mode) { emit('update:mode', v) }

function clear() {
  emit('update:url', undefined)
  emit('update:kind', undefined)
  emit('update:mode', undefined)
  emit('update:duration', undefined)
}

function setDuration(v: string) {
  const n = parseInt(v, 10)
  emit('update:duration', isFinite(n) && n > 0 ? n : undefined)
}

const isYoutube = computed(() => props.kind === 'youtube' || (props.url ? isYoutubeUrl(props.url) : false))
</script>

<template>
  <div class="media-picker">
    <label class="si-label">{{ label || 'Медиа' }}</label>
    <div class="si-row">
      <input
        class="si-input"
        :value="url"
        @input="setUrl(($event.target as HTMLInputElement).value)"
        placeholder="URL картинки / аудио / видео / YouTube"
      />
      <select
        class="si-select"
        style="max-width:160px"
        :value="kind || ''"
        @change="setKind(($event.target as HTMLSelectElement).value as Kind | '')"
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
        @input="setDuration(($event.target as HTMLInputElement).value)"
        placeholder="до конца"
      />
      <span class="muted">сек (0 / пусто = играть до конца)</span>
    </div>

    <div v-if="url" class="preview">
      <YouTubeEmbed v-if="isYoutube" :url="url" :mode="mode || 'video'" :autoplay="false" />
      <img v-else-if="kind === 'image'" :src="url" alt="" />
      <audio v-else-if="kind === 'audio'" :src="url" controls />
      <video v-else-if="kind === 'video'" :src="url" controls />
      <span v-else class="muted">{{ url }}</span>
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
.preview img, .preview video { max-height: 280px; max-width: 100%; }
.preview audio { width: 100%; }
.muted { color: var(--si-mute); font-size: 13px; word-break: break-all; }
</style>
