<script setup lang="ts">
import SoundToggle from '@/components/SoundToggle.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Eye, Minus, Plus, SkipForward } from '@lucide/vue'
import type { Game, MediaItem } from '@/types'
import { Button } from '@/components/ui/button'
import { getGame } from '@/storage'
import { usePlaySession, type Phase, type SessionSnapshot } from '@/composables/usePlaySession'
import { HOST_PING_MS, openPlayChannel, type HostCommand, type PlayChannel } from '@/play/channel'
import type { MediaAction, MediaStatus } from '@/play/mediaControl'
import BoardGrid from '@/components/play/BoardGrid.vue'
import AnimatedNumber from '@/components/play/AnimatedNumber.vue'
import AuctionPanel from '@/components/play/AuctionPanel.vue'
import CatPanel from '@/components/play/CatPanel.vue'
import VerdictPanel from '@/components/play/VerdictPanel.vue'
import FinalBetsPanel from '@/components/play/FinalBetsPanel.vue'
import FinalVerdictPanel from '@/components/play/FinalVerdictPanel.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import HostMediaControls from '@/components/play/HostMediaControls.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { t } = useI18n()

const game = ref<Game | null>(null)
const connected = ref(false)
// a mirror of the stage's session: snapshots overwrite it, commands go back to the stage
const mirror = usePlaySession(game)
const { state, players, round, activeQuestion, activeValue } = mirror
const mediaStatus = ref<Record<string, MediaStatus>>({})

const phaseLabel = computed<Record<Phase, string>>(() => ({
  title: t('host.phase.title'),
  'round-intro': t('host.phase.roundIntro'),
  board: t('host.phase.board'),
  auction: t('host.phase.auction'),
  cat: t('host.phase.cat'),
  question: t('host.phase.question'),
  answer: t('host.phase.answer'),
  'final-intro': t('host.phase.finalIntro'),
  'final-bets': t('host.phase.finalBets'),
  'final-question': t('host.phase.finalQuestion'),
  'final-answer': t('host.phase.finalAnswer'),
  results: t('host.phase.results'),
}))

const theme = computed(() => round.value?.themes.find((t) => t.questions.some((q) => q.id === state.activeQuestionId)))
const isQuestionPhase = computed(() => ['auction', 'cat', 'question', 'answer'].includes(state.phase))
const isFinalPhase = computed(() => ['final-bets', 'final-question', 'final-answer'].includes(state.phase))

function onScreen(): MediaItem[] {
  const q = activeQuestion.value
  const f = game.value?.finalRound
  switch (state.phase) {
    case 'question': return q?.media ?? []
    case 'answer': return q?.answerMedia ?? []
    case 'final-question': return f?.media ?? []
    case 'final-answer': return f?.answerMedia ?? []
    default: return []
  }
}
/** The clips on the stage right now, so the host can start and stop them. */
const stageMedia = computed(() => onScreen().filter((m) => m.kind !== 'image'))
const scoreStep = computed(() => (isQuestionPhase.value && activeValue.value ? activeValue.value : 100))
const ranking = computed(() => [...players.value].sort((a, b) => b.score - a.score))

let channel: PlayChannel | null = null
function send(name: HostCommand, ...args: unknown[]) {
  channel?.post({ type: 'command', name, args, phase: state.phase })
}
function mediaAction(id: string, action: MediaAction) {
  channel?.post({ type: 'media-command', id, action })
}

function apply(snapshot: SessionSnapshot) {
  const { players: snapshotPlayers, ...rest } = snapshot
  Object.assign(state, rest)
  players.value = snapshotPlayers
  connected.value = true
}

let pinger: ReturnType<typeof setInterval> | undefined
onMounted(async () => {
  game.value = (await getGame(props.id)) ?? null
  if (!game.value) {
    router.replace({ name: 'home' })
    return
  }
  channel = await openPlayChannel(props.id, (m) => {
    if (m.type === 'state') apply(m.snapshot)
    else if (m.type === 'media') mediaStatus.value = m.status
  })
  channel.post({ type: 'hello' })
  pinger = setInterval(() => channel?.post({ type: 'ping' }), HOST_PING_MS)
})
onUnmounted(() => {
  clearInterval(pinger)
  channel?.close()
})
</script>

<template>
  <main v-if="game" class="host">
    <header class="top">
      <span class="brand">{{ t('host.brand') }}</span>
      <span class="game">{{ game.title }}</span>
      <span class="flex-1" />
      <SoundToggle />
      <span v-if="connected" class="phase"><span class="dot" />{{ phaseLabel[state.phase] }}</span>
      <span v-else class="phase off">{{ t('host.offline') }}</span>
    </header>

    <section v-if="!connected" class="glass panel empty">
      {{ t('host.openGame') }}
    </section>

    <div v-else class="layout">
      <section class="glass panel main">
        <div v-if="state.phase === 'title'" class="center">
          <p class="muted">{{ t('host.namesHint') }}</p>
          <Button size="lg" class="big" @click="send('start')">{{ t('host.start') }}</Button>
        </div>

        <div v-else-if="state.phase === 'round-intro' || state.phase === 'final-intro'" class="center">
          <p class="title-gold text-4xl">{{ state.phase === 'final-intro' ? t('host.final') : round?.name }}</p>
          <Button size="lg" class="big" @click="send('advance')">{{ state.phase === 'final-intro' ? t('host.toBets') : t('host.toBoard') }}</Button>
        </div>

        <div v-else-if="state.phase === 'board' && round" class="board-wrap">
          <BoardGrid compact :round="round" :played="state.played" @pick="(q) => send('pick', q.id)" />
          <Button variant="ghost" class="self-center" @click="send('nextRound')">{{ t('host.skipRound') }}<SkipForward /></Button>
        </div>

        <div v-else-if="activeQuestion && isQuestionPhase" class="question">
          <div class="plate">
            <span>{{ theme?.name }}</span>
            <span v-if="activeQuestion.kind === 'auction'" class="kind">{{ t('host.auction') }}</span>
            <span v-else-if="activeQuestion.kind === 'cat-in-bag'" class="kind">{{ t('host.catInBag') }}</span>
            <span class="amount">{{ activeValue }}</span>
          </div>
          <MarkdownView class="q-text rich" :source="activeQuestion.text" />
          <div class="answer">
            <span class="answer-label"><Eye class="size-4" />{{ t('host.answer') }}</span>
            <MarkdownView class="answer-text rich" :source="activeQuestion.answer" />
          </div>
          <HostMediaControls v-if="stageMedia.length" :items="stageMedia" :status="mediaStatus" @action="mediaAction" />

          <AuctionPanel
            v-if="state.phase === 'auction'"
            :players="players"
            :value="activeQuestion.value"
            @stake="(id, amount) => send('setAuctionStake', id, amount)"
          />
          <CatPanel
            v-else-if="state.phase === 'cat'"
            :players="players"
            :value="activeQuestion.catValue ?? activeQuestion.value"
            @give="(id) => send('giveCat', id)"
          />
          <Button v-else-if="state.phase === 'question'" size="lg" class="big self-center" @click="send('advance')">
            {{ t('host.showAnswer') }}
          </Button>
          <VerdictPanel
            v-else
            :players="players"
            :value="activeValue"
            :only-player-id="state.stake?.playerId"
            @verdict="(playerId, sign) => send('close', { playerId, sign })"
            @nobody="send('close')"
          />
        </div>

        <div v-else-if="game.finalRound && isFinalPhase" class="question">
          <div class="plate"><span>{{ t('host.final') }}</span><span class="kind">{{ game.finalRound.theme }}</span></div>
          <MarkdownView class="q-text rich" :source="game.finalRound.text" />
          <div class="answer">
            <span class="answer-label"><Eye class="size-4" />{{ t('host.answer') }}</span>
            <MarkdownView class="answer-text rich" :source="game.finalRound.answer" />
          </div>
          <HostMediaControls v-if="stageMedia.length" :items="stageMedia" :status="mediaStatus" @action="mediaAction" />
          <FinalBetsPanel
            v-if="state.phase === 'final-bets'"
            :players="players"
            :bets="state.finalBets"
            @bet="(id, amount) => send('setFinalBet', id, amount)"
            @done="send('advance')"
          />
          <Button v-else-if="state.phase === 'final-question'" size="lg" class="big self-center" @click="send('advance')">
            {{ t('host.showAnswer') }}
          </Button>
          <FinalVerdictPanel
            v-else
            :players="players"
            :bets="state.finalBets"
            :verdicts="state.finalVerdicts"
            @verdict="(id, sign) => send('setFinalVerdict', id, sign)"
            @done="send('scoreFinal')"
          />
        </div>

        <div v-else-if="state.phase === 'results'" class="center">
          <p class="title-gold text-4xl">{{ t('host.resultsOnStage') }}</p>
        </div>
      </section>

      <aside class="glass panel scores" :aria-label="t('host.score')">
        <h2 class="aside-title">{{ t('host.score') }}</h2>
        <TransitionGroup name="rank" tag="ol" class="rank">
          <li v-for="p in ranking" :key="p.id" :class="{ active: p.id === state.stake?.playerId }">
            <span class="who">{{ p.name }}</span>
            <span class="pts" :class="{ neg: p.score < 0 }"><AnimatedNumber :value="p.score" /></span>
            <span class="adjust">
              <Button size="icon-sm" variant="secondary" :aria-label="`${p.name}: −${scoreStep}`" @click="send('adjustScore', p.id, -scoreStep)"><Minus /></Button>
              <Button size="icon-sm" variant="secondary" :aria-label="`${p.name}: +${scoreStep}`" @click="send('adjustScore', p.id, scoreStep)"><Plus /></Button>
            </span>
          </li>
        </TransitionGroup>
        <p class="hint">{{ t('host.scoreHint', { step: scoreStep }) }}</p>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.host {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100dvh;
  padding: 14px 18px 18px;
  background:
    radial-gradient(80% 50% at 0% 0%, color-mix(in oklch, var(--cyan) 14%, transparent), transparent 70%),
    radial-gradient(80% 50% at 100% 100%, color-mix(in oklch, var(--magenta) 14%, transparent), transparent 70%);
}
.top {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.brand {
  font-family: var(--font-display);
  font-size: 26px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--gold);
}
.game {
  color: var(--muted-foreground);
}
.phase {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklch, var(--cyan) 50%, transparent);
  color: var(--cyan);
  font-size: 14px;
}
.phase.off {
  border-color: oklch(1 0 0 / 0.2);
  color: var(--muted-foreground);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--cyan);
  box-shadow: 0 0 10px var(--cyan);
  animation: blink 1.6s ease-in-out infinite;
}
.panel {
  border-radius: 20px;
  padding: 18px;
}
.empty {
  text-align: center;
  color: var(--muted-foreground);
  padding: 48px 18px;
}
.layout {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 300px);
  gap: 14px;
  min-height: 0;
}
@media (max-width: 820px) {
  .layout { grid-template-columns: 1fr; }
}
.main {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  text-align: center;
  padding: 24px 0;
}
.muted {
  color: var(--muted-foreground);
}
.big {
  height: 52px;
  padding: 0 32px;
  font-size: 18px;
}
.board-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.board-wrap > :first-child {
  flex: 1;
  min-height: 300px;
}
.question {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.plate {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.kind {
  padding: 2px 10px;
  border-radius: 999px;
  background: oklch(0.3 0.18 290);
}
.amount {
  padding: 2px 12px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--night);
  font-weight: 700;
}
.q-text {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.3;
}
.rich :deep(> :first-child) {
  margin-top: 0;
}
.rich :deep(> :last-child) {
  margin-bottom: 0;
}
.rich :deep(p),
.rich :deep(ul),
.rich :deep(ol),
.rich :deep(blockquote),
.rich :deep(pre) {
  margin: 0.35em 0;
}
.rich :deep(ul) {
  list-style: disc;
  padding-left: 1.3em;
}
.rich :deep(ol) {
  list-style: decimal;
  padding-left: 1.3em;
}
.rich :deep(blockquote) {
  padding-left: 0.7em;
  border-left: 0.12em solid currentColor;
}
.rich :deep(code) {
  font-size: 0.85em;
}
.answer {
  display: grid;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid color-mix(in oklch, var(--cyan) 55%, transparent);
  background: color-mix(in oklch, var(--cyan) 12%, transparent);
}
.answer-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--cyan);
}
.answer-text {
  font-family: var(--font-display);
  font-size: 28px;
  line-height: 1.15;
  color: var(--gold);
}
.scores {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-self: start;
}
.aside-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}
.rank {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rank li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'who pts' 'adjust adjust';
  gap: 6px 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: linear-gradient(180deg, var(--tile), var(--tile-deep));
  border: 1px solid oklch(1 0 0 / 0.14);
}
.rank li.active {
  box-shadow: 0 0 0 2px var(--cyan);
}
.who {
  grid-area: who;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}
.pts {
  grid-area: pts;
  font-family: var(--font-display);
  font-size: 26px;
  line-height: 1;
  color: var(--gold);
}
.pts.neg {
  color: var(--magenta);
}
.adjust {
  grid-area: adjust;
  display: flex;
  gap: 6px;
}
.adjust > * {
  flex: 1;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--muted-foreground);
}
.rank-move {
  transition: transform 0.4s ease;
}
@keyframes blink {
  50% { opacity: 0.35; }
}
@media (prefers-reduced-motion: reduce) {
  .dot { animation: none; }
}
</style>
