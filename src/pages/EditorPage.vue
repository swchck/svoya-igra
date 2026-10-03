<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Game } from '../types'
import { useGamesStore } from '../stores/games'
import { getGame } from '../storage'
import { makeEmptyFinal, makeEmptyRound, makeEmptyTheme } from '../game/model'
import { exportGameFile, type GameFileFormat } from '../io/gameFile'
import { useAutosave } from '../composables/useAutosave'
import RoundTabs from '../components/editor/RoundTabs.vue'
import ThemeCard from '../components/editor/ThemeCard.vue'
import QuestionForm from '../components/editor/QuestionForm.vue'
import FinalForm from '../components/editor/FinalForm.vue'

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

function removeRound() {
  if (!game.value || game.value.rounds.length <= 1 || !confirm('Удалить раунд?')) return
  game.value.rounds.splice(roundIndex.value, 1)
  selectRound(Math.min(roundIndex.value, game.value.rounds.length - 1))
}

function addTheme() {
  round.value?.themes.push(makeEmptyTheme(`Тема ${round.value.themes.length + 1}`))
}

function removeTheme(i: number) {
  if (!round.value || !confirm('Удалить тему?')) return
  round.value.themes.splice(i, 1)
  selected.value = null
}

function removeQuestion() {
  if (!selected.value || !selectedTheme.value || !confirm('Удалить вопрос?')) return
  selectedTheme.value.questions.splice(selected.value.question, 1)
  selected.value = null
}

function removeFinal() {
  if (game.value && confirm('Удалить финал?')) game.value.finalRound = undefined
}

async function play() {
  if (!game.value) return
  await flushSave()
  if (saveStatus.value !== 'error') router.push({ name: 'play', params: { id: game.value.id } })
}

const exporting = ref(false)
async function exportAs(format: GameFileFormat) {
  if (!game.value || exporting.value) return
  exporting.value = true
  try {
    await exportGameFile(game.value, format)
  } catch (err) {
    alert('Ошибка экспорта: ' + (err as Error).message)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div v-if="game" class="si-page editor">
    <header class="editor-head">
      <button class="si-button ghost" @click="router.push({ name: 'home' })">← К списку</button>
      <div class="titles">
        <input v-model="game.title" class="si-input title-input" placeholder="Название игры" />
        <input v-model="game.subtitle" class="si-input subtitle-input" placeholder="Подзаголовок (необязательно)" />
      </div>
      <span class="save-status" :class="saveStatus" :title="saveError?.message" role="status">{{ saveLabel }}</span>
      <button class="si-button" :disabled="exporting" title="Сохранить как .json" @click="exportAs('json')">JSON</button>
      <button class="si-button" :disabled="exporting" title="Сохранить как .gamezip" @click="exportAs('gamezip')">
        {{ exporting ? '⏳ Упаковка…' : '📦 .gamezip' }}
      </button>
      <button class="si-button primary" @click="play">▶ Играть</button>
    </header>

    <RoundTabs :model-value="roundIndex" :rounds="game.rounds" @update:model-value="selectRound" @add="addRound" />

    <div v-if="round" class="editor-grid">
      <section class="structure">
        <div class="si-row round-row">
          <input v-model="round.name" class="si-input" placeholder="Название раунда" />
          <button v-if="game.rounds.length > 1" class="si-button danger" @click="removeRound">Удалить раунд</button>
        </div>
        <ThemeCard
          v-for="(theme, tIdx) in round.themes"
          :key="theme.id"
          v-model="round.themes[tIdx]"
          :selected="selected?.theme === tIdx ? selected.question : null"
          @select="(qIdx) => (selected = { theme: tIdx, question: qIdx })"
          @remove="removeTheme(tIdx)"
        />
        <button class="si-button" @click="addTheme">+ Тема</button>
      </section>

      <section class="q-editor si-card">
        <QuestionForm
          v-if="selected && selectedTheme?.questions[selected.question]"
          :key="selectedTheme.questions[selected.question].id"
          v-model="selectedTheme.questions[selected.question]"
          @remove="removeQuestion"
        />
        <p v-else class="q-placeholder">Выберите ячейку, чтобы отредактировать вопрос.</p>
      </section>
    </div>

    <section class="si-card final-section">
      <div class="si-row final-head">
        <h2 class="si-title final-title">ФИНАЛ</h2>
        <button v-if="!game.finalRound" class="si-button" @click="game.finalRound = makeEmptyFinal()">
          + Добавить финал
        </button>
      </div>
      <FinalForm v-if="game.finalRound" v-model="game.finalRound" @remove="removeFinal" />
    </section>
  </div>
</template>

<style scoped>
.editor-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.titles {
  flex: 1;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.title-input {
  font-family: var(--font-title);
  font-size: 22px;
  color: var(--si-gold);
}
.subtitle-input { font-size: 14px; padding: 6px 12px; }
.save-status { color: var(--si-mute); font-size: 14px; font-style: italic; }
.save-status.error { color: #ff8a8a; font-style: normal; font-weight: 700; }

.editor-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 18px;
}
@media (max-width: 900px) {
  .editor-grid { grid-template-columns: 1fr; }
}
.structure {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.round-row { flex-wrap: nowrap; }
.q-editor { min-height: 200px; align-self: start; }
.q-placeholder {
  color: var(--si-mute);
  font-style: italic;
  text-align: center;
  padding: 40px 12px;
  margin: 0;
}
.final-section { margin-top: 24px; }
.final-head { margin-bottom: 12px; }
.final-title { font-size: 28px; margin: 0; }
</style>
