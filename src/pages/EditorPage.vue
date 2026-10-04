<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
  ArrowLeft, ArrowRight, CircleAlert, CircleCheck, Download, FileJson, History, Loader2, MoreHorizontal, Package, Play, Plus, Printer,
  Trash2, TriangleAlert, Trophy, Wifi,
} from '@lucide/vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Game } from '@/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { confirmAction } from '@/composables/useConfirm'
import { useGamesStore } from '@/stores/games'
import { getGame } from '@/storage'
import { makeEmptyFinal, makeEmptyRound, moveItem, moveItemTo } from '@/game/model'
import type { Issue } from '@/game/validate'
import type { Snapshot } from '@/history'
import { plainCopy } from '@/lib/plain'
import { exportGameFile, type GameFileFormat } from '@/io/gameFile'
import { isDesktop } from '@/platform'
import ShareGameDialog from '@/components/lan/ShareGameDialog.vue'
import { useAutosave } from '@/composables/useAutosave'
import { useGameIssues } from '@/composables/useGameIssues'
import { useHistory } from '@/composables/useHistory'
import RoundStrip from '@/components/editor/RoundStrip.vue'
import BoardEditor from '@/components/editor/BoardEditor.vue'
import QuestionDialog from '@/components/editor/QuestionDialog.vue'
import FinalForm from '@/components/editor/FinalForm.vue'
import StagePreview from '@/components/editor/StagePreview.vue'
import HistoryDialog from '@/components/editor/HistoryDialog.vue'
import IssuesDialog from '@/components/editor/IssuesDialog.vue'
import GameSettingsDialog from '@/components/editor/GameSettingsDialog.vue'
import { offerTour } from '@/tour/state'
import TourHelpButton from '@/tour/TourHelpButton.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { t } = useI18n()
const store = useGamesStore()

const game = ref<Game | null>(null)
const tab = ref<number | 'final'>(0)
const selectedId = ref<string | null>(null)
const previewOpen = ref(false)
const historyOpen = ref(false)
const issuesOpen = ref(false)

getGame(props.id).then((g) => {
  if (!g) return router.replace({ name: 'home' })
  game.value = g
  offerTour('editor')
})

const { status: saveStatus, error: saveError, flush: flushSave } = useAutosave(game, (g) => store.save(g))
const { snapshot } = useHistory(game, saveStatus)
const { issues, errors, warnings } = useGameIssues(game)
const saveLabel = computed(
  () =>
    ({
      idle: t('editor.page.save.saved'),
      pending: t('editor.page.save.saving'),
      saving: t('editor.page.save.saving'),
      saved: t('editor.page.save.saved'),
      error: t('editor.page.save.error'),
    })[saveStatus.value],
)

const round = computed(() => (typeof tab.value === 'number' ? game.value?.rounds[tab.value] : undefined))

/** Every question of the round in reading order, with where it sits. */
const order = computed(() =>
  (round.value?.themes ?? []).flatMap((th, ti) => th.questions.map((q, qi) => ({ q, t: th, ti, qi }))),
)
const at = computed(() => order.value.findIndex((x) => x.q.id === selectedId.value))
const current = computed(() => order.value[at.value])

watch(tab, () => {
  selectedId.value = null
})

// the dialog is open exactly while a question is selected
const dialogOpen = computed({
  get: () => !!current.value,
  set: (open) => {
    if (!open) selectedId.value = null
  },
})

function step(offset: -1 | 1) {
  const next = order.value[at.value + offset]
  if (next) selectedId.value = next.q.id
}

function addRound() {
  if (!game.value) return
  game.value.rounds.push(makeEmptyRound(t('editor.strip.defaultRound', { n: game.value.rounds.length + 1 })))
  tab.value = game.value.rounds.length - 1
}

function reorderRound(from: number, to: number) {
  if (!game.value) return
  const openRound = tab.value
  moveItemTo(game.value.rounds, from, to)
  if (typeof openRound !== 'number') return
  // the open round keeps its identity while the others shift around it
  if (openRound === from) tab.value = to
  else if (from < openRound && to >= openRound) tab.value = openRound - 1
  else if (from > openRound && to <= openRound) tab.value = openRound + 1
}

function moveRound(offset: -1 | 1) {
  if (game.value && typeof tab.value === 'number') tab.value = moveItem(game.value.rounds, tab.value, offset)
}

async function removeRound() {
  if (!game.value || typeof tab.value !== 'number' || game.value.rounds.length <= 1) return
  const ok = await confirmAction({
    title: t('editor.page.removeRoundTitle', { name: round.value?.name }),
    description: t('editor.page.removeRoundText'),
    confirmLabel: t('editor.page.delete'),
    destructive: true,
  })
  if (!ok) return
  await snapshot('before-delete')
  game.value.rounds.splice(tab.value, 1)
  tab.value = Math.min(tab.value, game.value.rounds.length - 1)
}

async function removeTheme(index: number) {
  const theme = round.value?.themes[index]
  if (!theme) return
  const ok = await confirmAction({
    title: t('editor.page.removeThemeTitle', { name: theme.name || t('editor.page.removeThemeUnnamed') }),
    description: t('editor.page.removeThemeText'),
    confirmLabel: t('editor.page.delete'),
    destructive: true,
  })
  if (!ok) return
  await snapshot('before-delete')
  if (theme.questions.some((q) => q.id === selectedId.value)) selectedId.value = null
  round.value?.themes.splice(index, 1)
}

function moveQuestion(offset: -1 | 1) {
  const c = current.value
  if (c) moveItem(c.t.questions, c.qi, offset)
}

async function removeQuestion() {
  const c = current.value
  if (!c) return
  if (!(await confirmAction({ title: t('editor.page.removeQuestionTitle'), confirmLabel: t('editor.page.delete'), destructive: true }))) return
  await snapshot('before-delete')
  const neighbour = order.value[at.value + 1] ?? order.value[at.value - 1]
  c.t.questions.splice(c.t.questions.indexOf(c.q), 1)
  selectedId.value = neighbour && neighbour.q !== c.q ? neighbour.q.id : null
}

async function removeFinal() {
  if (!game.value) return
  if (await confirmAction({ title: t('editor.page.removeFinalTitle'), confirmLabel: t('editor.page.delete'), destructive: true })) {
    await snapshot('before-delete')
    game.value.finalRound = undefined
  }
}

// the dispose-time flush can't report a failure, so settle the save while the page can still say so
onBeforeRouteLeave(async () => {
  if (saveStatus.value === 'pending' || saveStatus.value === 'saving') await flushSave()
  if (saveStatus.value !== 'error') return true
  return confirmAction({
    title: t('editor.page.leave.title'),
    description: saveError.value?.message ?? t('editor.page.leave.fallback'),
    confirmLabel: t('editor.page.leave.confirm'),
    cancelLabel: t('editor.page.leave.cancel'),
    destructive: true,
  })
})

function issueSummary() {
  return t('editor.issues.summary', { errors: t('editor.issues.errors', errors.value), warnings: t('editor.issues.warnings', warnings.value) })
}

async function play() {
  if (!game.value) return
  if (errors.value) {
    const ok = await confirmAction({
      title: t('editor.page.playWithErrors.title'),
      description: t('editor.page.playWithErrors.description', { summary: issueSummary() }),
      confirmLabel: t('editor.page.playWithErrors.confirm'),
      cancelLabel: t('editor.page.playWithErrors.cancel'),
      destructive: true,
    })
    if (!ok) {
      issuesOpen.value = true
      return
    }
  }
  await flushSave()
  if (saveStatus.value === 'error') {
    toast.error(t('editor.page.notSaved'), { description: saveError.value?.message })
    return
  }
  router.push({ name: 'play', params: { id: game.value.id } })
}

async function goToIssue(issue: Issue) {
  const g = game.value
  if (!g) return
  if (issue.final) {
    tab.value = 'final'
    return
  }
  const index = g.rounds.findIndex((r) => r.id === issue.roundId)
  if (index < 0) return
  tab.value = index
  // switching rounds clears the selection, so the question is picked once that has run
  await nextTick()
  selectedId.value = issue.questionId ?? null
}

async function restore(snap: Snapshot) {
  if (!game.value) return
  try {
    await snapshot('before-restore')
    game.value = plainCopy(snap.game)
    tab.value = 0
    selectedId.value = null
    historyOpen.value = false
    // replacing the object is not an edit, so autosave would not write it
    await flushSave()
    if (saveStatus.value === 'error') toast.error(t('editor.page.notSaved'), { description: saveError.value?.message })
    else toast.success(t('editor.page.restored'))
  } catch (err) {
    toast.error(t('editor.page.restoreFailed'), { description: (err as Error).message })
  }
}

const shareOpen = ref(false)
const exporting = ref(false)
async function exportAs(format: GameFileFormat) {
  if (!game.value || exporting.value) return
  exporting.value = true
  try {
    if (await exportGameFile(game.value, format)) toast.success(t('editor.page.exported'))
  } catch (err) {
    toast.error(t('editor.page.exportFailed'), { description: (err as Error).message })
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div v-if="game" class="editor">
    <header class="bar" data-tauri-drag-region>
      <Button variant="ghost" :aria-label="t('editor.page.back')" @click="router.push({ name: 'home' })"><ArrowLeft /><span class="lbl">{{ t('editor.page.back') }}</span></Button>
      <div class="names">
        <input v-model="game.title" class="game-title" :placeholder="t('editor.page.gameTitle')" :aria-label="t('editor.page.gameTitle')" />
        <input v-model="game.subtitle" class="game-sub" :placeholder="t('editor.page.subtitlePlaceholder')" :aria-label="t('editor.page.subtitleLabel')" />
      </div>
      <span class="save" :class="saveStatus" role="status" :title="saveError?.message">
        <span class="save-dot" /><span class="lbl">{{ saveLabel }}</span>
      </span>
      <button
        type="button"
        class="issues"
        data-tour="issues"
        :class="errors ? 'error' : warnings ? 'warning' : 'clean'"
        :aria-label="issues.length ? t('editor.page.issuesBadge', { summary: issueSummary() }) : t('editor.page.issuesClean')"
        @click="issuesOpen = true"
      >
        <CircleAlert v-if="errors" class="size-4" /><TriangleAlert v-else-if="warnings" class="size-4" /><CircleCheck v-else class="size-4" />
        <span v-if="issues.length" class="tabular-nums">{{ issues.length }}</span>
      </button>
      <Button variant="ghost" data-tour="history" :aria-label="t('editor.page.history')" :title="t('editor.page.history')" @click="historyOpen = true"><History /><span class="lbl">{{ t('editor.page.history') }}</span></Button>
      <TourHelpButton id="editor" />
      <GameSettingsDialog v-model="game.settings" />
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="secondary" data-tour="export" :disabled="exporting">
            <Loader2 v-if="exporting" class="animate-spin" /><Download v-else /><span class="lbl">{{ t('editor.page.export') }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-52">
          <DropdownMenuItem @select="exportAs('gamezip')"><Package />{{ t('editor.page.exportGamezip') }}</DropdownMenuItem>
          <DropdownMenuItem @select="exportAs('json')"><FileJson />{{ t('editor.page.exportJson') }}</DropdownMenuItem>
          <DropdownMenuItem v-if="isDesktop" @select="shareOpen = true"><Wifi />{{ t('lan.share.menu') }}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select="router.push({ name: 'print', params: { id: game.id } })"><Printer />{{ t('editor.page.cheatSheet') }}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="lg" data-tour="play" @click="play"><Play />{{ t('editor.page.play') }}</Button>
    </header>

    <div class="body">
      <RoundStrip v-model="tab" data-tour="rounds" :rounds="game.rounds" :final="game.finalRound" @add="addRound" @reorder="reorderRound" />

      <template v-if="round">
        <section class="board-pane">
          <div class="round-head">
            <input v-model="round.name" class="round-name" :placeholder="t('editor.page.roundName')" :aria-label="t('editor.page.roundName')" />
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" :aria-label="t('editor.page.roundActions')"><MoreHorizontal /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="min-w-56">
                <DropdownMenuItem :disabled="tab === 0" @select="moveRound(-1)"><ArrowLeft />{{ t('editor.page.moveEarlier') }}</DropdownMenuItem>
                <DropdownMenuItem :disabled="tab === game.rounds.length - 1" @select="moveRound(1)"><ArrowRight />{{ t('editor.page.moveLater') }}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" :disabled="game.rounds.length <= 1" @select="removeRound"><Trash2 />{{ t('editor.page.removeRound') }}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <BoardEditor v-model:round="round" v-model:selected="selectedId" @remove-theme="removeTheme" />
          <p class="tip">{{ t('editor.page.tip') }}</p>
        </section>

        <QuestionDialog
          v-if="current"
          v-model="current.t.questions[current.qi]"
          v-model:open="dialogOpen"
          :theme-name="current.t.name"
          :has-prev="at > 0"
          :has-next="at < order.length - 1"
          :first="current.qi === 0"
          :last="current.qi === current.t.questions.length - 1"
          @prev="step(-1)"
          @next="step(1)"
          @move="moveQuestion"
          @remove="removeQuestion"
          @preview="previewOpen = true"
        />
      </template>

      <section v-else-if="tab === 'final'" class="final-pane glass">
        <template v-if="game.finalRound">
          <h2 class="final-title"><Trophy class="size-6" />{{ t('editor.page.finalTitle') }}</h2>
          <FinalForm v-model="game.finalRound" @remove="removeFinal" @preview="previewOpen = true" />
        </template>
        <div v-else class="empty">
          <Trophy class="size-12 text-gold" />
          <p class="text-lg">{{ t('editor.page.finalIntro') }}</p>
          <Button size="lg" @click="game.finalRound = makeEmptyFinal()"><Plus />{{ t('editor.page.addFinal') }}</Button>
        </div>
      </section>
    </div>

    <HistoryDialog v-model:open="historyOpen" :game-id="game.id" @restore="restore" />
    <IssuesDialog v-model:open="issuesOpen" :issues="issues" @goto="goToIssue" />
    <ShareGameDialog v-if="isDesktop" v-model:open="shareOpen" :game="game" />

    <StagePreview
      v-if="current && tab !== 'final'"
      v-model:open="previewOpen"
      :topic="current.t.name"
      :amount="current.q.value"
      :text="current.q.text"
      :media="current.q.media"
      :answer="current.q.answer"
      :answer-media="current.q.answerMedia"
    />
    <StagePreview
      v-else-if="tab === 'final' && game.finalRound"
      v-model:open="previewOpen"
      :topic="t('editor.page.previewFinalTopic', { theme: game.finalRound.theme })"
      :text="game.finalRound.text"
      :media="game.finalRound.media"
      :answer="game.finalRound.answer"
      :answer-media="game.finalRound.answerMedia"
    />
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}
.bar {
  position: relative;
  z-index: 10;
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 4px 20px 4px calc(20px + var(--titlebar-inset));
  background: oklch(0.2 0.15 270 / 0.82);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid oklch(1 0 0 / 0.08);
}
.names {
  flex: 1;
  min-width: 120px;
  display: grid;
}
.names input {
  min-width: 0;
  text-overflow: ellipsis;
}
.save .lbl {
  white-space: nowrap;
}
@media (max-width: 1180px) {
  .bar .lbl {
    display: none;
  }
}
.game-title,
.game-sub,
.round-name {
  border: 0;
  border-bottom: 1px dashed transparent;
  background: transparent;
  outline: none;
}
.game-title:hover,
.game-title:focus,
.game-sub:hover,
.game-sub:focus,
.round-name:hover,
.round-name:focus {
  border-bottom-color: oklch(1 0 0 / 0.25);
}
.game-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--gold);
}
.game-sub {
  font-size: 13px;
  color: var(--muted-foreground);
}
.save {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted-foreground);
}
.save-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--cyan);
}
.save.pending .save-dot,
.save.saving .save-dot {
  background: var(--gold);
  animation: pulse 0.9s ease-in-out infinite;
}
.issues {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid currentColor;
  background: color-mix(in oklch, currentColor 14%, transparent);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.issues.error { color: var(--destructive); }
.issues.warning { color: var(--gold); }
.issues.clean { color: var(--cyan); padding: 0 9px; }
.issues:hover { background: color-mix(in oklch, currentColor 24%, transparent); }
.save.error {
  color: var(--destructive);
  font-weight: 600;
}
.save.error .save-dot {
  background: var(--destructive);
}
.body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 2vh, 16px);
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
  padding: clamp(8px, 2vh, 16px) 20px clamp(10px, 2.5vh, 24px);
  /* only the final's form or a very tall board ever needs this */
  overflow-y: auto;
}
.board-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.5vh, 12px);
  min-width: 0;
}
.round-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.round-name {
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-size: clamp(20px, 3.6vh, 28px);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
@media (max-height: 700px) {
  .tip {
    display: none;
  }
}
.tip {
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.final-pane {
  width: min(820px, 100%);
  margin: 0 auto;
  padding: 24px;
  border-radius: 20px;
}
.final-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-size: 30px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--gold);
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px 12px;
  text-align: center;
  color: var(--muted-foreground);
}
@keyframes pulse {
  50% { opacity: 0.3; }
}
</style>
