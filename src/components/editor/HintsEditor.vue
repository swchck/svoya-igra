<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Lightbulb, Plus, X } from '@lucide/vue'
import type { Question } from '@/types'
import { Button } from '@/components/ui/button'
import MediaList from '@/components/MediaList.vue'
import { hintedValue } from '@/game/kinds'
import { makeEmptyHint } from '@/game/model'

const { t } = useI18n()
const question = defineModel<Question>({ required: true })
const list = ref<HTMLElement | null>(null)

const ladder = computed(() => {
  const count = question.value.hints?.length ?? 0
  return Array.from({ length: count + 1 }, (_, shown) => hintedValue(question.value.value, count, shown))
})

function add() {
  const hints = (question.value.hints ??= [])
  hints.push(makeEmptyHint())
  nextTick(() => list.value?.querySelectorAll<HTMLTextAreaElement>('textarea')[hints.length - 1]?.focus())
}

function remove(index: number) {
  const hints = question.value.hints
  if (!hints) return
  hints.splice(index, 1)
  if (!hints.length) delete question.value.hints
}
</script>

<template>
  <div class="hints">
    <Button v-if="!question.hints?.length" variant="outline" class="self-start" @click="add"><Lightbulb />{{ t('editor.hints.add') }}</Button>
    <template v-else>
      <div class="head">
        <span class="label">{{ t('editor.hints.title') }}</span>
        <span class="ladder" :aria-label="t('editor.hints.ladder')">{{ ladder.join(' → ') }}</span>
      </div>
      <p class="hint-text">{{ t('editor.hints.hint') }}</p>
      <ol ref="list" class="rows">
        <li v-for="(h, i) in question.hints" :key="h.id" class="row">
          <span class="n">{{ i + 1 }}</span>
          <div class="grid gap-2">
            <textarea v-model="h.text" class="text" rows="2" :aria-label="t('editor.hints.item', { n: i + 1 })" :placeholder="t('editor.hints.placeholder')" />
            <MediaList v-model="h.media" />
          </div>
          <button type="button" class="remove" :aria-label="t('editor.hints.remove', { n: i + 1 })" @click="remove(i)"><X class="size-4" /></button>
        </li>
      </ol>
      <Button variant="ghost" size="sm" class="self-start" @click="add"><Plus />{{ t('editor.hints.more') }}</Button>
    </template>
  </div>
</template>

<style scoped>
.hints {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
}
.label {
  font-size: 14px;
  font-weight: 500;
}
.ladder {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--gold);
}
.hint-text {
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.rows {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 32px;
  align-items: start;
  gap: 6px;
}
.n {
  padding-top: 8px;
  font-family: var(--font-display);
  color: var(--gold);
  text-align: center;
}
.text {
  width: 100%;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--input);
  background: oklch(0.14 0.1 274 / 0.55);
  color: inherit;
  font-family: var(--font-serif);
  font-size: 16px;
  resize: vertical;
  outline: none;
}
.text:focus {
  border-color: var(--ring);
}
.remove {
  display: grid;
  place-items: center;
  height: 32px;
  margin-top: 4px;
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
