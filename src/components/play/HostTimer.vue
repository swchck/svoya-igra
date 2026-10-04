<script setup lang="ts">
import { Pause, Play, RotateCcw } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import AnswerTimer from './AnswerTimer.vue'

const { t } = useI18n()
defineProps<{ remainingMs: number; totalMs: number; running: boolean }>()
defineEmits<{ (e: 'start'): void; (e: 'pause'): void; (e: 'reset'): void }>()
</script>

<template>
  <div class="host-timer" role="group" :aria-label="t('host.timer.title')">
    <AnswerTimer :remaining-ms="remainingMs" :total-ms="totalMs" :running="running" style="--timer-size: 64px" />
    <Button v-if="running" variant="secondary" @click="$emit('pause')"><Pause />{{ t('host.timer.pause') }}</Button>
    <Button v-else @click="$emit('start')">
      <Play />{{ remainingMs > 0 && remainingMs < totalMs ? t('host.timer.resume') : t('host.timer.start') }}
    </Button>
    <Button variant="ghost" :disabled="!running && remainingMs === totalMs" @click="$emit('reset')"><RotateCcw />{{ t('host.timer.reset') }}</Button>
    <span v-if="remainingMs <= 0" class="up" role="status">{{ t('host.timer.up') }}</span>
  </div>
</template>

<style scoped>
.host-timer {
  display: flex;
  padding: 4px;
  align-items: center;
  gap: 10px;
}
.up {
  font-family: var(--font-display);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--magenta);
}
</style>
