<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { History, Loader2, RotateCcw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { listSnapshots, type Snapshot } from '@/history'

const props = defineProps<{ gameId: string }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ (e: 'restore', snapshot: Snapshot): void }>()

const { t, locale } = useI18n()
const snapshots = ref<Snapshot[]>([])
const loading = ref(false)
const failed = ref(false)

// a fresh read on every open: snapshots keep arriving while the dialog is closed
watch(open, async (isOpen) => {
  if (!isOpen) return
  loading.value = true
  failed.value = false
  try {
    snapshots.value = await listSnapshots(props.gameId)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})

const UNITS = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
] as const

const relative = computed(() => {
  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
  return (at: number) => {
    const seconds = Math.round((at - Date.now()) / 1000)
    const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? (['second', 1] as const)
    return rtf.format(unit === 'second' ? 0 : Math.round(seconds / size), unit)
  }
})
const exact = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' })
  return (at: number) => fmt.format(at)
})

const REASON_KEYS = {
  open: 'open',
  auto: 'auto',
  'before-delete': 'beforeDelete',
  'before-restore': 'beforeRestore',
} as const
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[85dvh] flex-col gap-4 sm:max-w-xl">
      <div>
        <DialogTitle class="title"><History class="size-5" />{{ t('editor.history.title') }}</DialogTitle>
        <DialogDescription class="mt-1 text-muted-foreground">{{ t('editor.history.description') }}</DialogDescription>
      </div>

      <p v-if="loading" class="state" role="status"><Loader2 class="size-4 animate-spin" />{{ t('editor.history.loading') }}</p>
      <p v-else-if="failed" class="state" role="alert">{{ t('editor.history.failed') }}</p>
      <p v-else-if="!snapshots.length" class="state">{{ t('editor.history.empty') }}</p>
      <ul v-else class="list">
        <li v-for="(s, i) in snapshots" :key="s.id" class="row">
          <div class="min-w-0 flex-1">
            <p class="when">
              <time :datetime="new Date(s.createdAt).toISOString()" :title="exact(s.createdAt)">{{ relative(s.createdAt) }}</time>
              <span class="reason">{{ t(`editor.history.reason.${REASON_KEYS[s.reason]}`) }}</span>
            </p>
            <p class="summary">
              {{ t('editor.history.summary', { rounds: t('editor.history.rounds', s.rounds), questions: t('editor.history.questions', s.questions) }) }}
              <span class="exact">· {{ exact(s.createdAt) }}</span>
            </p>
          </div>
          <Button size="sm" :variant="i === 0 ? 'secondary' : 'outline'" :aria-label="`${t('editor.history.restore')}, ${exact(s.createdAt)}`" @click="emit('restore', s)">
            <RotateCcw />{{ t('editor.history.restore') }}
          </Button>
        </li>
      </ul>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 22px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--gold);
}
.state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px 8px;
  margin: 0;
  color: var(--muted-foreground);
  text-align: center;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  margin: 0;
  padding: 0 4px 0 0;
  overflow-y: auto;
  list-style: none;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid oklch(1 0 0 / 0.1);
  background: oklch(0.14 0.1 274 / 0.55);
}
.when {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-weight: 600;
}
.reason {
  padding: 1px 8px;
  border-radius: 999px;
  background: oklch(1 0 0 / 0.08);
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 400;
}
.summary {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.exact {
  white-space: nowrap;
}
</style>
