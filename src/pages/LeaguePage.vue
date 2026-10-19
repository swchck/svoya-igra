<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeft, Award, Plus, Printer, Trash2, Trophy } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import StageBackdrop from '@/components/play/StageBackdrop.vue'
import { confirmAction } from '@/composables/useConfirm'
import { formatDay, intlTag } from '@/i18n'
import { loadResults } from '@/play/history'
import { loadLeagues, newLeague, PLACE_POINTS, saveLeagues, standings, type League } from '@/play/league'

const { t } = useI18n()
const router = useRouter()

const results = loadResults()
const leagues = ref<League[]>(loadLeagues())
const currentId = ref(leagues.value[0]?.id ?? '')
const newName = ref('')

const current = computed(() => leagues.value.find((l) => l.id === currentId.value))
const inLeague = computed(() => new Set(current.value?.resultIds ?? []))
const table = computed(() => standings(results.filter((r) => inLeague.value.has(r.id))))
const pointsRule = PLACE_POINTS.slice(0, 3).join(' · ')

watch(leagues, (list) => saveLeagues(list), { deep: true })

function create() {
  const name = newName.value.trim() || t('league.defaultName', { n: leagues.value.length + 1 })
  const league = newLeague(name)
  leagues.value.unshift(league)
  currentId.value = league.id
  newName.value = ''
}

function rename(value: string | number) {
  if (current.value) current.value.name = String(value)
}

async function remove() {
  const league = current.value
  if (!league) return
  const ok = await confirmAction({
    title: t('league.deleteTitle', { name: league.name }),
    description: t('league.deleteHint'),
    confirmLabel: t('league.delete'),
    destructive: true,
  })
  if (!ok) return
  leagues.value = leagues.value.filter((l) => l.id !== league.id)
  currentId.value = leagues.value[0]?.id ?? ''
}

function toggle(id: string, on: boolean) {
  const league = current.value
  if (!league) return
  league.resultIds = on ? [...league.resultIds, id] : league.resultIds.filter((r) => r !== id)
}

function winners(id: string): string {
  const result = results.find((r) => r.id === id)
  return result?.rows.filter((r) => r.place === 1).map((r) => r.name).join(', ') ?? ''
}

const num = (n: number) => n.toLocaleString(intlTag())
const print = () => window.print()

function back() {
  if (window.history.state?.back) router.back()
  else void router.push({ name: 'home' })
}
</script>

<template>
  <StageBackdrop />
  <div class="league-page">
    <header class="bar" data-tauri-drag-region>
      <Button variant="ghost" @click="back"><ArrowLeft />{{ t('league.back') }}</Button>
      <h1 class="title title-shine">{{ t('league.title') }}</h1>
    </header>

    <main class="sections">
      <section class="glass section picker">
        <p class="hint">{{ t('league.hint') }}</p>
        <div v-if="leagues.length" class="chips" role="radiogroup" :aria-label="t('league.title')">
          <button
            v-for="l in leagues"
            :key="l.id"
            type="button"
            role="radio"
            class="chip"
            :class="{ on: l.id === currentId }"
            :aria-checked="l.id === currentId"
            @click="currentId = l.id"
          >
            <Trophy class="size-4" />{{ l.name }}
          </button>
        </div>
        <form class="create" @submit.prevent="create">
          <Input v-model="newName" :placeholder="t('league.namePlaceholder')" :aria-label="t('league.name')" />
          <Button type="submit"><Plus />{{ t('league.create') }}</Button>
        </form>
      </section>

      <template v-if="current">
        <section class="glass section print-area">
          <div class="head">
            <Input class="name-input" :model-value="current.name" :aria-label="t('league.name')" @update:model-value="rename" />
            <span class="flex-1" />
            <Button variant="secondary" :disabled="!table.length" @click="print"><Printer />{{ t('league.print') }}</Button>
            <Button variant="ghost" size="icon" :aria-label="t('league.delete')" :title="t('league.delete')" @click="remove"><Trash2 /></Button>
          </div>
          <h2 class="print-title">{{ current.name }}</h2>
          <p v-if="!table.length" class="hint">{{ t('league.emptyTable') }}</p>
          <table v-else class="table">
            <thead>
              <tr>
                <th>#</th>
                <th class="left">{{ t('league.col.name') }}</th>
                <th :title="t('league.col.pointsHint', { rule: pointsRule })">{{ t('league.col.points') }}</th>
                <th>{{ t('league.col.wins') }}</th>
                <th>{{ t('league.col.podiums') }}</th>
                <th>{{ t('league.col.games') }}</th>
                <th>{{ t('league.col.total') }}</th>
                <th>{{ t('league.col.avgPlace') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in table" :key="s.name" :style="{ '--pc': s.color }">
                <td class="rank">
                  <Award v-if="i < 3" class="medal" :class="`m${i + 1}`" />
                  <template v-else>{{ i + 1 }}</template>
                </td>
                <td class="left who">{{ s.avatar }} {{ s.name }}</td>
                <td class="points">{{ s.points }}</td>
                <td>{{ s.wins }}</td>
                <td>{{ s.podiums }}</td>
                <td>{{ s.games }}</td>
                <td :class="{ neg: s.total < 0 }">{{ num(s.total) }}</td>
                <td>{{ s.avgPlace }}</td>
              </tr>
            </tbody>
          </table>
          <p class="hint rule">{{ t('league.rule', { rule: pointsRule }) }}</p>
        </section>

        <section class="glass section">
          <h2 class="section-title">{{ t('league.games') }}</h2>
          <p v-if="!results.length" class="hint">{{ t('league.noGames') }}</p>
          <ul v-else class="games">
            <li v-for="r in results" :key="r.id">
              <label class="game">
                <input type="checkbox" :aria-label="r.title" :checked="inLeague.has(r.id)" @change="toggle(r.id, ($event.target as HTMLInputElement).checked)" />
                <span class="game-title">{{ r.title }}</span>
                <span class="meta">{{ formatDay(r.playedAt) }} · {{ t('league.players', { n: r.rows.length }, r.rows.length) }}</span>
                <span class="meta win"><Trophy class="size-3.5" />{{ winners(r.id) }}</span>
              </label>
            </li>
          </ul>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.league-page {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100dvh;
}
.bar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 4px 20px 4px calc(20px + var(--titlebar-inset));
}
.title {
  margin: 0;
  font-size: 30px;
  line-height: 1;
}
.sections {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(860px, 100%);
  margin: 0 auto;
  padding: 12px 20px 24px;
}
.section {
  display: grid;
  gap: 14px;
  padding: 20px 22px;
  border-radius: 20px;
}
.section-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold);
}
.hint {
  margin: 0;
  font-size: 14px;
  color: var(--muted-foreground);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid oklch(var(--tint) 0 0 / 0.2);
  cursor: pointer;
}
.chip.on {
  border-color: var(--gold);
  background: color-mix(in oklch, var(--gold) 18%, transparent);
}
.create,
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.create :deep(input) {
  flex: 1;
  min-width: 200px;
}
.name-input {
  width: min(360px, 100%);
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: 0.04em;
}
.print-title {
  display: none;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.table th,
.table td {
  padding: 8px 6px;
  text-align: center;
  border-bottom: 1px solid var(--border);
}
.table th {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}
.table .left {
  text-align: left;
}
.who {
  font-weight: 600;
  border-left: 4px solid var(--pc);
}
.points {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--gold);
}
.neg {
  color: var(--magenta);
}
.medal {
  width: 20px;
  height: 20px;
}
.m1 { color: #e0b030; }
.m2 { color: #9aa3b5; }
.m3 { color: #c07a45; }
.games {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.game {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  cursor: pointer;
}
.game:hover {
  background: oklch(var(--tint) 0 0 / 0.06);
}
.game input {
  width: 18px;
  height: 18px;
  accent-color: var(--gold);
}
.game-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}
.meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--muted-foreground);
  white-space: nowrap;
}
@media (max-width: 640px) {
  .game {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .meta {
    grid-column: 2;
  }
}

@media print {
  .bar,
  .picker,
  .section:not(.print-area),
  .head {
    display: none !important;
  }
  .league-page {
    height: auto;
  }
  .sections {
    overflow: visible;
  }
  .print-area {
    color: #1b1d2a;
    background: #fff;
    border: 0;
    box-shadow: none;
  }
  .print-title {
    display: block;
    margin: 0;
    font-family: var(--font-display);
    font-size: 28px;
  }
}
</style>
