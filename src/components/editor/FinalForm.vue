<script setup lang="ts">
import { MonitorPlay, Trash2 } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import type { FinalQuestion } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import MediaList from '@/components/MediaList.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'

const { t } = useI18n()
const final = defineModel<FinalQuestion>({ required: true })
defineEmits<{ (e: 'remove'): void; (e: 'preview'): void }>()
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="grid gap-2">
      <Label for="f-theme">{{ t('editor.final.theme') }}</Label>
      <Input id="f-theme" v-model="final.theme" class="h-11 font-display text-lg tracking-wide uppercase" :placeholder="t('editor.final.themePlaceholder')" />
    </div>
    <div class="grid gap-2">
      <Label as="span">{{ t('editor.final.question') }}</Label>
      <MarkdownEditor v-model="final.text" :label="t('editor.final.question')" :placeholder="t('editor.final.questionPlaceholder')" />
    </div>
    <MediaList v-model="final.media" :label="t('editor.final.questionMedia')" />
    <div class="grid gap-2">
      <Label as="span">{{ t('editor.final.answer') }}</Label>
      <MarkdownEditor v-model="final.answer" display :label="t('editor.final.answer')" :placeholder="t('editor.final.answerPlaceholder')" />
    </div>
    <MediaList v-model="final.answerMedia" :label="t('editor.final.answerMedia')" />
    <div class="flex flex-wrap gap-2">
      <Button variant="secondary" @click="$emit('preview')"><MonitorPlay />{{ t('editor.final.preview') }}</Button>
      <span class="flex-1" />
      <Button variant="ghost" class="text-destructive" @click="$emit('remove')"><Trash2 />{{ t('editor.final.remove') }}</Button>
    </div>
  </div>
</template>
