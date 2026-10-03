<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Download, FileJson, MoreHorizontal, Package, Pencil, Play, Plus, Sparkles, Trash2, Upload } from '@lucide/vue'
import type { Game } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { exportGameFile, GAME_FILE_ACCEPT, importGameFile, importSampleGame, type GameFileFormat } from '@/io/gameFile'
import { isDesktop, pickGameFile } from '@/platform'

const router = useRouter()
const store = useGamesStore()
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const SAMPLE_TITLE = 'Своя игра — 1996 и не только'
const version = ref('')

onMounted(async () => {
  if (isDesktop) version.value = await (await import('@tauri-apps/api/app')).getVersion()
})

// no editor is open while the library is on screen, so unsaved attachments can't be lost
onMounted(() => {
  store.pruneMedia().catch(() => {})
})

function failed(action: string, err: unknown) {
  toast.error(action, { description: err instanceof Error ? err.message : String(err) })
}

async function createNew() {
  try {
    const g = await store.save(makeEmptyGame('Своя Игра'))
    router.push({ name: 'editor', params: { id: g.id } })
  } catch (err) {
    failed('Не удалось создать игру', err)
  }
}

async function remove(g: Game) {
  const ok = await confirmAction({
    title: `Удалить «${g.title || 'Без названия'}»?`,
    description: 'Игра и все её файлы будут удалены без возможности восстановления.',
    confirmLabel: 'Удалить',
    destructive: true,
  })
  if (!ok) return
  try {
    await store.remove(g.id)
    toast.success('Игра удалена')
  } catch (err) {
    failed('Не удалось удалить игру', err)
  }
}

async function exportAs(g: Game, format: GameFileFormat) {
  try {
    if (await exportGameFile(g, format)) toast.success('Файл сохранён')
  } catch (err) {
    failed('Ошибка экспорта', err)
  }
}

async function loadSample() {
  busy.value = true
  try {
    const previous = store.games.filter((g) => g.title === SAMPLE_TITLE)
    // save before removing: removal prunes media, and the new copy's files must be referenced by then
    await store.save(await importSampleGame())
    for (const old of previous) await store.remove(old.id)
    toast.success('Пример загружен', previous.length ? { description: 'Предыдущая копия заменена' } : undefined)
  } catch (err) {
    failed('Не удалось загрузить пример', err)
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
    failed('Не удалось открыть файл', err)
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
    const game = await store.save(await importGameFile(file))
    toast.success('Игра импортирована', { description: game.title })
  } catch (err) {
    failed('Не удалось импортировать', err)
  } finally {
    busy.value = false
  }
}

function questionCount(g: Game) {
  return g.rounds.reduce((n, r) => n + r.themes.reduce((m, t) => m + t.questions.length, 0), 0)
}

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <main class="mx-auto w-full max-w-5xl px-6 py-10">
    <header class="py-12 text-center">
      <h1 class="title-gold text-7xl leading-none sm:text-8xl">Своя игра</h1>
      <p class="mt-4 font-serif text-lg text-muted-foreground italic">Конструктор и проигрыватель</p>
    </header>

    <div class="mb-8 flex flex-wrap justify-center gap-3">
      <Button size="lg" @click="createNew"><Plus />Новая игра</Button>
      <Button size="lg" variant="outline" :disabled="busy" @click="startImport"><Upload />Импорт</Button>
      <Button size="lg" variant="ghost" :disabled="busy" @click="loadSample"><Sparkles />Пример (1996)</Button>
      <input ref="fileInput" type="file" class="hidden" :accept="GAME_FILE_ACCEPT" @change="onFile" />
    </div>

    <Card v-if="store.loadError" class="items-center px-6 text-center text-destructive">
      Не удалось открыть библиотеку игр: {{ store.loadError.message }}
    </Card>

    <Card v-else-if="store.games.length === 0" class="items-center gap-2 px-6 py-12 text-center">
      <p class="font-display text-2xl text-gold uppercase">Игр пока нет</p>
      <p class="text-muted-foreground">Создайте первую или откройте пример, чтобы посмотреть, как всё устроено.</p>
    </Card>

    <ul v-else class="flex flex-col gap-3">
      <li v-for="g in store.games" :key="g.id">
        <Card class="flex-row flex-wrap items-center gap-4 px-5 py-4">
          <div class="min-w-56 flex-1">
            <h2 class="font-display text-2xl font-medium text-gold">{{ g.title || 'Без названия' }}</h2>
            <p class="text-sm text-muted-foreground">
              {{ g.rounds.length }} {{ plural(g.rounds.length, 'раунд', 'раунда', 'раундов') }} ·
              {{ questionCount(g) }} {{ plural(questionCount(g), 'вопрос', 'вопроса', 'вопросов') }}
              <template v-if="g.finalRound"> · финал</template>
              · изменена {{ fmtDate(g.updatedAt) }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button @click="router.push({ name: 'play', params: { id: g.id } })"><Play />Играть</Button>
            <Button variant="secondary" @click="router.push({ name: 'editor', params: { id: g.id } })">
              <Pencil />Редактировать
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" aria-label="Ещё действия"><MoreHorizontal /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="min-w-52">
                <DropdownMenuItem @select="exportAs(g, 'gamezip')"><Package />Экспорт .gamezip</DropdownMenuItem>
                <DropdownMenuItem @select="exportAs(g, 'json')"><FileJson />Экспорт JSON</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" @select="remove(g)"><Trash2 />Удалить</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      </li>
    </ul>

    <p class="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Download class="size-4" />Игры хранятся на этом компьютере. Для переноса используйте экспорт в .gamezip.
    </p>
    <p v-if="version" class="mt-2 text-center text-xs text-muted-foreground/70">Версия {{ version }}</p>
  </main>
</template>
