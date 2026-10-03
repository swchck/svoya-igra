<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RotateCcw, X } from '@lucide/vue'
import type { Player } from '@/types'
import { buzzWinner, pressedBy, type LanStatus } from '@/play/lan'
import { playerColor } from '@/play/palette'
import { Button } from '@/components/ui/button'

const props = defineProps<{ players: Player[]; status: LanStatus; value: number }>()
defineEmits<{ (e: 'reopen', wrong: boolean): void }>()
const { t } = useI18n()

const seats = computed(() => new Map(props.players.map((p, i) => [p.id, { name: p.name, color: playerColor(p, i) }])))
const order = computed(() =>
  props.status.buzz.order.map((id, i) => {
    const seat = seats.value.get(id)
    return { id, name: pressedBy(props.status, i, seat?.name) || '?', color: seat?.color ?? 'currentColor' }
  }),
)
const excluded = computed(() => props.status.buzz.excluded.map((id) => seats.value.get(id)?.name ?? '?').join(', '))
const winner = computed(() => buzzWinner(props.status))
const stateLabel = computed(() => t(`lan.buzz.${props.status.buzz.state}`))
</script>

<template>
  <section class="buzz" :aria-label="t('lan.buzz.title')">
    <div class="head">
      <h3 class="title">{{ t('lan.buzz.title') }}</h3>
      <span class="chip" :class="status.buzz.state">{{ stateLabel }}</span>
    </div>
    <ol v-if="order.length" class="order">
      <li v-for="(p, i) in order" :key="p.id" :class="{ first: i === 0 }" :style="{ '--pc': p.color }">
        <span class="place">{{ i + 1 }}</span><span class="name">{{ p.name }}</span>
      </li>
    </ol>
    <p v-else class="muted">{{ t('lan.buzz.nobody') }}</p>
    <p v-if="excluded" class="muted">{{ t('lan.buzz.excluded', { names: excluded }) }}</p>
    <div class="actions">
      <Button v-if="winner" variant="destructive" size="sm" @click="$emit('reopen', true)"><X />{{ t('lan.buzz.wrong', { value }) }}</Button>
      <Button variant="secondary" size="sm" @click="$emit('reopen', false)"><RotateCcw />{{ t('lan.buzz.reopen') }}</Button>
    </div>
  </section>
</template>

<style scoped>
.buzz {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid color-mix(in oklch, var(--gold) 45%, transparent);
  background: color-mix(in oklch, var(--gold) 8%, transparent);
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 15px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--gold);
}
.chip {
  padding: 1px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid oklch(1 0 0 / 0.25);
  color: var(--muted-foreground);
}
.chip.open {
  border-color: var(--cyan);
  color: var(--cyan);
}
.chip.locked {
  border-color: var(--gold);
  color: var(--gold);
}
.order {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.order li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border-radius: 999px;
  border: 1px solid oklch(1 0 0 / 0.18);
  border-left: 4px solid var(--pc);
}
.order li.first {
  border-color: var(--gold);
  box-shadow: 0 0 0 1px var(--gold), 0 0 18px -4px var(--gold);
  font-weight: 700;
}
.place {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: oklch(1 0 0 / 0.12);
  font-size: 13px;
}
.first .place {
  background: var(--gold);
  color: var(--night);
}
.muted {
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
