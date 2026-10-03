<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Crown } from '@lucide/vue'
import type { Player } from '@/types'
import { confettiAt } from '@/lib/motion'
import AnimatedNumber from './AnimatedNumber.vue'

const props = defineProps<{
  players: Player[]
  /** The player answering alone: the auction winner or the cat's recipient. */
  activeId?: string
}>()

const leaderId = computed(() => {
  const [first, second] = [...props.players].sort((a, b) => b.score - a.score)
  return first && first.score > 0 && (!second || first.score > second.score) ? first.id : undefined
})

interface Burst {
  key: number
  delta: number
}
const bursts = ref<Record<string, Burst[]>>({})
const shaking = ref<Record<string, boolean>>({})
const desks = ref<Record<string, HTMLElement>>({})
let seq = 0

watch(
  () => props.players.map((p) => [p.id, p.score] as const),
  async (now, before) => {
    const old = new Map(before)
    for (const [id, score] of now) {
      const prev = old.get(id)
      if (prev === undefined || prev === score) continue
      const delta = score - prev
      const burst = { key: ++seq, delta }
      bursts.value[id] = [...(bursts.value[id] ?? []), burst]
      setTimeout(() => (bursts.value[id] = (bursts.value[id] ?? []).filter((b) => b !== burst)), 1600)
      if (delta > 0) {
        await nextTick()
        const r = desks.value[id]?.getBoundingClientRect()
        if (r) confettiAt(r.left + r.width / 2, r.top)
      } else {
        shaking.value[id] = false
        await nextTick()
        shaking.value[id] = true
      }
    }
  },
)
</script>

<template>
  <section class="podiums" aria-label="Счёт">
    <TransitionGroup name="desk">
      <div
        v-for="p in players"
        :key="p.id"
        :ref="(el) => el && (desks[p.id] = el as HTMLElement)"
        class="desk"
        :class="{ active: p.id === activeId, leader: p.id === leaderId, shake: shaking[p.id], negative: p.score < 0 }"
        @animationend="shaking[p.id] = false"
      >
        <Crown v-if="p.id === leaderId" class="crown" aria-label="Лидер" />
        <span class="name">{{ p.name }}</span>
        <span class="score"><AnimatedNumber :value="p.score" /></span>
        <span v-for="b in bursts[p.id]" :key="b.key" class="delta" :class="b.delta > 0 ? 'up' : 'down'">
          {{ b.delta > 0 ? '+' : '−' }}{{ Math.abs(b.delta) }}
        </span>
      </div>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.podiums {
  display: flex;
  justify-content: center;
  gap: clamp(10px, 1.6vw, 24px);
  padding: 0 clamp(12px, 2vw, 32px) clamp(10px, 1.6vh, 20px);
}
.desk {
  position: relative;
  flex: 0 1 240px;
  min-width: 0;
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 10px 16px 12px;
  border-radius: 18px 18px 10px 10px;
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.1), transparent 40%),
    linear-gradient(180deg, var(--tile), var(--tile-deep));
  border: 1px solid oklch(1 0 0 / 0.16);
  border-bottom: 4px solid var(--gold-deep);
  box-shadow: 0 18px 40px -22px oklch(0.05 0.1 280 / 0.95);
  transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
}
.desk.active {
  transform: translateY(-6px);
  border-color: var(--cyan);
  box-shadow: 0 0 0 2px var(--cyan), 0 18px 50px -18px color-mix(in oklch, var(--cyan) 80%, transparent);
}
.desk.leader {
  border-bottom-color: var(--gold);
}
.crown {
  position: absolute;
  top: -16px;
  width: 26px;
  height: 26px;
  color: var(--gold);
  filter: drop-shadow(0 2px 6px oklch(0 0 0 / 0.5));
  animation: bob 2.4s ease-in-out infinite;
}
.name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: clamp(14px, 1.4vw, 20px);
  font-weight: 600;
}
.score {
  font-family: var(--font-display);
  font-size: clamp(28px, 3.4vw, 50px);
  font-weight: 700;
  line-height: 1;
  color: var(--gold);
  text-shadow: 0 0 18px color-mix(in oklch, var(--gold) 45%, transparent);
}
.negative .score {
  color: var(--magenta);
  text-shadow: 0 0 18px color-mix(in oklch, var(--magenta) 45%, transparent);
}
.delta {
  position: absolute;
  top: -8px;
  right: 10px;
  font-family: var(--font-display);
  font-size: clamp(20px, 2.2vw, 32px);
  font-weight: 700;
  pointer-events: none;
  animation: rise 1.6s ease-out forwards;
}
.delta.up { color: var(--cyan); }
.delta.down { color: var(--magenta); }
.shake {
  animation: shake 0.5s ease;
  border-color: var(--magenta);
}
.desk-enter-active, .desk-leave-active { transition: opacity 0.3s, transform 0.3s; }
.desk-enter-from, .desk-leave-to { opacity: 0; transform: translateY(20px); }
@keyframes rise {
  0% { opacity: 0; transform: translateY(10px) scale(0.8); }
  15% { opacity: 1; transform: translateY(0) scale(1.15); }
  100% { opacity: 0; transform: translateY(-46px) scale(1); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(7px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(3px); }
}
@keyframes bob {
  0%, 100% { transform: translateY(0) rotate(-6deg); }
  50% { transform: translateY(-3px) rotate(6deg); }
}
@media (prefers-reduced-motion: reduce) {
  .crown, .delta, .shake { animation: none; }
  .delta { display: none; }
}
</style>
