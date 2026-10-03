<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Clapperboard, Image as ImageIcon, MonitorPlay, Music, Pause, Play, RotateCcw } from '@lucide/vue'
import type { MediaItem } from '@/types'
import { formatTime, segmentOf } from '@/media/segment'
import type { MediaAction, MediaStatus } from '@/play/mediaControl'
import IconButton from '@/components/IconButton.vue'

const { t } = useI18n()
defineProps<{ items: MediaItem[]; status: Record<string, MediaStatus> }>()
defineEmits<{ (e: 'action', id: string, action: MediaAction): void }>()

const KIND = {
  image: { icon: ImageIcon, label: 'media.kind.image' },
  audio: { icon: Music, label: 'media.kind.audio' },
  video: { icon: Clapperboard, label: 'media.kind.video' },
  youtube: { icon: MonitorPlay, label: 'media.kind.youtube' },
} as const

function describe(item: MediaItem): string {
  const { start, end } = segmentOf(item)
  const label = item.kind === 'youtube' && item.mode === 'audio' ? t('media.host.youtubeAudioOnly') : t(KIND[item.kind].label)
  if (item.kind === 'image') return label
  if (end !== undefined) return t('media.host.range', { label, start: formatTime(start), end: formatTime(end) })
  return start ? t('media.host.from', { label, start: formatTime(start) }) : label
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
          {{ t('media.host.blocked') }}
        </span>
        <span v-else-if="status[item.id]?.playing" class="block text-xs text-cyan">{{ t('media.host.playing') }}</span>
      </span>
      <template v-if="item.kind !== 'image' && status[item.id]">
        <IconButton
          v-if="status[item.id].playing"
          :label="t('media.player.pause')"
          variant="secondary"
          @click="$emit('action', item.id, 'pause')"
        ><Pause /></IconButton>
        <IconButton v-else :label="t('media.player.play')" variant="default" @click="$emit('action', item.id, 'play')"><Play /></IconButton>
        <IconButton :label="t('media.host.restart')" variant="ghost" @click="$emit('action', item.id, 'restart')"><RotateCcw /></IconButton>
      </template>
    </li>
  </ul>
</template>
