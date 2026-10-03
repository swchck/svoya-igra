<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Archive, Cat, Download, Globe, RefreshCw, Save, WifiOff } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import StageBackdrop from '@/components/play/StageBackdrop.vue'
import LiveBoard from './components/LiveBoard.vue'
import GithubMark from './components/GithubMark.vue'
import iconUrl from '../../assets/app-icon.svg'
import DownloadButton from './components/DownloadButton.vue'
import { APP_URL, DOWNLOADS, downloadUrl, isAvailable, latestRelease, loadLatestRelease, RELEASES_URL, REPO_URL } from './downloads'

onMounted(loadLatestRelease)
const released = computed(() => DOWNLOADS.some(isAvailable))

// words stay whole when the title wraps; letters drop in one after another across both
const TITLE = 'Своя игра'.split(' ').map((word, w, all) => {
  const offset = all.slice(0, w).join('').length
  return [...word].map((ch, i) => ({ ch, delay: (offset + i) * 55 }))
})

const SHOWCASE = [
  {
    id: 'editor',
    title: 'Редактор в виде табло',
    text: 'Игра собирается на том же табло, что увидят игроки. Нажмите на клетку, и рядом откроется вопрос: текст, ответ, картинки, звук и видео. Темы и вопросы перетаскиваются мышью, правки сохраняются сразу.',
    alt: 'Редактор: табло раунда и открытый вопрос',
  },
  {
    id: 'board',
    title: 'Сцена для зрителей',
    text: 'Табло разворачивается на весь экран или проектор. Выбранная клетка вылетает в вопрос, а счёт игроков внизу обновляется, как только ведущий засчитает ответ.',
    alt: 'Табло раунда со счётом игроков',
  },
  {
    id: 'question',
    title: 'Картинки, звук и YouTube',
    text: 'К вопросу и к ответу можно прикрепить файлы с диска или ссылки. Ролик с YouTube идёт как видео или только звуком. У звука и видео задаётся отрезок, например с 0:30 по 1:15. Длинный вопрос уменьшается, чтобы поместиться на экран.',
    alt: 'Вопрос с картинками на экране для зрителей',
  },
  {
    id: 'host',
    title: 'Пульт ведущего',
    text: 'Во втором окне ведущий видит правильный ответ, выбирает вопросы, включает звук и видео и засчитывает ответы. Пока пульт открыт, на сцене нет ни одной кнопки.',
    alt: 'Окно ведущего с вопросом и правильным ответом',
  },
]

const FACTS = [
  { icon: Cat, title: 'Аукцион и кот в мешке', text: 'На аукционе игрок ставит до всего своего счёта, кота ведущий отдаёт другому игроку. В финале каждый делает ставку.' },
  { icon: Save, title: 'Партия не потеряется', text: 'Счёт пишется после каждого хода. Если закрыть окно посреди игры, в следующий раз можно продолжить с того же места.' },
  { icon: WifiOff, title: 'Без интернета и аккаунта', text: 'Игры хранятся у вас. Сеть нужна только для YouTube и медиа по ссылкам.' },
  { icon: Archive, title: 'Игра в одном файле', text: 'Экспорт в .gamezip забирает вопросы вместе с медиа. Двойной клик по файлу откроет игру в приложении.' },
]

const STEPS = [
  { title: 'Соберите игру', text: 'Создайте новую или откройте пример. Заполните темы, вопросы и ответы.' },
  { title: 'Выведите на экран', text: 'Нажмите «Играть» и разверните сцену. Кнопка «Окно ведущего» откроет пульт для второго монитора.' },
  { title: 'Ведите', text: 'Выбирайте вопросы, показывайте ответы и отмечайте, кто ответил верно. После финала на экране появятся итоги.' },
]

const FAQ = [
  {
    q: 'Чем онлайн-версия отличается от приложения?',
    a: 'Это то же приложение, только в браузере. Игры хранятся в этом браузере: если очистить данные сайта, они пропадут, поэтому важные игры сохраняйте в .gamezip. Пульт ведущего открывается отдельным окном браузера. Открыть .gamezip двойным кликом можно только в установленном приложении.',
  },
  {
    q: 'macOS пишет, что не может проверить разработчика',
    a: 'У приложения нет подписи Apple, поэтому macOS спрашивает разрешения при первом запуске. Откройте «Системные настройки», раздел «Конфиденциальность и безопасность», и нажмите «Всё равно открыть». Если macOS называет приложение повреждённым, выполните в Терминале: xattr -dr com.apple.quarantine "/Applications/Своя Игра.app"',
  },
  {
    q: 'Windows показывает окно SmartScreen',
    a: 'У установщика нет платной подписи, поэтому Windows его не узнаёт. Нажмите «Подробнее», затем «Выполнить в любом случае».',
  },
  {
    q: 'Как запустить AppImage на Linux?',
    a: 'Сделайте файл исполняемым командой chmod +x Svoya-Igra_Linux-x64.AppImage и запустите его. Устанавливать ничего не нужно.',
  },
  {
    q: 'Где хранятся мои игры?',
    a: 'В данных приложения на вашем компьютере. Чтобы перенести игру или отправить её другому ведущему, экспортируйте её в файл .gamezip.',
  },
  {
    q: 'Сколько это стоит?',
    a: 'Нисколько. Приложение бесплатное, исходный код открыт на GitHub.',
  },
]
</script>

<template>
  <StageBackdrop />
  <div class="relative z-10 overflow-x-hidden">
    <header class="sticky top-0 z-20 border-b border-white/10 bg-[oklch(0.18_0.13_272/0.7)] backdrop-blur-md">
      <nav class="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-5">
        <a href="#" class="flex items-center gap-2">
          <img :src="iconUrl" alt="" class="size-8" />
          <span class="font-display text-lg tracking-wide text-gold uppercase">Своя игра</span>
        </a>
        <div class="hidden flex-1 items-center gap-5 text-sm text-muted-foreground md:flex">
          <a href="#features" class="hover:text-foreground">Возможности</a>
          <a href="#how" class="hover:text-foreground">Как играть</a>
          <a href="#download" class="hover:text-foreground">Скачать</a>
          <a href="#faq" class="hover:text-foreground">Вопросы</a>
        </div>
        <div class="flex-1 md:hidden" />
        <Button as-child variant="ghost" size="sm">
          <a :href="APP_URL"><Globe class="size-4" />Онлайн</a>
        </Button>
        <Button as-child variant="ghost" size="sm" class="hidden sm:inline-flex">
          <a :href="REPO_URL" target="_blank" rel="noopener"><GithubMark class="size-4" />GitHub</a>
        </Button>
      </nav>
    </header>

    <main>
      <section class="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pt-14 pb-20 sm:px-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:pt-20">
        <div class="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <h1 class="hero-title" aria-label="Своя игра">
            <span v-for="(word, w) in TITLE" :key="w" class="word" aria-hidden="true">
              <span v-for="(l, i) in word" :key="i" class="letter" :style="{ animationDelay: `${l.delay}ms` }">{{ l.ch }}</span>
            </span>
          </h1>
          <p class="lede max-w-xl font-serif text-xl leading-relaxed text-foreground/90 sm:text-2xl">
            Соберите свою игру с картинками, музыкой и роликами с YouTube и проведите её на большом экране.
          </p>
          <div class="lede flex flex-col flex-wrap items-center justify-center gap-3 sm:flex-row sm:items-start lg:justify-start">
            <DownloadButton />
            <Button as-child size="lg" variant="secondary" class="glass h-12 px-6 text-base">
              <a :href="APP_URL"><Globe />Открыть в браузере</a>
            </Button>
          </div>
        </div>
        <figure class="m-0 flex flex-col gap-3">
          <LiveBoard />
          <figcaption class="text-center text-sm text-muted-foreground">Табло настоящее: нажмите на любую стоимость.</figcaption>
        </figure>
      </section>

      <section id="features" class="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-5">
        <h2 class="title-gold mb-14 text-center text-4xl sm:text-5xl">Что умеет приложение</h2>
        <div class="flex flex-col gap-20">
          <article
            v-for="(s, i) in SHOWCASE"
            :key="s.id"
            class="grid items-center gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
          >
            <div class="flex flex-col gap-3" :class="{ 'lg:order-2': i % 2 }">
              <h3 class="font-display text-3xl tracking-wide text-gold uppercase">{{ s.title }}</h3>
              <p class="max-w-prose text-lg leading-relaxed text-foreground/80">{{ s.text }}</p>
            </div>
            <figure class="screen m-0">
              <img :src="`screens/${s.id}.webp`" :alt="s.alt" width="1600" height="1000" loading="lazy" class="block w-full" />
            </figure>
          </article>
        </div>
      </section>

      <section class="mx-auto max-w-6xl px-4 py-16 sm:px-5">
        <ul class="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          <li v-for="f in FACTS" :key="f.title" class="flex gap-4">
            <span class="fact-icon"><component :is="f.icon" class="size-5" /></span>
            <div>
              <h3 class="mb-1 font-display text-xl tracking-wide uppercase">{{ f.title }}</h3>
              <p class="leading-relaxed text-muted-foreground">{{ f.text }}</p>
            </div>
          </li>
        </ul>
      </section>

      <section id="how" class="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-5">
        <h2 class="title-gold mb-10 text-center text-4xl sm:text-5xl">Как играть</h2>
        <ol class="grid gap-4 md:grid-cols-3">
          <li v-for="(step, i) in STEPS" :key="step.title" class="glass flex gap-4 rounded-2xl p-6">
            <span class="step-num">{{ i + 1 }}</span>
            <div>
              <h3 class="mb-1 font-display text-xl tracking-wide uppercase">{{ step.title }}</h3>
              <p class="text-muted-foreground">{{ step.text }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section id="download" class="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-5">
        <h2 class="title-gold mb-3 text-center text-4xl sm:text-5xl">Скачать</h2>
        <p class="mb-10 text-center text-muted-foreground">
          <template v-if="latestRelease && released">Версия {{ latestRelease.version }}, вышла {{ latestRelease.date }}.</template>
          <template v-else-if="latestRelease !== undefined">Первая версия ещё не опубликована.</template>
          Когда выйдет новая версия, приложение предложит обновиться.
        </p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <template v-for="d in DOWNLOADS" :key="d.id">
            <a v-if="isAvailable(d)" :href="downloadUrl(d)" class="platform group">
              <Download class="size-6 shrink-0 text-gold transition group-hover:translate-y-0.5" />
              <span class="flex flex-col">
                <span class="font-medium">{{ d.label }}</span>
                <span class="text-sm text-muted-foreground">{{ d.hint }}</span>
              </span>
            </a>
            <div v-else class="platform opacity-50" aria-disabled="true">
              <Download class="size-6 shrink-0" />
              <span class="flex flex-col">
                <span class="font-medium">{{ d.label }}</span>
                <span class="text-sm text-muted-foreground">ещё не собрано</span>
              </span>
            </div>
          </template>
          <a :href="APP_URL" class="platform online group sm:col-span-2 lg:col-span-3">
            <Globe class="size-6 shrink-0 text-cyan transition group-hover:rotate-12" />
            <span class="flex flex-col">
              <span class="font-medium">Онлайн-версия</span>
              <span class="text-sm text-muted-foreground">Ничего не нужно устанавливать. Игры хранятся в этом браузере.</span>
            </span>
          </a>
        </div>
        <p class="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw class="size-4" />Все версии и списки изменений
          <a :href="RELEASES_URL" class="text-gold underline-offset-4 hover:underline">на GitHub</a>
        </p>
      </section>

      <section id="faq" class="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:px-5">
        <h2 class="title-gold mb-8 text-center text-4xl sm:text-5xl">Вопросы</h2>
        <Accordion type="single" collapsible class="glass rounded-2xl px-5">
          <AccordionItem v-for="(item, i) in FAQ" :key="i" :value="String(i)">
            <AccordionTrigger class="text-left text-base">{{ item.q }}</AccordionTrigger>
            <AccordionContent class="leading-relaxed text-muted-foreground">{{ item.a }}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </main>

    <footer class="border-t border-white/10 bg-[oklch(0.14_0.1_274/0.6)]">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-sm text-muted-foreground sm:px-5">
        <span class="flex items-center gap-2"><img :src="iconUrl" alt="" class="size-5" />Своя игра</span>
        <a :href="APP_URL" class="hover:text-foreground">Онлайн-версия</a>
        <span class="flex-1" />
        <a :href="REPO_URL" class="hover:text-foreground">Исходный код на GitHub</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.hero-title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-size: clamp(64px, 11vw, 132px);
  line-height: 0.92;
  filter: drop-shadow(0 8px 26px oklch(0.1 0.12 274 / 0.75));
}
.word {
  display: inline-block;
  white-space: nowrap;
  margin-right: 0.22em;
}
.letter {
  display: inline-block;
  background: linear-gradient(180deg, oklch(0.98 0.07 95) 0%, var(--gold) 45%, var(--gold-deep) 100%);
  background-clip: text;
  color: transparent;
  white-space: pre;
  animation: drop 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.3) both;
}
.lede {
  animation: fade-up 0.6s 0.6s ease-out both;
}
.screen {
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid oklch(1 0 0 / 0.14);
  box-shadow:
    0 0 0 6px oklch(0.2 0.14 272 / 0.45),
    0 40px 80px -36px oklch(0.05 0.12 280);
}
.fact-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(180deg, var(--tile), var(--tile-deep));
  border: 1px solid color-mix(in oklch, var(--gold) 45%, transparent);
  color: var(--gold);
}
.step-num {
  font-family: var(--font-display);
  font-size: 56px;
  line-height: 0.9;
  font-weight: 700;
  background: linear-gradient(180deg, oklch(0.98 0.07 95), var(--gold) 45%, var(--gold-deep));
  background-clip: text;
  color: transparent;
}
.platform {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid oklch(1 0 0 / 0.12);
  background: oklch(0.2 0.14 272 / 0.62);
  backdrop-filter: blur(14px);
  transition: border-color 0.15s ease, background 0.15s ease;
}
a.platform:hover {
  border-color: var(--gold);
  background: oklch(0.26 0.17 272 / 0.75);
}
.platform.online {
  border-color: color-mix(in oklch, var(--cyan) 35%, transparent);
}
a.platform.online:hover {
  border-color: var(--cyan);
}
@keyframes drop {
  0% { opacity: 0; transform: translateY(-0.6em) rotate(-8deg) scale(1.3); }
  100% { opacity: 1; transform: none; }
}
@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
}
@media (prefers-reduced-motion: reduce) {
  .letter, .lede { animation: none; }
}
</style>
