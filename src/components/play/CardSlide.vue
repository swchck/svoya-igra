<script setup lang="ts">
import { computed } from 'vue'
import type { MediaItem } from '@/types'
import MediaView from '@/components/MediaView.vue'
import FitText from './FitText.vue'

const props = defineProps<{
  variant: 'question' | 'answer'
  text: string
  media?: MediaItem[]
  /** Theme name, or the kind of question when it is special. */
  topic?: string
  /** What the question is worth right now. */
  amount?: number
  /** Who answers alone, after an auction or a cat in the bag. */
  holder?: string
}>()

const hasMedia = computed(() => !!props.media?.length)
</script>

<template>
  <section class="card" :class="variant">
    <header v-if="topic || amount !== undefined || holder" class="plate">
      <span v-if="topic" class="topic">{{ topic }}</span>
      <span v-if="holder" class="holder">{{ holder }}</span>
      <span v-if="amount !== undefined" class="amount">{{ amount }}</span>
    </header>
    <p v-if="variant === 'answer'" class="answer-label">Правильный ответ</p>
    <FitText
      :text="text"
      :share="hasMedia ? (variant === 'answer' ? 0.24 : 0.36) : 0.72"
      :max="variant === 'answer' ? 96 : 72"
      :class="variant === 'answer' ? 'answer-text' : 'question-text'"
    />
    <div v-if="hasMedia" class="media">
      <MediaView :items="media!" autoplay />
    </div>
    <div class="dock"><slot /></div>
  </section>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 2vh, 24px);
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  max-width: 1400px;
  padding: clamp(8px, 2vh, 24px) clamp(16px, 4vw, 64px);
  text-align: center;
}
.plate {
  flex: none;
  display: flex;
  align-items: stretch;
  border-radius: 999px;
  overflow: hidden;
  font-family: var(--font-display);
  font-size: clamp(15px, 1.7vw, 26px);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  box-shadow: 0 10px 30px -14px oklch(0.05 0.1 280 / 0.9);
  animation: plate-in 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}
.plate > span {
  padding: 0.3em 1em;
}
.topic {
  background: oklch(0.28 0.18 285);
  color: var(--foreground);
}
.holder {
  background: var(--cyan);
  color: var(--night);
}
.amount {
  background: var(--gold);
  color: var(--night);
  font-weight: 700;
}
.question-text {
  font-family: var(--font-serif);
  font-weight: 700;
  line-height: 1.18;
  text-shadow: 0 4px 24px oklch(0.1 0.12 274 / 0.6);
  animation: text-in 0.6s 0.15s ease-out both;
}
.answer-label {
  flex: none;
  color: var(--cyan);
  font-family: var(--font-display);
  font-size: clamp(14px, 1.4vw, 22px);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  animation: text-in 0.4s ease-out both;
}
.answer-text {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.05;
  text-transform: uppercase;
  color: var(--gold);
  text-shadow: 0 0 30px color-mix(in oklch, var(--gold) 45%, transparent), 0 4px 0 oklch(0.35 0.12 60 / 0.7);
  animation: flip-in 0.75s cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
  transform-origin: 50% 0;
}
.media {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  container-type: size;
  animation: text-in 0.6s 0.3s ease-out both;
}
.dock {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.dock:empty {
  display: none;
}
@keyframes plate-in {
  from { opacity: 0; transform: translateY(-12px) scale(0.9); }
}
@keyframes text-in {
  from { opacity: 0; transform: translateY(14px); }
}
@keyframes flip-in {
  0% { opacity: 0; transform: perspective(900px) rotateX(-80deg); }
  60% { opacity: 1; }
  100% { transform: perspective(900px) rotateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .plate, .question-text, .answer-label, .answer-text, .media { animation: none; }
}
</style>
