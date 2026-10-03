<script setup lang="ts">
import { computed, ref } from 'vue'
import { Cat, Gavel, GripVertical, Image as ImageIcon, Music, Plus, Trash2 } from '@lucide/vue'
import type { Question, Round } from '@/types'
import IconButton from '@/components/IconButton.vue'
import { isQuestionReady, makeEmptyQuestion, makeEmptyTheme, moveItemTo } from '@/game/model'

const round = defineModel<Round>('round', { required: true })
/** Id of the question open in the inspector. */
const selected = defineModel<string | null>('selected', { required: true })
const emit = defineEmits<{
  (e: 'remove-theme', index: number): void
  /** The user clicked a cell, as opposed to the selection changing on its own. */
  (e: 'picked'): void
}>()

const columns = computed(() => Math.max(1, ...round.value.themes.map((t) => t.questions.length)))

function hasSound(q: Question) {
  return [...(q.media ?? []), ...(q.answerMedia ?? [])].some((m) => m.kind !== 'image')
}
function hasPicture(q: Question) {
  return [...(q.media ?? []), ...(q.answerMedia ?? [])].some((m) => m.kind === 'image')
}

function addQuestion(themeIndex: number) {
  const questions = round.value.themes[themeIndex].questions
  const last = questions.at(-1)
  const q = makeEmptyQuestion(last ? last.value + 100 : 100)
  questions.push(q)
  selected.value = q.id
}

function addTheme() {
  const theme = makeEmptyTheme(`Тема ${round.value.themes.length + 1}`)
  theme.questions.splice(columns.value)
  round.value.themes.push(theme)
}

// native drag and drop: a question moves to the cell it is dropped on, a theme to the row
type Drag = { kind: 'question'; theme: number; index: number } | { kind: 'theme'; index: number }
const drag = ref<Drag | null>(null)
const over = ref<string | null>(null)

function startQuestion(e: DragEvent, theme: number, index: number) {
  drag.value = { kind: 'question', theme, index }
  e.dataTransfer?.setData('text/plain', '')
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function startTheme(e: DragEvent, index: number) {
  drag.value = { kind: 'theme', index }
  e.dataTransfer?.setData('text/plain', '')
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function end() {
  drag.value = null
  over.value = null
}

function dropOnQuestion(theme: number, index: number) {
  const d = drag.value
  end()
  if (d?.kind !== 'question') return
  const themes = round.value.themes
  if (d.theme === theme) {
    moveItemTo(themes[theme].questions, d.index, index)
  } else {
    const [q] = themes[d.theme].questions.splice(d.index, 1)
    themes[theme].questions.splice(index, 0, q)
  }
}
function dropOnTheme(index: number) {
  const d = drag.value
  end()
  if (d?.kind === 'theme') moveItemTo(round.value.themes, d.index, index)
  else if (d?.kind === 'question' && d.theme !== index) {
    const [q] = round.value.themes[d.theme].questions.splice(d.index, 1)
    round.value.themes[index].questions.push(q)
  }
}
</script>

<template>
  <div class="board-editor" :class="{ dragging: !!drag }" :style="{ '--cols': columns }">
    <div
      v-for="(theme, t) in round.themes"
      :key="theme.id"
      class="row"
      :class="{ 'drop-row': over === theme.id }"
      @dragover.prevent="drag && (over = theme.id)"
      @dragleave="over === theme.id && (over = null)"
      @drop.prevent="dropOnTheme(t)"
    >
      <div class="theme">
        <span class="grip" draggable="true" title="Перетащите, чтобы переставить тему" @dragstart="startTheme($event, t)" @dragend="end">
          <GripVertical class="size-4" />
        </span>
        <textarea
          v-model="theme.name"
          class="theme-input"
          rows="2"
          placeholder="Название темы"
          aria-label="Название темы"
          @keydown.enter.prevent="($event.target as HTMLTextAreaElement).blur()"
        />
        <span class="theme-delete">
          <IconButton label="Удалить тему" size="icon-xs" @click="$emit('remove-theme', t)"><Trash2 /></IconButton>
        </span>
      </div>
      <button
        v-for="(q, i) in theme.questions"
        :key="q.id"
        class="tile"
        :class="{
          selected: selected === q.id,
          draft: !isQuestionReady(q),
          auction: q.kind === 'auction',
          cat: q.kind === 'cat-in-bag',
          'drop-cell': over === q.id,
        }"
        draggable="true"
        :aria-pressed="selected === q.id"
        :aria-label="`${theme.name}, ${q.value}${isQuestionReady(q) ? '' : ', не заполнен'}`"
        :title="q.text || 'Вопрос ещё не заполнен'"
        @click="((selected = q.id), emit('picked'))"
        @dragstart="startQuestion($event, t, i)"
        @dragend="end"
        @dragover.prevent.stop="drag?.kind === 'question' && (over = q.id)"
        @drop.prevent.stop="dropOnQuestion(t, i)"
      >
        <span class="value">{{ q.value }}</span>
        <span class="marks" aria-hidden="true">
          <Gavel v-if="q.kind === 'auction'" />
          <Cat v-else-if="q.kind === 'cat-in-bag'" />
          <Music v-if="hasSound(q)" />
          <ImageIcon v-if="hasPicture(q)" />
        </span>
      </button>
      <span v-for="i in columns - theme.questions.length" :key="`pad-${i}`" class="pad" />
      <span class="add-q"><IconButton label="Добавить вопрос в тему" variant="ghost" @click="addQuestion(t)"><Plus /></IconButton></span>
    </div>
    <button class="add-theme" @click="addTheme"><Plus class="size-4" />Тема</button>
  </div>
</template>

<style scoped>
.board-editor {
  display: grid;
  gap: 8px;
}
.row {
  display: grid;
  grid-template-columns: minmax(150px, 1.5fr) repeat(var(--cols), minmax(58px, 1fr)) 36px;
  gap: 8px;
  align-items: stretch;
  border-radius: 16px;
  transition: background 0.15s ease;
}
.row.drop-row {
  background: color-mix(in oklch, var(--cyan) 12%, transparent);
}
.theme {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 64px;
  padding: 4px 6px 4px 2px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.08), transparent 50%),
    linear-gradient(135deg, oklch(0.32 0.2 290), oklch(0.24 0.18 275));
  border: 1px solid color-mix(in oklch, var(--gold) 45%, transparent);
}
.grip {
  display: grid;
  place-items: center;
  width: 20px;
  align-self: stretch;
  color: oklch(1 0 0 / 0.35);
  cursor: grab;
}
.grip:hover {
  color: var(--gold);
}
.theme-input {
  flex: 1;
  min-width: 0;
  padding: 4px;
  border: 0;
  border-bottom: 1px dashed transparent;
  background: transparent;
  resize: none;
  overflow: hidden;
  field-sizing: content;
  max-height: 2.6em;
  line-height: 1.15;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--gold);
  outline: none;
}
.theme-input:hover,
.theme-input:focus {
  border-bottom-color: color-mix(in oklch, var(--gold) 60%, transparent);
}
.theme-input::placeholder {
  color: color-mix(in oklch, var(--gold) 45%, transparent);
}
.theme-delete {
  position: absolute;
  top: 2px;
  right: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.row:hover .theme-delete,
.theme-delete:focus-within {
  opacity: 1;
}
.tile {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 64px;
  border-radius: 14px;
  border: 1px solid oklch(1 0 0 / 0.16);
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.14), transparent 45%),
    linear-gradient(180deg, var(--tile), var(--tile-deep));
  box-shadow: inset 0 -4px 0 oklch(0.15 0.15 270 / 0.6);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
}
.tile:hover {
  transform: translateY(-2px);
  filter: brightness(1.12);
}
.tile.auction {
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.14), transparent 45%),
    linear-gradient(180deg, oklch(0.52 0.15 70), oklch(0.33 0.12 60));
}
.tile.cat {
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.14), transparent 45%),
    linear-gradient(180deg, color-mix(in oklch, var(--magenta) 80%, black), oklch(0.3 0.16 340));
}
.tile.draft {
  background: oklch(0.22 0.12 272 / 0.55);
  border: 1px dashed oklch(1 0 0 / 0.28);
  box-shadow: none;
}
.tile.draft .value {
  color: color-mix(in oklch, var(--gold) 55%, transparent);
  text-shadow: none;
}
.tile.selected {
  box-shadow: 0 0 0 2px var(--gold), 0 10px 30px -10px color-mix(in oklch, var(--gold) 60%, transparent);
  transform: translateY(-2px);
}
.tile.drop-cell {
  box-shadow: 0 0 0 2px var(--cyan);
}
.value {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: var(--gold);
  text-shadow: 0 2px 0 oklch(0.3 0.12 60 / 0.7);
}
.marks {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: flex;
  gap: 3px;
  color: oklch(1 0 0 / 0.75);
}
.marks :deep(svg) {
  width: 12px;
  height: 12px;
}
.pad {
  border-radius: 14px;
  border: 1px dashed oklch(1 0 0 / 0.06);
}
.add-q {
  display: grid;
  place-items: center;
  opacity: 0.55;
}
.row:hover .add-q {
  opacity: 1;
}
.add-theme {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 48px;
  border-radius: 14px;
  border: 1px dashed oklch(1 0 0 / 0.25);
  background: transparent;
  color: var(--muted-foreground);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.add-theme:hover {
  border-color: var(--gold);
  color: var(--gold);
}
.dragging .tile:not(.drop-cell):hover {
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .tile { transition: none; }
}
</style>
