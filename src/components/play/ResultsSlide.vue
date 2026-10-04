<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Crown, Home, Undo2 } from '@lucide/vue'
import type { Player } from '@/types'
import type { PlayerStats } from '@/composables/usePlaySession'
import { playerColor } from '@/play/palette'
import { Button } from '@/components/ui/button'
import { confettiAt } from '@/lib/motion'
import AnimatedNumber from './AnimatedNumber.vue'
import StatsTable from './StatsTable.vue'

const { t } = useI18n()
const props = defineProps<{
  ranking: Player[]
  stats?: Record<string, PlayerStats>
  showHome?: boolean
  /** Offers to take back the last scoring; used when no host window does. */
  canUndo?: boolean
}>()
defineEmits<{ (e: 'home'): void; (e: 'undo'): void }>()

// colors follow the setup order, which the ranking has lost
const colors = computed(() => new Map(props.ranking.map((p, i) => [p.id, playerColor(p, i)])))

// the classic podium order: second, first, third
const podium = computed(() => {
  const [first, second, third] = props.ranking
  return [second && { p: second, place: 2 }, first && { p: first, place: 1 }, third && { p: third, place: 3 }].filter(
    (x): x is { p: Player; place: number } => !!x,
  )
})
const rest = computed(() => props.ranking.slice(3))

onMounted(() => {
  setTimeout(() => confettiAt(innerWidth / 2, innerHeight * 0.35, { big: true }), 900)
  setTimeout(() => confettiAt(innerWidth * 0.25, innerHeight * 0.5), 1300)
  setTimeout(() => confettiAt(innerWidth * 0.75, innerHeight * 0.5), 1500)
})
</script>

<template>
  <section class="results" :class="{ 'with-stats': stats }">
    <h1 class="title-shine heading">{{ t('play.results.title') }}</h1>
    <ol class="podium">
      <li
        v-for="s in podium"
        :key="s.p.id"
        class="step"
        :class="`place-${s.place}`"
        :style="{ '--pc': colors.get(s.p.id), animationDelay: `${300 + (3 - s.place) * 250}ms` }"
      >
        <Crown v-if="s.place === 1" class="crown" />
        <span class="who">{{ s.p.avatar }} {{ s.p.name }}</span>
        <span class="pts"><AnimatedNumber :value="s.p.score" :ms="1400" /></span>
        <span class="block"><span class="num">{{ s.place }}</span></span>
      </li>
    </ol>
    <ol v-if="rest.length" class="rest" :start="4">
      <li v-for="p in rest" :key="p.id"><span>{{ p.name }}</span><span class="pts-small">{{ p.score }}</span></li>
    </ol>
    <StatsTable v-if="stats && Object.keys(stats).length" class="stats" :players="ranking" :stats="stats" />
    <div v-if="showHome" class="actions">
      <Button v-if="canUndo" variant="ghost" @click="$emit('undo')"><Undo2 />{{ t('play.stage.undo') }}</Button>
      <Button size="lg" @click="$emit('home')"><Home />{{ t('play.results.home') }}</Button>
    </div>
  </section>
</template>

<style scoped>
.results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  gap: clamp(14px, 3vh, 32px);
  height: 100%;
  padding: 2vh 4vw;
  overflow-y: auto;
}
.heading {
  margin: 0;
  font-size: clamp(48px, 8vw, 128px);
  line-height: 1;
}
.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: clamp(10px, 2vw, 28px);
  margin: 0;
  padding: 0;
  list-style: none;
  width: min(1000px, 100%);
}
.step {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  animation: rise 0.9s cubic-bezier(0.2, 0.9, 0.3, 1.1) both;
}
.who {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: clamp(16px, 2vw, 30px);
  font-weight: 600;
  color: color-mix(in oklch, var(--pc) 75%, var(--foreground));
}
.pts {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(26px, 3.6vw, 60px);
  color: var(--gold);
  text-shadow: 0 0 24px color-mix(in oklch, var(--gold) 50%, transparent);
}
.block {
  display: grid;
  place-items: center;
  width: 100%;
  border-radius: 16px 16px 0 0;
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.18), transparent 35%),
    linear-gradient(180deg, var(--tile), var(--tile-deep));
  border: 1px solid oklch(1 0 0 / 0.18);
  border-bottom: 0;
}
.place-1 .block { height: clamp(120px, 26vh, 280px); border-top: 4px solid var(--gold); }
.with-stats .place-1 .block { height: clamp(60px, 13vh, 150px); }
.with-stats .place-2 .block { height: clamp(46px, 9vh, 110px); }
.with-stats .place-3 .block { height: clamp(36px, 6.5vh, 80px); }
.with-stats .num { font-size: clamp(22px, 4vh, 48px); }
.with-stats .heading { font-size: clamp(40px, 6.5vh, 84px); }
.with-stats { gap: clamp(8px, 1.6vh, 20px); }
.place-2 .block { height: clamp(90px, 18vh, 200px); border-top: 4px solid oklch(0.85 0.02 260); }
.place-3 .block { height: clamp(70px, 13vh, 150px); border-top: 4px solid oklch(0.7 0.12 55); }
.num {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(36px, 6vh, 80px);
  color: oklch(1 0 0 / 0.85);
}
.crown {
  width: clamp(28px, 4vw, 52px);
  height: auto;
  color: var(--gold);
  filter: drop-shadow(0 0 16px color-mix(in oklch, var(--gold) 70%, transparent));
}
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.stats {
  animation: rise 0.9s 1.2s cubic-bezier(0.2, 0.9, 0.3, 1.1) both;
}
.rest {
  display: grid;
  gap: 6px;
  width: min(520px, 100%);
  margin: 0;
  padding-left: 1.5em;
  font-size: clamp(14px, 1.4vw, 20px);
}
.rest li::marker { color: var(--muted-foreground); }
.rest li { display: flex; justify-content: space-between; gap: 12px; }
.pts-small { font-family: var(--font-display); color: var(--gold); }
@keyframes rise {
  from { opacity: 0; transform: translateY(80px); }
}
@media (prefers-reduced-motion: reduce) {
  .step, .stats { animation: none; }
}
</style>
