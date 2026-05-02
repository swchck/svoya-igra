<script setup lang="ts">
import type { MediaItem } from '../types'
import YouTubeEmbed from './YouTubeEmbed.vue'

defineProps<{
  items?: MediaItem[]
  /** When true, autoplay audio/video/youtube */
  autoplay?: boolean
}>()
</script>

<template>
  <div v-if="items && items.length" class="m-view" :class="{ many: items.length > 1 }">
    <div v-for="it in items" :key="it.id" class="m-cell">
      <YouTubeEmbed
        v-if="it.kind === 'youtube'"
        :url="it.url"
        :mode="it.mode || 'video'"
        :duration="it.duration"
        :autoplay="autoplay"
      />
      <img v-else-if="it.kind === 'image'" :src="it.url" alt="" />
      <audio v-else-if="it.kind === 'audio'" :src="it.url" controls :autoplay="autoplay" />
      <video v-else-if="it.kind === 'video'" :src="it.url" controls :autoplay="autoplay" />
    </div>
  </div>
</template>

<style scoped>
.m-view {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 1100px;
}
.m-view.many .m-cell {
  flex: 1 1 calc(50% - 12px);
  min-width: 240px;
  max-width: 100%;
  display: flex;
  justify-content: center;
}
.m-cell img,
.m-cell video {
  max-width: 100%;
  max-height: 50vh;
  border-radius: 12px;
  object-fit: contain;
}
.m-cell audio { width: min(560px, 100%); }
.m-view:not(.many) .m-cell { width: 100%; display: flex; justify-content: center; }
.m-view.many .m-cell img,
.m-view.many .m-cell video { max-height: 36vh; }
</style>
