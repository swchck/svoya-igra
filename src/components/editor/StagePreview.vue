<script setup lang="ts">
import { ref } from 'vue'
import type { MediaItem } from '@/types'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import CardSlide from '@/components/play/CardSlide.vue'

defineProps<{
  topic?: string
  amount?: number
  text: string
  media?: MediaItem[]
  answer: string
  answerMedia?: MediaItem[]
}>()
const open = defineModel<boolean>('open', { required: true })
const side = ref<'question' | 'answer'>('question')
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="gap-3 p-4 sm:max-w-[min(1200px,94vw)]">
      <div class="flex flex-wrap items-center gap-3 pr-8">
        <DialogTitle class="font-display text-lg tracking-wide uppercase">Так увидят зрители</DialogTitle>
        <DialogDescription class="sr-only">Предпросмотр вопроса и ответа в пропорциях экрана 16:9.</DialogDescription>
        <ToggleGroup v-model="side" type="single" variant="outline" size="sm">
          <ToggleGroupItem value="question">Вопрос</ToggleGroupItem>
          <ToggleGroupItem value="answer">Ответ</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div class="frame">
        <CardSlide
          v-if="side === 'question'"
          key="q"
          variant="question"
          quiet
          :topic="topic"
          :amount="amount"
          :text="text || 'Текст вопроса'"
          :media="media"
        />
        <CardSlide v-else key="a" variant="answer" quiet :text="answer || 'Ответ'" :media="answerMedia" />
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.frame {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  border-radius: 14px;
  background:
    radial-gradient(110% 70% at 50% -10%, oklch(0.5 0.27 268 / 0.9), transparent 70%),
    linear-gradient(180deg, var(--stage-top), var(--stage-bottom) 85%);
}
</style>
