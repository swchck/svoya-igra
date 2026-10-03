<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getGame, uid } from '../storage'
import type { Game, Player, Question } from '../types'
import MediaView from '../components/MediaView.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()

const game = ref<Game | null>(null)
;(async () => {
  const g = await getGame(props.id)
  if (!g) {
    router.replace({ name: 'home' })
    return
  }
  game.value = g
})()

type Phase =
  | 'title'
  | 'round-intro'
  | 'board'
  | 'question'
  | 'answer'
  | 'final-intro'
  | 'final-question'
  | 'final-answer'
  | 'results'

const state = reactive({
  phase: 'title' as Phase,
  roundIndex: 0,
  activeQuestionId: null as string | null,
  played: {} as Record<string, true>,
})

const players = ref<Player[]>([
  { id: uid('p_'), name: 'Игрок 1', score: 0 },
  { id: uid('p_'), name: 'Игрок 2', score: 0 },
])

const currentRound = computed(() => game.value?.rounds[state.roundIndex])
const activeQuestion = computed<Question | null>(() => {
  if (!state.activeQuestionId || !currentRound.value) return null
  for (const t of currentRound.value.themes) {
    for (const q of t.questions) if (q.id === state.activeQuestionId) return q
  }
  return null
})

function start() {
  state.phase = 'round-intro'
}

function intoBoard() {
  state.phase = 'board'
}

function pickQuestion(q: Question) {
  if (state.played[q.id]) return
  state.activeQuestionId = q.id
  state.phase = 'question'
}

function reveal() {
  state.phase = 'answer'
}

function backToBoard(awardTo?: Player, deduct = false) {
  if (activeQuestion.value) {
    state.played[activeQuestion.value.id] = true
    if (awardTo) {
      const v = activeQuestion.value.value
      awardTo.score += deduct ? -v : v
    }
  }
  state.activeQuestionId = null
  // If round complete → next round / final
  if (currentRound.value && allPlayed(currentRound.value)) {
    nextRound()
  } else {
    state.phase = 'board'
  }
}

function allPlayed(round: NonNullable<typeof currentRound.value>): boolean {
  return round.themes.every((t) => t.questions.every((q) => state.played[q.id]))
}

function nextRound() {
  if (!game.value) return
  if (state.roundIndex < game.value.rounds.length - 1) {
    state.roundIndex += 1
    state.phase = 'round-intro'
  } else if (game.value.finalRound) {
    state.phase = 'final-intro'
  } else {
    state.phase = 'results'
  }
}

function startFinal() {
  state.phase = 'final-question'
}
function revealFinal() {
  state.phase = 'final-answer'
}
function endGame() {
  state.phase = 'results'
}

function adjustScore(p: Player, delta: number) {
  p.score += delta
}

function addPlayer() {
  players.value.push({ id: uid('p_'), name: `Игрок ${players.value.length + 1}`, score: 0 })
}
function removePlayer(p: Player) {
  players.value = players.value.filter((x) => x.id !== p.id)
}

function home() {
  if (state.phase !== 'title' && state.phase !== 'results') {
    if (!confirm('Прервать игру?')) return
  }
  router.push({ name: 'home' })
}

// Fullscreen + ESC handling
const isFullscreen = ref(false)
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}
function onFsChange() { isFullscreen.value = !!document.fullscreenElement }

function onKey(e: KeyboardEvent) {
  if (e.key === ' ' || e.key === 'Enter') {
    if (state.phase === 'question') { e.preventDefault(); reveal() }
    else if (state.phase === 'final-question') { e.preventDefault(); revealFinal() }
    else if (state.phase === 'round-intro') { e.preventDefault(); intoBoard() }
    else if (state.phase === 'final-intro') { e.preventDefault(); startFinal() }
  } else if (e.key === 'Escape' && state.phase === 'answer') {
    backToBoard()
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFsChange)
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFsChange)
  window.removeEventListener('keydown', onKey)
})

const winner = computed(() => {
  const sorted = [...players.value].sort((a, b) => b.score - a.score)
  return sorted[0]
})

function maxQuestions(round: { themes: { questions: unknown[] }[] }): number {
  return round.themes.reduce((m, t) => Math.max(m, t.questions.length), 0)
}
</script>

<template>
  <div v-if="game" class="play-shell">
    <!-- Top bar -->
    <header class="play-top">
      <button class="si-button ghost" @click="home">← Выйти</button>
      <div class="si-spacer" />
      <button class="si-button ghost" @click="toggleFullscreen">
        {{ isFullscreen ? '⤓ Свернуть' : '⤢ На весь экран' }}
      </button>
    </header>

    <!-- Players strip -->
    <section v-if="state.phase !== 'title' && state.phase !== 'results'" class="players-strip">
      <div v-for="p in players" :key="p.id" class="player-card">
        <input v-model="p.name" class="player-name" />
        <div class="player-score">{{ p.score }}</div>
        <div class="player-controls">
          <button class="si-button ghost" @click="adjustScore(p, -100)">−100</button>
          <button class="si-button ghost" @click="adjustScore(p, 100)">+100</button>
        </div>
      </div>
    </section>

    <!-- Title slide -->
    <section v-if="state.phase === 'title'" class="slide title-slide">
      <h1 class="si-title huge">{{ game.title || 'СВОЯ ИГРА' }}</h1>
      <p v-if="game.subtitle" class="subtitle">{{ game.subtitle }}</p>
      <div class="setup si-card">
        <h3 style="margin-top:0">Игроки</h3>
        <div class="players-setup">
          <div v-for="p in players" :key="p.id" class="si-row">
            <input v-model="p.name" class="si-input" />
            <button class="si-button danger ghost" :disabled="players.length<=1" @click="removePlayer(p)">×</button>
          </div>
          <button class="si-button" @click="addPlayer">+ Игрок</button>
        </div>
      </div>
      <button class="si-button primary big" @click="start">▶ Начать игру</button>
    </section>

    <!-- Round intro -->
    <section v-else-if="state.phase === 'round-intro'" class="slide round-intro" @click="intoBoard">
      <h1 class="si-title huge round-name">{{ currentRound?.name }}</h1>
      <p class="hint">нажмите для перехода к выбору</p>
    </section>

    <!-- Board -->
    <section v-else-if="state.phase === 'board' && currentRound" class="slide board">
      <h2 class="board-title si-title">{{ currentRound.name }}</h2>
      <div
        class="board-grid"
        :style="{
          gridTemplateColumns: `minmax(240px, 1.6fr) repeat(${maxQuestions(currentRound)}, 1fr)`
        }"
      >
        <template v-for="t in currentRound.themes" :key="t.id">
          <div class="theme-name-cell">{{ t.name }}</div>
          <button
            v-for="q in t.questions"
            :key="q.id"
            class="board-cell"
            :class="{ played: state.played[q.id] }"
            :disabled="!!state.played[q.id]"
            @click="pickQuestion(q)"
          >
            <span v-if="!state.played[q.id]">{{ q.value }}</span>
          </button>
          <!-- pad if theme has fewer questions -->
          <span
            v-for="i in Math.max(0, maxQuestions(currentRound) - t.questions.length)"
            :key="t.id + '-pad-' + i"
            class="board-cell pad"
          />
        </template>
      </div>
      <div class="board-foot">
        <button class="si-button ghost" @click="nextRound">Пропустить раунд →</button>
      </div>
    </section>

    <!-- Question -->
    <section v-else-if="state.phase === 'question' && activeQuestion" class="slide question-slide">
      <div v-if="activeQuestion.kind !== 'normal'" class="badge">
        {{ activeQuestion.kind === 'auction' ? 'ВОПРОС-АУКЦИОН' : 'КОТ В МЕШКЕ' }}
      </div>
      <div class="q-text">{{ activeQuestion.text }}</div>
      <MediaView v-if="activeQuestion.media?.length" class="q-media" :items="activeQuestion.media" :autoplay="true" />
      <div class="q-actions">
        <button class="si-button primary big" @click="reveal">Показать ответ</button>
      </div>
    </section>

    <!-- Answer -->
    <section v-else-if="state.phase === 'answer' && activeQuestion" class="slide answer-slide">
      <div class="a-text">{{ activeQuestion.answer }}</div>
      <MediaView v-if="activeQuestion.answerMedia?.length" class="q-media" :items="activeQuestion.answerMedia" :autoplay="true" />
      <div class="award-grid">
        <div v-for="p in players" :key="p.id" class="award-card">
          <div class="award-name">{{ p.name }}</div>
          <div class="award-buttons">
            <button class="si-button primary" @click="backToBoard(p, false)">+{{ activeQuestion.value }}</button>
            <button class="si-button danger" @click="backToBoard(p, true)">−{{ activeQuestion.value }}</button>
          </div>
        </div>
      </div>
      <div style="margin-top: 16px;">
        <button class="si-button ghost" @click="backToBoard()">Никто (к выбору)</button>
      </div>
    </section>

    <!-- Final intro -->
    <section v-else-if="state.phase === 'final-intro'" class="slide round-intro" @click="startFinal">
      <h1 class="si-title huge round-name">ФИНАЛЬНЫЙ РАУНД</h1>
      <p class="subtitle">{{ game.finalRound?.theme }}</p>
      <p class="hint">нажмите чтобы начать</p>
    </section>

    <!-- Final question -->
    <section v-else-if="state.phase === 'final-question' && game.finalRound" class="slide question-slide">
      <div class="badge">ФИНАЛ · {{ game.finalRound.theme }}</div>
      <div class="q-text">{{ game.finalRound.text }}</div>
      <MediaView v-if="game.finalRound.media?.length" class="q-media" :items="game.finalRound.media" :autoplay="true" />
      <div class="q-actions">
        <button class="si-button primary big" @click="revealFinal">Показать ответ</button>
      </div>
    </section>

    <!-- Final answer -->
    <section v-else-if="state.phase === 'final-answer' && game.finalRound" class="slide answer-slide">
      <div class="a-text">{{ game.finalRound.answer }}</div>
      <div class="q-actions">
        <button class="si-button primary big" @click="endGame">К результатам →</button>
      </div>
    </section>

    <!-- Results -->
    <section v-else-if="state.phase === 'results'" class="slide results-slide">
      <h1 class="si-title huge">ИТОГИ</h1>
      <div class="results-list">
        <div
          v-for="(p, i) in [...players].sort((a, b) => b.score - a.score)"
          :key="p.id"
          class="result-row"
          :class="{ winner: i === 0 }"
        >
          <span class="rank">{{ i + 1 }}</span>
          <span class="name">{{ p.name }}</span>
          <span class="score">{{ p.score }}</span>
        </div>
      </div>
      <p v-if="winner" class="winner-line">Победитель: <b>{{ winner.name }}</b></p>
      <button class="si-button primary big" @click="home">← На главную</button>
    </section>
  </div>
</template>

<style scoped>
.play-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.play-top {
  display: flex;
  gap: 12px;
  padding: 12px 18px;
  align-items: center;
}

.players-strip {
  display: flex;
  gap: 10px;
  padding: 0 18px 8px;
  overflow-x: auto;
}
.player-card {
  background: var(--si-cell-bg);
  border: 1px solid var(--si-cell-border);
  border-radius: 12px;
  padding: 10px 14px;
  min-width: 160px;
}
.player-name {
  background: transparent;
  border: none;
  color: var(--si-white);
  font-family: var(--font-title);
  font-size: 16px;
  width: 100%;
  outline: none;
  border-bottom: 1px dashed transparent;
}
.player-name:focus { border-bottom-color: var(--si-gold); }
.player-score {
  color: var(--si-gold);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 28px;
  text-align: center;
  margin: 4px 0;
}
.player-controls { display: flex; gap: 6px; }
.player-controls .si-button { flex: 1; padding: 4px 8px; font-size: 12px; }

.slide {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px;
  gap: 24px;
}

.huge {
  font-size: clamp(60px, 10vw, 140px);
  margin: 0;
  line-height: 1;
}
.subtitle {
  color: var(--si-mute);
  font-style: italic;
  font-size: 22px;
  margin: 0;
}
.setup { width: min(520px, 100%); text-align: left; }
.players-setup { display: flex; flex-direction: column; gap: 10px; }
.si-button.big { padding: 14px 28px; font-size: 18px; }

.round-intro { cursor: pointer; }
.round-name { letter-spacing: 0.04em; }
.hint { color: var(--si-mute); font-style: italic; }

.board-title { font-size: clamp(28px, 4vw, 44px); margin: 0; }
.board {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}
.board-grid {
  display: grid;
  gap: 6px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}
.theme-name-cell {
  background: rgba(255, 192, 0, 0.18);
  color: var(--si-gold);
  border: 1px solid var(--si-gold);
  border-radius: 8px;
  padding: 18px 14px;
  font-family: var(--font-title);
  font-size: clamp(16px, 1.6vw, 22px);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-weight: 700;
  text-transform: uppercase;
}
.board-cell {
  border-radius: 8px;
  border: 1px solid var(--si-cell-border);
  background: var(--si-cell-bg);
  color: var(--si-gold);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: clamp(20px, 3vw, 36px);
  cursor: pointer;
  min-height: 80px;
  transition: transform 0.15s, background 0.15s;
}
.board-cell:hover:not(:disabled) { transform: scale(1.04); background: rgba(255, 192, 0, 0.12); }
.board-cell.played, .board-cell.pad {
  background: var(--si-cell-played);
  color: transparent;
  cursor: default;
  border-color: rgba(255, 255, 255, 0.05);
}
.board-cell.pad { pointer-events: none; }

.board-foot { display: flex; justify-content: center; }

.question-slide, .answer-slide {
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}
.badge {
  background: var(--si-gold);
  color: #1a1a4a;
  padding: 6px 18px;
  border-radius: 30px;
  font-family: var(--font-title);
  font-weight: 700;
  letter-spacing: 0.1em;
}
.q-text {
  font-family: var(--font-body);
  font-weight: 700;
  font-size: clamp(28px, 4vw, 56px);
  line-height: 1.25;
  white-space: pre-wrap;
}
.a-text {
  font-family: var(--font-title);
  font-weight: 700;
  color: var(--si-gold);
  font-size: clamp(36px, 6vw, 80px);
  line-height: 1.2;
  white-space: pre-wrap;
}
.q-media { max-width: 100%; }
.q-media img { max-width: 100%; max-height: 50vh; border-radius: 12px; }
.q-media video { max-width: 100%; max-height: 50vh; border-radius: 12px; }
.q-media audio { width: min(560px, 100%); }
.q-actions { margin-top: 18px; }

.award-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  width: 100%;
  max-width: 900px;
}
.award-card {
  background: var(--si-cell-bg);
  border: 1px solid var(--si-cell-border);
  border-radius: 10px;
  padding: 12px;
}
.award-name { font-family: var(--font-title); margin-bottom: 8px; }
.award-buttons { display: flex; gap: 8px; }
.award-buttons .si-button { flex: 1; }

.results-list {
  width: min(640px, 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.result-row {
  display: grid;
  grid-template-columns: 50px 1fr 120px;
  gap: 12px;
  padding: 16px 18px;
  background: var(--si-cell-bg);
  border: 1px solid var(--si-cell-border);
  border-radius: 12px;
  align-items: center;
}
.result-row.winner {
  border-color: var(--si-gold);
  background: rgba(255, 192, 0, 0.18);
}
.rank { font-family: var(--font-title); font-size: 22px; color: var(--si-gold); }
.name { text-align: left; font-size: 22px; }
.score { text-align: right; font-weight: 700; color: var(--si-gold); font-size: 28px; }
.winner-line { font-size: 22px; }
</style>
