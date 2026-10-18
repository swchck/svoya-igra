<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { HostInfo } from '@/types'

const { t } = useI18n()
defineProps<{ card: HostInfo }>()
</script>

<template>
  <div v-if="card.accepted?.length || card.rejected?.length || card.notes" class="key">
    <p v-if="card.accepted?.length" class="line good">
      <span class="label">{{ t('host.key.accepted') }}</span>{{ card.accepted.join(' · ') }}
    </p>
    <p v-if="card.rejected?.length" class="line bad">
      <span class="label">{{ t('host.key.rejected') }}</span>{{ card.rejected.join(' · ') }}
    </p>
    <p v-if="card.notes" class="notes">{{ card.notes }}</p>
  </div>
</template>

<style scoped>
.key {
  display: grid;
  gap: 4px;
  font-size: 15px;
}
.line {
  margin: 0;
  overflow-wrap: anywhere;
}
.label {
  margin-right: 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.good .label {
  color: oklch(0.78 0.15 155);
}
.bad .label {
  color: var(--magenta);
}
.notes {
  margin: 4px 0 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: oklch(1 0 0 / 0.06);
  color: var(--muted-foreground);
  white-space: pre-line;
}
</style>
