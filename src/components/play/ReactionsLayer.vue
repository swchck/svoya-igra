<script setup lang="ts">
import { ref } from 'vue'

/** How long one reaction floats, ms. */
const FLOAT_MS = 3200
/** Reactions on screen at once; a crowd tapping away mustn't bury the stage. */
const MAX_SHOWN = 40

interface Bubble {
  id: number
  emoji: string
  /** Horizontal start, percent of the width. */
  x: number
  /** Sideways sway, px. */
  drift: number
}

const bubbles = ref<Bubble[]>([])
let next = 0

/** Floats a spectator's reaction up the side of the stage. */
function add(emoji: string) {
  if (bubbles.value.length >= MAX_SHOWN) return
  const id = next++
  // the edges, so reactions never cover the question in the middle
  const side = Math.random() < 0.5 ? 2 + Math.random() * 14 : 84 + Math.random() * 14
  bubbles.value.push({ id, emoji, x: side, drift: (Math.random() - 0.5) * 80 })
  setTimeout(() => (bubbles.value = bubbles.value.filter((b) => b.id !== id)), FLOAT_MS)
}

defineExpose({ add })
</script>

<template>
  <div class="reactions" aria-hidden="true">
    <span
      v-for="b in bubbles"
      :key="b.id"
      class="bubble"
      :style="{ left: `${b.x}%`, '--drift': `${b.drift}px`, animationDuration: `${FLOAT_MS}ms` }"
    >{{ b.emoji }}</span>
  </div>
</template>

<style scoped>
.reactions {
  position: fixed;
  inset: 0;
  z-index: 40;
  overflow: hidden;
  pointer-events: none;
}
.bubble {
  position: absolute;
  bottom: -60px;
  font-size: clamp(32px, 4vw, 56px);
  animation: float-up ease-out forwards;
  filter: drop-shadow(0 4px 10px oklch(0 0 0 / 0.35));
}
@keyframes float-up {
  0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
  12% { opacity: 1; transform: translate(calc(var(--drift) * 0.2), -12vh) scale(1.1); }
  100% { transform: translate(var(--drift), -78vh) scale(0.9); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes float-up {
    0%, 100% { transform: translateY(-40vh); opacity: 0; }
    20%, 70% { opacity: 1; }
  }
}
</style>
