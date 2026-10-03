<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
import type { Theme } from '@/types'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import IconButton from '@/components/IconButton.vue'
import { makeEmptyQuestion } from '@/game/model'
import { cn } from '@/lib/utils'

const theme = defineModel<Theme>({ required: true })
defineProps<{ selected: number | null }>()
defineEmits<{ (e: 'select', questionIndex: number): void; (e: 'remove'): void }>()

const KIND_CELL = {
  normal: '',
  auction: 'bg-accent',
  'cat-in-bag': 'bg-fuchsia-500/25',
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
      <IconButton label="Удалить тему" @click="$emit('remove')"><Trash2 /></IconButton>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="(q, qIdx) in theme.questions"
        :key="q.id"
        :class="
          cn(
            'h-12 w-16 rounded-lg border border-border bg-board font-display text-lg font-semibold text-gold transition hover:-translate-y-px',
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
