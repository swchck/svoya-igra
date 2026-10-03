<script setup lang="ts">
import type { MediaItem } from '@/types'
import { Badge } from '@/components/ui/badge'
import MediaView from '@/components/MediaView.vue'

defineProps<{
  variant: 'question' | 'answer'
  text: string
  media?: MediaItem[]
  badge?: string
}>()
</script>

<template>
  <section class="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-7 p-8 text-center">
    <Badge v-if="badge" class="px-4 py-1 font-display text-base tracking-widest uppercase">{{ badge }}</Badge>
    <div
      v-if="variant === 'question'"
      class="font-serif text-[clamp(28px,3.6vw,56px)] leading-tight font-bold whitespace-pre-wrap"
    >
      {{ text }}
    </div>
    <div v-else class="title-gold text-[clamp(36px,5.5vw,84px)] leading-tight whitespace-pre-wrap normal-case">
      {{ text }}
    </div>
    <MediaView v-if="media?.length" :items="media" :autoplay="true" />
    <div class="flex w-full flex-col items-center gap-4"><slot /></div>
  </section>
</template>
