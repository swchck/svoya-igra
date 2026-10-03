<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { parseYoutubeUrl } from '../game/youtube'
import { youtubeEmbedUrl } from '../platform'

const props = defineProps<{
  url: string
  /** 'video' = clean playback w/o titles & related; 'audio' = hide picture, only sound */
  mode?: 'video' | 'audio'
  autoplay?: boolean
  /** Auto-stop after this many seconds */
  duration?: number
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const isPlaying = ref(props.autoplay !== false)
let stopTimer: number | undefined

function armTimer() {
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = undefined }
  if (props.duration && props.duration > 0 && isPlaying.value) {
    stopTimer = window.setTimeout(() => {
      send('pauseVideo')
      isPlaying.value = false
    }, props.duration * 1000)
  }
}
watch(() => [props.duration, props.url], () => armTimer())
onBeforeUnmount(() => { if (stopTimer) clearTimeout(stopTimer) })

const embed = computed(() => {
  const parsed = parseYoutubeUrl(props.url)
  if (!parsed) return null
  const params = new URLSearchParams({
    autoplay: props.autoplay === false ? '0' : '1',
    modestbranding: '1',
    rel: '0',
    iv_load_policy: '3',
    showinfo: '0',
    playsinline: '1',
    fs: '1',
    controls: '1',
    enablejsapi: '1',
  })
  if (parsed.start) params.set('start', String(parsed.start))
  return youtubeEmbedUrl(parsed.id, params)
})

const isAudio = computed(() => props.mode === 'audio')

function send(cmd: 'pauseVideo' | 'playVideo' | 'stopVideo') {
  const w = iframeRef.value?.contentWindow
  if (!w) return
  w.postMessage(
    JSON.stringify({ event: 'command', func: cmd, args: [] }),
    '*',
  )
}

function togglePlay() {
  if (isPlaying.value) {
    send('pauseVideo')
    isPlaying.value = false
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = undefined }
  } else {
    send('playVideo')
    isPlaying.value = true
    armTimer()
  }
}

function stop() {
  send('stopVideo')
  isPlaying.value = false
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = undefined }
}

function onLoad() {
  // Iframe loaded; if autoplay enabled, arm the auto-stop timer.
  if (isPlaying.value) armTimer()
}
</script>

<template>
  <div class="yt-wrap" :class="{ audio: isAudio }">
    <div v-if="!embed" class="yt-error">Не удалось разобрать ссылку YouTube.</div>
    <template v-else>
      <div class="yt-frame-holder">
        <iframe
          ref="iframeRef"
          class="yt-frame"
          :src="embed"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          frameborder="0"
          @load="onLoad"
        />
        <div v-if="isAudio" class="yt-audio-mask">
          <span class="yt-audio-icon">{{ isPlaying ? '♪' : '⏸' }}</span>
          <span class="yt-audio-label">Аудио из YouTube</span>
        </div>
      </div>
      <div v-if="isAudio" class="yt-audio-controls">
        <button class="si-button" @click="togglePlay">
          {{ isPlaying ? '⏸ Пауза' : '▶ Воспроизвести' }}
        </button>
        <button class="si-button ghost" @click="stop">⏹ Остановить</button>
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
  color: var(--si-gold);
  font-family: var(--font-title);
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
  color: var(--si-mute);
  padding: 20px;
}
</style>
