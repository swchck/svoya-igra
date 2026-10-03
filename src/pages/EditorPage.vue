<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { ArrowLeft, ArrowRight, FileJson, Loader2, Package, Play, Plus, Trash2 } from '@lucide/vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import type { Game } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { confirmAction } from '@/composables/useConfirm'
import { useGamesStore } from '@/stores/games'
import { getGame } from '@/storage'
import { makeEmptyFinal, makeEmptyRound, makeEmptyTheme, moveItem } from '@/game/model'
import IconButton from '@/components/IconButton.vue'
import { exportGameFile, type GameFileFormat } from '@/io/gameFile'
import { useAutosave } from '@/composables/useAutosave'
import RoundTabs from '@/components/editor/RoundTabs.vue'
import ThemeCard from '@/components/editor/ThemeCard.vue'
import QuestionForm from '@/components/editor/QuestionForm.vue'
import FinalForm from '@/components/editor/FinalForm.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const store = useGamesStore()

const game = ref<Game | null>(null)
const roundIndex = ref(0)
const selected = ref<{ theme: number; question: number } | null>(null)

getGame(props.id).then((g) => {
  if (g) game.value = g
  else router.replace({ name: 'home' })
})

const { status: saveStatus, error: saveError, flush: flushSave } = useAutosave(game, (g) => store.save(g))
const saveLabel = computed(
  () =>
    ({ idle: '', pending: 'Сохранение…', saving: 'Сохранение…', saved: 'Сохранено', error: 'Не сохранено' })[
      saveStatus.value
    ],
)

const round = computed(() => game.value?.rounds[roundIndex.value])
const selectedTheme = computed(() => (selected.value ? round.value?.themes[selected.value.theme] : undefined))

function selectRound(i: number) {
  roundIndex.value = i
  selected.value = null
}

function addRound() {
  if (!game.value) return
  game.value.rounds.push(makeEmptyRound(`РАУНД ${game.value.rounds.length + 1}`))
  selectRound(game.value.rounds.length - 1)
}

function moveRound(offset: -1 | 1) {
  if (game.value) roundIndex.value = moveItem(game.value.rounds, roundIndex.value, offset)
}

function moveTheme(index: number, offset: -1 | 1) {
  if (!round.value) return
  const target = moveItem(round.value.themes, index, offset)
  if (selected.value?.theme === index) selected.value = { ...selected.value, theme: target }
  else if (selected.value?.theme === target) selected.value = { ...selected.value, theme: index }
}

function moveQuestion(offset: -1 | 1) {
  if (!selected.value || !selectedTheme.value) return
  selected.value = { ...selected.value, question: moveItem(selectedTheme.value.questions, selected.value.question, offset) }
}

async function removeRound() {
  if (!game.value || game.value.rounds.length <= 1) return
  if (!(await confirmAction({ title: `Удалить «${round.value?.name}»?`, description: 'Все темы и вопросы раунда будут удалены.', confirmLabel: 'Удалить', destructive: true }))) return
  game.value.rounds.splice(roundIndex.value, 1)
  selectRound(Math.min(roundIndex.value, game.value.rounds.length - 1))
}

function addTheme() {
  round.value?.themes.push(makeEmptyTheme(`Тема ${round.value.themes.length + 1}`))
}

async function removeTheme(i: number) {
  if (!round.value) return
  const name = round.value.themes[i]?.name
  if (!(await confirmAction({ title: `Удалить тему «${name}»?`, confirmLabel: 'Удалить', destructive: true }))) return
  round.value.themes.splice(i, 1)
  selected.value = null
}

async function removeQuestion() {
  if (!selected.value || !selectedTheme.value) return
  if (!(await confirmAction({ title: 'Удалить вопрос?', confirmLabel: 'Удалить', destructive: true }))) return
  if (!selected.value || !selectedTheme.value) return
  selectedTheme.value.questions.splice(selected.value.question, 1)
  selected.value = null
}

async function removeFinal() {
  if (!game.value) return
  if (await confirmAction({ title: 'Удалить финал?', confirmLabel: 'Удалить', destructive: true })) {
    game.value.finalRound = undefined
  }
}

// the dispose-time flush can't report a failure, so settle the save while the page can still say so
onBeforeRouteLeave(async () => {
  if (saveStatus.value === 'pending' || saveStatus.value === 'saving') await flushSave()
  if (saveStatus.value !== 'error') return true
  return confirmAction({
    title: 'Изменения не сохранены',
    description: saveError.value?.message ?? 'Последние правки не удалось записать.',
    confirmLabel: 'Уйти без сохранения',
    cancelLabel: 'Остаться',
    destructive: true,
  })
})

async function play() {
  if (!game.value) return
  await flushSave()
  if (saveStatus.value === 'error') {
    toast.error('Игра не сохранена', { description: saveError.value?.message })
    return
  }
  router.push({ name: 'play', params: { id: game.value.id } })
}

const exporting = ref(false)
async function exportAs(format: GameFileFormat) {
  if (!game.value || exporting.value) return
  exporting.value = true
  try {
    if (await exportGameFile(game.value, format)) toast.success('Файл сохранён')
  } catch (err) {
    toast.error('Ошибка экспорта', { description: (err as Error).message })
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <main v-if="game" class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-6">
    <header class="flex flex-wrap items-center gap-3">
      <Button variant="ghost" @click="router.push({ name: 'home' })"><ArrowLeft />К списку</Button>
      <div class="flex min-w-64 flex-1 flex-col gap-1.5">
        <Input
          v-model="game.title"
          class="h-11 font-display text-2xl tracking-wide text-gold md:text-2xl"
          placeholder="Название игры"
          aria-label="Название игры"
        />
        <Input v-model="game.subtitle" class="h-8" placeholder="Подзаголовок (необязательно)" aria-label="Подзаголовок" />
      </div>
      <span
        class="min-w-24 text-sm italic"
        :class="saveStatus === 'error' ? 'font-semibold text-destructive not-italic' : 'text-muted-foreground'"
        :title="saveError?.message"
        role="status"
      >{{ saveLabel }}</span>
      <Button variant="secondary" :disabled="exporting" @click="exportAs('json')"><FileJson />JSON</Button>
      <Button variant="secondary" :disabled="exporting" @click="exportAs('gamezip')">
        <Loader2 v-if="exporting" class="animate-spin" /><Package v-else />.gamezip
      </Button>
      <Button size="lg" @click="play"><Play />Играть</Button>
    </header>

    <RoundTabs :model-value="roundIndex" :rounds="game.rounds" @update:model-value="selectRound" @add="addRound" />

    <div v-if="round" class="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <section class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <Input v-model="round.name" class="font-display tracking-wide uppercase" placeholder="Название раунда" aria-label="Название раунда" />
          <IconButton label="Раунд раньше" :disabled="roundIndex === 0" @click="moveRound(-1)"><ArrowLeft /></IconButton>
          <IconButton label="Раунд позже" :disabled="roundIndex === game.rounds.length - 1" @click="moveRound(1)">
            <ArrowRight />
          </IconButton>
          <Button v-if="game.rounds.length > 1" variant="destructive" @click="removeRound"><Trash2 />Раунд</Button>
        </div>
        <ThemeCard
          v-for="(theme, tIdx) in round.themes"
          :key="theme.id"
          v-model="round.themes[tIdx]"
          :selected="selected?.theme === tIdx ? selected.question : null"
          :first="tIdx === 0"
          :last="tIdx === round.themes.length - 1"
          @move="(offset) => moveTheme(tIdx, offset)"
          @select="(qIdx) => (selected = { theme: tIdx, question: qIdx })"
          @remove="removeTheme(tIdx)"
        />
        <Button variant="outline" class="self-start" @click="addTheme"><Plus />Тема</Button>
      </section>

      <Card class="self-start px-5">
        <QuestionForm
          v-if="selected && selectedTheme?.questions[selected.question]"
          :key="selectedTheme.questions[selected.question].id"
          v-model="selectedTheme.questions[selected.question]"
          :first="selected.question === 0"
          :last="selected.question === selectedTheme.questions.length - 1"
          @move="moveQuestion"
          @remove="removeQuestion"
        />
        <p v-else class="py-10 text-center text-muted-foreground italic">Выберите ячейку, чтобы отредактировать вопрос.</p>
      </Card>
    </div>

    <Separator class="my-2" />

    <Card class="px-5">
      <div class="flex items-center gap-3">
        <h2 class="title-gold text-3xl">Финал</h2>
        <Button v-if="!game.finalRound" variant="outline" @click="game.finalRound = makeEmptyFinal()"><Plus />Добавить финал</Button>
      </div>
      <FinalForm v-if="game.finalRound" v-model="game.finalRound" @remove="removeFinal" />
    </Card>
  </main>
</template>
