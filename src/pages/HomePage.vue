<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { CircleHelp, Download, FileJson, MoreHorizontal, Package, Pencil, Play, Plus, Settings, Sparkles, Trash2, Upload, Wifi } from '@lucide/vue'
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
import { useBackup } from '@/composables/useBackup'
import { makeEmptyGame, newGameSettings } from '@/game/model'
import { prefs } from '@/prefs'
import type { GameFileFormat } from '@/io/gameFile'
import { GAME_FILE_ACCEPT, isBackupFileName } from '@/io/files'
import { findSample, loadSample as importSample } from '@/io/sample'
import { offerTour, startTour } from '@/tour/state'
import { isDesktop, pickGameFile } from '@/platform'
import StageBackdrop from '@/components/play/StageBackdrop.vue'
import MiniBoard from '@/components/MiniBoard.vue'
import { currentLocale } from '@/i18n'

// the file formats and the Wi-Fi share are only needed once a button asks for them
const gameFile = () => import('@/io/gameFile')
const ShareGameDialog = defineAsyncComponent(() => import('@/components/lan/ShareGameDialog.vue'))

const router = useRouter()
const { t } = useI18n()
const store = useGamesStore()
const { busy: restoring, restore: restoreBackup } = useBackup()
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const sampleId = computed(() => findSample(store.games)?.id)
const version = ref('')
const sharing = ref<Game | null>(null)
const shareOpen = ref(false)

function shareOverWifi(g: Game) {
  sharing.value = g
  shareOpen.value = true
}

onMounted(async () => {
  if (isDesktop) version.value = await (await import('@tauri-apps/api/app')).getVersion()
})

onMounted(() => {
  store.pruneMedia().catch(() => {})
  offerTour()
})

function failed(action: string, err: unknown) {
  toast.error(action, { description: err instanceof Error ? err.message : String(err) })
}

async function createNew() {
  try {
    const g = await store.save({ ...makeEmptyGame(), settings: newGameSettings(prefs) })
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
    const { exportGameFile } = await gameFile()
    if (await exportGameFile(g, format)) toast.success(t('home.toast.fileSaved'))
  } catch (err) {
    failed(t('home.toast.exportFailed'), err)
  }
}

async function loadSample() {
  busy.value = true
  try {
    const { replaced } = await importSample(store)
    toast.success(t('home.toast.sampleLoaded'), replaced ? { description: t('home.toast.sampleReplaced') } : undefined)
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
  if (isBackupFileName(file.name)) return restoreBackup(file)
  busy.value = true
  try {
    const { importGameFileWithNotes } = await gameFile()
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
    <header class="hero" data-tauri-drag-region>
      <div class="locale" data-tour="home-tools">
        <Button variant="ghost" size="icon" :aria-label="t('tour.restart')" :title="t('tour.restart')" data-tour="help" @click="startTour()"><CircleHelp /></Button>
        <Button variant="ghost" size="icon" :aria-label="t('prefs.open')" :title="t('prefs.open')" @click="router.push({ name: 'settings' })"><Settings /></Button>
      </div>
      <h1 class="title-shine hero-title">{{ t('system.appName') }}</h1>
      <p class="hero-sub">{{ t('home.subtitle') }}</p>
      <div class="actions" data-tour="home-actions">
        <Button size="lg" class="h-12 px-6 text-base" @click="createNew"><Plus />{{ t('home.newGame') }}</Button>
        <Button size="lg" variant="outline" class="h-12 px-6 text-base" :disabled="busy || restoring" @click="startImport"><Upload />{{ t('home.import') }}</Button>
        <Button size="lg" variant="ghost" class="h-12 px-6 text-base" :disabled="busy || restoring" @click="loadSample"><Sparkles />{{ t('home.openSample') }}</Button>
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
      <li v-for="g in store.games" :key="g.id" class="game glass" :data-tour="g.id === sampleId ? 'game-card' : undefined">
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
          <Button size="sm" @click="router.push({ name: 'play', params: { id: g.id } })"><Play />{{ t('home.card.play') }}</Button>
          <Button size="sm" variant="secondary" @click="router.push({ name: 'editor', params: { id: g.id } })"><Pencil />{{ t('home.card.edit') }}</Button>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon-sm" :aria-label="t('home.card.moreActions')"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="min-w-52">
              <DropdownMenuItem @select="exportAs(g, 'gamezip')"><Package />{{ t('home.card.exportGamezip') }}</DropdownMenuItem>
              <DropdownMenuItem @select="exportAs(g, 'json')"><FileJson />{{ t('home.card.exportJson') }}</DropdownMenuItem>
              <DropdownMenuItem v-if="isDesktop" @select="shareOverWifi(g)"><Wifi />{{ t('lan.share.menu') }}</DropdownMenuItem>
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
    <ShareGameDialog v-if="isDesktop" v-model:open="shareOpen" :game="sharing" />
  </main>
</template>

<style scoped>
.home {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1120px;
  height: 100dvh;
  margin: 0 auto;
  padding: 0 24px clamp(10px, 2.5vh, 24px);
}
.home > * {
  flex: none;
}
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(4px, 1.4vh, 14px);
  padding: clamp(28px, 7vh, 96px) 0 clamp(14px, 4vh, 48px);
  text-align: center;
}
.locale {
  position: absolute;
  top: 16px;
  right: 0;
  display: flex;
  gap: 4px;
}
.hero-title {
  margin: 0;
  font-size: clamp(48px, min(11vw, 15vh), 150px);
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
  margin-top: clamp(4px, 1.4vh, 14px);
}
.notice {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 48px 24px;
  border-radius: 22px;
  text-align: center;
}
.home > .games {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  align-content: start;
  /* room for the hover lift and shadow, which overflow would otherwise clip */
  padding: 6px 6px 20px;
}
.games {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 300px));
  justify-content: center;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.game {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border-radius: 18px;
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
.thumb :deep(.mini) {
  max-height: min(150px, 20vh);
}
@media (max-height: 700px) {
  .hero-sub {
    display: none;
  }
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
  font-size: 20px;
  font-weight: 500;
  line-height: 1.15;
  color: var(--gold);
}
.meta {
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.buttons {
  display: flex;
  gap: 6px;
  margin-top: auto;
}
.footnote {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: clamp(8px, 2.5vh, 40px) 0 0;
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
