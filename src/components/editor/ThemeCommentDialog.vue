<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Theme } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'

const theme = defineModel<Theme | undefined>('theme')
const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n()

function setComment(e: Event) {
  if (!theme.value) return
  const value = (e.target as HTMLTextAreaElement).value
  if (value.trim()) theme.value.comment = value
  else delete theme.value.comment
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogTitle>{{ t('editor.themeComment.title', { name: theme?.name || t('editor.dialog.unnamedTheme') }) }}</DialogTitle>
      <DialogDescription>{{ t('editor.themeComment.description') }}</DialogDescription>
      <textarea
        class="comment"
        rows="4"
        :value="theme?.comment ?? ''"
        :placeholder="t('editor.themeComment.placeholder')"
        :aria-label="t('editor.themeComment.title', { name: theme?.name ?? '' })"
        @input="setComment"
      />
      <DialogFooter>
        <Button @click="open = false">{{ t('editor.themeComment.done') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.comment {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--input);
  background: oklch(0.14 0.1 274 / 0.55);
  color: inherit;
  font-size: 15px;
  line-height: 1.4;
  resize: vertical;
  outline: none;
}
.comment:focus {
  border-color: var(--ring);
}
</style>
