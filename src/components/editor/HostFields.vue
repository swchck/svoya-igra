<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight, NotebookPen } from '@lucide/vue'
import type { HostInfo } from '@/types'
import { Label } from '@/components/ui/label'
import ChipsInput from '@/components/ChipsInput.vue'

const { t } = useI18n()
const card = defineModel<HostInfo>({ required: true })
const notesId = useId()

/** What is filled in, for the folded header; empty when nothing is. */
const summary = computed(() =>
  [
    card.value.accepted?.length && t('editor.host.summaryAccepted', { n: card.value.accepted.length }),
    card.value.rejected?.length && t('editor.host.summaryRejected', { n: card.value.rejected.length }),
    card.value.notes && t('editor.host.summaryNotes'),
  ]
    .filter(Boolean)
    .join(' · '),
)
// starts open only when there is something to see; afterwards it is the author's call
const open = ref(!!summary.value)

function setNotes(e: Event) {
  const value = (e.target as HTMLTextAreaElement).value
  if (value.trim()) card.value.notes = value
  else delete card.value.notes
}
</script>

<template>
  <details class="host-fields" :open="open" @toggle="open = ($event.target as HTMLDetailsElement).open">
    <summary class="title">
      <ChevronRight class="chevron size-4" aria-hidden="true" /><NotebookPen class="size-4" />{{ t('editor.host.title') }}
      <span v-if="summary && !open" class="summary">{{ summary }}</span>
    </summary>
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
  </details>
</template>

<style scoped>
.host-fields {
  padding-top: 10px;
  border-top: 1px dashed oklch(var(--tint) 0 0 / 0.14);
}
.host-fields[open] {
  display: grid;
  gap: 10px;
}
.title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--cyan);
  cursor: pointer;
  list-style: none;
}
.title::-webkit-details-marker {
  display: none;
}
.chevron {
  transition: transform 0.15s ease;
}
[open] > .title .chevron {
  transform: rotate(90deg);
}
.summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 400;
  color: var(--muted-foreground);
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
