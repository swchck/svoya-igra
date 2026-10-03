<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Printer } from '@lucide/vue'
import type { Game, MediaItem, Question } from '@/types'
import { Button } from '@/components/ui/button'
import { getGame } from '@/storage'
import { formatTime, segmentOf } from '@/media/segment'
import MarkdownView from '@/components/MarkdownView.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { t } = useI18n()

const game = ref<Game | null>(null)
getGame(props.id).then((g) => {
  if (!g) return router.replace({ name: 'home' })
  game.value = g
})

function mediaNote(m: MediaItem): string {
  const label = m.kind === 'youtube' && m.mode === 'audio' ? t('print.media.youtubeAudio') : t(`print.media.${m.kind}`)
  if (m.kind === 'image') return label
  const { start, end } = segmentOf(m)
  if (end !== undefined) return t('print.media.range', { label, start: formatTime(start), end: formatTime(end) })
  return start > 0 ? t('print.media.from', { label, start: formatTime(start) }) : label
}

const print = () => window.print()

function notes(items?: MediaItem[]): string {
  return (items ?? []).map(mediaNote).join(', ')
}

function kindLabel(q: Question): string {
  if (q.kind === 'auction') return t('print.kind.auction')
  if (q.kind === 'cat-in-bag') return t('print.kind.catInBag', { n: q.catValue ?? q.value })
  return ''
}
</script>

<template>
  <div v-if="game" class="page">
    <div class="toolbar">
      <Button variant="ghost" @click="router.push({ name: 'editor', params: { id } })"><ArrowLeft />{{ t('print.back') }}</Button>
      <span class="toolbar-title">{{ t('print.title') }}</span>
      <Button @click="print"><Printer />{{ t('print.print') }}</Button>
    </div>

    <main class="sheet">
      <header class="head">
        <h1>{{ game.title }}</h1>
        <p v-if="game.subtitle" class="subtitle">{{ game.subtitle }}</p>
        <p class="doc-title">{{ t('print.title') }}</p>
      </header>

      <section v-for="(round, ri) in game.rounds" :key="round.id" class="round" :class="{ first: ri === 0 }">
        <h2>{{ round.name }}</h2>
        <section v-for="theme in round.themes" :key="theme.id" class="theme">
          <h3>{{ theme.name }}</h3>
          <ol class="rows">
            <li v-for="q in theme.questions" :key="q.id" class="row">
              <span class="val">{{ q.value }}</span>
              <div class="q">
                <p v-if="kindLabel(q)" class="tag">{{ kindLabel(q) }}</p>
                <MarkdownView v-if="q.text.trim()" class="md" :source="q.text" />
                <p v-else-if="!q.media?.length" class="empty">{{ t('print.noText') }}</p>
                <p v-if="q.media?.length" class="media">{{ t('print.mediaPrefix') }}: {{ notes(q.media) }}</p>
              </div>
              <div class="a">
                <MarkdownView v-if="q.answer.trim()" class="md" :source="q.answer" />
                <p v-else-if="!q.answerMedia?.length" class="empty">{{ t('print.noAnswer') }}</p>
                <p v-if="q.answerMedia?.length" class="media">{{ t('print.mediaPrefix') }}: {{ notes(q.answerMedia) }}</p>
              </div>
            </li>
          </ol>
        </section>
      </section>

      <section v-if="game.finalRound" class="round final">
        <h2>{{ t('print.final') }}</h2>
        <section class="theme">
          <h3>{{ game.finalRound.theme }}</h3>
          <ol class="rows">
            <li class="row">
              <span class="val" aria-hidden="true">★</span>
              <div class="q">
                <MarkdownView v-if="game.finalRound.text.trim()" class="md" :source="game.finalRound.text" />
                <p v-else class="empty">{{ t('print.noText') }}</p>
                <p v-if="game.finalRound.media?.length" class="media">{{ t('print.mediaPrefix') }}: {{ notes(game.finalRound.media) }}</p>
              </div>
              <div class="a">
                <MarkdownView v-if="game.finalRound.answer.trim()" class="md" :source="game.finalRound.answer" />
                <p v-else class="empty">{{ t('print.noAnswer') }}</p>
                <p v-if="game.finalRound.answerMedia?.length" class="media">{{ t('print.mediaPrefix') }}: {{ notes(game.finalRound.answerMedia) }}</p>
              </div>
            </li>
          </ol>
        </section>
      </section>
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
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
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
.sheet {
  width: min(900px, 100%);
  margin: 20px auto 40px;
  padding: 28px 32px 36px;
  background: #fff;
  box-shadow: 0 8px 30px oklch(0.2 0.1 270 / 0.25);
  font-size: 13px;
  line-height: 1.4;
}
.head {
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 2px solid #1b1d2a;
}
.head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.subtitle {
  margin: 0;
  color: #555a70;
}
.doc-title {
  margin: 2px 0 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6a6f86;
}
.round + .round {
  margin-top: 22px;
}
.round h2 {
  margin: 0 0 8px;
  padding: 3px 8px;
  background: #1b1d2a;
  color: #fff;
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.theme {
  margin-bottom: 10px;
  break-inside: avoid;
}
.theme h3 {
  margin: 0;
  padding: 2px 0;
  border-bottom: 1px solid #1b1d2a;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 10px;
  padding: 4px 0;
  border-bottom: 1px solid #d4d6e0;
  break-inside: avoid;
}
.val {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  color: #6a4f00;
}
.q,
.a {
  min-width: 0;
}
.a {
  padding-left: 10px;
  border-left: 2px solid #1b1d2a;
  font-weight: 700;
}
.md :deep(p),
.md :deep(ul),
.md :deep(ol),
.md :deep(blockquote) {
  margin: 0 0 0.25em;
}
.md :deep(ul),
.md :deep(ol) {
  padding-left: 1.2em;
}
.md :deep(ul) { list-style: disc; }
.md :deep(ol) { list-style: decimal; }
.md :deep(:last-child) {
  margin-bottom: 0;
}
.q .md {
  font-family: var(--font-serif);
}
.tag {
  display: inline-block;
  margin: 0 0 2px;
  padding: 0 6px;
  border: 1px solid #1b1d2a;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.media {
  margin: 2px 0 0;
  font-size: 11.5px;
  font-style: italic;
  font-weight: 400;
  color: #555a70;
}
.empty {
  margin: 0;
  color: #8a8fa5;
  font-style: italic;
  font-weight: 400;
}
.final .val {
  color: #1b1d2a;
}

@media (max-width: 640px) {
  .sheet {
    padding: 18px 14px 24px;
  }
  .row {
    grid-template-columns: 38px minmax(0, 1fr);
  }
  .a {
    grid-column: 2;
    padding-left: 8px;
  }
}

@media print {
  .page {
    background: #fff;
  }
  .toolbar {
    display: none;
  }
  .sheet {
    width: 100%;
    margin: 0;
    padding: 0;
    box-shadow: none;
    font-size: 10.5pt;
  }
  .round:not(.first) {
    break-before: page;
    margin-top: 0;
  }
  .row {
    grid-template-columns: 44px minmax(0, 1.5fr) minmax(0, 1fr);
  }
  .a {
    grid-column: auto;
  }
}
</style>

<style>
@page {
  margin: 12mm;
}
@media print {
  body {
    background: #fff !important;
  }
}
</style>
