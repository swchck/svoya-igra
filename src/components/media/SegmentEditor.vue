<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Play, RotateCcw } from '@lucide/vue'
import type { MediaItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import MediaElement from '@/components/MediaElement.vue'
import TimeInput from '@/components/TimeInput.vue'
import { formatTime, segmentOf } from '@/media/segment'

const { t } = useI18n()
const props = defineProps<{ item: MediaItem }>()
const emit = defineEmits<{ (e: 'patch', p: Pick<MediaItem, 'start' | 'end'>): void }>()

const duration = ref(0)
const player = ref<InstanceType<typeof MediaElement> | null>(null)

const segment = computed(() => segmentOf(props.item))
const linkStart = computed(() => segmentOf({ ...props.item, start: undefined }).start)
const listenOnly = computed(() => props.item.kind === 'audio' || (props.item.kind === 'youtube' && props.item.mode === 'audio'))
const modified = computed(() => props.item.start !== undefined || props.item.end !== undefined)

// the thumbs follow the pointer through a draft; the item changes once on release, so the YouTube iframe reloads once
const draft = ref<number[] | null>(null)
const range = computed(() => draft.value ?? [segment.value.start, segment.value.end ?? duration.value])
const length = computed(() => Math.max(0, range.value[1] - range.value[0]))

function commit([from, to]: number[]) {
  draft.value = null
  emit('patch', {
    start: from === 0 && linkStart.value === 0 ? undefined : from,
    end: to >= duration.value ? undefined : to,
  })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="player" :class="{ wide: item.kind === 'audio' }">
      <MediaElement ref="player" :item="item" preview eager @duration="(d) => (duration = d)" />
    </div>

    <div class="flex items-center gap-3">
      <TimeInput
        class="w-[4.5rem] shrink-0"
        :label="t('media.segment.startLabel')"
        :model-value="item.start"
        :placeholder="formatTime(segment.start)"
        @update:model-value="(v) => emit('patch', { start: v, end: item.end })"
      />
      <Slider
        class="min-w-0 flex-1"
        :model-value="range"
        :min="0"
        :max="duration || 1"
        :step="1"
        :min-steps-between-thumbs="1"
        :disabled="!duration"
        :thumb-labels="[t('media.segment.thumbStart'), t('media.segment.thumbEnd')]"
        @update:model-value="(v) => (draft = v ?? null)"
        @value-commit="commit"
      />
      <TimeInput
        class="w-[4.5rem] shrink-0"
        :label="t('media.segment.endLabel')"
        :model-value="item.end"
        :placeholder="duration ? formatTime(duration) : t('media.segment.endPlaceholder')"
        @update:model-value="(v) => emit('patch', { start: item.start, end: v })"
      />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" @click="player?.run('restart')">
        <Play class="fill-current" />{{ listenOnly ? t('media.segment.listen') : t('media.segment.watch') }}
      </Button>
      <Button size="sm" variant="ghost" :disabled="!modified" @click="emit('patch', { start: undefined, end: undefined })">
        <RotateCcw />{{ t('media.segment.reset') }}
      </Button>
      <p class="ml-auto text-xs text-muted-foreground" aria-live="polite">
        {{ duration ? (modified ? t('media.segment.length', { n: formatTime(length) }) : t('media.segment.whole')) : t('media.segment.loading') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.player {
  --fit-w: 300px;
  display: flex;
  justify-content: flex-start;
}
.player.wide {
  display: block;
}
.player :deep(video) {
  max-height: 170px;
  border-radius: 12px;
}
.player :deep(audio) {
  width: 100%;
}
.player :deep(.yt-wrap) {
  place-items: start;
}
</style>
