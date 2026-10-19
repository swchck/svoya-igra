<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeft, Award, Printer } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { findResult, type ResultRow } from '@/play/history'
import { formatDay, intlTag } from '@/i18n'

type Who = 'all' | 'top' | 'winner'

const HOST_KEY = 'svoya-igra:diploma-host'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const router = useRouter()

const result = findResult(props.id)
const who = ref<Who>('all')
const host = ref(readHost())

function readHost(): string {
  try {
    return localStorage.getItem(HOST_KEY) ?? ''
  } catch {
    return ''
  }
}

function setHost(value: string | number) {
  host.value = String(value)
  try {
    localStorage.setItem(HOST_KEY, host.value)
  } catch {
    // the name just won't be remembered for next time
  }
}

// a single-choice group emits nothing when the picked item is clicked again
function setWho(v: unknown) {
  if (v) who.value = v as Who
}

const rows = computed<ResultRow[]>(() => {
  const all = result?.rows ?? []
  if (who.value === 'winner') return all.filter((r) => r.place === 1)
  if (who.value === 'top') return all.filter((r) => r.place <= 3)
  return all
})

function placeLine(row: ResultRow): string {
  return row.place <= 3 ? t(`play.diploma.place${row.place}`) : t('play.diploma.participant')
}

const date = computed(() => (result ? formatDay(result.playedAt) : ''))
const print = () => window.print()

function back() {
  if (window.history.state?.back) router.back()
  else void router.push({ name: 'home' })
}
</script>

<template>
  <div class="page">
    <div class="toolbar" data-tauri-drag-region>
      <Button variant="ghost" @click="back"><ArrowLeft />{{ t('play.diploma.back') }}</Button>
      <span class="toolbar-title">{{ t('play.diploma.title') }}</span>
      <template v-if="result">
        <ToggleGroup :model-value="who" type="single" variant="outline" size="sm" :aria-label="t('play.diploma.who')" @update:model-value="setWho">
          <ToggleGroupItem value="all">{{ t('play.diploma.whoAll') }}</ToggleGroupItem>
          <ToggleGroupItem value="top">{{ t('play.diploma.whoTop') }}</ToggleGroupItem>
          <ToggleGroupItem value="winner">{{ t('play.diploma.whoWinner') }}</ToggleGroupItem>
        </ToggleGroup>
        <Input
          class="host-input"
          :model-value="host"
          :aria-label="t('play.diploma.host')"
          :placeholder="t('play.diploma.hostPlaceholder')"
          @update:model-value="setHost"
        />
        <Button @click="print"><Printer />{{ t('play.diploma.print') }}</Button>
      </template>
    </div>

    <p v-if="!result" class="missing">{{ t('play.diploma.missing') }}</p>
    <main v-else class="sheets">
      <article v-for="(row, i) in rows" :key="i" class="diploma" :class="`place-${Math.min(row.place, 4)}`">
        <div class="frame">
          <Award class="medal" />
          <h1 class="heading">{{ t('play.diploma.heading') }}</h1>
          <p class="awarded">{{ result.teams ? t('play.diploma.awardedTeam') : t('play.diploma.awarded') }}</p>
          <p class="name">{{ row.avatar }} {{ row.name }}</p>
          <p class="for">{{ placeLine(row) }}</p>
          <p class="game">{{ t('play.diploma.inGame', { title: result.title }) }}</p>
          <p class="points">{{ t('play.diploma.points', { n: row.score.toLocaleString(intlTag()) }, Math.abs(row.score)) }}</p>
          <footer class="foot">
            <span class="date">{{ date }}</span>
            <span class="sign">
              <span class="line">{{ host }}</span>
              <span class="caption">{{ t('play.diploma.signature') }}</span>
            </span>
          </footer>
        </div>
      </article>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100dvh;
  color-scheme: light;
  color: #1b1d2a;
  background: #e8e9f0;
}
.toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  min-height: var(--titlebar-height);
  padding: 6px 20px 6px calc(20px + var(--titlebar-inset));
  color: var(--foreground);
  background: oklch(0.2 0.15 270 / 0.92);
  backdrop-filter: blur(14px);
}
.toolbar-title {
  flex: 1;
  font-family: var(--font-display);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--gold);
}
.host-input {
  width: 200px;
}
.missing {
  padding: 40px;
  text-align: center;
}
.sheets {
  display: grid;
  justify-items: center;
  gap: 24px;
  padding: 24px 16px 48px;
}
/* A4 landscape at 96 dpi; the print rules below take it to the paper edge */
.diploma {
  page: diploma;
  width: min(1123px, 100%);
  aspect-ratio: 297 / 210;
  padding: 3.2%;
  background: #fffdf6;
  box-shadow: 0 8px 30px oklch(0.2 0.1 270 / 0.25);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  container-type: inline-size;
}
.frame {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 3cqw 6cqw;
  border: 0.5cqw double var(--medal);
  outline: 0.15cqw solid var(--medal);
  outline-offset: -1.2cqw;
  text-align: center;
  --medal: #b8892a;
}
.place-2 .frame {
  --medal: #8a93a6;
}
.place-3 .frame {
  --medal: #b06a35;
}
.place-4 .frame {
  --medal: #3a4fb8;
}
.medal {
  width: 6cqw;
  height: 6cqw;
  color: var(--medal);
}
.heading {
  margin: 0.6cqw 0 0;
  font-family: var(--font-display);
  font-size: 7.5cqw;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--medal);
}
.awarded {
  margin: 2cqw 0 0;
  font-size: 1.8cqw;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #555a70;
}
.name {
  margin: 1cqw 0 0;
  max-width: 100%;
  font-family: var(--font-serif);
  font-size: 5.2cqw;
  font-weight: 700;
  line-height: 1.1;
  overflow-wrap: anywhere;
}
.for {
  margin: 2cqw 0 0;
  font-size: 2.6cqw;
  font-weight: 600;
}
.game {
  margin: 0.4cqw 0 0;
  font-family: var(--font-serif);
  font-size: 2.2cqw;
  font-style: italic;
}
.points {
  margin: 0.8cqw 0 0;
  font-size: 1.8cqw;
  color: #555a70;
}
.foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
  margin-top: auto;
  font-size: 1.5cqw;
}
.sign {
  display: grid;
  justify-items: center;
  gap: 0.3cqw;
}
.line {
  min-width: 22cqw;
  min-height: 1.4em;
  border-bottom: 1px solid #1b1d2a;
  font-family: var(--font-serif);
  font-style: italic;
}
.caption {
  font-size: 1.2cqw;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6a6f86;
}

@media print {
  .page {
    background: #fff;
  }
  .toolbar {
    display: none;
  }
  .sheets {
    display: block;
    padding: 0;
  }
  .diploma {
    width: 297mm;
    height: 210mm;
    aspect-ratio: auto;
    box-shadow: none;
    break-after: page;
  }
}
</style>

<style>
@page diploma {
  size: A4 landscape;
  margin: 0;
}
</style>
