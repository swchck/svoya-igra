<script setup lang="ts">
import type { MediaItem } from '../types'
import MediaElement from './MediaElement.vue'

defineProps<{
  items: MediaItem[]
  autoplay?: boolean
}>()
</script>

<template>
  <!-- each cell is a size container: pictures, videos and the YouTube player fit both ways -->
  <div class="m-view" :style="{ '--cols': Math.min(items.length, 3) }">
    <div v-for="it in items" :key="it.id" class="m-cell">
      <MediaElement :item="it" :autoplay="autoplay" />
    </div>
  </div>
</template>

<style scoped>
.m-view {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: clamp(8px, 1.4vw, 20px);
  width: 100%;
  height: 100%;
}
.m-cell {
  container-type: size;
  display: grid;
  place-items: center;
  min-height: 0;
  --fit-w: calc(100cqh * 16 / 9);
}
.m-cell :deep(img),
.m-cell :deep(.stage-video) {
  /* scale up or down to the largest size that fits the cell, so equal shapes look equal */
  width: min(100cqw, 100cqh * var(--ar, 1.5));
  height: auto;
  max-width: none;
  max-height: none;
}
.m-cell :deep(.stage-video video) {
  width: 100%;
  max-width: none;
  max-height: none;
}
.m-cell :deep(img),
.m-cell :deep(video) {
  box-shadow: 0 30px 80px -30px oklch(0.05 0.1 280 / 0.9);
}
</style>
