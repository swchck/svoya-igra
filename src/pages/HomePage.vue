<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Download, FileJson, MoreHorizontal, Package, Pencil, Play, Plus, Sparkles, Trash2, Upload } from '@lucide/vue'
import type { Game } from '@/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useGamesStore } from '@/stores/games'
import { confirmAction } from '@/composables/useConfirm'
import { makeEmptyGame } from '@/game/model'
import { exportGameFile, GAME_FILE_ACCEPT, importGameFileWithNotes, importSampleGame, type GameFileFormat } from '@/io/gameFile'
import { isDesktop, pickGameFile } from '@/platform'
import StageBackdrop from '@/components/play/StageBackdrop.vue'
import MiniBoard from '@/components/MiniBoard.vue'
import LocaleSwitch from '@/components/LocaleSwitch.vue'
import { currentLocale } from '@/i18n'

const router = useRouter()
const { t } = useI18n()
const store = useGamesStore()
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
// the titles in assets/sample/content.mjs plus the pre-translation sample, so older copies get replaced
const SAMPLE_TITLES = ['Пример: всего понемногу', 'Sample: a bit of everything', 'Primer: od svega po malo', 'Своя игра — 1996 и не только']
const version = ref('')

onMounted(async () => {
  if (isDesktop) version.value = await (await import('@tauri-apps/api/app')).getVersion()
})

onMounted(() => {
  store.pruneMedia().catch(() => {})
})

function failed(action: string, err: unknown) {
  toast.error(action, { description: err instanceof Error ? err.message : String(err) })
}

async function createNew() {
  try {
    const g = await store.save(makeEmptyGame())
    router.push({ name: 'editor', params: { id: g.id } })
  } catch (err) {
    failed(t('home.toast.createFailed'), err)
  }
}

async function remove(g: Game) {
  const ok = await confirmAction({
    title: t('home.confirmDelete.title', { title: g.title || t('home.untitled') }),
    description: t('home.confirmDelete.description'),
    confirmLabel: t('home.confirmDelete.confirm'),
    destructive: true,
  })
  if (!ok) return
  try {
    await store.remove(g.id)
    toast.success(t('home.toast.deleted'))
  } catch (err) {
    failed(t('home.toast.deleteFailed'), err)
  }
}

async function exportAs(g: Game, format: GameFileFormat) {
  try {
    if (await exportGameFile(g, format)) toast.success(t('home.toast.fileSaved'))
  } catch (err) {
    failed(t('home.toast.exportFailed'), err)
  }
}

async function loadSample() {
  busy.value = true
  try {
    const previous = store.games.filter((g) => SAMPLE_TITLES.includes(g.title))
    // save before removing: removal prunes media, and the new copy's files must be referenced by then
    await store.save(await importSampleGame())
    for (const old of previous) await store.remove(old.id)
    toast.success(t('home.toast.sampleLoaded'), previous.length ? { description: t('home.toast.sampleReplaced') } : undefined)
  } catch (err) {
    failed(t('home.toast.sampleFailed'), err)
  } finally {
    busy.value = false
  }
}

async function startImport() {
  if (!isDesktop) {
    fileInput.value?.click()
    return
  }
  try {
    const file = await pickGameFile()
    if (file) await importFile(file)
  } catch (err) {
    failed(t('home.toast.openFailed'), err)
  }
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await importFile(file)
}

async function importFile(file: File) {
  busy.value = true
  try {
    const { game: imported, notes } = await importGameFileWithNotes(file)
    const game = await store.save(imported)
    toast.success(t('home.toast.imported'), { description: [game.title, ...notes].join(' · ') })
  } catch (err) {
    failed(t('home.toast.importFailed'), err)
  } finally {
    busy.value = false
  }
}

function questionCount(g: Game) {
  return g.rounds.reduce((n, r) => n + r.themes.reduce((m, th) => m + th.questions.length, 0), 0)
}

function stats(g: Game) {
  const rounds = t('home.card.rounds', { n: g.rounds.length }, g.rounds.length)
  const count = questionCount(g)
  const questions = t('home.card.questions', { n: count }, count)
  return t(g.finalRound ? 'home.card.statsWithFinal' : 'home.card.stats', { rounds, questions })
}

function fmtDate(ts: number) {
  const locale = currentLocale() === 'sr' ? 'sr-Latn' : currentLocale()
  return new Date(ts).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <StageBackdrop />
  <main class="home">
    <header class="hero">
      <div class="locale"><LocaleSwitch /></div>
      <h1 class="title-shine hero-title">{{ t('system.appName') }}</h1>
      <p class="hero-sub">{{ t('home.subtitle') }}</p>
      <div class="actions">
        <Button size="lg" class="h-12 px-6 text-base" @click="createNew"><Plus />{{ t('home.newGame') }}</Button>
        <Button size="lg" variant="outline" class="h-12 px-6 text-base" :disabled="busy" @click="startImport"><Upload />{{ t('home.import') }}</Button>
        <Button size="lg" variant="ghost" class="h-12 px-6 text-base" :disabled="busy" @click="loadSample"><Sparkles />{{ t('home.openSample') }}</Button>
        <input ref="fileInput" type="file" class="hidden" :accept="GAME_FILE_ACCEPT" @change="onFile" />
      </div>
    </header>

    <section v-if="store.loadError" class="glass notice text-destructive">
      {{ t('home.libraryError', { message: store.loadError.message }) }}
    </section>

    <section v-else-if="store.games.length === 0" class="glass notice">
      <p class="font-display text-2xl text-gold uppercase">{{ t('home.empty.title') }}</p>
      <p class="text-muted-foreground">{{ t('home.empty.hint') }}</p>
    </section>

    <TransitionGroup v-else name="list" tag="ul" class="games">
      <li v-for="g in store.games" :key="g.id" class="game glass">
        <button class="thumb" :aria-label="t('home.card.playNamed', { title: g.title || t('home.untitled') })" @click="router.push({ name: 'play', params: { id: g.id } })">
          <MiniBoard :round="g.rounds[0]" />
          <span class="thumb-play"><Play class="size-7 translate-x-0.5" /></span>
        </button>
        <div class="info">
          <h2 class="name">{{ g.title || t('home.untitled') }}</h2>
          <p class="meta">
            {{ stats(g) }}
          </p>
          <p class="meta">{{ t('home.card.modified', { date: fmtDate(g.updatedAt) }) }}</p>
        </div>
        <div class="buttons">
          <Button @click="router.push({ name: 'play', params: { id: g.id } })"><Play />{{ t('home.card.play') }}</Button>
          <Button variant="secondary" @click="router.push({ name: 'editor', params: { id: g.id } })"><Pencil />{{ t('home.card.edit') }}</Button>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" :aria-label="t('home.card.moreActions')"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="min-w-52">
              <DropdownMenuItem @select="exportAs(g, 'gamezip')"><Package />{{ t('home.card.exportGamezip') }}</DropdownMenuItem>
              <DropdownMenuItem @select="exportAs(g, 'json')"><FileJson />{{ t('home.card.exportJson') }}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" @select="remove(g)"><Trash2 />{{ t('home.card.delete') }}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
    </TransitionGroup>

    <p class="footnote">
      <Download class="size-4" />{{ t('home.footnote') }}
    </p>
    <p v-if="version" class="version">{{ t('home.version', { version }) }}</p>
  </main>
</template>

<style scoped>
.home {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px 40px;
}
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: clamp(40px, 9vh, 96px) 0 clamp(28px, 5vh, 48px);
  text-align: center;
}
.locale {
  position: absolute;
  top: 16px;
  right: 0;
}
.hero-title {
  margin: 0;
  font-size: clamp(64px, 11vw, 150px);
  line-height: 0.9;
}
.hero-sub {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(18px, 2vw, 24px);
  color: var(--muted-foreground);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
}
.notice {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 48px 24px;
  border-radius: 22px;
  text-align: center;
}
.games {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 360px));
  justify-content: center;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.game {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border-radius: 22px;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.game:hover {
  transform: translateY(-4px);
  box-shadow: 0 0 0 1px color-mix(in oklch, var(--gold) 50%, transparent), 0 30px 60px -30px oklch(0.05 0.1 280 / 0.95);
}
.thumb {
  position: relative;
  display: block;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  border-radius: 14px;
}
.thumb-play {
  position: absolute;
  inset: 50% auto auto 50%;
  display: grid;
  place-items: center;
  width: 64px;
  aspect-ratio: 1;
  border-radius: 999px;
  background: var(--gold);
  color: var(--night);
  transform: translate(-50%, -50%) scale(0.6);
  opacity: 0;
  transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.4), opacity 0.2s ease;
  box-shadow: 0 10px 30px -8px oklch(0 0 0 / 0.6);
}
.game:hover .thumb-play,
.thumb:focus-visible .thumb-play {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
.info {
  display: grid;
  gap: 2px;
  padding: 0 4px;
}
.name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  line-height: 1.15;
  color: var(--gold);
}
.meta {
  margin: 0;
  font-size: 14px;
  color: var(--muted-foreground);
}
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}
.footnote {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 40px 0 0;
  font-size: 14px;
  color: var(--muted-foreground);
  text-align: center;
}
.version {
  margin: 6px 0 0;
  text-align: center;
  font-size: 12px;
  color: oklch(0.85 0.06 278 / 0.7);
}
.list-enter-active,
.list-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.list-move {
  transition: transform 0.35s ease;
}
</style>
