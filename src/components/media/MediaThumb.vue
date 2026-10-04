<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { ImageOff, Music, Play } from '@lucide/vue'
import type { MediaItem } from '@/types'
import { parseYoutubeUrl } from '@/game/youtube'
import { displayUrl } from '@/media/store'

const props = defineProps<{ item: MediaItem }>()

const src = ref<string | null>(null)
watchEffect(async (onCleanup) => {
  let stale = false
  onCleanup(() => (stale = true))
  src.value = null
  const url = await displayUrl(props.item.url)
  if (!stale) src.value = url
})

const youtubeId = computed(() => (props.item.kind === 'youtube' ? parseYoutubeUrl(props.item.url)?.id : undefined))
</script>

<template>
  <div class="thumb" :class="item.kind" aria-hidden="true">
    <template v-if="item.kind === 'audio'">
      <span class="bars"><i v-for="n in 9" :key="n" :style="{ '--h': `${[35, 70, 50, 90, 60, 80, 45, 65, 30][n - 1]}%` }" /></span>
      <Music class="glyph size-5" />
    </template>
    <img
      v-else-if="youtubeId"
      :src="`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`"
      alt=""
      loading="lazy"
    />
    <span v-else-if="src === ''" class="grid h-full place-items-center text-muted-foreground"><ImageOff class="size-5" /></span>
    <img v-else-if="item.kind === 'image' && src" :src="src" alt="" loading="lazy" />
    <video v-else-if="item.kind === 'video' && src" :src="`${src}#t=0.1`" muted preload="metadata" playsinline />
    <span v-if="item.kind === 'youtube' || item.kind === 'video'" class="badge" :class="{ yt: item.kind === 'youtube' }">
      <Play class="size-2.5 fill-current" />
    </span>
  </div>
</template>

<style scoped>
.thumb {
  position: relative;
  flex: none;
  width: 104px;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: 10px;
  background: oklch(0.12 0.08 274);
  box-shadow: inset 0 0 0 1px oklch(1 0 0 / 0.1);
}
.thumb img,
.thumb video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb.audio {
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, var(--tile), var(--tile-deep));
}
.bars {
  position: absolute;
  inset: 12% 10%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  opacity: 0.35;
}
.bars i {
  width: 5px;
  height: var(--h);
  border-radius: 3px;
  background: var(--gold);
}
.glyph {
  position: relative;
  color: var(--gold);
  filter: drop-shadow(0 2px 6px oklch(0 0 0 / 0.5));
}
.badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: oklch(0.12 0.08 274 / 0.8);
  color: #fff;
  backdrop-filter: blur(4px);
}
.badge.yt {
  background: rgba(220, 0, 0, 0.92);
}
</style>
