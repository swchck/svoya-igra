<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, Radio, SkipForward } from '@lucide/vue'
import type { Game } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getGame } from '@/storage'
import { usePlaySession, type Phase, type SessionSnapshot } from '@/composables/usePlaySession'
import { openPlayChannel, type HostCommand, type PlayChannel } from '@/play/channel'
import BoardGrid from '@/components/play/BoardGrid.vue'
import AuctionPanel from '@/components/play/AuctionPanel.vue'
import CatPanel from '@/components/play/CatPanel.vue'
import VerdictPanel from '@/components/play/VerdictPanel.vue'
import FinalBetsPanel from '@/components/play/FinalBetsPanel.vue'
import FinalVerdictPanel from '@/components/play/FinalVerdictPanel.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()

const game = ref<Game | null>(null)
const connected = ref(false)
// a mirror of the stage's session: snapshots overwrite it, commands go back to the stage
const mirror = usePlaySession(game)
const { state, players, round, activeQuestion, activeValue, ranking } = mirror

const PHASE_LABEL: Record<Phase, string> = {
  title: 'Заставка',
  'round-intro': 'Начало раунда',
  board: 'Выбор вопроса',
  auction: 'Аукцион',
  cat: 'Кот в мешке',
  question: 'Вопрос',
  answer: 'Ответ',
  'final-intro': 'Финал',
  'final-bets': 'Ставки финала',
  'final-question': 'Вопрос финала',
  'final-answer': 'Ответ финала',
  results: 'Итоги',
}

const theme = computed(() => round.value?.themes.find((t) => t.questions.some((q) => q.id === state.activeQuestionId)))

let channel: PlayChannel | null = null
function send(name: HostCommand, ...args: unknown[]) {
  channel?.post({ type: 'command', name, args, phase: state.phase })
}

function apply(snapshot: SessionSnapshot) {
  const { players: snapshotPlayers, ...rest } = snapshot
  Object.assign(state, rest)
  players.value = snapshotPlayers
  connected.value = true
}

onMounted(async () => {
  game.value = (await getGame(props.id)) ?? null
  if (!game.value) {
    router.replace({ name: 'home' })
    return
  }
  channel = await openPlayChannel(props.id, (m) => {
    if (m.type === 'state') apply(m.snapshot)
  })
  channel.post({ type: 'hello' })
})
onUnmounted(() => channel?.close())
</script>

<template>
  <main v-if="game" class="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-4">
    <header class="flex flex-wrap items-center gap-3">
      <h1 class="font-display text-2xl tracking-wide text-gold uppercase">Ведущий</h1>
      <span class="text-muted-foreground">{{ game.title }}</span>
      <div class="flex-1" />
      <Badge v-if="connected" variant="secondary"><Radio class="text-emerald-400" />{{ PHASE_LABEL[state.phase] }}</Badge>
      <Badge v-else variant="outline">Ждём экран игры…</Badge>
    </header>

    <Card v-if="!connected" class="items-center px-6 py-10 text-center text-muted-foreground">
      Откройте эту игру в главном окне — пульт подключится сам.
    </Card>

    <template v-else>
      <section class="flex flex-wrap gap-2" aria-label="Счёт">
        <div
          v-for="p in ranking"
          :key="p.id"
          class="flex items-center gap-2 rounded-lg border border-border bg-board px-3 py-1.5"
        >
          <span class="font-medium">{{ p.name }}</span>
          <span class="font-display text-xl text-gold tabular-nums">{{ p.score }}</span>
          <Button size="icon-xs" variant="ghost" :aria-label="`${p.name}: −100`" @click="send('adjustScore', p.id, -100)">−</Button>
          <Button size="icon-xs" variant="ghost" :aria-label="`${p.name}: +100`" @click="send('adjustScore', p.id, 100)">+</Button>
        </div>
      </section>

      <Card v-if="state.phase === 'title'" class="items-center gap-4 px-6 py-8">
        <p class="text-muted-foreground">Игроки рассаживаются на экране игры.</p>
        <Button size="lg" @click="send('start')">Начать игру</Button>
      </Card>

      <Card v-else-if="state.phase === 'round-intro' || state.phase === 'final-intro'" class="items-center gap-4 px-6 py-8">
        <p class="title-gold text-4xl">{{ state.phase === 'final-intro' ? 'Финал' : round?.name }}</p>
        <Button size="lg" @click="send('advance')">Дальше</Button>
      </Card>

      <section v-else-if="state.phase === 'board' && round" class="flex flex-col items-center gap-3">
        <BoardGrid :round="round" :played="state.played" @pick="(q) => send('pick', q.id)" />
        <Button variant="ghost" @click="send('nextRound')">Пропустить раунд<SkipForward /></Button>
      </section>

      <Card
        v-else-if="activeQuestion && ['auction', 'cat', 'question', 'answer'].includes(state.phase)"
        class="gap-4 px-6"
      >
        <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{{ theme?.name }}</span>·<span>{{ activeValue }}</span>
          <Badge v-if="activeQuestion.kind !== 'normal'" variant="outline">
            {{ activeQuestion.kind === 'auction' ? 'Аукцион' : 'Кот в мешке' }}
          </Badge>
        </div>
        <p class="font-serif text-2xl font-bold whitespace-pre-wrap">{{ activeQuestion.text }}</p>
        <div class="rounded-lg border border-gold/50 bg-accent px-4 py-3">
          <p class="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase"><Eye class="size-4" />Ответ</p>
          <p class="font-display text-2xl text-gold">{{ activeQuestion.answer }}</p>
        </div>

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
        <Button v-else-if="state.phase === 'question'" size="lg" class="self-center" @click="send('advance')">
          Показать ответ на экране
        </Button>
        <VerdictPanel
          v-else
          :players="players"
          :value="activeValue"
          :only-player-id="state.stake?.playerId"
          @verdict="(playerId, sign) => send('close', { playerId, sign })"
          @nobody="send('close')"
        />
      </Card>

      <Card v-else-if="game.finalRound && state.phase.startsWith('final-')" class="gap-4 px-6">
        <p class="text-sm text-muted-foreground">Финал · {{ game.finalRound.theme }}</p>
        <p class="font-serif text-2xl font-bold whitespace-pre-wrap">{{ game.finalRound.text }}</p>
        <div class="rounded-lg border border-gold/50 bg-accent px-4 py-3">
          <p class="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase"><Eye class="size-4" />Ответ</p>
          <p class="font-display text-2xl text-gold">{{ game.finalRound.answer }}</p>
        </div>
        <FinalBetsPanel
          v-if="state.phase === 'final-bets'"
          :players="players"
          :bets="state.finalBets"
          @bet="(id, amount) => send('setFinalBet', id, amount)"
          @done="send('advance')"
        />
        <Button v-else-if="state.phase === 'final-question'" size="lg" class="self-center" @click="send('advance')">
          Показать ответ на экране
        </Button>
        <FinalVerdictPanel
          v-else
          :players="players"
          :bets="state.finalBets"
          :verdicts="state.finalVerdicts"
          @verdict="(id, sign) => send('setFinalVerdict', id, sign)"
          @done="send('scoreFinal')"
        />
      </Card>

      <Card v-else-if="state.phase === 'results'" class="items-center gap-2 px-6 py-8">
        <p class="title-gold text-4xl">Итоги</p>
        <p v-for="(p, i) in ranking" :key="p.id" class="text-lg">{{ i + 1 }}. {{ p.name }} — {{ p.score }}</p>
      </Card>
    </template>
  </main>
</template>
