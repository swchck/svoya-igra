<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  /** The player who pressed first; a new one sets off the flash. */
  name?: string
  color?: string
}>()

/** How long the name stays up before the stage gives way again, ms. */
const FLASH_MS = 1400

const shown = ref<{ name: string; color: string; key: number } | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.name,
  (name) => {
    clearTimeout(timer)
    if (!name) {
      shown.value = null
      return
    }
    shown.value = { name, color: props.color ?? 'var(--gold)', key: Date.now() }
    timer = setTimeout(() => (shown.value = null), FLASH_MS)
  },
)
</script>

<template>
  <Transition name="flash">
    <div v-if="shown" :key="shown.key" class="buzz-flash" :style="{ '--pc': shown.color }" role="status" aria-live="assertive">
      <span class="name">{{ shown.name }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.buzz-flash {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  pointer-events: none;
  background: radial-gradient(60% 50% at 50% 50%, color-mix(in oklch, var(--pc) 45%, transparent), transparent 75%);
  box-shadow: inset 0 0 0 clamp(6px, 1vw, 14px) var(--pc);
}
.name {
  padding: 0.2em 0.8em;
  border-radius: 999px;
  background: var(--pc);
  color: var(--night);
  font-family: var(--font-display);
  font-size: calc(clamp(28px, 6vw, 96px) * var(--stage-scale, 1));
  letter-spacing: 0.04em;
  text-transform: uppercase;
  box-shadow: 0 0 80px var(--pc);
  animation: pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.4) both;
}
.flash-leave-active {
  transition: opacity 0.4s ease;
}
.flash-leave-to {
  opacity: 0;
}
@keyframes pop {
  from { transform: scale(0.5); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .name { animation: none; }
}
</style>
