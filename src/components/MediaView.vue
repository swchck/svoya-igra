<script setup lang="ts">
import type { MediaItem } from '../types'
import MediaElement from './MediaElement.vue'

defineProps<{
  items: MediaItem[]
  autoplay?: boolean
}>()
</script>

<template>
  <div class="m-view" :class="{ many: items.length > 1 }" :style="{ '--cols': Math.min(items.length, 3) }">
    <div v-for="it in items" :key="it.id" class="m-cell">
      <MediaElement :item="it" :autoplay="autoplay" />
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
.m-cell {
  width: 100%;
  display: flex;
  justify-content: center;
}
.m-view.many .m-cell {
  flex: 1 1 calc(100% / var(--cols) - 12px);
  min-width: 200px;
  width: auto;
}
.m-cell :deep(img),
.m-cell :deep(video) {
  max-width: 100%;
  max-height: 50vh;
  border-radius: 12px;
  object-fit: contain;
}
.m-view.many .m-cell :deep(img),
.m-view.many .m-cell :deep(video) { max-height: calc(48vh - var(--cols) * 4vh); }
.m-cell :deep(audio) { width: min(560px, 100%); }
</style>
