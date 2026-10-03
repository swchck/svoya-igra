<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch, watchEffect } from 'vue'
import { Play } from '@lucide/vue'
import type { MediaItem } from '../types'
import { parseYoutubeUrl } from '../game/youtube'
import { segmentOf } from '../media/segment'
import { displayUrl } from '../media/store'
import { MEDIA_REGISTRY, type MediaAction } from '../play/mediaControl'
import YouTubeEmbed from './YouTubeEmbed.vue'
import SoundCard from './SoundCard.vue'

const props = defineProps<{
  item: MediaItem
  autoplay?: boolean
  /** Editor preview: native controls, and YouTube stays a thumbnail until clicked. */
  preview?: boolean
}>()

const src = ref<string | null>(null)
watchEffect(async (onCleanup) => {
  let stale = false
  onCleanup(() => (stale = true))
  src.value = null
  const url = await displayUrl(props.item.url)
  if (!stale) src.value = url
})

const segment = computed(() => segmentOf(props.item))
const youtube = computed(() => (props.item.kind === 'youtube' ? parseYoutubeUrl(props.item.url) : null))
const playerRequested = ref(false)

const media = ref<HTMLMediaElement | null>(null)
const youtubePlayer = ref<InstanceType<typeof YouTubeEmbed> | null>(null)
const playing = ref(false)
const blocked = ref(false)
const elapsed = ref(0)
const clipLength = ref(0)

async function playNative(fromStart = false) {
  const el = media.value
  if (!el) return
  const { start, end } = segment.value
  if (fromStart || el.ended || el.currentTime < start - 0.25 || (end !== undefined && el.currentTime >= end - 0.1)) {
    el.currentTime = start
  }
  try {
    await el.play()
    blocked.value = false
  } catch (err) {
    if ((err as DOMException).name === 'NotAllowedError') blocked.value = true
  }
}

function run(action: MediaAction) {
  if (props.item.kind === 'youtube') return youtubePlayer.value?.run(action)
  if (action === 'pause') media.value?.pause()
  else playNative(action === 'restart')
}

function onMetadata() {
  const el = media.value
  if (!el) return
  const { start, end } = segment.value
  clipLength.value = Math.max(0, (end ?? el.duration) - start)
  el.currentTime = start
  // the autoplay attribute would start at 0 before the seek lands, so start by hand
  if (props.autoplay && !props.preview) playNative()
}

function onTimeUpdate() {
  const el = media.value
  if (!el) return
  const { start, end } = segment.value
  elapsed.value = Math.max(0, el.currentTime - start)
  if (end !== undefined && el.currentTime >= end) el.pause()
}

function onPlay() {
  playing.value = true
  const el = media.value
  const { start, end } = segment.value
  // native controls in the editor can start anywhere; keep playback inside the segment
  if (el && (el.currentTime < start - 0.25 || (end !== undefined && el.currentTime >= end))) el.currentTime = start
}

const registry = props.preview ? undefined : inject(MEDIA_REGISTRY, undefined)
const playable = computed(() => props.item.kind !== 'image')
let unregister: (() => void) | undefined
watch(
  () => [props.item.id, playable.value] as const,
  ([id, can]) => {
    unregister?.()
    unregister = registry && can ? registry.register(id, { run }) : undefined
  },
  { immediate: true },
)
watch([playing, blocked], ([p, b]) => registry?.report(props.item.id, { playing: p, blocked: b }))
onBeforeUnmount(() => unregister?.())
</script>

<template>
  <template v-if="item.kind === 'youtube'">
    <button
      v-if="preview && youtube && !playerRequested"
      class="yt-facade"
      :style="{ backgroundImage: `url(https://i.ytimg.com/vi/${youtube.id}/hqdefault.jpg)` }"
      aria-label="Загрузить плеер YouTube"
      @click="playerRequested = true"
    >
      <span class="yt-facade-play"><Play class="size-6" /></span>
    </button>
    <YouTubeEmbed
      v-else
      ref="youtubePlayer"
      :url="item.url"
      :mode="item.mode ?? 'video'"
      :start="segment.start"
      :end="segment.end"
      :autoplay="preview ? false : autoplay"
      @status="(s) => ((playing = s.playing), (blocked = s.blocked))"
    />
  </template>
  <template v-else-if="src">
    <img v-if="item.kind === 'image'" :src="src" alt="" class="media-img" />
    <template v-else-if="preview">
      <audio
        v-if="item.kind === 'audio'"
        ref="media"
        :src="src"
        controls
        @loadedmetadata="onMetadata"
        @timeupdate="onTimeUpdate"
        @play="onPlay"
        @pause="playing = false"
      />
      <video
        v-else
        ref="media"
        :src="src"
        controls
        class="media-video"
        @loadedmetadata="onMetadata"
        @timeupdate="onTimeUpdate"
        @play="onPlay"
        @pause="playing = false"
      />
    </template>
    <template v-else-if="item.kind === 'audio'">
      <audio
        ref="media"
        :src="src"
        @loadedmetadata="onMetadata"
        @timeupdate="onTimeUpdate"
        @play="onPlay"
        @pause="playing = false"
      />
      <SoundCard
        :playing="playing"
        :blocked="blocked"
        :elapsed="elapsed"
        :length="clipLength"
        label="Звук"
        @toggle="run(playing ? 'pause' : 'play')"
      />
    </template>
    <div v-else class="stage-video" @click="run(playing ? 'pause' : 'play')">
      <video
        ref="media"
        :src="src"
        class="media-video"
        playsinline
        @loadedmetadata="onMetadata"
        @timeupdate="onTimeUpdate"
        @play="onPlay"
        @pause="playing = false"
      />
      <span v-if="!playing" class="stage-video-play" aria-hidden="true"><Play class="size-10 translate-x-0.5" /></span>
      <span class="stage-video-track" aria-hidden="true">
        <span :style="{ width: `${clipLength ? Math.min(100, (elapsed / clipLength) * 100) : 0}%` }" />
      </span>
    </div>
  </template>
  <span v-else-if="src === ''" class="missing">Файл не найден</span>
</template>

<style scoped>
.missing {
  color: var(--muted-foreground);
  font-style: italic;
  padding: 12px;
}
.media-img,
.media-video {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 18px;
}
.stage-video {
  position: relative;
  display: grid;
  place-items: center;
  max-width: 100%;
  max-height: 100%;
  cursor: pointer;
}
.stage-video .media-video {
  box-shadow: 0 30px 80px -30px oklch(0.05 0.1 280 / 0.9);
}
.stage-video-play {
  position: absolute;
  display: grid;
  place-items: center;
  width: 96px;
  aspect-ratio: 1;
  border-radius: 999px;
  background: var(--gold);
  color: var(--night);
  box-shadow: 0 10px 40px -10px oklch(0 0 0 / 0.7);
}
.stage-video-track {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 12px;
  height: 4px;
  border-radius: 2px;
  background: oklch(1 0 0 / 0.2);
  overflow: hidden;
}
.stage-video-track span {
  display: block;
  height: 100%;
  background: var(--gold);
  transition: width 0.25s linear;
}
.yt-facade {
  position: relative;
  width: min(480px, 100%);
  aspect-ratio: 16 / 9;
  border: 0;
  border-radius: 12px;
  background: #000 center / cover no-repeat;
  cursor: pointer;
}
.yt-facade-play {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  width: 68px;
  height: 48px;
  border-radius: 12px;
  background: rgba(220, 0, 0, 0.9);
  color: #fff;
  display: grid;
  place-items: center;
}
</style>
