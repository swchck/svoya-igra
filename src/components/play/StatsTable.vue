<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Player } from '@/types'
import type { PlayerStats } from '@/composables/usePlaySession'
import { playerColor } from '@/play/palette'

const { t } = useI18n()
defineProps<{
  /** In the order to show, usually by place. */
  players: Player[]
  stats: Record<string, PlayerStats>
  /** The smaller table of the host window. */
  compact?: boolean
}>()

const NONE: PlayerStats = { correct: 0, wrong: 0, won: 0, lost: 0, streak: 0, bestStreak: 0, best: 0 }
</script>

<template>
  <table class="stats" :class="{ compact }">
    <caption class="sr-only">{{ t('play.results.stats.title') }}</caption>
    <thead>
      <tr>
        <th scope="col"><span class="sr-only">{{ t('play.podiums.score') }}</span></th>
        <th scope="col">{{ t('play.results.stats.correct') }}</th>
        <th scope="col">{{ t('play.results.stats.wrong') }}</th>
        <th scope="col">{{ t('play.results.stats.won') }}</th>
        <th scope="col">{{ t('play.results.stats.lost') }}</th>
        <th scope="col">{{ t('play.results.stats.streak') }}</th>
        <th scope="col">{{ t('play.results.stats.best') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(p, i) in players" :key="p.id" :style="{ '--pc': playerColor(p, i) }">
        <th scope="row" class="who"><span class="name"><span class="swatch" />{{ p.avatar }} {{ p.name }}</span></th>
        <td>{{ (stats[p.id] ?? NONE).correct }}</td>
        <td>{{ (stats[p.id] ?? NONE).wrong }}</td>
        <td class="up">{{ (stats[p.id] ?? NONE).won ? `+${stats[p.id].won}` : '–' }}</td>
        <td class="down">{{ (stats[p.id] ?? NONE).lost ? `−${stats[p.id].lost}` : '–' }}</td>
        <td>{{ (stats[p.id] ?? NONE).bestStreak }}</td>
        <td>{{ (stats[p.id] ?? NONE).best || '–' }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.stats {
  width: min(900px, 100%);
  border-collapse: separate;
  border-spacing: 0 clamp(3px, 0.6vh, 8px);
  font-size: clamp(13px, 1.35vw, 20px);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.stats.compact {
  width: 100%;
  font-size: 14px;
}
thead th {
  padding: 0 clamp(6px, 1vw, 16px);
  font-size: 0.72em;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}
td,
.who {
  padding: 0.35em clamp(6px, 1vw, 16px);
  background: linear-gradient(180deg, oklch(1 0 0 / 0.07), oklch(1 0 0 / 0.02));
}
tbody tr > :first-child {
  border-radius: 12px 0 0 12px;
}
tbody tr > :last-child {
  border-radius: 0 12px 12px 0;
}
.who {
  max-width: 14em;
  text-align: left;
  font-weight: 600;
}
.name {
  display: flex;
  align-items: center;
  gap: 0.5em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.swatch {
  flex: none;
  width: 0.7em;
  height: 0.7em;
  border-radius: 999px;
  background: var(--pc);
  box-shadow: 0 0 10px var(--pc);
}
.up {
  color: var(--cyan);
}
.down {
  color: var(--magenta);
}
</style>
