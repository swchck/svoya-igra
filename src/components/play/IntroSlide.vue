<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps<{
  title: string
  subtitle?: string
  /** Theme names announced one after another under the title. */
  themes?: string[]
  hint?: string
}>()
defineEmits<{ (e: 'next'): void }>()

const letters = computed(() => [...props.title])
const titleMs = computed(() => letters.value.length * 45 + 500)
</script>

<template>
  <section class="intro" role="button" tabindex="0" @click="$emit('next')" @keydown.enter="$emit('next')">
    <h1 class="title" :aria-label="title">
      <span
        v-for="(ch, i) in letters"
        :key="i"
        class="letter"
        :style="{ animationDelay: `${i * 45}ms` }"
        aria-hidden="true"
      >{{ ch }}</span>
    </h1>
    <p v-if="subtitle" class="subtitle" :style="{ animationDelay: `${titleMs}ms` }">{{ subtitle }}</p>
    <ul v-if="themes?.length" class="themes" :aria-label="t('play.intro.roundThemes')">
      <li
        v-for="(theme, i) in themes"
        :key="i"
        class="theme"
        :style="{ animationDelay: `${titleMs + i * 260}ms` }"
      >{{ theme }}</li>
    </ul>
    <p v-if="hint" class="hint">{{ hint }}</p>
  </section>
</template>

<style scoped>
.intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(16px, 3vh, 36px);
  height: 100%;
  padding: 2vh 4vw;
  text-align: center;
  cursor: pointer;
  outline: none;
}
.title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-size: clamp(48px, 9vw, 150px);
  line-height: 0.95;
  filter: drop-shadow(0 8px 26px oklch(0.1 0.12 274 / 0.75));
}
/* metal letters: each one carries its own vertical gradient, so they can fall in one by one */
.letter {
  display: inline-block;
  background: linear-gradient(180deg, oklch(0.98 0.07 95) 0%, var(--gold) 45%, var(--gold-deep) 100%);
  background-clip: text;
  color: transparent;
  white-space: pre;
  animation: drop 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.3) both;
}
.subtitle {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(20px, 2.4vw, 40px);
  color: var(--foreground);
  animation: fade-up 0.6s ease-out both;
}
.themes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: clamp(8px, 1.2vw, 16px);
  max-width: 1200px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.theme {
  padding: 0.45em 1.1em;
  border-radius: 999px;
  border: 1px solid color-mix(in oklch, var(--gold) 55%, transparent);
  background: linear-gradient(135deg, oklch(0.32 0.2 290 / 0.85), oklch(0.24 0.18 275 / 0.85));
  font-family: var(--font-display);
  font-size: clamp(16px, 1.9vw, 30px);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--gold);
  box-shadow: 0 12px 30px -16px oklch(0.05 0.1 280 / 0.9);
  animation: pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.4) both;
}
.hint {
  margin: 0;
  color: var(--muted-foreground);
  font-size: clamp(13px, 1.1vw, 17px);
  animation: fade-up 0.6s 1.2s ease-out both;
}
@keyframes drop {
  0% { opacity: 0; transform: translateY(-0.6em) rotate(-8deg) scale(1.3); }
  100% { opacity: 1; transform: none; }
}
@keyframes pop {
  0% { opacity: 0; transform: scale(0.4); }
  100% { opacity: 1; transform: none; }
}
@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
}
@media (prefers-reduced-motion: reduce) {
  .letter, .subtitle, .theme, .hint { animation: none; }
}
</style>
