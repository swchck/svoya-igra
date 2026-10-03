<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ArrowLeft, Check, Maximize, Minimize, SkipForward, X } from '@lucide/vue'
import { useRouter } from 'vue-router'
import type { Game } from '@/types'
import { Button } from '@/components/ui/button'
import { confirmAction } from '@/composables/useConfirm'
import { getGame } from '@/storage'
import { usePlaySession } from '@/composables/usePlaySession'
import PlayersStrip from '@/components/play/PlayersStrip.vue'
import PlayerSetup from '@/components/play/PlayerSetup.vue'
import IntroSlide from '@/components/play/IntroSlide.vue'
import BoardGrid from '@/components/play/BoardGrid.vue'
import CardSlide from '@/components/play/CardSlide.vue'
import ResultsSlide from '@/components/play/ResultsSlide.vue'

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

async function home() {
  if (inProgress.value && !(await confirmAction({ title: 'Прервать игру?', description: 'Счёт этой партии не сохранится.', confirmLabel: 'Прервать' }))) return
  router.push({ name: 'home' })
}

async function skipRound() {
  if (await confirmAction({ title: 'Пропустить раунд?', description: 'Несыгранные вопросы останутся несыгранными.', confirmLabel: 'Пропустить' })) {
    session.nextRound()
  }
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
  <div v-if="game" class="flex min-h-screen flex-col">
    <header class="flex items-center gap-3 px-5 py-3">
      <Button variant="ghost" @click="home"><ArrowLeft />Выйти</Button>
      <div class="flex-1" />
      <Button variant="ghost" @click="toggleFullscreen">
        <template v-if="isFullscreen"><Minimize />Свернуть</template>
        <template v-else><Maximize />На весь экран</template>
      </Button>
    </header>

    <PlayersStrip v-if="inProgress" v-model="players" />

    <section v-if="state.phase === 'title'" class="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <h1 class="title-gold text-6xl leading-none sm:text-8xl">{{ game.title || 'Своя игра' }}</h1>
        <p v-if="game.subtitle" class="mt-4 font-serif text-2xl text-muted-foreground italic">{{ game.subtitle }}</p>
      </div>
      <PlayerSetup v-model="players" @add="session.addPlayer" @remove="session.removePlayer" />
      <Button size="lg" class="h-12 px-8 text-lg" @click="session.start">Начать игру</Button>
    </section>

    <IntroSlide
      v-else-if="state.phase === 'round-intro'"
      :title="round?.name ?? ''"
      hint="Нажмите или пробел — к выбору вопроса"
      @next="session.advance"
    />

    <section v-else-if="state.phase === 'board' && round" class="flex flex-1 flex-col items-center gap-5 px-5 py-6">
      <h2 class="title-gold text-4xl">{{ round.name }}</h2>
      <BoardGrid :round="round" :played="state.played" @pick="session.pick" />
      <Button variant="ghost" @click="skipRound">Пропустить раунд<SkipForward /></Button>
    </section>

    <CardSlide
      v-else-if="state.phase === 'question' && activeQuestion"
      variant="question"
      :badge="KIND_BADGE[activeQuestion.kind]"
      :text="activeQuestion.text"
      :media="activeQuestion.media"
    >
      <Button size="lg" class="h-12 px-8 text-lg" @click="session.advance">Показать ответ</Button>
    </CardSlide>

    <CardSlide
      v-else-if="state.phase === 'answer' && activeQuestion"
      variant="answer"
      :text="activeQuestion.answer"
      :media="activeQuestion.answerMedia"
    >
      <div class="grid w-full max-w-4xl grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <div v-for="p in players" :key="p.id" class="flex flex-col gap-2 rounded-xl border border-border bg-board p-3">
          <div class="font-medium">{{ p.name }}</div>
          <div class="flex gap-2">
            <Button class="flex-1" @click="session.close({ player: p, sign: 1 })"><Check />+{{ activeQuestion.value }}</Button>
            <Button class="flex-1" variant="destructive" @click="session.close({ player: p, sign: -1 })">
              <X />−{{ activeQuestion.value }}
            </Button>
          </div>
        </div>
      </div>
      <Button variant="ghost" @click="session.close()">Никто не ответил — к табло</Button>
    </CardSlide>

    <IntroSlide
      v-else-if="state.phase === 'final-intro'"
      title="Финал"
      :subtitle="game.finalRound?.theme"
      hint="Нажмите или пробел — начать"
      @next="session.advance"
    />

    <CardSlide
      v-else-if="state.phase === 'final-question' && game.finalRound"
      variant="question"
      :badge="`Финал · ${game.finalRound.theme}`"
      :text="game.finalRound.text"
      :media="game.finalRound.media"
    >
      <Button size="lg" class="h-12 px-8 text-lg" @click="session.advance">Показать ответ</Button>
    </CardSlide>

    <CardSlide v-else-if="state.phase === 'final-answer' && game.finalRound" variant="answer" :text="game.finalRound.answer">
      <Button size="lg" class="h-12 px-8 text-lg" @click="session.advance">К итогам</Button>
    </CardSlide>

    <ResultsSlide v-else-if="state.phase === 'results'" :ranking="ranking" @home="home" />
  </div>
</template>
