<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRightLeft, CircleCheck, ClipboardPaste, Copy, CopyPlus, GripVertical, Image as ImageIcon, MessageSquareText, MoreHorizontal, Music, PencilLine, Plus, Shapes, TextCursorInput, Trash2, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useEventListener } from '@vueuse/core'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { copyTheme, nextValue } from '@/game/edit'
import type { QuestionRecord } from '@/play/questionStats'
import { useBoardClipboard } from '@/composables/useBoardClipboard'
import type { Question, Round } from '@/types'
import IconButton from '@/components/IconButton.vue'
import { markdownToPlain } from '@/lib/markdown'
import { isSpecial, KINDS, kindInfo } from '@/game/kinds'
import { Button } from '@/components/ui/button'
import NumberInput from '@/components/NumberInput.vue'
import { isQuestionReady, makeEmptyQuestion, makeEmptyTheme, moveItemTo } from '@/game/model'

const { t } = useI18n()
const round = defineModel<Round>('round', { required: true })
/** Id of the question open in the dialog. */
const selected = defineModel<string | null>('selected', { required: true })
const props = defineProps<{
  /** The game's other rounds, where a theme may move. */
  otherRounds?: { index: number; name: string }[]
  /** How each question fared in games played so far, by id. */
  records?: Record<string, QuestionRecord>
}>()

function recordTitle(q: Question): string {
  const r = props.records?.[q.id]
  return r ? `\n${t('editor.stats.line', { plays: t('editor.stats.plays', r.plays), answered: r.answered })}` : ''
}

/** Asked in a game and never answered, or always answered: worth a second look either way. */
function recordMark(q: Question): 'missed' | 'easy' | null {
  const r = props.records?.[q.id]
  if (!r?.plays) return null
  return r.answered === 0 ? 'missed' : r.answered === r.plays && r.wrong === 0 ? 'easy' : null
}
const emit = defineEmits<{
  (e: 'remove-questions', ids: string[]): void
  (e: 'remove-theme', index: number): void
  (e: 'move-theme', index: number, roundIndex: number): void
  (e: 'type-in', index: number): void
  (e: 'comment', index: number): void
}>()

const { clip, copy, pasteQuestion } = useBoardClipboard()

const root = ref<HTMLElement | null>(null)
/** Questions picked with Shift or Cmd/Ctrl for a change all at once. */
const picked = ref(new Set<string>())
const bulkValue = ref<number | undefined>()

function onTileClick(e: MouseEvent, q: Question) {
  if (e.shiftKey || e.metaKey || e.ctrlKey) {
    const next = new Set(picked.value)
    if (next.has(q.id)) next.delete(q.id)
    else next.add(q.id)
    picked.value = next
    return
  }
  picked.value = new Set()
  selected.value = q.id
}

function clearPicked() {
  picked.value = new Set()
}

// Escape drops the selection wherever focus is, unless a dialog is up and wants it
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && picked.value.size && !document.querySelector('[role=dialog]')) clearPicked()
})

function forPicked(change: (q: Question) => void) {
  for (const th of round.value.themes) for (const q of th.questions) if (picked.value.has(q.id)) change(q)
}

function removePicked() {
  const ids = [...picked.value]
  clearPicked()
  emit('remove-questions', ids)
}

// arrows walk the board like a spreadsheet; rows of different length land on the nearest cell
function onTileKey(e: KeyboardEvent, ti: number, i: number) {
  const moves: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }
  const move = moves[e.key]
  if (!move || e.altKey || e.metaKey || e.ctrlKey) return
  const themes = round.value.themes
  const row = ti + move[0]
  if (row < 0 || row >= themes.length || !themes[row].questions.length) return
  const col = Math.min(Math.max(0, i + move[1]), themes[row].questions.length - 1)
  e.preventDefault()
  root.value?.querySelector<HTMLElement>(`[data-cell="${row}:${col}"]`)?.focus()
}

function duplicateTheme(index: number) {
  round.value.themes.splice(index + 1, 0, copyTheme(round.value.themes[index]))
}

function copyThemeToClipboard(index: number) {
  copy({ kind: 'theme', theme: round.value.themes[index] })
  toast.success(t('editor.clipboard.themeCopied'))
}

function pasteQuestionInto(index: number) {
  const q = pasteQuestion()
  if (!q) return
  const questions = round.value.themes[index].questions
  q.value = nextValue(questions)
  questions.push(q)
  selected.value = q.id
}

const columns = computed(() => Math.max(1, ...round.value.themes.map((t) => t.questions.length)))

function hasSound(q: Question) {
  return [...(q.media ?? []), ...(q.answerMedia ?? [])].some((m) => m.kind !== 'image')
}
function hasPicture(q: Question) {
  return [...(q.media ?? []), ...(q.answerMedia ?? [])].some((m) => m.kind === 'image')
}

function addQuestion(themeIndex: number) {
  const questions = round.value.themes[themeIndex].questions
  const q = makeEmptyQuestion(nextValue(questions))
  questions.push(q)
  selected.value = q.id
}

function addTheme() {
  const theme = makeEmptyTheme(t('editor.board.defaultTheme', { n: round.value.themes.length + 1 }))
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
  <div ref="root" class="board-editor" :class="{ dragging: !!drag }" :style="{ '--cols': columns }">
    <div v-if="picked.size" class="bulk" role="toolbar" :aria-label="t('editor.bulk.label')">
      <span class="bulk-count">{{ t('editor.bulk.count', picked.size) }}</span>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="secondary" size="sm"><Shapes />{{ t('editor.bulk.kind') }}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem v-for="k in KINDS" :key="k.kind" @select="forPicked((q) => (q.kind = k.kind))">
            <component :is="k.icon" />{{ t(`editor.dialog.kinds.${k.key}.label`) }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span class="bulk-value">
        <NumberInput v-model="bulkValue" class="w-32" :min="1" :step="100" :step-snapping="false" :aria-label="t('editor.bulk.value')" />
        <Button variant="secondary" size="sm" :disabled="!bulkValue" @click="forPicked((q) => (q.value = bulkValue!))">{{ t('editor.bulk.setValue') }}</Button>
      </span>
      <Button variant="secondary" size="sm" @click="forPicked((q) => (q.draft = true))"><PencilLine />{{ t('editor.bulk.draft') }}</Button>
      <Button variant="secondary" size="sm" @click="forPicked((q) => delete q.draft)"><CircleCheck />{{ t('editor.bulk.ready') }}</Button>
      <Button variant="ghost" size="sm" class="text-destructive" @click="removePicked"><Trash2 />{{ t('editor.bulk.remove') }}</Button>
      <span class="flex-1" />
      <Button variant="ghost" size="sm" @click="clearPicked"><X />{{ t('editor.bulk.clear') }}</Button>
    </div>
    <div
      v-for="(theme, ti) in round.themes"
      :key="theme.id"
      class="row"
      :class="{ 'drop-row': over === theme.id }"
      @dragover.prevent="drag && (over = theme.id)"
      @dragleave="over === theme.id && (over = null)"
      @drop.prevent="dropOnTheme(ti)"
    >
      <div class="theme">
        <span class="grip" draggable="true" :title="t('editor.board.dragTheme')" @dragstart="startTheme($event, ti)" @dragend="end">
          <GripVertical class="size-4" />
        </span>
        <textarea
          v-model="theme.name"
          class="theme-input"
          rows="2"
          :placeholder="t('editor.board.themeName')"
          :aria-label="t('editor.board.themeName')"
          @keydown.enter.prevent="($event.target as HTMLTextAreaElement).blur()"
        />
        <MessageSquareText v-if="theme.comment" class="comment-mark" :aria-label="t('editor.board.hasComment')" />
        <span class="theme-menu">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <IconButton :label="t('editor.board.themeActions')" size="icon-xs"><MoreHorizontal /></IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="min-w-56">
              <DropdownMenuItem @select="duplicateTheme(ti)"><CopyPlus />{{ t('editor.board.duplicateTheme') }}</DropdownMenuItem>
              <DropdownMenuItem @select="copyThemeToClipboard(ti)"><Copy />{{ t('editor.board.copyTheme') }}</DropdownMenuItem>
              <DropdownMenuItem :disabled="clip?.kind !== 'question'" @select="pasteQuestionInto(ti)"><ClipboardPaste />{{ t('editor.board.pasteQuestion') }}</DropdownMenuItem>
              <DropdownMenuItem @select="$emit('type-in', ti)"><TextCursorInput />{{ t('editor.board.typeIn') }}</DropdownMenuItem>
              <DropdownMenuItem @select="$emit('comment', ti)"><MessageSquareText />{{ t('editor.board.comment') }}</DropdownMenuItem>
              <template v-if="otherRounds?.length">
                <DropdownMenuSeparator />
                <DropdownMenuItem v-for="r in otherRounds" :key="r.index" @select="$emit('move-theme', ti, r.index)">
                  <ArrowRightLeft />{{ t('editor.board.moveTo', { name: r.name }) }}
                </DropdownMenuItem>
              </template>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" @select="$emit('remove-theme', ti)"><Trash2 />{{ t('editor.board.removeTheme') }}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>
      <button
        v-for="(q, i) in theme.questions"
        :key="q.id"
        class="tile"
        :class="{
          selected: selected === q.id,
          picked: picked.has(q.id),
          draft: !isQuestionReady(q),
          [`kind-${q.kind}`]: isSpecial(q.kind),
          'drop-cell': over === q.id,
        }"
        :data-tour="ti === 0 && i === 0 ? 'board-cell' : undefined"
        draggable="true"
        aria-haspopup="dialog"
        :aria-label="`${theme.name}, ${q.value}${isQuestionReady(q) ? '' : t('editor.board.notFilled')}`"
        :aria-pressed="picked.size ? picked.has(q.id) : undefined"
        :data-cell="`${ti}:${i}`"
:title="(markdownToPlain(q.text) || t('editor.board.emptyQuestion')) + recordTitle(q)"
        @click="onTileClick($event, q)"
        @keydown="onTileKey($event, ti, i)"
        @dragstart="startQuestion($event, ti, i)"
        @dragend="end"
        @dragover.prevent.stop="drag?.kind === 'question' && (over = q.id)"
        @drop.prevent.stop="dropOnQuestion(ti, i)"
      >
        <span class="value">{{ q.value }}</span>
        <span v-if="recordMark(q)" class="record" :class="recordMark(q)!" aria-hidden="true" />
        <span class="marks" aria-hidden="true">
          <PencilLine v-if="q.draft" />
          <component :is="kindInfo(q.kind).icon" v-if="isSpecial(q.kind)" />
          <Music v-if="hasSound(q)" />
          <ImageIcon v-if="hasPicture(q)" />
        </span>
      </button>
      <span v-for="i in columns - theme.questions.length" :key="`pad-${i}`" class="pad" />
      <span class="add-q"><IconButton :label="t('editor.board.addQuestion')" variant="ghost" @click="addQuestion(ti)"><Plus /></IconButton></span>
    </div>
    <button class="add-theme" @click="addTheme"><Plus class="size-4" />{{ t('editor.board.addTheme') }}</button>
  </div>
</template>

<style scoped>
.board-editor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* rows share the window's height; past ~10 themes they bottom out and this scrolls */
  overflow-y: auto;
}
.row {
  flex: 1 1 0;
  min-height: 44px;
  max-height: 96px;
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
  min-height: 0;
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
.comment-mark {
  position: absolute;
  left: 6px;
  bottom: 6px;
  width: 12px;
  height: 12px;
  color: var(--cyan);
}
.theme-menu {
  position: absolute;
  top: 2px;
  right: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.row:hover .theme-menu,
.theme-menu:focus-within,
.theme-menu:has([data-state='open']) {
  opacity: 1;
}
.tile {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
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
.tile.kind-auction,
.tile.kind-all-in {
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.14), transparent 45%),
    linear-gradient(180deg, oklch(0.52 0.15 70), oklch(0.33 0.12 60));
}
.tile.kind-cat-in-bag {
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.14), transparent 45%),
    linear-gradient(180deg, color-mix(in oklch, var(--magenta) 80%, black), oklch(0.3 0.16 340));
}
.tile.kind-no-risk {
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.14), transparent 45%),
    linear-gradient(180deg, oklch(0.5 0.12 160), oklch(0.3 0.1 170));
}
.tile.kind-for-all {
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.14), transparent 45%),
    linear-gradient(180deg, color-mix(in oklch, var(--cyan) 60%, black), oklch(0.3 0.12 230));
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
.tile.picked {
  box-shadow: 0 0 0 2px var(--cyan), 0 10px 30px -10px color-mix(in oklch, var(--cyan) 60%, transparent);
}
.tile:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.bulk {
  position: sticky;
  top: 0;
  z-index: 5;
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid color-mix(in oklch, var(--cyan) 50%, transparent);
  background: oklch(0.2 0.14 272 / 0.95);
  backdrop-filter: blur(10px);
}
.bulk-count {
  font-weight: 600;
  color: var(--cyan);
}
.bulk-value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
.record {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.record.missed {
  background: var(--magenta);
  box-shadow: 0 0 8px var(--magenta);
}
.record.easy {
  background: oklch(0.78 0.15 155);
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
  flex: none;
  gap: 6px;
  min-height: 40px;
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
