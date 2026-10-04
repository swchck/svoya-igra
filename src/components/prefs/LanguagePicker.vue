<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { LOCALES, setLocale, type Locale } from '@/i18n'
import LocaleFlag from './LocaleFlag.vue'

defineProps<{ size?: 'large' | 'compact' }>()
const emit = defineEmits<{ (e: 'pick', locale: Locale): void }>()
const { locale } = useI18n()

async function pick(code: Locale) {
  await setLocale(code)
  emit('pick', code)
}
</script>

<template>
  <div class="picker" :class="size ?? 'compact'" role="radiogroup">
    <button
      v-for="l in LOCALES"
      :key="l.code"
      type="button"
      role="radio"
      class="choice"
      :class="{ on: locale === l.code }"
      :aria-checked="locale === l.code"
      :lang="l.code"
      @click="pick(l.code)"
    >
      <span class="flag-frame"><LocaleFlag :locale="l.code" /></span>
      <span class="label">{{ l.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: clamp(12px, 2.5vw, 32px);
}
.choice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  border: 1px solid oklch(1 0 0 / 0.12);
  background: oklch(0.2 0.14 272 / 0.5);
  color: var(--foreground);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.choice:hover {
  transform: translateY(-4px);
  border-color: color-mix(in oklch, var(--gold) 60%, transparent);
}
.choice:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}
.choice.on {
  border-color: var(--gold);
  box-shadow: 0 0 0 2px var(--gold), 0 20px 50px -20px color-mix(in oklch, var(--gold) 70%, transparent);
}
.flag-frame {
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 14px 34px -14px oklch(0 0 0 / 0.8), inset 0 0 0 1px oklch(1 0 0 / 0.15);
}
.large .flag-frame {
  width: clamp(150px, min(22vw, 30vh), 260px);
  aspect-ratio: 3 / 2;
}
.compact .flag-frame {
  width: 96px;
  aspect-ratio: 3 / 2;
  border-radius: 8px;
}
.label {
  font-family: var(--font-display);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.large .label {
  font-size: clamp(20px, 3.2vh, 30px);
}
.compact .label {
  font-size: 16px;
}
@media (prefers-reduced-motion: reduce) {
  .choice { transition: none; }
}
</style>
