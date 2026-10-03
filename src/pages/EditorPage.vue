<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { ArrowLeft, ArrowRight, Download, FileJson, Loader2, MoreHorizontal, MousePointerClick, Package, Play, Plus, Trash2, Trophy } from '@lucide/vue'
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
import { makeEmptyFinal, makeEmptyRound, moveItem } from '@/game/model'
import { exportGameFile, type GameFileFormat } from '@/io/gameFile'
import { useAutosave } from '@/composables/useAutosave'
import RoundStrip from '@/components/editor/RoundStrip.vue'
import BoardEditor from '@/components/editor/BoardEditor.vue'
import QuestionInspector from '@/components/editor/QuestionInspector.vue'
import FinalForm from '@/components/editor/FinalForm.vue'
import StagePreview from '@/components/editor/StagePreview.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { t } = useI18n()
const store = useGamesStore()

const game = ref<Game | null>(null)
const tab = ref<number | 'final'>(0)
const selectedId = ref<string | null>(null)
const previewOpen = ref(false)

getGame(props.id).then((g) => {
  if (!g) return router.replace({ name: 'home' })
  game.value = g
  selectedId.value = g.rounds[0]?.themes[0]?.questions[0]?.id ?? null
})

const { status: saveStatus, error: saveError, flush: flushSave } = useAutosave(game, (g) => store.save(g))
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
  selectedId.value = order.value[0]?.q.id ?? null
})

// in the one-column layout the inspector sits under the board, out of sight
const inspector = ref<HTMLElement | null>(null)
function revealInspector() {
  if (matchMedia('(max-width: 1100px)').matches) inspector.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function step(offset: -1 | 1) {
  const next = order.value[at.value + offset]
  if (next) selectedId.value = next.q.id
}

function addRound() {
  if (!game.value) return
  game.value.rounds.push(makeEmptyRound(t('editor.strip.defaultRound', { n: game.value.rounds.length + 1 })))
  tab.value = game.value.rounds.length - 1
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
  const neighbour = order.value[at.value + 1] ?? order.value[at.value - 1]
  c.t.questions.splice(c.t.questions.indexOf(c.q), 1)
  selectedId.value = neighbour && neighbour.q !== c.q ? neighbour.q.id : null
}

async function removeFinal() {
  if (!game.value) return
  if (await confirmAction({ title: t('editor.page.removeFinalTitle'), confirmLabel: t('editor.page.delete'), destructive: true })) {
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

async function play() {
  if (!game.value) return
  await flushSave()
  if (saveStatus.value === 'error') {
    toast.error(t('editor.page.notSaved'), { description: saveError.value?.message })
    return
  }
  router.push({ name: 'play', params: { id: game.value.id } })
}

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
    <header class="bar">
      <Button variant="ghost" @click="router.push({ name: 'home' })"><ArrowLeft />{{ t('editor.page.back') }}</Button>
      <div class="names">
        <input v-model="game.title" class="game-title" :placeholder="t('editor.page.gameTitle')" :aria-label="t('editor.page.gameTitle')" />
        <input v-model="game.subtitle" class="game-sub" :placeholder="t('editor.page.subtitlePlaceholder')" :aria-label="t('editor.page.subtitleLabel')" />
      </div>
      <span class="save" :class="saveStatus" role="status" :title="saveError?.message">
        <span class="save-dot" />{{ saveLabel }}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="secondary" :disabled="exporting">
            <Loader2 v-if="exporting" class="animate-spin" /><Download v-else />{{ t('editor.page.export') }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-52">
          <DropdownMenuItem @select="exportAs('gamezip')"><Package />{{ t('editor.page.exportGamezip') }}</DropdownMenuItem>
          <DropdownMenuItem @select="exportAs('json')"><FileJson />{{ t('editor.page.exportJson') }}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="lg" @click="play"><Play />{{ t('editor.page.play') }}</Button>
    </header>

    <div class="body">
      <RoundStrip v-model="tab" :rounds="game.rounds" :final="game.finalRound" @add="addRound" />

      <div v-if="round" class="workspace">
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
          <BoardEditor v-model:round="round" v-model:selected="selectedId" @remove-theme="removeTheme" @picked="revealInspector" />
          <p class="tip">{{ t('editor.page.tip') }}</p>
        </section>

        <aside ref="inspector" class="glass inspector-pane">
          <QuestionInspector
            v-if="current"
            :key="current.q.id"
            v-model="current.t.questions[current.qi]"
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
          <div v-else class="empty">
            <MousePointerClick class="size-10 text-gold" />
            <p>{{ t('editor.page.pickQuestion') }}</p>
          </div>
        </aside>
      </div>

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
  min-height: 100dvh;
}
.bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: oklch(0.2 0.15 270 / 0.82);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid oklch(1 0 0 / 0.08);
}
.names {
  flex: 1;
  min-width: 220px;
  display: grid;
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
.save.error {
  color: var(--destructive);
  font-weight: 600;
}
.save.error .save-dot {
  background: var(--destructive);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
  padding: 16px 20px 32px;
}
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(380px, 460px);
  gap: 18px;
  align-items: start;
}
@media (max-width: 1100px) {
  .workspace { grid-template-columns: 1fr; }
}
.board-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tip {
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.inspector-pane {
  position: sticky;
  top: 84px;
  max-height: calc(100dvh - 100px);
  overflow-y: auto;
  padding: 18px;
  border-radius: 20px;
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
