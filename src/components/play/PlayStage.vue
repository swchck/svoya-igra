<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Maximize, Minimize, MonitorSmartphone, SkipForward } from '@lucide/vue'
import type { Game } from '@/types'
import { Button } from '@/components/ui/button'
import { confirmAction } from '@/composables/useConfirm'
import { usePlaySession, type SessionSnapshot } from '@/composables/usePlaySession'
import { clearSession, saveSession } from '@/play/savedSession'
import { HOST_COMMANDS, openHostWindow, openPlayChannel, type PlayChannel } from '@/play/channel'
import PlayersStrip from './PlayersStrip.vue'
import PlayerSetup from './PlayerSetup.vue'
import IntroSlide from './IntroSlide.vue'
import BoardGrid from './BoardGrid.vue'
import CardSlide from './CardSlide.vue'
import ResultsSlide from './ResultsSlide.vue'
import AuctionPanel from './AuctionPanel.vue'
import CatPanel from './CatPanel.vue'
import VerdictPanel from './VerdictPanel.vue'
import FinalBetsPanel from './FinalBetsPanel.vue'
import FinalVerdictPanel from './FinalVerdictPanel.vue'

const props = defineProps<{ game: Game; restored?: SessionSnapshot }>()
const router = useRouter()

const session = usePlaySession(
  computed(() => props.game),
  props.restored,
)
const { state, players, round, activeQuestion, activeValue, ranking, inProgress } = session

const theme = computed(() => round.value?.themes.find((t) => t.questions.some((q) => q.id === state.activeQuestionId)))
const stakeHolder = computed(() => (state.stake ? session.player(state.stake.playerId) : undefined))
const questionBadge = computed(() => {
  const q = activeQuestion.value
  if (!q) return undefined
  if (q.kind === 'auction') return stakeHolder.value ? `Аукцион · ${stakeHolder.value.name} · ${activeValue.value}` : 'Вопрос-аукцион'
  if (q.kind === 'cat-in-bag') return stakeHolder.value ? `Кот в мешке · ${stakeHolder.value.name} · ${activeValue.value}` : 'Кот в мешке'
  return `${theme.value?.name ?? ''} · ${q.value}`
})

let channel: PlayChannel | null = null
function publish() {
  channel?.post({ type: 'state', snapshot: session.snapshot() })
}

watch(
  [() => state, players],
  () => {
    if (state.phase === 'results') clearSession(props.game.id)
    else if (state.phase !== 'title') saveSession(props.game.id, session.snapshot())
    publish()
  },
  { deep: true },
)

async function home() {
  const ok =
    !inProgress.value ||
    (await confirmAction({
      title: 'Выйти из игры?',
      description: 'Счёт сохранится, партию можно будет продолжить позже.',
      confirmLabel: 'Выйти',
    }))
  if (ok) router.push({ name: 'home' })
}

async function skipRound() {
  const ok = await confirmAction({
    title: 'Пропустить раунд?',
    description: 'Оставшиеся вопросы этого раунда сыграны не будут.',
    confirmLabel: 'Пропустить',
  })
  if (ok) session.nextRound()
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
  if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable], [role=dialog]')) return
  if ((e.key === ' ' || e.key === 'Enter') && session.advance()) e.preventDefault()
  else if (e.key === 'Escape' && state.phase === 'answer') session.close()
}

onMounted(async () => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  window.addEventListener('keydown', onKey)
  channel = await openPlayChannel(props.game.id, (m) => {
    if (m.type === 'hello') publish()
    // a command from a phase the stage has left is a double click or a stale screen
    else if (m.type === 'command' && HOST_COMMANDS.includes(m.name) && m.phase === state.phase) {
      ;(session[m.name] as (...args: unknown[]) => void)(...m.args)
    }
  })
  publish()
})
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('keydown', onKey)
  channel?.close()
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="flex items-center gap-2 px-5 py-3">
      <Button variant="ghost" @click="home"><ArrowLeft />Выйти</Button>
      <div class="flex-1" />
      <Button variant="ghost" @click="openHostWindow(game.id, game.title)"><MonitorSmartphone />Окно ведущего</Button>
      <Button variant="ghost" @click="toggleFullscreen">
        <template v-if="isFullscreen"><Minimize />Свернуть</template>
        <template v-else><Maximize />На весь экран</template>
      </Button>
    </header>

    <PlayersStrip v-if="inProgress" v-model:players="players" @adjust="session.adjustScore" />

    <section v-if="state.phase === 'title'" class="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <h1 class="title-gold text-6xl leading-none sm:text-8xl">{{ game.title || 'Своя игра' }}</h1>
        <p v-if="game.subtitle" class="mt-4 font-serif text-2xl text-muted-foreground italic">{{ game.subtitle }}</p>
      </div>
      <PlayerSetup v-model="players" @add="session.addPlayer" @remove="(p) => session.removePlayer(p.id)" />
      <Button size="lg" class="h-12 px-8 text-lg" @click="session.start">Начать игру</Button>
    </section>

    <IntroSlide
      v-else-if="state.phase === 'round-intro'"
      :title="round?.name ?? ''"
      hint="Нажмите пробел или кликните, чтобы перейти к табло"
      @next="session.advance"
    />

    <section v-else-if="state.phase === 'board' && round" class="flex flex-1 flex-col items-center gap-5 px-5 py-6">
      <h2 class="title-gold text-4xl">{{ round.name }}</h2>
      <BoardGrid :round="round" :played="state.played" @pick="(q) => session.pick(q.id)" />
      <Button variant="ghost" @click="skipRound">Пропустить раунд<SkipForward /></Button>
    </section>

    <CardSlide
      v-else-if="state.phase === 'auction' && activeQuestion"
      variant="question"
      badge="Вопрос-аукцион"
      :text="`Тема: ${theme?.name ?? ''}`"
    >
      <AuctionPanel :players="players" :value="activeQuestion.value" @stake="session.setAuctionStake" />
    </CardSlide>

    <CardSlide
      v-else-if="state.phase === 'cat' && activeQuestion"
      variant="question"
      badge="Кот в мешке"
      text="Вопрос достаётся другому игроку"
    >
      <CatPanel :players="players" :value="activeQuestion.catValue ?? activeQuestion.value" @give="session.giveCat" />
    </CardSlide>

    <CardSlide
      v-else-if="state.phase === 'question' && activeQuestion"
      variant="question"
      :badge="questionBadge"
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
      <VerdictPanel
        :players="players"
        :value="activeValue"
        :only-player-id="state.stake?.playerId"
        @verdict="(playerId, sign) => session.close({ playerId, sign })"
        @nobody="session.close()"
      />
    </CardSlide>

    <IntroSlide
      v-else-if="state.phase === 'final-intro'"
      title="Финал"
      :subtitle="game.finalRound?.theme"
      hint="Нажмите пробел или кликните, чтобы перейти к ставкам"
      @next="session.advance"
    />

    <CardSlide
      v-else-if="state.phase === 'final-bets' && game.finalRound"
      variant="question"
      :badge="`Финал · ${game.finalRound.theme}`"
      text="Ставки"
    >
      <FinalBetsPanel :players="players" :bets="state.finalBets" @bet="session.setFinalBet" @done="session.advance" />
    </CardSlide>

    <CardSlide
      v-else-if="state.phase === 'final-question' && game.finalRound"
      variant="question"
      :badge="`Финал · ${game.finalRound.theme}`"
      :text="game.finalRound.text"
      :media="game.finalRound.media"
    >
      <Button size="lg" class="h-12 px-8 text-lg" @click="session.advance">Показать ответ</Button>
    </CardSlide>

    <CardSlide
      v-else-if="state.phase === 'final-answer' && game.finalRound"
      variant="answer"
      :text="game.finalRound.answer"
      :media="game.finalRound.answerMedia"
    >
      <FinalVerdictPanel
        :players="players"
        :bets="state.finalBets"
        :verdicts="state.finalVerdicts"
        @verdict="session.setFinalVerdict"
        @done="session.scoreFinal"
      />
    </CardSlide>

    <ResultsSlide v-else-if="state.phase === 'results'" :ranking="ranking" @home="router.push({ name: 'home' })" />
  </div>
</template>
