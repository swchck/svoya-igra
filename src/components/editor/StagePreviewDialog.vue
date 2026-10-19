<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight, MonitorPlay } from '@lucide/vue'
import type { Game } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import StagePreviewFrame, { type PreviewScene } from './StagePreviewFrame.vue'

const props = defineProps<{ game: Game; roundIndex: number }>()
const { t } = useI18n()

const SCENES: PreviewScene[] = ['intro', 'board', 'question', 'answer']
const scene = ref<PreviewScene>('board')
const round = computed(() => props.game.rounds[props.roundIndex] ?? props.game.rounds[0])
const questions = computed(() => round.value?.themes.flatMap((th) => th.questions.map((q) => ({ q, topic: th.name }))) ?? [])
const index = ref(0)
const current = computed(() => questions.value[Math.min(index.value, questions.value.length - 1)])
watch(round, () => (index.value = 0))

// a single-choice group emits nothing when the picked item is clicked again
function setScene(v: unknown) {
  if (v) scene.value = v as PreviewScene
}
function step(by: number) {
  const n = questions.value.length
  if (n) index.value = (index.value + by + n) % n
}
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <Button variant="ghost" size="icon" :aria-label="t('editor.stagePreview.open')" :title="t('editor.stagePreview.open')"><MonitorPlay /></Button>
    </DialogTrigger>
    <DialogContent class="gap-3 p-4 sm:max-w-[min(1200px,94vw)]">
      <div class="flex flex-wrap items-center gap-3 pr-8">
        <DialogTitle class="font-display text-lg tracking-wide uppercase">{{ t('editor.stagePreview.title') }}</DialogTitle>
        <DialogDescription class="sr-only">{{ t('editor.stagePreview.description') }}</DialogDescription>
        <ToggleGroup :model-value="scene" type="single" variant="outline" size="sm" @update:model-value="setScene">
          <ToggleGroupItem v-for="s in SCENES" :key="s" :value="s">{{ t(`editor.stagePreview.scenes.${s}`) }}</ToggleGroupItem>
        </ToggleGroup>
        <div v-if="(scene === 'question' || scene === 'answer') && questions.length" class="flex items-center gap-1 text-sm text-muted-foreground">
          <Button variant="ghost" size="icon" :aria-label="t('editor.stagePreview.prev')" @click="step(-1)"><ChevronLeft /></Button>
          <span class="tabular-nums">{{ current?.topic }} · {{ current?.q.value }}</span>
          <Button variant="ghost" size="icon" :aria-label="t('editor.stagePreview.next')" @click="step(1)"><ChevronRight /></Button>
        </div>
      </div>
      <StagePreviewFrame :settings="game.settings" :round="round" :scene="scene" :question="current?.q" :topic="current?.topic" />
    </DialogContent>
  </Dialog>
</template>
