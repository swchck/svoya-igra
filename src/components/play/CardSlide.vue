<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MediaItem } from '@/types'
import MediaView from '@/components/MediaView.vue'
import { renderMarkdown } from '@/lib/markdown'
import FitText from './FitText.vue'
import { optionLetter } from '@/game/kinds'

const { t } = useI18n()
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
  /** Editor preview: clips wait for a click instead of starting on their own. */
  quiet?: boolean
  /** Hints opened so far, listed under the question. */
  hints?: string[]
  /** Choices shown under the text, A, B, C… */
  options?: string[]
  /** The right choice, lit up once the answer is revealed. */
  correct?: number
}>()

const html = computed(() => renderMarkdown(props.text))
const hasMedia = computed(() => !!props.media?.length)
const hasOptions = computed(() => !!props.options?.length)
const textShare = computed(() => {
  const full = hasMedia.value ? (props.variant === 'answer' ? 0.24 : 0.36) : 0.72
  const withExtras = hasOptions.value || !!props.hints?.length
  return withExtras ? full * 0.6 : full
})
</script>

<template>
  <section class="card" :class="variant">
    <header v-if="topic || amount !== undefined || holder" class="plate">
      <span v-if="topic" class="topic">{{ topic }}</span>
      <span v-if="holder" class="holder">{{ holder }}</span>
      <span v-if="amount !== undefined" class="amount">{{ amount }}</span>
    </header>
    <p v-if="variant === 'answer'" class="answer-label">{{ t('play.card.correctAnswer') }}</p>
    <FitText
      :html="html"
      :share="textShare"
      :max="variant === 'answer' ? 96 : 72"
      :class="variant === 'answer' ? 'answer-text' : 'question-text'"
    />
    <ol v-if="hints?.length" class="hints">
      <li v-for="(hint, i) in hints" :key="i"><span class="hint-n">{{ i + 1 }}</span>{{ hint }}</li>
    </ol>
    <ol v-if="hasOptions" class="options" :class="{ revealed: variant === 'answer' && correct !== undefined }">
      <li v-for="(option, i) in options" :key="i" :class="{ right: correct === i }">
        <span class="letter">{{ optionLetter(i) }}</span><span class="option-text">{{ option }}</span>
      </li>
    </ol>
    <div v-if="hasMedia" class="media">
      <MediaView :items="media!" :autoplay="!quiet" />
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
  font-size: calc(clamp(15px, 1.7vw, 26px) * var(--stage-scale, 1));
  letter-spacing: 0.06em;
  text-transform: uppercase;
  box-shadow: 0 10px 30px -14px oklch(0.05 0.1 280 / 0.9);
  animation: plate-in 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}
.plate > span {
  padding: 0.3em 1em;
}
.topic {
  background: var(--theme-bottom);
  color: var(--on-tile, var(--foreground));
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
/* glows meant for a dark room only blur letters on white */
.light-surface .question-text,
.light-surface .answer-text {
  text-shadow: none;
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
.hints {
  flex: none;
  display: grid;
  gap: 0.35em;
  width: min(100%, 1100px);
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-serif);
  font-size: calc(clamp(16px, 2.2vw, 36px) * var(--stage-scale, 1));
  text-align: left;
}
.hints li {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  padding: 0.3em 0.8em;
  border-left: 3px solid var(--cyan);
  border-radius: 0 0.5em 0.5em 0;
  background: color-mix(in oklch, var(--cyan) 10%, transparent);
  animation: text-in 0.5s ease-out both;
}
.hint-n {
  flex: none;
  font-family: var(--font-display);
  color: var(--cyan);
}
.options {
  flex: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(8px, 1.4vh, 16px) clamp(10px, 1.6vw, 24px);
  width: min(100%, 1100px);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: calc(clamp(16px, 2.1vw, 34px) * var(--stage-scale, 1));
  animation: text-in 0.6s 0.25s ease-out both;
}
.options li {
  display: flex;
  align-items: center;
  gap: 0.6em;
  min-width: 0;
  padding: 0.45em 0.8em;
  border-radius: 0.6em;
  border: 1px solid oklch(var(--tint) 0 0 / 0.18);
  background: linear-gradient(180deg, var(--tile), var(--tile-deep));
  text-align: left;
  transition: opacity 0.4s ease, transform 0.4s ease, box-shadow 0.4s ease;
}
.letter {
  flex: none;
  font-family: var(--font-display);
  color: var(--gold);
}
.option-text {
  min-width: 0;
  overflow-wrap: anywhere;
}
.revealed li:not(.right) {
  opacity: 0.35;
}
.revealed li.right {
  border-color: transparent;
  background: var(--gold);
  color: var(--night);
  box-shadow: 0 0 40px color-mix(in oklch, var(--gold) 55%, transparent);
  transform: scale(1.03);
}
.revealed li.right .letter {
  color: var(--night);
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
  .plate, .question-text, .answer-label, .answer-text, .media, .options, .hints li { animation: none; }
}
</style>
