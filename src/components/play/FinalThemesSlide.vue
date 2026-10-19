<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'
import type { FinalQuestion } from '@/types'

const { t } = useI18n()
defineProps<{
  themes: FinalQuestion[]
  removed: string[]
  /** Who strikes the next theme. */
  picker?: string
  /** The host strikes themes here; otherwise the list is only shown. */
  interactive?: boolean
}>()
defineEmits<{ (e: 'remove', themeId: string): void }>()
</script>

<template>
  <section class="final-themes">
    <h2 class="title-shine heading">{{ t('play.finalThemes.title') }}</h2>
    <p v-if="picker" class="turn">{{ t('play.finalThemes.turn', { name: picker }) }}</p>
    <ul class="list">
      <li v-for="(f, i) in themes" :key="f.id" :class="{ gone: removed.includes(f.id) }" :style="{ '--i': i }">
        <button
          type="button"
          class="plate"
          :disabled="!interactive || removed.includes(f.id)"
          :aria-label="t('play.finalThemes.remove', { theme: f.theme })"
          @click="$emit('remove', f.id)"
        >
          <span class="name">{{ f.theme }}</span>
          <X v-if="interactive && !removed.includes(f.id)" class="cross" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.final-themes {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(12px, 2.4vh, 28px);
  height: 100%;
  padding: 2vh 4vw;
  text-align: center;
}
.heading {
  margin: 0;
  font-family: var(--font-display);
  font-size: calc(clamp(32px, 5vw, 80px) * var(--stage-scale, 1));
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.turn {
  margin: 0;
  font-size: calc(clamp(16px, 1.8vw, 28px) * var(--stage-scale, 1));
  color: var(--cyan);
}
.list {
  display: grid;
  gap: clamp(8px, 1.4vh, 16px);
  width: min(100%, 900px);
  margin: 0;
  padding: 0;
  list-style: none;
}
.list li {
  animation: plate-in 0.5s calc(var(--i) * 80ms) cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}
.plate {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.5em 2.2em;
  border-radius: 999px;
  border: 1px solid oklch(var(--tint) 0 0 / 0.18);
  background: linear-gradient(180deg, var(--tile), var(--tile-deep));
  color: var(--gold);
  font-family: var(--font-display);
  font-size: calc(clamp(20px, 2.8vw, 46px) * var(--stage-scale, 1));
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: opacity 0.5s ease, filter 0.5s ease, transform 0.5s ease;
}
.plate:not(:disabled) {
  cursor: pointer;
}
.plate:not(:disabled):hover {
  filter: brightness(1.15);
  transform: translateY(-2px);
}
.cross {
  position: absolute;
  right: 0.7em;
  width: 0.8em;
  height: 0.8em;
  color: var(--magenta);
  opacity: 0.7;
}
.gone .plate {
  opacity: 0.3;
  filter: grayscale(1);
  transform: scale(0.96);
}
.gone .name {
  text-decoration: line-through;
  text-decoration-thickness: 0.08em;
}
@keyframes plate-in {
  from { opacity: 0; transform: translateY(-12px) scale(0.92); }
}
@media (prefers-reduced-motion: reduce) {
  .list li { animation: none; }
}
</style>
