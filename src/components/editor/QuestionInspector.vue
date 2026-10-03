<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, ArrowRight, Cat, ChevronLeft, ChevronRight, CircleHelp, Gavel, MonitorPlay, Trash2 } from '@lucide/vue'
import type { Question, QuestionKind } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import IconButton from '@/components/IconButton.vue'
import NumberInput from '@/components/NumberInput.vue'
import MediaList from '@/components/MediaList.vue'

const question = defineModel<Question>({ required: true })
defineProps<{
  themeName: string
  /** Neighbours in reading order across the board, for stepping without the mouse. */
  hasPrev: boolean
  hasNext: boolean
  first: boolean
  last: boolean
}>()
defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'move', offset: -1 | 1): void
  (e: 'remove'): void
  (e: 'preview'): void
}>()

const KINDS: { value: QuestionKind; label: string; icon: typeof Gavel; hint: string }[] = [
  { value: 'normal', label: 'Обычный', icon: CircleHelp, hint: 'Отвечает тот, кто первым нажал на кнопку.' },
  { value: 'auction', label: 'Аукцион', icon: Gavel, hint: 'Игроки торгуются. Ставка от стоимости вопроса до всего счёта.' },
  { value: 'cat-in-bag', label: 'Кот в мешке', icon: Cat, hint: 'Ведущий отдаёт вопрос другому игроку по своей цене.' },
]
const PRESETS = [100, 200, 300, 400, 500, 1000]
const kindHint = computed(() => KINDS.find((k) => k.value === question.value.kind)?.hint)
</script>

<template>
  <div class="inspector">
    <header class="head">
      <IconButton label="Предыдущий вопрос" :disabled="!hasPrev" @click="$emit('prev')"><ChevronLeft /></IconButton>
      <div class="title">
        <span class="theme">{{ themeName || 'Тема без названия' }}</span>
        <span class="value">{{ question.value }}</span>
      </div>
      <IconButton label="Следующий вопрос" :disabled="!hasNext" @click="$emit('next')"><ChevronRight /></IconButton>
    </header>

    <div class="kinds" role="radiogroup" aria-label="Тип вопроса">
      <button
        v-for="k in KINDS"
        :key="k.value"
        role="radio"
        class="kind"
        :class="[k.value, { on: question.kind === k.value }]"
        :aria-checked="question.kind === k.value"
        @click="question.kind = k.value"
      >
        <component :is="k.icon" class="size-5" />{{ k.label }}
      </button>
    </div>
    <p class="hint">{{ kindHint }}</p>

    <div class="grid gap-2">
      <Label>Стоимость</Label>
      <div class="flex flex-wrap items-center gap-2">
        <NumberInput v-model="question.value" class="w-36" :step="100" />
        <button
          v-for="p in PRESETS"
          :key="p"
          class="preset"
          :class="{ on: question.value === p }"
          @click="question.value = p"
        >{{ p }}</button>
      </div>
    </div>
    <div v-if="question.kind === 'cat-in-bag'" class="grid gap-2">
      <Label>Цена кота</Label>
      <NumberInput v-model="question.catValue" class="w-36" :step="100" :placeholder="String(question.value)" />
    </div>

    <div class="grid gap-2">
      <Label for="q-text">Вопрос</Label>
      <Textarea id="q-text" v-model="question.text" class="field font-serif text-lg" placeholder="Что увидят и услышат игроки" />
    </div>
    <MediaList v-model="question.media" label="Медиа к вопросу" />

    <div class="grid gap-2">
      <Label for="q-answer">Ответ</Label>
      <Textarea id="q-answer" v-model="question.answer" class="field answer font-display text-xl" placeholder="Правильный ответ" />
    </div>
    <MediaList v-model="question.answerMedia" label="Медиа к ответу" />

    <footer class="foot">
      <Button variant="secondary" @click="$emit('preview')"><MonitorPlay />Как на экране</Button>
      <span class="flex-1" />
      <IconButton label="Сдвинуть влево" :disabled="first" @click="$emit('move', -1)"><ArrowLeft /></IconButton>
      <IconButton label="Сдвинуть вправо" :disabled="last" @click="$emit('move', 1)"><ArrowRight /></IconButton>
      <IconButton label="Удалить вопрос" class="text-destructive" @click="$emit('remove')"><Trash2 /></IconButton>
    </footer>
  </div>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.theme {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.value {
  flex: none;
  padding: 2px 12px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--night);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
}
.kinds {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.kind {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border-radius: 14px;
  border: 1px solid oklch(1 0 0 / 0.12);
  background: oklch(0.16 0.11 274 / 0.6);
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.kind:hover {
  color: var(--foreground);
}
.kind.on {
  color: var(--night);
  border-color: transparent;
}
.kind.normal.on { background: var(--gold); }
.kind.auction.on { background: oklch(0.78 0.15 70); }
.kind.cat-in-bag.on { background: var(--magenta); color: white; }
.hint {
  margin: -8px 0 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.preset {
  height: 32px;
  min-width: 48px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid oklch(1 0 0 / 0.12);
  background: transparent;
  color: var(--muted-foreground);
  font-family: var(--font-display);
  font-size: 15px;
  cursor: pointer;
}
.preset:hover {
  color: var(--gold);
  border-color: color-mix(in oklch, var(--gold) 50%, transparent);
}
.preset.on {
  background: color-mix(in oklch, var(--gold) 18%, transparent);
  border-color: var(--gold);
  color: var(--gold);
}
.field {
  min-height: 96px;
  field-sizing: content;
}
.field.answer {
  min-height: 64px;
  color: var(--gold);
}
.foot {
  position: sticky;
  bottom: -18px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 -18px -18px;
  padding: 12px 18px;
  border-top: 1px solid oklch(1 0 0 / 0.08);
  background: oklch(0.18 0.13 272 / 0.95);
  border-radius: 0 0 20px 20px;
}
</style>
