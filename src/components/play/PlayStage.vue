<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Cat, Gavel, Maximize, Minimize, MonitorSmartphone, SkipForward } from '@lucide/vue'
import type { Game } from '@/types'
import { Button } from '@/components/ui/button'
import { confirmAction } from '@/composables/useConfirm'
import { usePlaySession, type SessionSnapshot } from '@/composables/usePlaySession'
import { clearSession, saveSession } from '@/play/savedSession'
import { HOST_COMMANDS, HOST_PING_MS, openHostWindow, openPlayChannel, type PlayChannel } from '@/play/channel'
import { createMediaRegistry, MEDIA_REGISTRY } from '@/play/mediaControl'
import { plainCopy } from '@/lib/plain'
import { prefersReducedMotion } from '@/lib/motion'
import { useStageSounds } from '@/play/sounds'
import SoundToggle from '@/components/SoundToggle.vue'
import StageBackdrop from './StageBackdrop.vue'
import PlayerPodiums from './PlayerPodiums.vue'
import PlayerSetup from './PlayerSetup.vue'
import IntroSlide from './IntroSlide.vue'
import BoardGrid from './BoardGrid.vue'
import CardSlide from './CardSlide.vue'
import SpecialSlide from './SpecialSlide.vue'
import ResultsSlide from './ResultsSlide.vue'
import AuctionPanel from './AuctionPanel.vue'
import CatPanel from './CatPanel.vue'
import VerdictPanel from './VerdictPanel.vue'
import FinalBetsPanel from './FinalBetsPanel.vue'
import FinalVerdictPanel from './FinalVerdictPanel.vue'

const props = defineProps<{ game: Game; restored?: SessionSnapshot }>()
const router = useRouter()
const { t } = useI18n()

const session = usePlaySession(
  computed(() => props.game),
  props.restored,
)
const { state, players, round, activeQuestion, activeValue, ranking, inProgress } = session

useStageSounds(() => state.phase, players)

const media = createMediaRegistry()
provide(MEDIA_REGISTRY, media)

const theme = computed(() => round.value?.themes.find((t) => t.questions.some((q) => q.id === state.activeQuestionId)))
const stakeHolder = computed(() => (state.stake ? session.player(state.stake.playerId) : undefined))
const topic = computed(() => {
  const kind = activeQuestion.value?.kind
  if (kind === 'auction') return t('play.stage.auction')
  if (kind === 'cat-in-bag') return t('play.stage.catInBag')
  return theme.value?.name
})

/** A key that changes whenever the stage should play a scene transition. */
const sceneKey = computed(() => `${state.phase}:${state.roundIndex}:${state.activeQuestionId ?? ''}`)
// the board lights up cell by cell only on its first appearance in a round
const cascadeBoard = ref(false)
watch(
  () => state.phase,
  (phase, before) => {
    cascadeBoard.value = phase === 'board' && before === 'round-intro'
  },
)

let channel: PlayChannel | null = null
function publish() {
  channel?.post({ type: 'state', snapshot: session.snapshot() })
}
function publishMedia() {
  channel?.post({ type: 'media', status: plainCopy(media.status) })
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
watch(() => media.status, publishMedia, { deep: true })

// the host window pings while open; with a host at the controls the stage drops its own
const lastPing = ref(0)
const now = ref(Date.now())
const clock = setInterval(() => (now.value = Date.now()), 1000)
const hostConnected = computed(() => now.value - lastPing.value < HOST_PING_MS * 2.5)

interface Flight {
  key: number
  rect: DOMRect
  value: number
}
const flight = ref<Flight | null>(null)
const flightTile = ref<HTMLElement | null>(null)
const stageMain = ref<HTMLElement | null>(null)

/** Picks a question and flies its board cell up into the question card. */
function pick(questionId: string) {
  const cell = document.querySelector(`[data-question-id="${CSS.escape(questionId)}"]`)
  const rect = cell?.getBoundingClientRect()
  const value = round.value?.themes.flatMap((t) => t.questions).find((q) => q.id === questionId)?.value ?? 0
  const before = state.phase
  session.pick(questionId)
  if (rect && before === 'board' && state.phase !== 'board' && !prefersReducedMotion()) {
    flight.value = { key: Date.now(), rect, value }
  }
}

watch(flightTile, (tile) => {
  const f = flight.value
  const target = stageMain.value?.getBoundingClientRect()
  if (!tile || !f || !target) return
  const to = {
    left: target.left + target.width * 0.06,
    top: target.top + target.height * 0.06,
    width: target.width * 0.88,
    height: target.height * 0.88,
  }
  tile
    .animate(
      [
        {
          left: `${f.rect.left}px`,
          top: `${f.rect.top}px`,
          width: `${f.rect.width}px`,
          height: `${f.rect.height}px`,
          opacity: 1,
          fontSize: `${f.rect.height * 0.48}px`,
        },
        { offset: 0.65, opacity: 1 },
        {
          left: `${to.left}px`,
          top: `${to.top}px`,
          width: `${to.width}px`,
          height: `${to.height}px`,
          opacity: 0,
          fontSize: `${to.height * 0.4}px`,
        },
      ],
      { duration: 700, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'forwards' },
    )
    .finished.then(
      () => (flight.value = null),
      () => (flight.value = null),
    )
})

async function home() {
  const ok =
    !inProgress.value ||
    (await confirmAction({
      title: t('play.stage.leaveConfirm.title'),
      description: t('play.stage.leaveConfirm.description'),
      confirmLabel: t('play.stage.leaveConfirm.confirm'),
    }))
  if (ok) router.push({ name: 'home' })
}

async function skipRound() {
  const ok = await confirmAction({
    title: t('play.stage.skipConfirm.title'),
    description: t('play.stage.skipConfirm.description'),
    confirmLabel: t('play.stage.skipConfirm.confirm'),
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

// the top bar fades away while the mouse rests, so the projector shows only the game
const chromeVisible = ref(true)
let idle: ReturnType<typeof setTimeout> | undefined
function wake() {
  chromeVisible.value = true
  clearTimeout(idle)
  idle = setTimeout(() => (chromeVisible.value = false), 2500)
}

function onKey(e: KeyboardEvent) {
  if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable], [role=dialog]')) return
  if ((e.key === ' ' || e.key === 'Enter') && session.advance()) e.preventDefault()
  else if (e.key === 'Escape' && state.phase === 'answer') session.close()
}

onMounted(async () => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  window.addEventListener('keydown', onKey)
  window.addEventListener('mousemove', wake)
  wake()
  channel = await openPlayChannel(props.game.id, (m) => {
    if (m.type === 'hello' || m.type === 'ping') {
      lastPing.value = Date.now()
      now.value = lastPing.value
      if (m.type === 'hello') {
        publish()
        publishMedia()
      }
    } else if (m.type === 'media-command') {
      media.run(m.id, m.action)
    } else if (m.type === 'command' && HOST_COMMANDS.includes(m.name) && m.phase === state.phase) {
      // a command from a phase the stage has left is a double click or a stale screen
      if (m.name === 'pick') pick(String(m.args[0]))
      else (session[m.name] as (...args: unknown[]) => void)(...m.args)
    }
  })
  publish()
})
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('mousemove', wake)
  clearTimeout(idle)
  clearInterval(clock)
  channel?.close()
})
</script>

<template>
  <div class="stage" :class="{ 'chrome-hidden': !chromeVisible && state.phase !== 'title' }">
    <StageBackdrop :dim="state.phase === 'question' || state.phase === 'answer'" />

    <header class="chrome">
      <Button variant="ghost" @click="home"><ArrowLeft />{{ t('play.stage.leave') }}</Button>
      <span v-if="hostConnected" class="host-on"><span class="dot" />{{ t('play.stage.hostConnected') }}</span>
      <div class="flex-1" />
      <SoundToggle />
      <Button variant="ghost" @click="openHostWindow(game.id, game.title)"><MonitorSmartphone />{{ t('play.stage.hostWindow') }}</Button>
      <Button variant="ghost" @click="toggleFullscreen">
        <template v-if="isFullscreen"><Minimize />{{ t('play.stage.exitFullscreen') }}</template>
        <template v-else><Maximize />{{ t('play.stage.fullscreen') }}</template>
      </Button>
    </header>

    <main ref="stageMain" class="scene-area">
      <Transition name="scene" mode="out-in">
        <section v-if="state.phase === 'title'" :key="sceneKey" class="title-scene">
          <h1 class="title-shine game-title">{{ game.title || t('play.stage.defaultTitle') }}</h1>
          <p v-if="game.subtitle" class="subtitle">{{ game.subtitle }}</p>
          <PlayerSetup v-model="players" @add="session.addPlayer" @remove="(p) => session.removePlayer(p.id)" />
          <Button size="lg" class="start" @click="session.start">{{ t('play.stage.start') }}</Button>
        </section>

        <IntroSlide
          v-else-if="state.phase === 'round-intro'"
          :key="sceneKey"
          :title="round?.name ?? ''"
          :themes="round?.themes.map((t) => t.name)"
          :hint="t('play.stage.hintToBoard')"
          @next="session.advance"
        />

        <section v-else-if="state.phase === 'board' && round" :key="sceneKey" class="board-scene">
          <BoardGrid :round="round" :played="state.played" :cascade="cascadeBoard" @pick="(q) => pick(q.id)" />
          <Button v-if="!hostConnected" variant="ghost" class="skip" @click="skipRound">{{ t('play.stage.skipRound') }}<SkipForward /></Button>
        </section>

        <SpecialSlide
          v-else-if="state.phase === 'auction' && activeQuestion"
          :key="sceneKey"
          :icon="Gavel"
          motion="swing"
          :title="t('play.stage.auction')"
          :topic="theme?.name"
        >
          <div v-if="!hostConnected" class="glass dock">
            <AuctionPanel :players="players" :value="activeQuestion.value" @stake="session.setAuctionStake" />
          </div>
        </SpecialSlide>

        <SpecialSlide
          v-else-if="state.phase === 'cat' && activeQuestion"
          :key="sceneKey"
          :icon="Cat"
          motion="wobble"
          :title="t('play.stage.catInBag')"
          :text="t('play.stage.catText')"
        >
          <div v-if="!hostConnected" class="glass dock">
            <CatPanel :players="players" :value="activeQuestion.catValue ?? activeQuestion.value" @give="session.giveCat" />
          </div>
        </SpecialSlide>

        <CardSlide
          v-else-if="state.phase === 'question' && activeQuestion"
          :key="sceneKey"
          variant="question"
          :topic="topic"
          :holder="stakeHolder?.name"
          :amount="activeValue"
          :text="activeQuestion.text"
          :media="activeQuestion.media"
        >
          <Button v-if="!hostConnected" size="lg" class="h-12 px-8 text-lg" @click="session.advance">{{ t('play.stage.showAnswer') }}</Button>
        </CardSlide>

        <CardSlide
          v-else-if="state.phase === 'answer' && activeQuestion"
          :key="sceneKey"
          variant="answer"
          :text="activeQuestion.answer"
          :media="activeQuestion.answerMedia"
        >
          <div v-if="!hostConnected" class="glass dock">
            <VerdictPanel
              :players="players"
              :value="activeValue"
              :only-player-id="state.stake?.playerId"
              @verdict="(playerId, sign) => session.close({ playerId, sign })"
              @nobody="session.close()"
            />
          </div>
        </CardSlide>

        <IntroSlide
          v-else-if="state.phase === 'final-intro'"
          :key="sceneKey"
          :title="t('play.stage.final')"
          :subtitle="game.finalRound?.theme"
          :hint="t('play.stage.hintToBets')"
          @next="session.advance"
        />

        <CardSlide
          v-else-if="state.phase === 'final-bets' && game.finalRound"
          :key="sceneKey"
          variant="question"
          :topic="t('play.stage.finalTopic', { theme: game.finalRound.theme })"
          :text="t('play.stage.finalBetsText')"
        >
          <div v-if="!hostConnected" class="glass dock">
            <FinalBetsPanel :players="players" :bets="state.finalBets" @bet="session.setFinalBet" @done="session.advance" />
          </div>
          <ul v-else class="bets-status">
            <li v-for="p in players" :key="p.id" :class="{ done: state.finalBets[p.id] !== undefined }">{{ p.name }}</li>
          </ul>
        </CardSlide>

        <CardSlide
          v-else-if="state.phase === 'final-question' && game.finalRound"
          :key="sceneKey"
          variant="question"
          :topic="t('play.stage.finalTopic', { theme: game.finalRound.theme })"
          :text="game.finalRound.text"
          :media="game.finalRound.media"
        >
          <Button v-if="!hostConnected" size="lg" class="h-12 px-8 text-lg" @click="session.advance">{{ t('play.stage.showAnswer') }}</Button>
        </CardSlide>

        <CardSlide
          v-else-if="state.phase === 'final-answer' && game.finalRound"
          :key="sceneKey"
          variant="answer"
          :text="game.finalRound.answer"
          :media="game.finalRound.answerMedia"
        >
          <div v-if="!hostConnected" class="glass dock">
            <FinalVerdictPanel
              :players="players"
              :bets="state.finalBets"
              :verdicts="state.finalVerdicts"
              @verdict="session.setFinalVerdict"
              @done="session.scoreFinal"
            />
          </div>
        </CardSlide>

        <ResultsSlide
          v-else-if="state.phase === 'results'"
          :key="sceneKey"
          :ranking="ranking"
          show-home
          @home="router.push({ name: 'home' })"
        />
      </Transition>
    </main>

    <PlayerPodiums v-if="inProgress" :players="players" :active-id="state.stake?.playerId" />

    <div v-if="flight" :key="flight.key" ref="flightTile" class="flight" aria-hidden="true">{{ flight.value }}</div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100dvh;
  overflow: hidden;
}
.chrome {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  transition: opacity 0.5s ease;
}
.chrome-hidden .chrome {
  opacity: 0;
}
.chrome-hidden {
  cursor: none;
}
.host-on {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--cyan);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--cyan);
  box-shadow: 0 0 10px var(--cyan);
}
.scene-area {
  position: relative;
  z-index: 1;
  min-height: 0;
}
.scene-area > * {
  height: 100%;
}
.title-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(14px, 3vh, 30px);
  padding: 2vh 4vw;
  text-align: center;
  overflow-y: auto;
}
.game-title {
  margin: 0;
  font-size: clamp(44px, 8vw, 140px);
  line-height: 0.95;
}
.subtitle {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(18px, 2vw, 32px);
  color: var(--muted-foreground);
}
.start {
  height: 56px;
  padding: 0 40px;
  font-size: 20px;
  animation: beckon 2s ease-out infinite;
}
.board-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0 clamp(12px, 2vw, 32px) 8px;
}
.board-scene > :first-child {
  flex: 1;
  min-height: 0;
  max-width: 1600px;
}
.skip {
  flex: none;
}
.dock {
  border-radius: 22px;
  padding: 16px 20px;
  width: min(960px, 100%);
  display: flex;
  justify-content: center;
}
.bets-status {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.bets-status li {
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px dashed oklch(1 0 0 / 0.3);
  color: var(--muted-foreground);
  transition: all 0.3s ease;
}
.bets-status li.done {
  border-style: solid;
  border-color: var(--cyan);
  color: var(--cyan);
}
.flight {
  position: fixed;
  z-index: 5;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.16), transparent 45%),
    linear-gradient(180deg, var(--tile), var(--tile-deep));
  border: 2px solid var(--gold);
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--gold);
  pointer-events: none;
  box-shadow: 0 30px 90px -20px oklch(0.05 0.1 280 / 0.9);
}
.scene-enter-active {
  transition: opacity 0.45s ease, transform 0.45s cubic-bezier(0.2, 0.9, 0.3, 1), filter 0.45s ease;
}
.scene-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease, filter 0.25s ease;
}
.scene-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(10px);
  filter: blur(6px);
}
.scene-leave-to {
  opacity: 0;
  transform: scale(1.03);
  filter: blur(4px);
}
@keyframes beckon {
  0% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--gold) 55%, transparent); }
  100% { box-shadow: 0 0 0 20px transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .scene-enter-active, .scene-leave-active { transition: opacity 0.2s; }
  .scene-enter-from, .scene-leave-to { transform: none; filter: none; }
  .start { animation: none; }
}
</style>
