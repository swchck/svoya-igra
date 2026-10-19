<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Copy, CopyPlus, MonitorPlay, PencilLine, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useBoardClipboard } from '@/composables/useBoardClipboard'
import type { QuestionRecord } from '@/play/questionStats'
import type { Question, QuestionKind } from '@/types'
import { KINDS, kindInfo } from '@/game/kinds'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
const kind = computed(() => kindInfo(question.value.kind))
const kindHint = computed(() => t(`editor.dialog.kinds.${kind.value.key}.hint`))

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
        <div class="toolbar" data-tour="q-settings">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button type="button" class="kind-pick" :class="kind.kind" :title="kindHint">
                <span class="sr-only">{{ t('editor.dialog.kindLabel') }}:</span>
                <component :is="kind.icon" class="size-4" />{{ t(`editor.dialog.kinds.${kind.key}.label`) }}<ChevronDown class="size-4 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="w-80">
              <DropdownMenuRadioGroup :model-value="kind.kind" @update:model-value="(v) => (question.kind = v as QuestionKind)">
                <DropdownMenuRadioItem v-for="k in KINDS" :key="k.kind" :value="k.kind" class="items-start">
                  <component :is="k.icon" class="mt-0.5 size-4" />
                  <span class="grid gap-0.5">
                    <span class="font-medium">{{ t(`editor.dialog.kinds.${k.key}.label`) }}</span>
                    <span class="text-xs text-muted-foreground">{{ t(`editor.dialog.kinds.${k.key}.hint`) }}</span>
                  </span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div class="field" :title="t('editor.dialog.valueHint')">
            <span class="field-label">{{ t('editor.dialog.value') }}</span>
            <NumberInput v-model="question.value" class="value-input" :min="1" :step="100" :step-snapping="false" :aria-label="t('editor.dialog.value')" />
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon-sm" :aria-label="t('editor.dialog.presets')" :title="t('editor.dialog.presets')"><ChevronDown /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" class="min-w-28">
                <DropdownMenuItem v-for="p in PRESETS" :key="p" class="preset-item" :class="{ on: question.value === p }" @select="question.value = p">{{ p }}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div v-if="question.kind === 'cat-in-bag'" class="field">
            <span class="field-label">{{ t('editor.dialog.catValue') }}</span>
            <NumberInput v-model="question.catValue" class="value-input" :min="1" :step="100" :step-snapping="false" :placeholder="String(question.value)" :aria-label="t('editor.dialog.catValue')" />
          </div>

          <div class="field" :title="t('editor.dialog.secondsHint')">
            <span class="field-label">{{ t('editor.dialog.seconds') }}</span>
            <NumberInput v-model="question.seconds" class="seconds-input" :min="0" :step="5" :placeholder="t('editor.dialog.secondsInherit')" :aria-label="t('editor.dialog.seconds')" />
          </div>

        </div>
        <p v-if="kind.kind !== 'normal'" class="hint kind-hint">{{ kindHint }}</p>

        <div class="cols">
          <section class="col" :aria-label="t('editor.dialog.question')">
            <h3 class="col-title">{{ t('editor.dialog.question') }}</h3>
            <MarkdownEditor v-model="question.text" data-tour="q-text" :label="t('editor.dialog.question')" :placeholder="t('editor.dialog.questionPlaceholder')" />
            <MediaList v-model="question.media" data-tour="q-media" blurrable compact :label="t('editor.dialog.questionMedia')" />
            <div class="extras">
              <OptionsEditor v-model="question" />
              <HintsEditor v-model="question" />
            </div>
          </section>
          <section class="col answer" :aria-label="t('editor.dialog.answer')">
            <h3 class="col-title">{{ t('editor.dialog.answer') }}</h3>
            <MarkdownEditor v-model="question.answer" display :label="t('editor.dialog.answer')" :placeholder="t('editor.dialog.answerPlaceholder')" />
            <MediaList v-model="question.answerMedia" compact :label="t('editor.dialog.answerMedia')" />
            <HostFields :key="question.id" v-model="question" />
          </section>
        </div>
      </div>

      <footer class="foot">
        <Button variant="secondary" @click="$emit('preview')"><MonitorPlay />{{ t('editor.dialog.preview') }}</Button>
        <button type="button" class="draft-toggle" :class="{ on: question.draft }" :aria-pressed="!!question.draft" :title="t('editor.dialog.draftHint')" @click="toggleDraft">
          <PencilLine class="size-4" />{{ t('editor.dialog.draft') }}
        </button>
        <span v-if="record" class="record-line">{{ t('editor.stats.line', { plays: t('editor.stats.plays', record.plays), answered: record.answered }) }}<template v-if="record.wrong">, {{ t('editor.stats.wrong', record.wrong) }}</template></span>
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
.toolbar {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
}
.kind-pick {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px 0 12px;
  border-radius: 10px;
  border: 0;
  background: var(--gold);
  color: var(--night);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.kind-pick.auction { background: oklch(0.78 0.15 70); }
.kind-pick.cat-in-bag { background: var(--magenta); color: white; }
.kind-pick.no-risk { background: oklch(0.72 0.14 160); }
.kind-pick.all-in { background: oklch(0.7 0.19 40); }
.kind-pick.for-all { background: var(--cyan); }
.field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.field-label {
  font-size: 13px;
  color: var(--muted-foreground);
  white-space: nowrap;
}
.kind-hint {
  margin-top: -4px;
}
.preset-item {
  font-family: var(--font-display);
  font-size: 15px;
}
.preset-item.on {
  color: var(--gold);
}
.extras {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
}
.extras > :deep(*) {
  flex: 1 1 100%;
}
/* while both are still just their add buttons, they share one row */
.extras > :deep(.options:has(> button:only-child)),
.extras > :deep(.hints:has(> button:only-child)) {
  flex: 0 0 auto;
}
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
