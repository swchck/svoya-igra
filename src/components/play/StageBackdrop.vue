<script setup lang="ts">
defineProps<{ dim?: boolean }>()
</script>

<template>
  <div class="backdrop" :class="{ dim }" aria-hidden="true">
    <div class="beam beam-magenta" />
    <div class="beam beam-cyan" />
    <div class="floor" />
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
    radial-gradient(110% 70% at 50% -10%, oklch(0.5 0.27 268 / 0.9), transparent 70%),
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
</style>
