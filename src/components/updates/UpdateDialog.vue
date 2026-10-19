<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, Loader2, RotateCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { currentLocale } from '@/i18n'
import { APP_VERSION, parseFeedNotes } from '@/updates/changelog'
import { installUpdate, skipUpdate, updates } from '@/updates/state'

const { t } = useI18n()

const notes = computed(() => parseFeedNotes(updates.available?.notes, currentLocale()))
const installing = computed(() => updates.status === 'installing')
const percent = computed(() => {
  const p = updates.progress
  return p?.total ? Math.min(100, Math.round((p.done / p.total) * 100)) : null
})
const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1)

function setOpen(open: boolean) {
  // closing mid-download would hide the progress, not stop it
  if (!installing.value) updates.offerOpen = open
}
</script>

<template>
  <Dialog :open="updates.offerOpen && !!updates.available" @update:open="setOpen">
    <DialogContent class="sm:max-w-lg" :show-close-button="!installing">
      <DialogTitle>{{ t('system.updates.title', { version: updates.available?.version }) }}</DialogTitle>
      <DialogDescription>{{ t('system.updates.current', { version: APP_VERSION }) }}</DialogDescription>

      <section class="notes" :aria-label="t('system.updates.whatsNew')">
        <h3 class="notes-title">{{ t('system.updates.whatsNew') }}</h3>
        <ul v-if="notes.length">
          <li v-for="(note, i) in notes" :key="i">{{ note }}</li>
        </ul>
        <p v-else class="text-muted-foreground">{{ t('system.updates.noNotes') }}</p>
      </section>

      <div v-if="installing" class="progress" role="status">
        <div class="bar" :class="{ unknown: percent === null }"><span :style="{ width: `${percent ?? 100}%` }" /></div>
        <span class="text-sm text-muted-foreground">
          <template v-if="percent !== null">{{ t('system.updates.downloadingOf', { done: mb(updates.progress!.done), total: mb(updates.progress!.total!) }) }}</template>
          <template v-else>{{ t('system.updates.downloading') }}</template>
        </span>
      </div>
      <p v-else-if="updates.status === 'failed'" class="text-sm text-destructive" role="alert">{{ t('system.updates.failed') }}</p>
      <p v-else class="text-sm text-muted-foreground">{{ t('system.updates.restartHint') }}</p>

      <DialogFooter>
        <Button v-if="!installing" variant="ghost" @click="skipUpdate">{{ t('system.updates.skip') }}</Button>
        <span class="hidden flex-1 sm:block" />
        <Button v-if="!installing" variant="secondary" @click="updates.offerOpen = false">{{ t('system.updates.later') }}</Button>
        <Button :disabled="installing" @click="installUpdate">
          <Loader2 v-if="installing" class="animate-spin" />
          <RotateCw v-else-if="updates.status === 'failed'" />
          <Download v-else />
          {{ updates.status === 'failed' ? t('system.updates.retry') : t('system.updates.install') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.notes {
  max-height: 46vh;
  overflow-y: auto;
  padding: 12px 16px;
  border-radius: 14px;
  background: oklch(var(--tint) 0 0 / 0.05);
}
.notes-title {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 15px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold);
}
.notes ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 1.2em;
  list-style: disc;
}
.progress {
  display: grid;
  gap: 6px;
}
.bar {
  height: 8px;
  border-radius: 999px;
  background: oklch(var(--tint) 0 0 / 0.1);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--gold);
  transition: width 0.2s ease;
}
.bar.unknown span {
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  50% { opacity: 0.4; }
}
@media (prefers-reduced-motion: reduce) {
  .bar.unknown span { animation: none; }
}
</style>
