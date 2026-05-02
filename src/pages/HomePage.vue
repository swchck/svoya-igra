<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGamesStore } from '../stores/games'
import { exportGameJson, importGameJson, makeEmptyGame } from '../storage'
import { exportGameZip, importGameZip } from '../archive'
import type { Game } from '../types'

const router = useRouter()
const store = useGamesStore()

const fileInput = ref<HTMLInputElement | null>(null)

const sortedGames = computed(() =>
  [...store.games].sort((a, b) => b.updatedAt - a.updatedAt),
)

function createNew() {
  const g = makeEmptyGame('Своя Игра')
  store.save(g)
  router.push({ name: 'editor', params: { id: g.id } })
}

function play(id: string) {
  router.push({ name: 'play', params: { id } })
}

function edit(id: string) {
  router.push({ name: 'editor', params: { id } })
}

function remove(g: Game) {
  if (!confirm(`Удалить игру "${g.title}"?`)) return
  store.remove(g.id)
}

function downloadJson(g: Game) {
  const blob = new Blob([exportGameJson(g)], { type: 'application/json' })
  trigger(blob, `${slug(g.title)}.json`)
}

async function downloadGamezip(g: Game) {
  try {
    const blob = await exportGameZip(g)
    trigger(blob, `${slug(g.title)}.gamezip`)
  } catch (err) {
    alert('Ошибка экспорта: ' + (err as Error).message)
  }
}

function slug(t: string): string {
  const s = (t || 'svoya-igra').trim().toLowerCase().replace(/[^a-zа-яё0-9-]+/gi, '-').replace(/^-+|-+$/g, '')
  return s || 'svoya-igra'
}

function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

function pickFile() {
  fileInput.value?.click()
}

async function loadSample() {
  try {
    // Динамический import — образец и его картинки попадают в бандл (или inline-бандл портативной сборки).
    const mod = await import('../samples/sample1996')
    const game = importGameJson(JSON.stringify(mod.getSampleGame()))
    for (const g of store.games) {
      if (g.title === game.title) store.remove(g.id)
    }
    store.save(game)
    alert('Образец игры загружен (предыдущая копия заменена)')
  } catch (err) {
    alert('Не удалось загрузить пример: ' + (err as Error).message)
  }
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const isZip = file.name.toLowerCase().endsWith('.gamezip') || file.name.toLowerCase().endsWith('.zip')
    let game: Game
    if (isZip) {
      game = await importGameZip(file)
    } else {
      const text = await file.text()
      game = importGameJson(text)
    }
    store.save(game)
    alert('Игра импортирована')
  } catch (err) {
    alert('Не удалось импортировать: ' + (err as Error).message)
  } finally {
    input.value = ''
  }
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <div class="si-page home">
    <header class="hero">
      <h1 class="si-title hero-title">СВОЯ&nbsp;ИГРА</h1>
      <p class="hero-sub">Конструктор и проигрыватель</p>
    </header>

    <section class="actions">
      <button class="si-button primary" @click="createNew">+ Новая игра</button>
      <button class="si-button" @click="pickFile">Импорт (JSON / .gamezip)</button>
      <button class="si-button ghost" @click="loadSample">Загрузить пример (1996)</button>
      <input
        ref="fileInput"
        type="file"
        accept=".json,.gamezip,.zip,application/json,application/zip,application/x-svoya-igra+zip"
        style="display:none"
        @change="onFile"
      />
    </section>

    <section v-if="sortedGames.length === 0" class="empty">
      <p>Игр пока нет. Создайте первую — нажмите «Новая игра».</p>
    </section>

    <section v-else class="game-list">
      <article v-for="g in sortedGames" :key="g.id" class="si-card game-row">
        <div class="game-info">
          <h3 class="game-title">{{ g.title || 'Без названия' }}</h3>
          <p class="game-meta">
            {{ g.rounds.length }} раунд(а) ·
            обновлено {{ fmtDate(g.updatedAt) }}
          </p>
        </div>
        <div class="game-actions">
          <button class="si-button primary" @click="play(g.id)">Играть</button>
          <button class="si-button" @click="edit(g.id)">Редактировать</button>
          <button class="si-button ghost" @click="downloadGamezip(g)">📦 .gamezip</button>
          <button class="si-button ghost" @click="downloadJson(g)">JSON</button>
          <button class="si-button danger" @click="remove(g)">Удалить</button>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 60px 0 40px;
}
.hero-title {
  font-size: clamp(56px, 9vw, 110px);
  margin: 0;
  line-height: 1;
}
.hero-sub {
  margin: 12px 0 0;
  color: var(--si-mute);
  font-style: italic;
  font-size: 18px;
}
.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin: 16px 0 32px;
  flex-wrap: wrap;
}
.empty {
  text-align: center;
  color: var(--si-mute);
  padding: 40px;
}
.game-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.game-row {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.game-info { flex: 1; min-width: 220px; }
.game-title {
  margin: 0 0 4px;
  font-family: var(--font-title);
  color: var(--si-gold);
  font-size: 24px;
}
.game-meta {
  margin: 0;
  color: var(--si-mute);
  font-size: 14px;
}
.game-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
