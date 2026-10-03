<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  Clapperboard,
  Download,
  FileArchive,
  Gavel,
  LayoutGrid,
  MonitorSmartphone,
  RefreshCw,
  Save,
  Sparkles,
  WifiOff,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import BoardMock from './components/BoardMock.vue'
import GithubMark from './components/GithubMark.vue'
import iconUrl from '../../assets/app-icon.svg'
import DownloadButton from './components/DownloadButton.vue'
import { DOWNLOADS, downloadUrl, isAvailable, latestRelease, loadLatestRelease, RELEASES_URL, REPO_URL } from './downloads'

onMounted(loadLatestRelease)
const released = computed(() => DOWNLOADS.some(isAvailable))

const FEATURES = [
  {
    icon: LayoutGrid,
    title: 'Редактор раундов',
    text: 'Раунды, темы, вопросы и финал. Стоимость, типы вопросов, перестановка — всё в одном окне, сохраняется само.',
  },
  {
    icon: Clapperboard,
    title: 'Картинки, звук, видео',
    text: 'Несколько медиа к вопросу и к ответу. Файлы с диска или ссылки, YouTube — как видео или только звук, с ограничением по времени.',
  },
  {
    icon: Gavel,
    title: 'Аукцион и кот в мешке',
    text: 'Ставки до ва-банка, передача вопроса другому игроку, финал со ставками — правила считаются сами.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Окно ведущего',
    text: 'Сцена — на проекторе, пульт с ответами и управлением — на ноутбуке. Зрители видят только то, что нужно.',
  },
  {
    icon: Save,
    title: 'Партия не потеряется',
    text: 'Счёт и сыгранные вопросы сохраняются по ходу игры. Закрыли окно — продолжите с того же места.',
  },
  {
    icon: WifiOff,
    title: 'Без интернета и аккаунтов',
    text: 'Игры хранятся на вашем компьютере. Сеть нужна только для YouTube.',
  },
]

const STEPS = [
  { title: 'Соберите', text: 'Создайте игру или откройте пример. Добавьте вопросы, ответы и медиа.' },
  { title: 'Выведите на экран', text: '«Играть» — и сцена на весь экран. Окно ведущего откроется рядом.' },
  { title: 'Ведите', text: 'Выбирайте вопросы, открывайте ответы, начисляйте очки. Итоги посчитаются сами.' },
]

const SCREENS = [
  { id: 'board', label: 'Табло', alt: 'Табло раунда с темами и стоимостями вопросов' },
  { id: 'question', label: 'Вопрос', alt: 'Вопрос с картинками на экране для зрителей' },
  { id: 'host', label: 'Ведущий', alt: 'Окно ведущего с вопросом и правильным ответом' },
  { id: 'editor', label: 'Редактор', alt: 'Редактор: темы, вопросы и медиа' },
]

const FAQ = [
  {
    q: 'macOS пишет, что не может проверить разработчика',
    a: 'Приложение не подписано сертификатом Apple. Откройте «Системные настройки → Конфиденциальность и безопасность» и нажмите «Всё равно открыть». Если система говорит, что приложение повреждено, выполните в терминале: xattr -dr com.apple.quarantine "/Applications/Своя Игра.app".',
  },
  {
    q: 'Windows показывает предупреждение SmartScreen',
    a: 'Нажмите «Подробнее», затем «Выполнить в любом случае». Предупреждение появляется, потому что у установщика нет коммерческой подписи.',
  },
  {
    q: 'Где хранятся мои игры?',
    a: 'На вашем компьютере, внутри приложения. Чтобы перенести игру или поделиться ею, экспортируйте её в файл .gamezip — двойной клик по нему откроет игру на другом компьютере.',
  },
  {
    q: 'Нужен ли интернет?',
    a: 'Нет. Картинки, звук и видео с диска хранятся внутри игры. Интернет нужен только для вопросов с YouTube.',
  },
  {
    q: 'Сколько это стоит?',
    a: 'Нисколько. Исходный код открыт на GitHub.',
  },
]
</script>

<template>
  <div class="relative overflow-x-hidden">
    <header class="sticky top-0 z-20 border-b border-white/10 bg-[oklch(0.25_0.17_268/0.75)] backdrop-blur">
      <nav class="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
        <a href="#" class="flex items-center gap-2">
          <img :src="iconUrl" alt="" class="size-8" />
          <span class="font-display text-lg tracking-wide text-gold uppercase">Своя игра</span>
        </a>
        <div class="hidden flex-1 items-center gap-5 text-sm text-muted-foreground md:flex">
          <a href="#features" class="hover:text-foreground">Возможности</a>
          <a href="#how" class="hover:text-foreground">Как это работает</a>
          <a href="#download" class="hover:text-foreground">Скачать</a>
          <a href="#faq" class="hover:text-foreground">Вопросы</a>
        </div>
        <div class="flex-1 md:hidden" />
        <Button as-child variant="ghost" size="sm">
          <a :href="REPO_URL" target="_blank" rel="noopener"><GithubMark class="size-4" />GitHub</a>
        </Button>
      </nav>
    </header>

    <main>
      <section class="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 pt-16 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:pt-24">
        <div class="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <Badge variant="secondary" class="gap-1.5"><Sparkles class="size-3.5" />Для вечеринок, квизов и уроков</Badge>
          <h1 class="title-gold text-6xl leading-[0.95] sm:text-7xl lg:text-8xl">Своя игра</h1>
          <p class="max-w-xl font-serif text-xl leading-relaxed text-foreground/90 sm:text-2xl">
            Соберите собственную «Свою игру» с картинками, музыкой и YouTube — и проведите её на большом экране.
          </p>
          <DownloadButton />
        </div>
        <BoardMock />
      </section>

      <section id="features" class="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <h2 class="title-gold mb-3 text-center text-4xl sm:text-5xl">Всё для игры</h2>
        <p class="mx-auto mb-10 max-w-2xl text-center text-muted-foreground">
          От первого вопроса до итогового счёта — без таблиц, презентаций и ручного подсчёта очков.
        </p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card v-for="f in FEATURES" :key="f.title" class="gap-3 px-6">
            <div class="flex size-11 items-center justify-center rounded-xl bg-accent text-gold">
              <component :is="f.icon" class="size-5" />
            </div>
            <h3 class="font-display text-xl tracking-wide uppercase">{{ f.title }}</h3>
            <p class="leading-relaxed text-muted-foreground">{{ f.text }}</p>
          </Card>
        </div>
      </section>

      <section class="mx-auto max-w-5xl px-5 py-16">
        <Tabs default-value="board" class="flex-col items-center gap-6">
          <TabsList>
            <TabsTrigger v-for="s in SCREENS" :key="s.id" :value="s.id">{{ s.label }}</TabsTrigger>
          </TabsList>
          <TabsContent v-for="s in SCREENS" :key="s.id" :value="s.id" class="w-full">
            <figure class="overflow-hidden rounded-2xl border border-white/15 shadow-2xl shadow-black/40">
              <div class="flex gap-1.5 border-b border-white/10 bg-black/30 px-4 py-2.5" aria-hidden="true">
                <span class="size-3 rounded-full bg-white/20" /><span class="size-3 rounded-full bg-white/20" /><span
                  class="size-3 rounded-full bg-white/20"
                />
              </div>
              <img :src="`screens/${s.id}.webp`" :alt="s.alt" width="800" height="500" loading="lazy" class="block w-full" />
            </figure>
          </TabsContent>
        </Tabs>
      </section>

      <section id="how" class="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <h2 class="title-gold mb-10 text-center text-4xl sm:text-5xl">Три шага</h2>
        <ol class="grid gap-4 md:grid-cols-3">
          <li v-for="(step, i) in STEPS" :key="step.title" class="flex gap-4 rounded-xl border border-border bg-board p-6">
            <span class="font-display text-5xl leading-none text-gold">{{ i + 1 }}</span>
            <div>
              <h3 class="mb-1 font-display text-xl tracking-wide uppercase">{{ step.title }}</h3>
              <p class="text-muted-foreground">{{ step.text }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section id="download" class="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <h2 class="title-gold mb-3 text-center text-4xl sm:text-5xl">Скачать</h2>
        <p class="mb-10 text-center text-muted-foreground">
          <template v-if="latestRelease && released">Версия {{ latestRelease.version }} от {{ latestRelease.date }}.</template>
          <template v-else-if="latestRelease !== undefined">Первый выпуск скоро появится.</template>
          Приложение обновляется само.
        </p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <a
            v-for="d in DOWNLOADS"
            :key="d.id"
            :href="isAvailable(d) ? downloadUrl(d) : RELEASES_URL"
            class="group flex items-center gap-4 rounded-xl border border-border bg-board p-5 transition hover:border-gold hover:bg-accent"
          >
            <Download class="size-6 shrink-0 text-gold transition group-hover:translate-y-0.5" />
            <span class="flex flex-col">
              <span class="font-medium">{{ d.label }}</span>
              <span class="text-sm text-muted-foreground">{{ d.hint }}</span>
            </span>
          </a>
        </div>
        <p class="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw class="size-4" />Все версии и список изменений —
          <a :href="RELEASES_URL" class="text-gold underline-offset-4 hover:underline">на GitHub</a>
        </p>
      </section>

      <section id="faq" class="mx-auto max-w-3xl scroll-mt-20 px-5 py-16">
        <h2 class="title-gold mb-8 text-center text-4xl sm:text-5xl">Вопросы</h2>
        <Accordion type="single" collapsible class="rounded-xl border border-border bg-board px-5">
          <AccordionItem v-for="(item, i) in FAQ" :key="i" :value="String(i)">
            <AccordionTrigger class="text-left text-base">{{ item.q }}</AccordionTrigger>
            <AccordionContent class="leading-relaxed text-muted-foreground">{{ item.a }}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </main>

    <footer class="border-t border-white/10">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-8 text-sm text-muted-foreground">
        <span class="flex items-center gap-2"><img :src="iconUrl" alt="" class="size-5" />Своя игра</span>
        <span class="flex items-center gap-1.5"><FileArchive class="size-4" />Игры переносятся файлами .gamezip</span>
        <span class="flex-1" />
        <a :href="REPO_URL" class="hover:text-foreground">Исходный код на GitHub</a>
      </div>
    </footer>
  </div>
</template>
