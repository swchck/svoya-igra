<script setup lang="ts">
import type { MediaItem } from '../../types'
import MediaView from '../MediaView.vue'

defineProps<{
  variant: 'question' | 'answer'
  text: string
  media?: MediaItem[]
  badge?: string
}>()
</script>

<template>
  <section class="slide card-slide">
    <div v-if="badge" class="badge">{{ badge }}</div>
    <div :class="variant === 'question' ? 'q-text' : 'a-text'">{{ text }}</div>
    <MediaView v-if="media?.length" :items="media" :autoplay="true" />
    <div class="actions"><slot /></div>
  </section>
</template>

<style scoped>
.card-slide {
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}
.badge {
  background: var(--si-gold);
  color: #1a1a4a;
  padding: 6px 18px;
  border-radius: 30px;
  font-family: var(--font-title);
  font-weight: 700;
  letter-spacing: 0.1em;
}
.q-text {
  font-weight: 700;
  font-size: clamp(28px, 4vw, 56px);
  line-height: 1.25;
  white-space: pre-wrap;
}
.a-text {
  font-family: var(--font-title);
  font-weight: 700;
  color: var(--si-gold);
  font-size: clamp(36px, 6vw, 80px);
  line-height: 1.2;
  white-space: pre-wrap;
}
.actions {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}
</style>
