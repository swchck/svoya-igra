<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Pause, Play, Square } from '@lucide/vue'
import type { MediaMode } from '@/types'
import { Button } from '@/components/ui/button'
import { parseYoutubeUrl } from '@/game/youtube'
import { youtubeEmbedUrl } from '@/platform'

const props = defineProps<{
  url: string
  /** `video` shows the player; `audio` keeps it running behind a cover. */
  mode?: MediaMode
  autoplay?: boolean
  /** Seconds of playback from the start offset; unset plays to the end. */
  duration?: number
}>()

const iframe = ref<HTMLIFrameElement | null>(null)
const playing = ref(false)

const embed = computed(() => {
  const video = parseYoutubeUrl(props.url)
  if (!video) return null
  const params = new URLSearchParams({
    autoplay: props.autoplay ? '1' : '0',
    rel: '0',
    iv_load_policy: '3',
    playsinline: '1',
    enablejsapi: '1',
  })
  if (video.start) params.set('start', String(video.start))
  // the player stops itself at `end`, unlike a timer it survives pauses and buffering
  if (props.duration) params.set('end', String(video.start + props.duration))
  return youtubeEmbedUrl(video.id, params)
})

function send(func: 'pauseVideo' | 'playVideo' | 'stopVideo') {
  iframe.value?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*')
}

// iframe API: the player reports its state once the page says it is listening
let handshake: ReturnType<typeof setInterval> | undefined
function onLoad() {
  clearInterval(handshake)
  let tries = 0
  handshake = setInterval(() => {
    iframe.value?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', channel: 'widget' }), '*')
    if (++tries > 20) clearInterval(handshake)
  }, 250)
}

function onMessage(e: MessageEvent) {
  if (!iframe.value || e.source !== iframe.value.contentWindow || typeof e.data !== 'string') return
  let data: { event?: string; info?: { playerState?: number } | number }
  try {
    data = JSON.parse(e.data)
  } catch {
    return
  }
  if (data.event === 'onReady' || data.event === 'initialDelivery') clearInterval(handshake)
  const state = typeof data.info === 'object' ? data.info?.playerState : data.event === 'onStateChange' ? data.info : undefined
  // 1 playing, 3 buffering; everything else means silence
  if (typeof state === 'number') playing.value = state === 1 || state === 3
}

window.addEventListener('message', onMessage)
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  clearInterval(handshake)
})
</script>

<template>
  <div class="yt-wrap" :class="{ audio: mode === 'audio' }">
    <div v-if="!embed" class="yt-error">Не удалось разобрать ссылку YouTube.</div>
    <template v-else>
      <div class="yt-frame-holder">
        <iframe
          ref="iframe"
          class="yt-frame"
          :src="embed"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          frameborder="0"
          @load="onLoad"
        />
        <div v-if="mode === 'audio'" class="yt-audio-mask">
          <span class="yt-audio-icon">{{ playing ? '♪' : '⏸' }}</span>
          <span class="yt-audio-label">Аудио из YouTube</span>
        </div>
      </div>
      <div v-if="mode === 'audio'" class="yt-audio-controls">
        <Button v-if="playing" variant="secondary" @click="send('pauseVideo')"><Pause />Пауза</Button>
        <Button v-else variant="secondary" @click="send('playVideo')"><Play />Воспроизвести</Button>
        <Button variant="ghost" @click="send('stopVideo')"><Square />Стоп</Button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.yt-wrap {
  width: 100%;
  max-width: 960px;
}
.yt-frame-holder {
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}
.yt-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
/* In audio mode: keep iframe alive (so audio plays) but hide it visually */
.yt-wrap.audio .yt-frame-holder {
  aspect-ratio: auto;
  height: 96px;
}
.yt-wrap.audio .yt-frame {
  /* keep mounted but invisible to user; controls stay reachable on focus */
  opacity: 0.001;
  pointer-events: none;
}
.yt-audio-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(0,0,80,0.85), rgba(0,0,40,0.85));
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--gold);
  font-family: var(--font-display);
  font-size: 22px;
  pointer-events: none;
}
.yt-audio-icon {
  font-size: 32px;
}
.yt-audio-controls {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  justify-content: center;
}
.yt-error {
  color: var(--muted-foreground);
  padding: 20px;
}
</style>
