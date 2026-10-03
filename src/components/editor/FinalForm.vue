<script setup lang="ts">
import { MonitorPlay, Trash2 } from '@lucide/vue'
import type { FinalQuestion } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import MediaList from '@/components/MediaList.vue'

const final = defineModel<FinalQuestion>({ required: true })
defineEmits<{ (e: 'remove'): void; (e: 'preview'): void }>()
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="grid gap-2">
      <Label for="f-theme">Тема финала</Label>
      <Input id="f-theme" v-model="final.theme" class="h-11 font-display text-lg tracking-wide uppercase" placeholder="Её объявят перед ставками" />
    </div>
    <div class="grid gap-2">
      <Label for="f-text">Вопрос</Label>
      <Textarea id="f-text" v-model="final.text" class="min-h-28 font-serif text-lg [field-sizing:content]" placeholder="Что увидят и услышат игроки" />
    </div>
    <MediaList v-model="final.media" label="Медиа к вопросу" />
    <div class="grid gap-2">
      <Label for="f-answer">Ответ</Label>
      <Textarea id="f-answer" v-model="final.answer" class="min-h-16 font-display text-xl text-gold [field-sizing:content]" placeholder="Правильный ответ" />
    </div>
    <MediaList v-model="final.answerMedia" label="Медиа к ответу" />
    <div class="flex flex-wrap gap-2">
      <Button variant="secondary" @click="$emit('preview')"><MonitorPlay />Как на экране</Button>
      <span class="flex-1" />
      <Button variant="ghost" class="text-destructive" @click="$emit('remove')"><Trash2 />Удалить финал</Button>
    </div>
  </div>
</template>
