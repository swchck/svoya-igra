<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import type { Theme } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { fillTheme, parseTypedQuestions } from '@/game/edit'

const props = defineProps<{ theme: Theme | undefined }>()
const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n()

const source = ref('')
const typed = computed(() => parseTypedQuestions(source.value))
const unanswered = computed(() => typed.value.filter((q) => !q.answer).length)

watch(open, (on) => on && (source.value = ''))

function apply() {
  if (!props.theme || !typed.value.length) return
  const { filled, added } = fillTheme(props.theme, typed.value)
  toast.success(t('editor.typeIn.done', { filled, added }))
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-2xl">
      <DialogTitle>{{ t('editor.typeIn.title', { theme: theme?.name || t('editor.dialog.unnamedTheme') }) }}</DialogTitle>
      <DialogDescription>{{ t('editor.typeIn.description') }}</DialogDescription>
      <textarea v-model="source" class="source" rows="10" :placeholder="t('editor.typeIn.placeholder')" :aria-label="t('editor.typeIn.title', { theme: theme?.name ?? '' })" />
      <p class="text-sm text-muted-foreground" role="status">
        {{ typed.length ? t('editor.typeIn.count', typed.length) : t('editor.typeIn.none') }}<template v-if="unanswered">. {{ t('editor.typeIn.unanswered', unanswered) }}</template>
      </p>
      <DialogFooter>
        <Button variant="ghost" @click="open = false">{{ t('editor.typeIn.cancel') }}</Button>
        <Button :disabled="!typed.length" @click="apply">{{ t('editor.typeIn.apply') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.source {
  width: 100%;
  min-height: 220px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--input);
  background: var(--well);
  color: inherit;
  font-family: var(--font-serif);
  font-size: 16px;
  line-height: 1.45;
  resize: vertical;
  outline: none;
}
.source:focus {
  border-color: var(--ring);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 40%, transparent);
}
</style>
