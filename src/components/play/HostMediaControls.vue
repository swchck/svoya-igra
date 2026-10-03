<script setup lang="ts">
import { Clapperboard, Image as ImageIcon, MonitorPlay, Music, Pause, Play, RotateCcw } from '@lucide/vue'
import type { MediaItem } from '@/types'
import { formatTime, segmentOf } from '@/media/segment'
import type { MediaAction, MediaStatus } from '@/play/mediaControl'
import IconButton from '@/components/IconButton.vue'

defineProps<{ items: MediaItem[]; status: Record<string, MediaStatus> }>()
defineEmits<{ (e: 'action', id: string, action: MediaAction): void }>()

const KIND = {
  image: { icon: ImageIcon, label: 'Картинка' },
  audio: { icon: Music, label: 'Звук' },
  video: { icon: Clapperboard, label: 'Видео' },
  youtube: { icon: MonitorPlay, label: 'YouTube' },
} as const

function describe(item: MediaItem): string {
  const { start, end } = segmentOf(item)
  const label = item.kind === 'youtube' && item.mode === 'audio' ? 'YouTube, только звук' : KIND[item.kind].label
  if (item.kind === 'image') return label
  if (end !== undefined) return `${label}, ${formatTime(start)}–${formatTime(end)}`
  return start ? `${label}, с ${formatTime(start)}` : label
}
</script>

<template>
  <ul class="grid gap-2">
    <li
      v-for="item in items"
      :key="item.id"
      class="flex items-center gap-3 rounded-xl border border-border bg-night/40 px-3 py-2"
      :class="{ 'border-cyan/70': status[item.id]?.playing }"
    >
      <component :is="KIND[item.kind].icon" class="size-5 shrink-0 text-gold" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm">{{ describe(item) }}</span>
        <span v-if="status[item.id]?.blocked" class="block text-xs text-magenta">
          Не запускается без клика: нажмите на плеер на экране игры
        </span>
        <span v-else-if="status[item.id]?.playing" class="block text-xs text-cyan">Играет</span>
      </span>
      <template v-if="item.kind !== 'image' && status[item.id]">
        <IconButton
          v-if="status[item.id].playing"
          label="Пауза"
          variant="secondary"
          @click="$emit('action', item.id, 'pause')"
        ><Pause /></IconButton>
        <IconButton v-else label="Воспроизвести" variant="default" @click="$emit('action', item.id, 'play')"><Play /></IconButton>
        <IconButton label="С начала отрезка" variant="ghost" @click="$emit('action', item.id, 'restart')"><RotateCcw /></IconButton>
      </template>
    </li>
  </ul>
</template>
