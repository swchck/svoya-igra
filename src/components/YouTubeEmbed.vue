<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MediaMode } from '@/types'
import { parseYoutubeUrl } from '@/game/youtube'
import type { MediaAction } from '@/play/mediaControl'
import { youtubeEmbedUrl } from '@/platform'
import SoundCard from './SoundCard.vue'

const { t } = useI18n()
const props = defineProps<{
  url: string
  /** `video` shows the player; `audio` keeps it running under a sound card. */
  mode?: MediaMode
  autoplay?: boolean
  start: number
  end?: number
  /** Player volume, 0 to 100; full when not given. */
  volume?: number
}>()
const emit = defineEmits<{
  (e: 'status', status: { playing: boolean; blocked: boolean }): void
  /** The video's full length in seconds, once the player reports it. */
  (e: 'duration', seconds: number): void
}>()

const iframe = ref<HTMLIFrameElement | null>(null)
const playing = ref(false)
// whether the player has run once; until then only a click inside the iframe can start it
const started = ref(false)
const blocked = ref(false)
const elapsed = ref(0)
const videoLength = ref(0)

const embed = computed(() => {
  const video = parseYoutubeUrl(props.url)
  if (!video) return null
  const params = new URLSearchParams({
    autoplay: props.autoplay ? '1' : '0',
    rel: '0',
    iv_load_policy: '3',
    playsinline: '1',
    enablejsapi: '1',
    start: String(Math.floor(props.start)),
  })
  // the player stops itself at `end`, unlike a timer it survives pauses and buffering
  if (props.end !== undefined) params.set('end', String(Math.ceil(props.end)))
  return youtubeEmbedUrl(video.id, params)
})

const length = computed(() => {
  const stop = props.end ?? videoLength.value
  return stop > props.start ? stop - props.start : 0
})

function command(func: string, args: unknown[] = []) {
  iframe.value?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
}

function run(action: MediaAction) {
  if (action === 'pause') return command('pauseVideo')
  if (action === 'restart' || (props.end !== undefined && elapsed.value >= length.value - 0.5)) {
    command('seekTo', [props.start, true])
  }
  command('playVideo')
}
defineExpose({ run })

function applyVolume() {
  if (props.volume !== undefined) command('setVolume', [props.volume])
}
watch(() => props.volume, applyVolume)

// iframe API: the player reports its state once the page says it is listening
let handshake: ReturnType<typeof setInterval> | undefined
let startWatch: ReturnType<typeof setTimeout> | undefined
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
  let data: { event?: string; info?: { playerState?: number; currentTime?: number; duration?: number } | number }
  try {
    data = JSON.parse(e.data)
  } catch {
    return
  }
  if (data.event === 'onReady' || data.event === 'initialDelivery') {
    clearInterval(handshake)
    applyVolume()
    // in the app's WebView YouTube refuses to start without a click inside the window
    if (props.autoplay && !startWatch) startWatch = setTimeout(() => (blocked.value = !playing.value), 4000)
  }
  const info = typeof data.info === 'object' ? data.info : undefined
  if (info?.currentTime !== undefined) elapsed.value = Math.max(0, info.currentTime - props.start)
  if (info?.duration) videoLength.value = info.duration
  const state = info?.playerState ?? (data.event === 'onStateChange' && typeof data.info === 'number' ? data.info : undefined)
  // 1 playing, 3 buffering; everything else means silence
  if (typeof state === 'number') {
    playing.value = state === 1 || state === 3
    if (state === 1) {
      blocked.value = false
      started.value = true
    }
  }
}

watch([playing, blocked], ([p, b]) => emit('status', { playing: p, blocked: b }))
watch(videoLength, (d) => emit('duration', d))

window.addEventListener('message', onMessage)
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  clearInterval(handshake)
  clearTimeout(startWatch)
})
</script>

<template>
  <div class="yt-wrap" :class="mode === 'audio' ? 'audio' : 'video'">
    <div v-if="!embed" class="yt-error">{{ t('media.player.youtubeInvalid') }}</div>
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
        <div v-if="blocked && mode !== 'audio'" class="yt-blocked">{{ t('media.player.tapVideoToStart') }}</div>
      </div>
      <!-- before the first start clicks pass through the card to the player, which counts as the
           click YouTube waits for; after that a click on a player overlay would do nothing, so the
           card drives the player through the iframe API -->
      <SoundCard
        v-if="mode === 'audio'"
        class="yt-cover"
        :passive="!started"
        :playing="playing"
        :blocked="blocked"
        :elapsed="elapsed"
        :length="length"
        :label="t('media.player.youtubeAudio')"
        @toggle="run(playing ? 'pause' : 'play')"
      />
    </template>
  </div>
</template>

<style scoped>
.yt-wrap {
  position: relative;
  width: 100%;
  display: grid;
  place-items: center;
}
/* --fit-w comes from a size container on the stage, so the player fits its height too */
.yt-frame-holder {
  position: relative;
  aspect-ratio: 16 / 9;
  width: min(100%, var(--fit-w, 100%));
  background: #000;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 30px 80px -30px oklch(0.05 0.1 280 / 0.9);
}
.yt-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.audio {
  width: min(720px, 100%);
  height: auto;
}
.audio .yt-frame-holder {
  position: absolute;
  inset: 0;
  width: auto;
  aspect-ratio: auto;
  border-radius: 28px;
}
.yt-cover {
  position: relative;
}
.yt-blocked {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  padding: 8px 16px;
  border-radius: 999px;
  background: oklch(0.15 0.1 280 / 0.85);
  color: var(--gold);
  font-family: var(--font-display);
  pointer-events: none;
}
.yt-error {
  color: var(--muted-foreground);
  padding: 20px;
}
</style>
