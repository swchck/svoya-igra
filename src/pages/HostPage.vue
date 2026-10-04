<script setup lang="ts">
import SoundToggle from '@/components/SoundToggle.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Eye, Keyboard, Minus, Plus, SkipForward, Smartphone, Undo2 } from '@lucide/vue'
import type { Game, MediaItem } from '@/types'
import { Button } from '@/components/ui/button'
import { getGame } from '@/storage'
import { useHostDemo } from '@/composables/useHostDemo'
import { offerTour, tour } from '@/tour/state'
import TourHelpButton from '@/tour/TourHelpButton.vue'
import { usePlaySession, type Phase, type SessionSnapshot, type Sign } from '@/composables/usePlaySession'
import { accentStyle } from '@/play/accents'
import { playerColor } from '@/play/palette'
import { useRemaining } from '@/play/timer'
import { HOST_PING_MS, openPlayChannel, type HostCommand, type PlayChannel } from '@/play/channel'
import type { MediaAction, MediaStatus } from '@/play/mediaControl'
import { buzzable, buzzWindow, buzzWinner, type LanStatus } from '@/play/lan'
import { prefs } from '@/prefs'
import BoardGrid from '@/components/play/BoardGrid.vue'
import AnimatedNumber from '@/components/play/AnimatedNumber.vue'
import AuctionPanel from '@/components/play/AuctionPanel.vue'
import CatPanel from '@/components/play/CatPanel.vue'
import VerdictPanel from '@/components/play/VerdictPanel.vue'
import FinalBetsPanel from '@/components/play/FinalBetsPanel.vue'
import FinalVerdictPanel from '@/components/play/FinalVerdictPanel.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import HostMediaControls from '@/components/play/HostMediaControls.vue'
import HostTimer from '@/components/play/HostTimer.vue'
import StatsTable from '@/components/play/StatsTable.vue'
import BuzzPanel from '@/components/play/BuzzPanel.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { t } = useI18n()

const game = ref<Game | null>(null)
const connected = ref(false)
// a mirror of the stage's session: snapshots overwrite it, commands go back to the stage
const mirror = usePlaySession(game)
const { state, players, round, activeQuestion, activeValue, canUndo } = mirror
const mediaStatus = ref<Record<string, MediaStatus>>({})
/** The stage's phone buzzers; null while they are off. */
const lan = ref<LanStatus | null>(null)
const showBuzz = computed(() => !!lan.value && buzzable(state))
const buzzedId = computed(() => (lan.value && buzzWindow(state) !== null ? buzzWinner(lan.value) : undefined))

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

const accent = computed(() => accentStyle(game.value?.settings))
const answerMs = computed(() => (game.value?.settings?.answerSeconds ?? 0) * 1000)
const remaining = useRemaining(() => state.timer)
const timerRunning = computed(() => state.timer.endsAt !== null && remaining.value > 0)
const showTimer = computed(() => answerMs.value > 0 && (state.phase === 'question' || state.phase === 'final-question'))

const selectedId = ref<string>()
const hintOpen = ref(false)
/** Who +/- apply to: the stake holder when one answers alone, else the host's pick. */
const targetId = computed(() => state.stake?.playerId ?? selectedId.value)

const scoreStep = computed(() => (isQuestionPhase.value && activeValue.value ? activeValue.value : 100))
const ranking = computed(() => [...players.value].sort((a, b) => b.score - a.score))
// colors and numbers follow the setup order, which ranking reshuffles
const seats = computed(() => new Map(players.value.map((p, i) => [p.id, { color: playerColor(p, i), n: i + 1 }])))

// whoever buzzed first is who + and − apply to
watch(buzzedId, (id) => {
  if (id) selectedId.value = id
})

function apply(snapshot: SessionSnapshot | null) {
  connected.value = !!snapshot
  if (!snapshot) return
  const { players: snapshotPlayers, ...rest } = snapshot
  Object.assign(state, rest)
  players.value = snapshotPlayers
}
const demo = useHostDemo({ game, wanted: () => tour.demo, current: mirror.snapshot, apply })

let channel: PlayChannel | null = null
// nothing reaches the stage while the tour plays with made-up state
function send(name: HostCommand, ...args: unknown[]) {
  if (!demo.active.value) channel?.post({ type: 'command', name, args, phase: state.phase })
}
function mediaAction(id: string, action: MediaAction) {
  if (!demo.active.value) channel?.post({ type: 'media-command', id, action })
}

/** Marks the target player right or wrong in whichever phase takes a verdict. */
function verdictKey(sign: Sign) {
  const id = targetId.value
  if (!id || !players.value.some((p) => p.id === id)) return
  if (state.phase === 'answer') send('close', { playerId: id, sign })
  else if (state.phase === 'final-answer') send('setFinalVerdict', id, sign)
}

const ADVANCE_PHASES: Phase[] = ['round-intro', 'question', 'final-intro', 'final-bets', 'final-question']
const CLOSABLE_PHASES: Phase[] = ['auction', 'cat', 'question', 'answer']

function onKey(e: KeyboardEvent) {
  if (!connected.value || e.altKey) return
  const target = e.target instanceof Element ? e.target : null
  if (target?.closest('input, textarea, select, [contenteditable], [role=dialog], [role=slider]')) return
  if (e.ctrlKey || e.metaKey) {
    // the layout-independent code, so Cyrillic keyboards undo as well
    if (e.code === 'KeyZ' && !e.shiftKey) {
      e.preventDefault()
      send('undo')
    }
    return
  }
  const digit = /^[1-9]$/.test(e.key) ? Number(e.key) : 0
  if (digit) selectedId.value = players.value[digit - 1]?.id ?? selectedId.value
  else if (e.key === '+' || e.key === '=') verdictKey(1)
  else if (e.key === '-') verdictKey(-1)
  else if (e.key === '?') hintOpen.value = !hintOpen.value
  else if (e.key === 'Escape') {
    if (hintOpen.value) hintOpen.value = false
    else if (CLOSABLE_PHASES.includes(state.phase)) send('close')
  } else if (e.key === ' ' && !target?.closest('button, a, summary')) {
    // a focused button takes its own Space
    if (state.phase === 'title') send('start')
    else if (ADVANCE_PHASES.includes(state.phase)) send('advance')
    else return
    e.preventDefault()
  }
}

watch(connected, (on) => on && offerTour('host'))

let pinger: ReturnType<typeof setInterval> | undefined
onMounted(async () => {
  window.addEventListener('keydown', onKey)
  game.value = (await getGame(props.id)) ?? null
  if (!game.value) {
    router.replace({ name: 'home' })
    return
  }
  channel = await openPlayChannel(props.id, (m) => {
    if (m.type === 'state') demo.receive(m.snapshot)
    else if (m.type === 'media') mediaStatus.value = m.status
    else if (m.type === 'lan') lan.value = m.status
  })
  channel.post({ type: 'hello' })
  pinger = setInterval(() => channel?.post({ type: 'ping' }), HOST_PING_MS)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  clearInterval(pinger)
  channel?.close()
})
</script>

<template>
  <main v-if="game" class="host" :style="accent">
    <header class="top" data-tauri-drag-region>
      <span class="brand">{{ t('host.brand') }}</span>
      <span class="game">{{ game.title }}</span>
      <span class="flex-1" data-tauri-drag-region />
      <div class="tools" data-tour="host-top">
        <span v-if="demo.active.value" class="demo">{{ t('tour.demo') }}</span>
        <TourHelpButton id="host" />
        <Button variant="ghost" size="icon" :aria-pressed="hintOpen" :aria-label="t('host.hotkeys.toggle')" :title="t('host.hotkeys.toggle')" @click="hintOpen = !hintOpen">
          <Keyboard />
        </Button>
        <SoundToggle />
        <span v-if="connected" class="phase"><span class="dot" />{{ phaseLabel[state.phase] }}</span>
        <span v-else class="phase off">{{ t('host.offline') }}</span>
      </div>
    </header>

    <section v-if="!connected" class="glass panel empty">
      {{ t('host.openGame') }}
    </section>

    <div v-else class="layout">
      <section class="glass panel main">
        <div v-if="state.phase === 'title'" class="center">
          <p class="muted">{{ state.teams ? t('host.namesHintTeams') : t('host.namesHint') }}</p>
          <Button size="lg" class="big" @click="send('start')">{{ t('host.start') }}</Button>
        </div>

        <div v-else-if="state.phase === 'round-intro' || state.phase === 'final-intro'" class="center">
          <p class="title-gold text-4xl">{{ state.phase === 'final-intro' ? t('host.final') : round?.name }}</p>
          <Button size="lg" class="big" @click="send('advance')">{{ state.phase === 'final-intro' ? t('host.toBets') : t('host.toBoard') }}</Button>
        </div>

        <div v-else-if="state.phase === 'board' && round" class="board-wrap">
          <div class="chooser" data-tour="host-chooser" role="group" :aria-label="t('lan.chooses')">
            <span class="muted">{{ t('lan.chooses') }}:</span>
            <button
              v-for="p in players"
              :key="p.id"
              type="button"
              class="chooser-chip"
              :class="{ on: p.id === state.chooserId }"
              :style="{ '--pc': seats.get(p.id)?.color }"
              :aria-pressed="p.id === state.chooserId"
              @click="send('setChooser', p.id)"
            >{{ p.avatar }} {{ p.name }}</button>
          </div>
          <BoardGrid compact :round="round" :played="state.played" @pick="(q) => send('pick', q.id)" />
          <Button variant="ghost" class="self-center" @click="send('nextRound')">{{ t('host.skipRound') }}<SkipForward /></Button>
        </div>

        <div v-else-if="activeQuestion && isQuestionPhase" class="question" data-tour="host-question">
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
          <HostTimer v-if="showTimer" data-tour="host-timer" :remaining-ms="remaining" :total-ms="answerMs" :running="timerRunning" @start="send('timerStart')" @pause="send('timerPause')" @reset="send('timerReset')" />

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
          <template v-else-if="state.phase === 'question'">
            <BuzzPanel
              v-if="showBuzz && lan"
              data-tour="host-buzz"
              :players="players"
              :status="lan"
              :value="activeValue"
              :armed="state.buzzArmed"
              :penalty="prefs.wrongPenalty"
              @reopen="(wrong) => send('buzzReopen', wrong)"
              @open="send('openBuzz')"
            />
            <Button size="lg" class="big self-center" @click="send('advance')">
              {{ t('host.showAnswer') }}
            </Button>
          </template>
          <VerdictPanel
            v-else
            data-tour="host-verdict"
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
          <HostTimer v-if="showTimer" :remaining-ms="remaining" :total-ms="answerMs" :running="timerRunning" @start="send('timerStart')" @pause="send('timerPause')" @reset="send('timerReset')" />
          <FinalBetsPanel
            v-if="state.phase === 'final-bets'"
            :players="players"
            :bets="state.finalBets"
            @bet="(id, amount) => send('setFinalBet', id, amount)"
            @done="send('advance')"
          />
          <template v-else-if="state.phase === 'final-question'">
            <section v-if="lan" class="phone-answers" :aria-label="t('lan.final.answers')">
              <h3 class="aside-title">{{ t('lan.final.answers') }}</h3>
              <p v-for="p in players.filter((x) => x.score > 0)" :key="p.id">
                <span class="who-name">{{ p.name }}</span>
                <span v-if="lan.answers[p.id]" class="said">{{ lan.answers[p.id] }}</span>
                <span v-else class="muted">{{ t('lan.final.noAnswer') }}</span>
              </p>
            </section>
            <Button size="lg" class="big self-center" @click="send('advance')">
              {{ t('host.showAnswer') }}
            </Button>
          </template>
          <FinalVerdictPanel
            v-else
            :players="players"
            :bets="state.finalBets"
            :verdicts="state.finalVerdicts"
            :answers="lan?.answers"
            @verdict="(id, sign) => send('setFinalVerdict', id, sign)"
            @done="send('scoreFinal')"
          />
        </div>

        <div v-else-if="state.phase === 'results'" class="center">
          <p class="title-gold text-4xl">{{ t('host.resultsOnStage') }}</p>
          <StatsTable v-if="Object.keys(state.stats).length" compact :players="ranking" :stats="state.stats" />
        </div>
      </section>

      <aside class="glass panel scores" data-tour="host-scores" :aria-label="t('host.score')">
        <div class="aside-head">
          <h2 class="aside-title">{{ state.teams ? t('host.teamsScore') : t('host.score') }}</h2>
          <Button variant="ghost" size="sm" :disabled="!canUndo" :title="t('host.undoHint')" @click="send('undo')"><Undo2 />{{ t('host.undo') }}</Button>
        </div>
        <TransitionGroup name="rank" tag="ol" class="rank">
          <li
            v-for="p in ranking"
            :key="p.id"
            :class="{ active: p.id === state.stake?.playerId || p.id === buzzedId, selected: p.id === targetId }"
            :style="{ '--pc': seats.get(p.id)?.color }"
          >
            <span class="who">
              <button type="button" class="seat" :aria-pressed="p.id === targetId" :aria-label="p.name" @click="selectedId = p.id">{{ seats.get(p.id)?.n }}</button>
              <span class="label">{{ p.avatar }} {{ p.name }}</span>
              <Smartphone v-if="lan?.phones[p.id]" class="size-3.5 shrink-0 text-cyan" :aria-label="t('lan.phoneConnected')" />
            </span>
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

    <aside v-if="hintOpen" class="glass hotkeys" role="region" :aria-label="t('host.hotkeys.title')">
      <h2 class="aside-title">{{ t('host.hotkeys.title') }}</h2>
      <dl>
        <div><dt><kbd>1</kbd>–<kbd>9</kbd></dt><dd>{{ t('host.hotkeys.pick') }}</dd></div>
        <div><dt><kbd>+</kbd></dt><dd>{{ t('host.hotkeys.correct') }}</dd></div>
        <div><dt><kbd>−</kbd></dt><dd>{{ t('host.hotkeys.wrong') }}</dd></div>
        <div><dt><kbd>Space</kbd></dt><dd>{{ t('host.hotkeys.advance') }}</dd></div>
        <div><dt><kbd>Esc</kbd></dt><dd>{{ t('host.hotkeys.close') }}</dd></div>
        <div><dt><kbd>Ctrl</kbd>+<kbd>Z</kbd></dt><dd>{{ t('host.hotkeys.undo') }}</dd></div>
        <div><dt><kbd>?</kbd></dt><dd>{{ t('host.hotkeys.help') }}</dd></div>
      </dl>
    </aside>
  </main>
</template>

<style scoped>
.host {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100dvh;
  padding: 10px 18px 18px;
  background:
    radial-gradient(80% 50% at 0% 0%, color-mix(in oklch, var(--cyan) 14%, transparent), transparent 70%),
    radial-gradient(80% 50% at 100% 100%, color-mix(in oklch, var(--magenta) 14%, transparent), transparent 70%);
}
.top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: var(--titlebar-inset);
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
.tools {
  display: flex;
  align-items: center;
  gap: 12px;
}
.demo {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--night);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
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
.board-wrap > :nth-child(2) {
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
.phone-answers {
  display: grid;
  gap: 6px;
}
.phone-answers p {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 0;
}
.who-name {
  font-weight: 600;
}
.said {
  font-family: var(--font-serif);
  color: var(--gold);
  overflow-wrap: anywhere;
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
.rank li {
  border-left: 5px solid var(--pc);
}
.rank li.selected {
  box-shadow: 0 0 0 2px var(--pc);
}
.rank li.active {
  box-shadow: 0 0 0 2px var(--cyan);
}
.who {
  grid-area: who;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-weight: 600;
}
.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.seat {
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  border: 1px solid oklch(1 0 0 / 0.3);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}
.seat[aria-pressed='true'] {
  background: var(--pc);
  border-color: var(--pc);
  color: var(--night);
}
.seat:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.aside-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.hotkeys {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 20;
  width: min(340px, calc(100vw - 36px));
  padding: 14px 16px;
  border-radius: 16px;
}
.hotkeys dl {
  display: grid;
  gap: 6px;
  margin: 10px 0 0;
  font-size: 14px;
}
.hotkeys dl > div {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}
.hotkeys dt {
  display: flex;
  align-items: center;
  gap: 3px;
  justify-content: flex-end;
}
.hotkeys dd {
  margin: 0;
  color: var(--muted-foreground);
}
kbd {
  min-width: 24px;
  padding: 1px 6px;
  border-radius: 6px;
  border: 1px solid oklch(1 0 0 / 0.3);
  border-bottom-width: 2px;
  background: oklch(1 0 0 / 0.08);
  font-family: inherit;
  font-size: 12px;
  text-align: center;
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
.chooser {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}
.chooser-chip {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklch, var(--pc) 60%, transparent);
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
}
.chooser-chip.on {
  background: var(--cyan);
  border-color: var(--cyan);
  color: oklch(0.2 0.1 280);
  font-weight: 600;
}
</style>
