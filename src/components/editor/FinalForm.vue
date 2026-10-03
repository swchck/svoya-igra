<script setup lang="ts">
import { Trash2 } from '@lucide/vue'
import type { FinalQuestion } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import MediaList from '@/components/MediaList.vue'

const final = defineModel<FinalQuestion>({ required: true })
defineEmits<{ (e: 'remove'): void }>()
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="grid gap-1.5">
      <Label for="f-theme">Тема финала</Label>
      <Input id="f-theme" v-model="final.theme" placeholder="Тема" />
    </div>
    <div class="grid gap-1.5">
      <Label for="f-text">Вопрос</Label>
      <Textarea id="f-text" v-model="final.text" class="min-h-24 font-serif text-base" placeholder="Финальный вопрос…" />
    </div>
    <MediaList v-model="final.media" label="Медиа к финалу" />
    <div class="grid gap-1.5">
      <Label for="f-answer">Ответ</Label>
      <Textarea id="f-answer" v-model="final.answer" class="min-h-20 font-serif text-base" placeholder="Ответ…" />
    </div>
    <MediaList v-model="final.answerMedia" label="Медиа к ответу" />
    <div>
      <Button variant="destructive" @click="$emit('remove')"><Trash2 />Удалить финал</Button>
    </div>
  </div>
</template>
