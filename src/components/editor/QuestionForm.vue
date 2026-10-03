<script setup lang="ts">
import { ArrowLeft, ArrowRight, Trash2 } from '@lucide/vue'
import type { Question } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import NumberInput from '@/components/NumberInput.vue'
import MediaList from '@/components/MediaList.vue'

const question = defineModel<Question>({ required: true })
defineProps<{ first?: boolean; last?: boolean }>()
defineEmits<{ (e: 'remove'): void; (e: 'move', offset: -1 | 1): void }>()
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
      <div class="grid gap-1.5">
        <Label>Стоимость</Label>
        <NumberInput v-model="question.value" :step="100" />
      </div>
      <div class="grid gap-1.5">
        <Label>Тип</Label>
        <Select v-model="question.kind">
          <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Обычный</SelectItem>
            <SelectItem value="auction">Вопрос-аукцион</SelectItem>
            <SelectItem value="cat-in-bag">Кот в мешке</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div v-if="question.kind === 'cat-in-bag'" class="grid gap-1.5">
        <Label>Цена «кота»</Label>
        <NumberInput v-model="question.catValue" :step="100" :placeholder="String(question.value)" />
      </div>
    </div>

    <div class="grid gap-1.5">
      <Label for="q-text">Вопрос</Label>
      <Textarea id="q-text" v-model="question.text" class="min-h-24 font-serif text-base" placeholder="Текст вопроса…" />
    </div>
    <MediaList v-model="question.media" label="Медиа к вопросу" />

    <div class="grid gap-1.5">
      <Label for="q-answer">Ответ</Label>
      <Textarea id="q-answer" v-model="question.answer" class="min-h-20 font-serif text-base" placeholder="Правильный ответ…" />
    </div>
    <MediaList v-model="question.answerMedia" label="Медиа к ответу" />

    <div class="flex flex-wrap gap-2">
      <Button variant="outline" :disabled="first" @click="$emit('move', -1)"><ArrowLeft />Левее</Button>
      <Button variant="outline" :disabled="last" @click="$emit('move', 1)">Правее<ArrowRight /></Button>
      <div class="flex-1" />
      <Button variant="destructive" @click="$emit('remove')"><Trash2 />Удалить вопрос</Button>
    </div>
  </div>
</template>
