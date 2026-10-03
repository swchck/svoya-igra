<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import type { MediaItem } from '../types'
import { parseYoutubeUrl } from '../game/youtube'
import { displayUrl } from '../media/store'
import YouTubeEmbed from './YouTubeEmbed.vue'

const props = defineProps<{
  item: MediaItem
  autoplay?: boolean
  /** Editor preview: YouTube stays a thumbnail until clicked, saving ~1 MB of player per item. */
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

const youtube = computed(() => (props.item.kind === 'youtube' ? parseYoutubeUrl(props.item.url) : null))
const playerRequested = ref(false)
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
      <span class="yt-facade-play">▶</span>
    </button>
    <YouTubeEmbed
      v-else
      :url="item.url"
      :mode="item.mode ?? 'video'"
      :duration="item.duration"
      :autoplay="preview ? false : autoplay"
    />
  </template>
  <template v-else-if="src">
    <img v-if="item.kind === 'image'" :src="src" alt="" />
    <audio v-else-if="item.kind === 'audio'" :src="src" controls :autoplay="autoplay" />
    <video v-else-if="item.kind === 'video'" :src="src" controls :autoplay="autoplay" />
  </template>
  <span v-else-if="src === ''" class="missing">Файл не найден</span>
</template>

<style scoped>
.missing {
  color: var(--si-mute);
  font-style: italic;
  padding: 12px;
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
  font-size: 22px;
  display: grid;
  place-items: center;
}
</style>
