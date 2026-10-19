<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Copy, CopyPlus, MonitorPlay, PencilLine, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useBoardClipboard } from '@/composables/useBoardClipboard'
import type { QuestionRecord } from '@/play/questionStats'
import type { Question } from '@/types'
import { KINDS, kindInfo } from '@/game/kinds'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import IconButton from '@/components/IconButton.vue'
import NumberInput from '@/components/NumberInput.vue'
import MediaList from '@/components/MediaList.vue'
import { LazyMarkdownEditor as MarkdownEditor } from '@/components/markdownEditorLoader'
import HostFields from './HostFields.vue'
import OptionsEditor from './OptionsEditor.vue'
import HintsEditor from './HintsEditor.vue'

const { t } = useI18n()
const question = defineModel<Question>({ required: true })
const open = defineModel<boolean>('open', { required: true })
defineProps<{
  themeName: string
  hasPrev: boolean
  hasNext: boolean
  first: boolean
  last: boolean
  /** How the question fared in games played so far. */
  record?: QuestionRecord
}>()
const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'move', offset: -1 | 1): void
  (e: 'remove'): void
  (e: 'preview'): void
  (e: 'duplicate'): void
}>()

const { copy } = useBoardClipboard()
function copyQuestion() {
  copy({ kind: 'question', question: question.value })
  toast.success(t('editor.clipboard.questionCopied'))
}

function toggleDraft() {
  if (question.value.draft) delete question.value.draft
  else question.value.draft = true
}

const PRESETS = [100, 200, 300, 400, 500, 1000]
const kindHint = computed(() => t(`editor.dialog.kinds.${kindInfo(question.value.kind).key}.hint`))

// Alt+arrows is word movement inside a text field, so there it needs Ctrl or Cmd as well
function onKeydown(e: KeyboardEvent) {
  if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
  const el = e.target as HTMLElement
  const typing = el.isContentEditable || el.matches('input, textarea')
  if (typing && !e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  if (e.key === 'ArrowLeft') emit('prev')
  else emit('next')
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      data-tour="q-dialog"
      class="h-[min(92dvh,920px)] max-h-[92dvh] gap-0 overflow-hidden p-0 sm:max-w-[min(1200px,94vw)]"
      @keydown="onKeydown"
      @open-auto-focus.prevent
    >
      <header class="head">
        <IconButton :label="t('editor.dialog.prev')" aria-keyshortcuts="Alt+ArrowLeft" :disabled="!hasPrev" @click="$emit('prev')"><ChevronLeft /></IconButton>
        <div class="title">
          <DialogTitle class="theme">{{ themeName || t('editor.dialog.unnamedTheme') }}</DialogTitle>
          <span class="value">{{ question.value }}</span>
        </div>
        <IconButton :label="t('editor.dialog.next')" aria-keyshortcuts="Alt+ArrowRight" :disabled="!hasNext" @click="$emit('next')"><ChevronRight /></IconButton>
        <DialogDescription class="sr-only">{{ t('editor.dialog.description') }}</DialogDescription>
      </header>

      <div class="body">
        <div class="settings" data-tour="q-settings">
          <div class="kind-box">
            <div class="kinds" role="radiogroup" :aria-label="t('editor.dialog.kindLabel')">
              <button
                v-for="k in KINDS"
                :key="k.kind"
                type="button"
                role="radio"
                class="kind"
                :class="[k.kind, { on: question.kind === k.kind }]"
                :aria-checked="question.kind === k.kind"
                @click="question.kind = k.kind"
              >
                <component :is="k.icon" class="size-4" />{{ t(`editor.dialog.kinds.${k.key}.label`) }}
              </button>
            </div>
            <p class="hint">{{ kindHint }}</p>
          </div>

          <div class="grid gap-2" :title="t('editor.dialog.valueHint')">
            <Label as="span">{{ t('editor.dialog.value') }}</Label>
            <div class="flex flex-wrap items-center gap-2">
              <NumberInput v-model="question.value" class="value-input" :min="1" :step="100" :step-snapping="false" />
              <button
                v-for="p in PRESETS"
                :key="p"
                type="button"
                class="preset"
                :class="{ on: question.value === p }"
                @click="question.value = p"
              >{{ p }}</button>
            </div>
          </div>

          <div class="grid gap-2">
            <Label as="span">{{ t('editor.dialog.status') }}</Label>
            <p v-if="record" class="record-line">{{ t('editor.stats.line', { plays: t('editor.stats.plays', record.plays), answered: record.answered }) }}<template v-if="record.wrong">, {{ t('editor.stats.wrong', record.wrong) }}</template></p>
            <button type="button" class="draft-toggle" :class="{ on: question.draft }" :aria-pressed="!!question.draft" :title="t('editor.dialog.draftHint')" @click="toggleDraft">
              <PencilLine class="size-4" />{{ t('editor.dialog.draft') }}
            </button>
          </div>

          <div class="grid gap-2" :title="t('editor.dialog.secondsHint')">
            <Label as="span">{{ t('editor.dialog.seconds') }}</Label>
            <NumberInput v-model="question.seconds" class="seconds-input" :min="0" :step="5" :placeholder="t('editor.dialog.secondsInherit')" />
          </div>

          <div v-if="question.kind === 'cat-in-bag'" class="grid gap-2">
            <Label>{{ t('editor.dialog.catValue') }}</Label>
            <NumberInput v-model="question.catValue" class="value-input" :min="1" :step="100" :step-snapping="false" :placeholder="String(question.value)" />
          </div>
        </div>

        <div class="cols">
          <section class="col" :aria-label="t('editor.dialog.question')">
            <h3 class="col-title">{{ t('editor.dialog.question') }}</h3>
            <MarkdownEditor v-model="question.text" data-tour="q-text" :label="t('editor.dialog.question')" :placeholder="t('editor.dialog.questionPlaceholder')" />
            <MediaList v-model="question.media" data-tour="q-media" blurrable :label="t('editor.dialog.questionMedia')" />
            <OptionsEditor v-model="question" />
            <HintsEditor v-model="question" />
          </section>
          <section class="col answer" :aria-label="t('editor.dialog.answer')">
            <h3 class="col-title">{{ t('editor.dialog.answer') }}</h3>
            <MarkdownEditor v-model="question.answer" display :label="t('editor.dialog.answer')" :placeholder="t('editor.dialog.answerPlaceholder')" />
            <MediaList v-model="question.answerMedia" :label="t('editor.dialog.answerMedia')" />
            <HostFields v-model="question" />
          </section>
        </div>
      </div>

      <footer class="foot">
        <Button variant="secondary" @click="$emit('preview')"><MonitorPlay />{{ t('editor.dialog.preview') }}</Button>
        <span class="flex-1" />
        <IconButton :label="t('editor.dialog.duplicate')" @click="$emit('duplicate')"><CopyPlus /></IconButton>
        <IconButton :label="t('editor.dialog.copy')" @click="copyQuestion"><Copy /></IconButton>
        <IconButton :label="t('editor.dialog.moveLeft')" :disabled="first" @click="$emit('move', -1)"><ArrowLeft /></IconButton>
        <IconButton :label="t('editor.dialog.moveRight')" :disabled="last" @click="$emit('move', 1)"><ArrowRight /></IconButton>
        <IconButton :label="t('editor.dialog.remove')" class="text-destructive" @click="$emit('remove')"><Trash2 /></IconButton>
      </footer>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
:global([data-slot='dialog-content']) {
  display: flex;
  flex-direction: column;
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 64px 14px 16px;
  border-bottom: 1px solid oklch(var(--tint) 0 0 / 0.08);
}
.title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.theme {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-display);
  font-size: 20px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.value {
  flex: none;
  padding: 2px 14px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--night);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 20px;
}
.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 2vh, 18px);
  padding: clamp(10px, 2vh, 18px) 20px;
}
.settings {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  align-items: start;
}
.kind-box {
  flex: 1 1 320px;
}
.kinds {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.kind {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 6px 8px;
  border-radius: 12px;
  border: 1px solid oklch(var(--tint) 0 0 / 0.12);
  background: var(--well);
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.kind:hover {
  color: var(--foreground);
}
.kind.on {
  color: var(--night);
  border-color: transparent;
}
.kind.normal.on { background: var(--gold); }
.kind.auction.on { background: oklch(0.78 0.15 70); }
.kind.cat-in-bag.on { background: var(--magenta); color: white; }
.kind.no-risk.on { background: oklch(0.72 0.14 160); }
.kind.all-in.on { background: oklch(0.7 0.19 40); }
.kind.for-all.on { background: var(--cyan); }
.hint {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.value-input {
  width: 9rem;
}
.seconds-input {
  width: 8rem;
}
.record-line {
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.draft-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid oklch(var(--tint) 0 0 / 0.12);
  background: transparent;
  color: var(--muted-foreground);
  font-size: 13px;
  cursor: pointer;
}
.draft-toggle:hover {
  color: var(--foreground);
}
.draft-toggle.on {
  border-color: var(--cyan);
  background: color-mix(in oklch, var(--cyan) 16%, transparent);
  color: var(--cyan);
}
.value-input :deep(input) {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--gold);
}
.preset {
  height: 32px;
  min-width: 48px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid oklch(var(--tint) 0 0 / 0.12);
  background: transparent;
  color: var(--muted-foreground);
  font-family: var(--font-display);
  font-size: 15px;
  cursor: pointer;
}
.preset:hover {
  color: var(--gold);
  border-color: color-mix(in oklch, var(--gold) 50%, transparent);
}
.preset.on {
  background: color-mix(in oklch, var(--gold) 18%, transparent);
  border-color: var(--gold);
  color: var(--gold);
}
.cols {
  flex: 1;
  min-height: 220px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
@media (max-width: 720px) {
  .cols { grid-template-columns: 1fr; }
}
/* each side scrolls on its own, so a long media list never pushes the other out of view */
.col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid oklch(var(--tint) 0 0 / 0.08);
  background: var(--well);
}
.col.answer {
  border-color: color-mix(in oklch, var(--gold) 28%, transparent);
}
.col-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 15px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}
.col.answer .col-title {
  color: var(--gold);
}
.foot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border-top: 1px solid oklch(var(--tint) 0 0 / 0.08);
  background: var(--panel-solid);
}
</style>
