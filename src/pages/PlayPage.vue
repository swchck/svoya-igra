<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Game } from '../types'
import { getGame } from '../storage'
import { usePlaySession } from '../composables/usePlaySession'
import PlayersStrip from '../components/play/PlayersStrip.vue'
import PlayerSetup from '../components/play/PlayerSetup.vue'
import IntroSlide from '../components/play/IntroSlide.vue'
import BoardGrid from '../components/play/BoardGrid.vue'
import CardSlide from '../components/play/CardSlide.vue'
import ResultsSlide from '../components/play/ResultsSlide.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()

const game = ref<Game | null>(null)
getGame(props.id).then((g) => {
  if (g) game.value = g
  else router.replace({ name: 'home' })
})

const session = usePlaySession(game)
const { state, players, round, activeQuestion, ranking, inProgress } = session

const KIND_BADGE = { normal: undefined, auction: 'ВОПРОС-АУКЦИОН', 'cat-in-bag': 'КОТ В МЕШКЕ' } as const

function home() {
  if (inProgress.value && !confirm('Прервать игру?')) return
  router.push({ name: 'home' })
}

const isFullscreen = ref(false)
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.()
  else document.documentElement.requestFullscreen?.()
}
function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

function onKey(e: KeyboardEvent) {
  if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return
  if ((e.key === ' ' || e.key === 'Enter') && session.advance()) e.preventDefault()
  else if (e.key === 'Escape' && state.phase === 'answer') session.close()
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div v-if="game" class="play-shell">
    <header class="play-top">
      <button class="si-button ghost" @click="home">← Выйти</button>
      <div class="si-spacer" />
      <button class="si-button ghost" @click="toggleFullscreen">
        {{ isFullscreen ? '⤓ Свернуть' : '⤢ На весь экран' }}
      </button>
    </header>

    <PlayersStrip v-if="inProgress" v-model="players" />

    <section v-if="state.phase === 'title'" class="slide">
      <h1 class="si-title huge">{{ game.title || 'СВОЯ ИГРА' }}</h1>
      <p v-if="game.subtitle" class="subtitle">{{ game.subtitle }}</p>
      <PlayerSetup v-model="players" @add="session.addPlayer" @remove="session.removePlayer" />
      <button class="si-button primary big" @click="session.start">▶ Начать игру</button>
    </section>

    <IntroSlide
      v-else-if="state.phase === 'round-intro'"
      :title="round?.name ?? ''"
      hint="нажмите для перехода к выбору"
      @next="session.advance"
    />

    <section v-else-if="state.phase === 'board' && round" class="slide board">
      <h2 class="board-title si-title">{{ round.name }}</h2>
      <BoardGrid :round="round" :played="state.played" @pick="session.pick" />
      <button class="si-button ghost" @click="session.nextRound">Пропустить раунд →</button>
    </section>

    <CardSlide
      v-else-if="state.phase === 'question' && activeQuestion"
      variant="question"
      :badge="KIND_BADGE[activeQuestion.kind]"
      :text="activeQuestion.text"
      :media="activeQuestion.media"
    >
      <button class="si-button primary big" @click="session.advance">Показать ответ</button>
    </CardSlide>

    <CardSlide
      v-else-if="state.phase === 'answer' && activeQuestion"
      variant="answer"
      :text="activeQuestion.answer"
      :media="activeQuestion.answerMedia"
    >
      <div class="award-grid">
        <div v-for="p in players" :key="p.id" class="award-card">
          <div class="award-name">{{ p.name }}</div>
          <div class="award-buttons">
            <button class="si-button primary" @click="session.close({ player: p, sign: 1 })">
              +{{ activeQuestion.value }}
            </button>
            <button class="si-button danger" @click="session.close({ player: p, sign: -1 })">
              −{{ activeQuestion.value }}
            </button>
          </div>
        </div>
      </div>
      <button class="si-button ghost" @click="session.close()">Никто (к выбору)</button>
    </CardSlide>

    <IntroSlide
      v-else-if="state.phase === 'final-intro'"
      title="ФИНАЛЬНЫЙ РАУНД"
      :subtitle="game.finalRound?.theme"
      hint="нажмите чтобы начать"
      @next="session.advance"
    />

    <CardSlide
      v-else-if="state.phase === 'final-question' && game.finalRound"
      variant="question"
      :badge="`ФИНАЛ · ${game.finalRound.theme}`"
      :text="game.finalRound.text"
      :media="game.finalRound.media"
    >
      <button class="si-button primary big" @click="session.advance">Показать ответ</button>
    </CardSlide>

    <CardSlide v-else-if="state.phase === 'final-answer' && game.finalRound" variant="answer" :text="game.finalRound.answer">
      <button class="si-button primary big" @click="session.advance">К результатам →</button>
    </CardSlide>

    <ResultsSlide v-else-if="state.phase === 'results'" :ranking="ranking" @home="home" />
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
.board { gap: 16px; width: 100%; }
.board-title { font-size: clamp(28px, 4vw, 44px); margin: 0; }
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
.award-buttons .si-button { flex: 1; justify-content: center; }
</style>
