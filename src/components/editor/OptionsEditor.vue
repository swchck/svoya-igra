<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ListChecks, Plus, X } from '@lucide/vue'
import type { Question } from '@/types'
import { Button } from '@/components/ui/button'
import { MAX_OPTIONS, optionLetter } from '@/game/kinds'

const { t } = useI18n()
const question = defineModel<Question>({ required: true })
const list = ref<HTMLElement | null>(null)

const STARTING_OPTIONS = 4

function focusOption(index: number) {
  nextTick(() => list.value?.querySelectorAll<HTMLInputElement>('input')[index]?.focus())
}

function start() {
  question.value.options = Array.from({ length: STARTING_OPTIONS }, () => '')
  focusOption(0)
}

function add() {
  const options = question.value.options
  if (!options || options.length >= MAX_OPTIONS) return
  options.push('')
  focusOption(options.length - 1)
}

function remove(index: number) {
  const q = question.value
  if (!q.options) return
  q.options.splice(index, 1)
  if (q.correctOption === index) delete q.correctOption
  else if (q.correctOption !== undefined && q.correctOption > index) q.correctOption -= 1
  if (!q.options.length) clear()
}

function clear() {
  delete question.value.options
  delete question.value.correctOption
}
</script>

<template>
  <div class="options">
    <Button v-if="!question.options" variant="outline" class="self-start" @click="start"><ListChecks />{{ t('editor.options.add') }}</Button>
    <template v-else>
      <div class="head">
        <span class="label">{{ t('editor.options.title') }}</span>
        <button type="button" class="drop-all" @click="clear">{{ t('editor.options.clear') }}</button>
      </div>
      <p class="hint">{{ t('editor.options.hint') }}</p>
      <ol ref="list" class="rows">
        <li v-for="(_, i) in question.options" :key="i" class="row" :class="{ right: question.correctOption === i }">
          <button
            type="button"
            class="letter"
            :aria-pressed="question.correctOption === i"
            :aria-label="t('editor.options.markRight', { letter: optionLetter(i) })"
            :title="t('editor.options.markRight', { letter: optionLetter(i) })"
            @click="question.correctOption = i"
          >
            <Check v-if="question.correctOption === i" class="size-4" /><template v-else>{{ optionLetter(i) }}</template>
          </button>
          <input
            v-model="question.options[i]"
            class="text"
            :aria-label="t('editor.options.option', { letter: optionLetter(i) })"
            :placeholder="t('editor.options.option', { letter: optionLetter(i) })"
            @keydown.enter.prevent="i === question.options.length - 1 ? add() : focusOption(i + 1)"
          />
          <button type="button" class="remove" :aria-label="t('editor.options.remove', { letter: optionLetter(i) })" @click="remove(i)"><X class="size-4" /></button>
        </li>
      </ol>
      <Button v-if="question.options.length < MAX_OPTIONS" variant="ghost" size="sm" class="self-start" @click="add"><Plus />{{ t('editor.options.more') }}</Button>
    </template>
  </div>
</template>

<style scoped>
.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.label {
  font-size: 14px;
  font-weight: 500;
}
.drop-all {
  border: 0;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 13px;
  cursor: pointer;
}
.drop-all:hover {
  color: var(--foreground);
}
.hint {
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.rows {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 6px;
}
.letter {
  display: grid;
  place-items: center;
  height: 36px;
  border-radius: 10px;
  border: 1px solid oklch(1 0 0 / 0.16);
  background: transparent;
  color: var(--muted-foreground);
  font-family: var(--font-display);
  font-size: 16px;
  cursor: pointer;
}
.letter:hover {
  color: var(--foreground);
}
.right .letter {
  border-color: transparent;
  background: oklch(0.75 0.15 155);
  color: var(--night);
}
.text {
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--input);
  background: oklch(0.14 0.1 274 / 0.55);
  color: inherit;
  font-size: 15px;
  outline: none;
}
.text:focus {
  border-color: var(--ring);
}
.right .text {
  border-color: color-mix(in oklch, oklch(0.75 0.15 155) 60%, transparent);
}
.remove {
  display: grid;
  place-items: center;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
}
.remove:hover {
  color: var(--foreground);
  background: oklch(1 0 0 / 0.08);
}
</style>
