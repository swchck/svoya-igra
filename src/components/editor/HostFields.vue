<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { NotebookPen } from '@lucide/vue'
import type { HostInfo } from '@/types'
import { Label } from '@/components/ui/label'
import ChipsInput from '@/components/ChipsInput.vue'

const { t } = useI18n()
const card = defineModel<HostInfo>({ required: true })
const notesId = useId()

function setNotes(e: Event) {
  const value = (e.target as HTMLTextAreaElement).value
  if (value.trim()) card.value.notes = value
  else delete card.value.notes
}
</script>

<template>
  <section class="host-fields" :aria-label="t('editor.host.title')">
    <h4 class="title"><NotebookPen class="size-4" />{{ t('editor.host.title') }}</h4>
    <div class="grid gap-1.5">
      <Label as="span">{{ t('editor.host.accepted') }}</Label>
      <ChipsInput v-model="card.accepted" tone="good" :label="t('editor.host.accepted')" :placeholder="t('editor.host.acceptedPlaceholder')" />
    </div>
    <div class="grid gap-1.5">
      <Label as="span">{{ t('editor.host.rejected') }}</Label>
      <ChipsInput v-model="card.rejected" tone="bad" :label="t('editor.host.rejected')" :placeholder="t('editor.host.rejectedPlaceholder')" />
    </div>
    <div class="grid gap-1.5">
      <Label :for="notesId">{{ t('editor.host.notes') }}</Label>
      <textarea
        :id="notesId"
        class="notes"
        rows="3"
        :value="card.notes ?? ''"
        :placeholder="t('editor.host.notesPlaceholder')"
        @input="setNotes"
      />
    </div>
  </section>
</template>

<style scoped>
.host-fields {
  display: grid;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed oklch(var(--tint) 0 0 / 0.14);
}
.title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--cyan);
}
.notes {
  min-height: 72px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid var(--input);
  background: var(--well);
  color: inherit;
  font-size: 14px;
  line-height: 1.4;
  resize: vertical;
  outline: none;
}
.notes:focus {
  border-color: var(--ring);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 40%, transparent);
}
.notes::placeholder {
  color: var(--muted-foreground);
}
</style>
