<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import type { MediaItem } from '@/types'
import { displayUrl } from '@/media/store'

/** `image` replaces the set with the game's own picture. */
const props = defineProps<{ dim?: boolean; image?: MediaItem }>()
const src = ref('')

watchEffect(async () => {
  const url = props.image?.url
  const resolved = url ? await displayUrl(url) : ''
  if (url === props.image?.url) src.value = resolved
})
</script>

<template>
  <div class="backdrop" :class="{ dim, pictured: !!src }" aria-hidden="true">
    <img v-if="src" class="picture" :src="src" alt="" draggable="false" />
    <div class="beam beam-magenta" />
    <div class="beam beam-cyan" />
    <div class="floor" />
    <div class="fx" />
    <div class="bulbs" />
    <div class="vignette" />
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(110% 70% at 50% -10%, var(--set-glow, oklch(0.5 0.27 268 / 0.9)), transparent 70%),
    linear-gradient(180deg, var(--stage-top), var(--stage-bottom) 85%);
  transition: filter 0.8s ease;
}
.backdrop.dim {
  filter: brightness(0.7) saturate(0.9);
}
/* two stage spotlights sweeping slowly from the top corners */
.beam {
  position: absolute;
  top: -40vh;
  width: 90vmax;
  height: 140vh;
  mix-blend-mode: screen;
  filter: blur(30px);
  opacity: 0.5;
  transform-origin: 50% 0;
}
.beam-magenta {
  left: -30vmax;
  background: conic-gradient(from 168deg at 50% 0, transparent 0deg, color-mix(in oklch, var(--magenta) 70%, transparent) 12deg, transparent 24deg);
  animation: sweep-left 26s ease-in-out infinite alternate;
}
.beam-cyan {
  right: -30vmax;
  background: conic-gradient(from 168deg at 50% 0, transparent 0deg, color-mix(in oklch, var(--cyan) 60%, transparent) 12deg, transparent 24deg);
  animation: sweep-right 31s ease-in-out infinite alternate;
}
.floor {
  position: absolute;
  inset: auto -10% -30vh;
  height: 60vh;
  background: radial-gradient(50% 50% at 50% 50%, oklch(0.55 0.25 268 / 0.45), transparent 70%);
  filter: blur(20px);
}
/* the row of bulbs along the top edge of the set */
.bulbs {
  position: absolute;
  inset: 0 0 auto;
  height: 10px;
  background: radial-gradient(circle at 50% 50%, oklch(0.95 0.08 90 / 0.85) 0 2px, transparent 3px) 0 0 / 28px 10px repeat-x;
  opacity: 0.35;
  animation: twinkle 3.2s steps(2, jump-none) infinite;
}
.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 90% at 50% 45%, transparent 55%, oklch(0.08 0.08 280 / 0.75));
}
@keyframes sweep-left {
  from { transform: rotate(-18deg); }
  to { transform: rotate(14deg); }
}
@keyframes sweep-right {
  from { transform: rotate(16deg); }
  to { transform: rotate(-12deg); }
}
@keyframes twinkle {
  from { opacity: 0.25; }
  to { opacity: 0.45; }
}
@media (prefers-reduced-motion: reduce) {
  .beam, .bulbs { animation: none; }
}
.picture {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* a picture of their own is the whole set; the vignette stays so text keeps its contrast */
.pictured .beam,
.pictured .floor,
.pictured .bulbs,
[data-look='classic'] .beam {
  display: none;
}
[data-look='neon'] .bulbs {
  display: none;
}
[data-look='neon'] .beam {
  opacity: 0.7;
}

/* each style's own set dressing lives in .fx; the studio has none */
.fx {
  position: absolute;
  inset: 0;
}
[data-look='retro'] .beam,
[data-look='winter'] .beam,
[data-look='chalk'] .beam,
[data-look='chalk'] .bulbs,
[data-look='chalk'] .floor,
[data-look='pixel'] .beam,
[data-look='noir'] .beam,
[data-look='noir'] .bulbs,
[data-look='space'] .beam,
[data-look='space'] .bulbs,
[data-look='halloween'] .beam,
[data-look='contrast'] .beam,
[data-look='contrast'] .floor,
[data-look='contrast'] .bulbs,
[data-look='contrast'] .vignette,
[data-look='contrast'] .fx {
  display: none;
}
/* retro: the scan lines and rounded corners of a tube set */
[data-look='retro'] .fx {
  background: repeating-linear-gradient(180deg, oklch(0 0 0 / 0.28) 0 1px, transparent 1px 4px);
}
[data-look='retro'] .vignette {
  background: radial-gradient(110% 100% at 50% 50%, transparent 62%, oklch(0.05 0.02 30 / 0.95) 82%);
}
/* winter: a garland of colored lights and two layers of snow falling at different speeds */
[data-look='winter'] .bulbs {
  height: 18px;
  opacity: 0.95;
  background:
    radial-gradient(circle, oklch(0.75 0.2 25) 0 4px, transparent 5px) 0 0 / 120px 18px repeat-x,
    radial-gradient(circle, oklch(0.88 0.17 90) 0 4px, transparent 5px) 30px 0 / 120px 18px repeat-x,
    radial-gradient(circle, oklch(0.78 0.17 150) 0 4px, transparent 5px) 60px 0 / 120px 18px repeat-x,
    radial-gradient(circle, oklch(0.75 0.14 240) 0 4px, transparent 5px) 90px 0 / 120px 18px repeat-x;
  animation-duration: 1.6s;
}
[data-look='winter'] .fx {
  background:
    radial-gradient(circle, oklch(1 0 0 / 0.9) 0 1.5px, transparent 2.5px) 0 0 / 90px 90px,
    radial-gradient(circle, oklch(1 0 0 / 0.6) 0 1px, transparent 2px) 40px 30px / 60px 60px,
    radial-gradient(circle, oklch(1 0 0 / 0.75) 0 2.5px, transparent 3.5px) 20px 50px / 170px 170px;
  animation: snow 14s linear infinite;
}
@keyframes snow {
  to { background-position: 30px 90px, 20px 90px, 60px 220px; }
}
/* chalk: smudges of half-wiped chalk */
[data-look='chalk'] .fx {
  background:
    radial-gradient(40% 18% at 20% 30%, oklch(1 0 0 / 0.05), transparent 70%),
    radial-gradient(35% 14% at 75% 65%, oklch(1 0 0 / 0.045), transparent 70%),
    radial-gradient(30% 10% at 55% 15%, oklch(1 0 0 / 0.04), transparent 70%);
}
/* pixels: a coarse grid and square bulbs */
[data-look='pixel'] .fx {
  background:
    linear-gradient(90deg, oklch(1 0 0 / 0.04) 1px, transparent 1px) 0 0 / 32px 32px,
    linear-gradient(180deg, oklch(1 0 0 / 0.04) 1px, transparent 1px) 0 0 / 32px 32px;
}
[data-look='pixel'] .bulbs {
  height: 8px;
  background: linear-gradient(90deg, oklch(0.9 0.15 90) 0 8px, transparent 8px) 0 0 / 24px 8px repeat-x;
}
/* noir: one lamp hanging over the board */
[data-look='noir'] .fx {
  background:
    conic-gradient(from 160deg at 50% -4%, transparent 0deg, oklch(0.95 0.03 90 / 0.14) 12deg, oklch(0.95 0.03 90 / 0.14) 28deg, transparent 40deg),
    radial-gradient(30% 12% at 50% 0, oklch(0.95 0.04 90 / 0.35), transparent 70%);
  filter: blur(6px);
}
/* space: stars drifting slowly, the near ones faster */
[data-look='space'] .fx {
  background:
    radial-gradient(circle, oklch(1 0 0 / 0.9) 0 1px, transparent 1.5px) 0 0 / 120px 120px,
    radial-gradient(circle, oklch(0.9 0.05 230 / 0.7) 0 1px, transparent 1.5px) 50px 70px / 80px 80px,
    radial-gradient(circle, oklch(1 0 0 / 0.95) 0 1.5px, transparent 2.5px) 20px 30px / 230px 230px;
  animation: drift 120s linear infinite;
}
@keyframes drift {
  to { background-position: -240px 0, -320px 70px, -920px 30px; }
}
/* halloween: fog rolling over the floor */
[data-look='halloween'] .fx {
  inset: auto -20% -10vh;
  height: 45vh;
  background:
    radial-gradient(40% 50% at 30% 70%, oklch(0.8 0.03 300 / 0.28), transparent 70%),
    radial-gradient(45% 45% at 70% 80%, oklch(0.8 0.03 300 / 0.22), transparent 70%);
  filter: blur(18px);
  animation: fog 18s ease-in-out infinite alternate;
}
@keyframes fog {
  to { transform: translateX(8%); }
}
@media (prefers-reduced-motion: reduce) {
  .fx { animation: none !important; }
}

</style>
