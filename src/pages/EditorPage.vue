<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGamesStore } from '../stores/games'
import { getGame, makeEmptyQuestion, makeEmptyRound, makeEmptyTheme, uid } from '../storage'
import type { Game, Question, Round, Theme } from '../types'
import MediaList from '../components/MediaList.vue'
import { exportGameZip } from '../archive'
import { exportGameJson } from '../storage'

function fileSlug(t: string): string {
  const s = (t || 'svoya-igra').trim().toLowerCase().replace(/[^a-zа-яё0-9-]+/gi, '-').replace(/^-+|-+$/g, '')
  return s || 'svoya-igra'
}
function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

const props = defineProps<{ id: string }>()
const router = useRouter()
const store = useGamesStore()

const game = ref<Game | null>(null)
const activeRoundIndex = ref(0)
/** Selected question editor coordinates */
const selected = ref<{ tIdx: number; qIdx: number } | null>(null)

;(async () => {
  const g = await getGame(props.id)
  if (!g) {
    router.replace({ name: 'home' })
    return
  }
  game.value = g
})()

const currentRound = computed<Round | undefined>(() => game.value?.rounds[activeRoundIndex.value])
const selectedQuestion = computed<Question | null>(() => {
  if (!selected.value || !currentRound.value) return null
  const t = currentRound.value.themes[selected.value.tIdx]
  return t?.questions[selected.value.qIdx] ?? null
})

let saveTimer: number | undefined
watch(
  game,
  (g) => {
    if (!g) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => store.save(g), 250)
  },
  { deep: true },
)

function addRound() {
  if (!game.value) return
  const n = game.value.rounds.length + 1
  game.value.rounds.push(makeEmptyRound(`РАУНД ${n}`))
  activeRoundIndex.value = game.value.rounds.length - 1
}

function removeRound(i: number) {
  if (!game.value || game.value.rounds.length <= 1) return
  if (!confirm('Удалить раунд?')) return
  game.value.rounds.splice(i, 1)
  activeRoundIndex.value = Math.max(0, Math.min(activeRoundIndex.value, game.value.rounds.length - 1))
  selected.value = null
}

function addTheme() {
  if (!currentRound.value) return
  currentRound.value.themes.push(makeEmptyTheme(`Тема ${currentRound.value.themes.length + 1}`))
}

function removeTheme(i: number) {
  if (!currentRound.value) return
  if (!confirm('Удалить тему?')) return
  currentRound.value.themes.splice(i, 1)
  selected.value = null
}

function addQuestion(theme: Theme) {
  const last = theme.questions[theme.questions.length - 1]
  const value = last ? last.value + 100 : 100
  theme.questions.push(makeEmptyQuestion(value))
}

function removeQuestion(theme: Theme, qIdx: number) {
  theme.questions.splice(qIdx, 1)
  selected.value = null
}

function selectQuestion(tIdx: number, qIdx: number) {
  selected.value = { tIdx, qIdx }
}

function back() {
  router.push({ name: 'home' })
}

function play() {
  if (!game.value) return
  store.save(game.value)
  router.push({ name: 'play', params: { id: game.value.id } })
}

function ensureFinal() {
  if (!game.value) return
  if (!game.value.finalRound) {
    game.value.finalRound = { id: uid('f_'), theme: 'Финал', text: '', answer: '' }
  }
}

function removeFinal() {
  if (!game.value) return
  if (window.confirm('Удалить финал?')) game.value.finalRound = undefined
}

const exporting = ref(false)
async function saveGamezip() {
  if (!game.value || exporting.value) return
  exporting.value = true
  try {
    store.save(game.value) // ensure freshest copy persisted
    const blob = await exportGameZip(game.value)
    trigger(blob, `${fileSlug(game.value.title)}.gamezip`)
  } catch (err) {
    alert('Ошибка экспорта: ' + (err as Error).message)
  } finally {
    exporting.value = false
  }
}
function saveJson() {
  if (!game.value) return
  store.save(game.value)
  const blob = new Blob([exportGameJson(game.value)], { type: 'application/json' })
  trigger(blob, `${fileSlug(game.value.title)}.json`)
}

</script>

<template>
  <div v-if="game" class="si-page editor">
    <header class="editor-head">
      <button class="si-button ghost" @click="back">← К списку</button>
      <input v-model="game.title" class="si-input title-input" placeholder="Название игры" />
      <div class="si-spacer" />
      <button class="si-button" @click="saveJson" title="Сохранить как .json">JSON</button>
      <button class="si-button" :disabled="exporting" @click="saveGamezip" title="Сохранить как .gamezip">
        {{ exporting ? '⏳ Упаковка…' : '📦 .gamezip' }}
      </button>
      <button class="si-button primary" @click="play">▶ Играть</button>
    </header>

    <section class="round-tabs">
      <button
        v-for="(r, i) in game.rounds"
        :key="r.id"
        class="round-tab"
        :class="{ active: i === activeRoundIndex }"
        @click="activeRoundIndex = i; selected = null"
      >
        {{ r.name || `РАУНД ${i + 1}` }}
      </button>
      <button class="round-tab add" @click="addRound">+ раунд</button>
    </section>

    <div v-if="currentRound" class="editor-grid">
      <!-- Left: round/theme/question structure -->
      <section class="structure">
        <div class="si-row">
          <input
            v-model="currentRound.name"
            class="si-input"
            placeholder="Название раунда"
          />
          <button
            v-if="game.rounds.length > 1"
            class="si-button danger"
            @click="removeRound(activeRoundIndex)"
          >
            Удалить раунд
          </button>
        </div>

        <div class="theme-list">
          <article v-for="(theme, tIdx) in currentRound.themes" :key="theme.id" class="theme-card si-card">
            <div class="si-row">
              <input
                v-model="theme.name"
                class="si-input theme-name"
                placeholder="Название темы"
              />
              <button class="si-button danger ghost" @click="removeTheme(tIdx)">×</button>
            </div>
            <div class="q-row">
              <button
                v-for="(q, qIdx) in theme.questions"
                :key="q.id"
                class="q-cell"
                :class="{
                  active: selected?.tIdx === tIdx && selected.qIdx === qIdx,
                  empty: !q.text,
                  auction: q.kind === 'auction',
                  bag: q.kind === 'cat-in-bag',
                }"
                @click="selectQuestion(tIdx, qIdx)"
                :title="q.text || 'Пустой вопрос'"
              >
                {{ q.value }}
              </button>
              <button class="q-cell add" @click="addQuestion(theme)">+</button>
            </div>
          </article>
          <button class="si-button" @click="addTheme">+ Тема</button>
        </div>
      </section>

      <!-- Right: question editor -->
      <section class="q-editor si-card">
        <div v-if="!selectedQuestion" class="q-placeholder">
          Выберите ячейку, чтобы отредактировать вопрос.
        </div>
        <div v-else class="q-form">
          <div class="si-row">
            <div style="flex:1;">
              <label class="si-label">Стоимость</label>
              <input
                v-model.number="selectedQuestion.value"
                type="number"
                class="si-input"
                min="0"
                step="100"
              />
            </div>
            <div style="flex:1;">
              <label class="si-label">Тип</label>
              <select v-model="selectedQuestion.kind" class="si-select">
                <option value="normal">Обычный</option>
                <option value="auction">Вопрос-аукцион</option>
                <option value="cat-in-bag">Кот в мешке</option>
              </select>
            </div>
            <div v-if="selectedQuestion.kind === 'cat-in-bag'" style="flex:1;">
              <label class="si-label">Цена «кота»</label>
              <input
                v-model.number="selectedQuestion.catValue"
                type="number"
                class="si-input"
                min="0"
                step="100"
              />
            </div>
          </div>

          <div>
            <label class="si-label">Вопрос</label>
            <textarea v-model="selectedQuestion.text" class="si-textarea" placeholder="Текст вопроса..." />
          </div>

          <MediaList
            label="Медиа к вопросу (можно несколько)"
            v-model="selectedQuestion.media"
          />

          <div>
            <label class="si-label">Ответ</label>
            <textarea v-model="selectedQuestion.answer" class="si-textarea" placeholder="Правильный ответ..." />
          </div>

          <MediaList
            label="Медиа к ответу (можно несколько)"
            v-model="selectedQuestion.answerMedia"
          />

          <div class="si-row">
            <button
              class="si-button danger"
              @click="
                () => {
                  if (selected && currentRound) {
                    removeQuestion(currentRound.themes[selected.tIdx], selected.qIdx)
                  }
                }
              "
            >
              Удалить вопрос
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Final round -->
    <section class="si-card final-section">
      <div class="si-row" style="margin-bottom: 12px">
        <h2 class="si-title final-title">ФИНАЛ</h2>
        <button v-if="!game.finalRound" class="si-button" @click="ensureFinal">+ Добавить финал</button>
      </div>
      <div v-if="game.finalRound" class="final-form">
        <div>
          <label class="si-label">Тема финала</label>
          <input v-model="game.finalRound.theme" class="si-input" placeholder="Тема" />
        </div>
        <div>
          <label class="si-label">Вопрос</label>
          <textarea v-model="game.finalRound.text" class="si-textarea" placeholder="Финальный вопрос..." />
        </div>
        <MediaList label="Медиа к финалу (можно несколько)" v-model="game.finalRound.media" />
        <div>
          <label class="si-label">Ответ</label>
          <textarea v-model="game.finalRound.answer" class="si-textarea" placeholder="Ответ..." />
        </div>
        <button class="si-button danger" @click="removeFinal">Удалить финал</button>
      </div>
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
.title-input {
  flex: 1;
  min-width: 240px;
  font-family: var(--font-title);
  font-size: 22px;
  color: var(--si-gold);
}

.round-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.round-tab {
  padding: 8px 16px;
  border-radius: 8px 8px 0 0;
  border: 1px solid var(--si-cell-border);
  border-bottom: none;
  background: rgba(255, 255, 255, 0.05);
  color: var(--si-mute);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 14px;
  letter-spacing: 0.05em;
}
.round-tab.active {
  background: rgba(255, 192, 0, 0.18);
  color: var(--si-gold);
  border-color: var(--si-gold);
}
.round-tab.add { color: var(--si-mute); }

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
  gap: 14px;
}

.theme-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.theme-card {
  padding: 12px;
}
.theme-name { font-family: var(--font-title); }

.q-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.q-cell {
  width: 64px;
  height: 56px;
  border-radius: 8px;
  border: 1px solid var(--si-cell-border);
  background: var(--si-cell-bg);
  color: var(--si-gold);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.1s, background 0.15s;
}
.q-cell:hover { transform: translateY(-1px); }
.q-cell.active {
  outline: 2px solid var(--si-gold);
  outline-offset: 2px;
}
.q-cell.empty {
  color: rgba(255, 192, 0, 0.4);
  font-style: italic;
}
.q-cell.auction { background: rgba(255, 192, 0, 0.18); }
.q-cell.bag { background: rgba(160, 80, 220, 0.25); }
.q-cell.add {
  width: 44px;
  color: var(--si-mute);
  font-size: 22px;
}

.q-editor { min-height: 200px; }
.q-placeholder {
  color: var(--si-mute);
  font-style: italic;
  text-align: center;
  padding: 40px 12px;
}
.q-form { display: flex; flex-direction: column; gap: 14px; }

.final-section { margin-top: 24px; }
.final-title { color: var(--si-gold); font-size: 28px; margin: 0; }
.final-form { display: flex; flex-direction: column; gap: 14px; }
</style>
