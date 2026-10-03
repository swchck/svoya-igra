<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MediaItem } from '@/types'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import CardSlide from '@/components/play/CardSlide.vue'

const { t } = useI18n()
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
        <DialogTitle class="font-display text-lg tracking-wide uppercase">{{ t('editor.preview.title') }}</DialogTitle>
        <DialogDescription class="sr-only">{{ t('editor.preview.description') }}</DialogDescription>
        <ToggleGroup v-model="side" type="single" variant="outline" size="sm">
          <ToggleGroupItem value="question">{{ t('editor.preview.question') }}</ToggleGroupItem>
          <ToggleGroupItem value="answer">{{ t('editor.preview.answer') }}</ToggleGroupItem>
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
          :text="text || t('editor.preview.questionFallback')"
          :media="media"
        />
        <CardSlide v-else key="a" variant="answer" quiet :text="answer || t('editor.preview.answerFallback')" :media="answerMedia" />
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
