<script setup lang="ts">
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/vue'
import type { Theme } from '@/types'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import IconButton from '@/components/IconButton.vue'
import { makeEmptyQuestion } from '@/game/model'
import { cn } from '@/lib/utils'

const theme = defineModel<Theme>({ required: true })
defineProps<{ selected: number | null; first?: boolean; last?: boolean }>()
defineEmits<{
  (e: 'select', questionIndex: number): void
  (e: 'remove'): void
  (e: 'move', offset: -1 | 1): void
}>()

const KIND_CELL = {
  normal: '',
  auction: 'q-auction',
  'cat-in-bag': 'q-cat',
} as const

function addQuestion() {
  const last = theme.value.questions.at(-1)
  theme.value.questions.push(makeEmptyQuestion(last ? last.value + 100 : 100))
}
</script>

<template>
  <Card size="sm" class="gap-3 px-3">
    <div class="flex items-center gap-2">
      <Input v-model="theme.name" class="font-display text-base tracking-wide" placeholder="Название темы" aria-label="Название темы" />
      <IconButton label="Тему выше" :disabled="first" @click="$emit('move', -1)"><ArrowUp /></IconButton>
      <IconButton label="Тему ниже" :disabled="last" @click="$emit('move', 1)"><ArrowDown /></IconButton>
      <IconButton label="Удалить тему" @click="$emit('remove')"><Trash2 /></IconButton>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="(q, qIdx) in theme.questions"
        :key="q.id"
        :class="
          cn(
            'q-tile h-12 w-16 rounded-lg font-display text-lg font-semibold text-gold transition hover:-translate-y-0.5 hover:brightness-115',
            KIND_CELL[q.kind],
            !q.text && 'text-gold/40 italic',
            selected === qIdx && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
          )
        "
        :title="q.text || 'Пустой вопрос'"
        :aria-pressed="selected === qIdx"
        @click="$emit('select', qIdx)"
      >
        {{ q.value }}
      </button>
      <IconButton label="Добавить вопрос" variant="outline" size="icon-lg" class="h-12" @click="addQuestion">
        <Plus />
      </IconButton>
    </div>
  </Card>
</template>

<style scoped>
/* same tile as the stage board, so the editor reads as the board being built */
.q-tile {
  border: 1px solid oklch(1 0 0 / 0.16);
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.14), transparent 45%),
    linear-gradient(180deg, var(--tile), var(--tile-deep));
  box-shadow: inset 0 -3px 0 oklch(0.15 0.15 270 / 0.6);
}
.q-tile.q-auction {
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.14), transparent 45%),
    linear-gradient(180deg, oklch(0.5 0.15 70), oklch(0.32 0.12 60));
}
.q-tile.q-cat {
  background:
    linear-gradient(180deg, oklch(1 0 0 / 0.14), transparent 45%),
    linear-gradient(180deg, color-mix(in oklch, var(--magenta) 80%, black), oklch(0.3 0.16 340));
}
</style>
