<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Game } from '../types'
import { useGamesStore } from '../stores/games'
import { makeEmptyGame } from '../game/model'
import { exportGameFile, GAME_FILE_ACCEPT, importGameFile, importSampleGame, type GameFileFormat } from '../io/gameFile'

const router = useRouter()
const store = useGamesStore()
const fileInput = ref<HTMLInputElement | null>(null)
const SAMPLE_TITLE = 'Своя игра — 1996 и не только'

// no editor is open while the library is on screen, so unsaved attachments can't be lost
onMounted(() => {
  store.pruneMedia().catch(() => {})
})

async function createNew() {
  try {
    const g = await store.save(makeEmptyGame('Своя Игра'))
    router.push({ name: 'editor', params: { id: g.id } })
  } catch (err) {
    alert('Не удалось создать игру: ' + (err as Error).message)
  }
}

async function remove(g: Game) {
  if (!confirm(`Удалить игру "${g.title}"?`)) return
  try {
    await store.remove(g.id)
  } catch (err) {
    alert('Не удалось удалить игру: ' + (err as Error).message)
  }
}

async function exportAs(g: Game, format: GameFileFormat) {
  try {
    await exportGameFile(g, format)
  } catch (err) {
    alert('Ошибка экспорта: ' + (err as Error).message)
  }
}

async function loadSample() {
  try {
    const previous = store.games.filter((g) => g.title === SAMPLE_TITLE)
    // save before removing: removal prunes media, and the new copy's files must be referenced by then
    await store.save(await importSampleGame())
    for (const old of previous) await store.remove(old.id)
    alert('Образец игры загружен (предыдущая копия заменена)')
  } catch (err) {
    alert('Не удалось загрузить пример: ' + (err as Error).message)
  }
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    await store.save(await importGameFile(file))
    alert('Игра импортирована')
  } catch (err) {
    alert('Не удалось импортировать: ' + (err as Error).message)
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
      <button class="si-button" @click="fileInput?.click()">Импорт (JSON / .gamezip)</button>
      <button class="si-button ghost" @click="loadSample">Загрузить пример (1996)</button>
      <input
        ref="fileInput"
        type="file"
        :accept="GAME_FILE_ACCEPT"
        style="display:none"
        @change="onFile"
      />
    </section>

    <section v-if="store.loadError" class="empty error">
      <p>Не удалось открыть библиотеку игр: {{ store.loadError.message }}</p>
    </section>

    <section v-else-if="store.games.length === 0" class="empty">
      <p>Игр пока нет. Создайте первую — нажмите «Новая игра».</p>
    </section>

    <section v-else class="game-list">
      <article v-for="g in store.games" :key="g.id" class="si-card game-row">
        <div class="game-info">
          <h3 class="game-title">{{ g.title || 'Без названия' }}</h3>
          <p class="game-meta">
            {{ g.rounds.length }} раунд(а) ·
            обновлено {{ fmtDate(g.updatedAt) }}
          </p>
        </div>
        <div class="game-actions">
          <button class="si-button primary" @click="router.push({ name: 'play', params: { id: g.id } })">Играть</button>
          <button class="si-button" @click="router.push({ name: 'editor', params: { id: g.id } })">Редактировать</button>
          <button class="si-button ghost" @click="exportAs(g, 'gamezip')">📦 .gamezip</button>
          <button class="si-button ghost" @click="exportAs(g, 'json')">JSON</button>
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
.empty.error { color: #ff8a8a; }
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
