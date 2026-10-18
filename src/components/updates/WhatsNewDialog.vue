<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { currentLocale } from '@/i18n'
import { APP_VERSION, notesIn } from '@/updates/changelog'
import { markSeen, updates } from '@/updates/state'

const { t } = useI18n()
const locale = computed(() => currentLocale())

function date(day: string): string {
  const tag = locale.value === 'sr' ? 'sr-Latn' : locale.value
  return new Date(`${day}T12:00:00`).toLocaleDateString(tag, { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <Dialog :open="updates.whatsNewOpen" @update:open="(open) => !open && markSeen()">
    <DialogContent class="sm:max-w-xl">
      <DialogTitle class="flex items-center gap-2"><Sparkles class="size-5 text-gold" />{{ updates.justUpdated ? t('system.updates.updatedTitle', { version: APP_VERSION }) : t('system.updates.changelogTitle') }}</DialogTitle>
      <DialogDescription>{{ updates.justUpdated ? t('system.updates.updatedText') : t('system.updates.changelogText') }}</DialogDescription>
      <div class="entries">
        <section v-for="entry in updates.whatsNew" :key="entry.version" class="entry">
          <h3 class="entry-head"><span class="version">{{ entry.version }}</span><span class="date">{{ date(entry.date) }}</span></h3>
          <ul>
            <li v-for="(note, i) in notesIn(entry, locale)" :key="i">{{ note }}</li>
          </ul>
        </section>
      </div>
      <DialogFooter>
        <Button @click="markSeen">{{ t('system.updates.gotIt') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.entries {
  display: grid;
  gap: 18px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}
.entry-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 6px;
}
.version {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--gold);
}
.date {
  font-size: 13px;
  color: var(--muted-foreground);
}
.entry ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 1.2em;
  list-style: disc;
}
</style>
