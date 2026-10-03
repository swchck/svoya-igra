<script setup lang="ts">
import { Check, X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import type { Player } from '@/types'
import type { Sign } from '@/composables/usePlaySession'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
defineProps<{
  players: Player[]
  bets: Record<string, number>
  verdicts: Record<string, Sign>
  /** Answers sent from phones, shown for judging; absent when phones are off. */
  answers?: Record<string, string>
}>()
defineEmits<{ (e: 'verdict', playerId: string, sign: Sign): void; (e: 'done'): void }>()
</script>

<template>
  <div class="flex w-full max-w-2xl flex-col items-center gap-4">
    <div class="grid w-full gap-2">
      <div
        v-for="p in players"
        :key="p.id"
        class="flex items-center gap-3 rounded-xl border border-border bg-board px-4 py-2"
      >
        <span class="flex min-w-0 flex-1 flex-col text-left">
          <span class="font-medium">{{ p.name }}</span>
          <span v-if="answers" class="answer" :class="{ none: !answers[p.id] }">{{ answers[p.id] ?? t('lan.final.noAnswer') }}</span>
        </span>
        <span class="text-sm text-muted-foreground">{{ t('play.finalVerdict.bet', { bet: bets[p.id] ?? 0 }) }}</span>
        <Button
          size="sm"
          :variant="verdicts[p.id] === 1 ? 'default' : 'outline'"
          :aria-pressed="verdicts[p.id] === 1"
          @click="$emit('verdict', p.id, 1)"
        ><Check />{{ t('play.finalVerdict.correct') }}</Button>
        <Button
          size="sm"
          :variant="verdicts[p.id] === -1 ? 'destructive' : 'outline'"
          :aria-pressed="verdicts[p.id] === -1"
          @click="$emit('verdict', p.id, -1)"
        ><X />{{ t('play.finalVerdict.incorrect') }}</Button>
      </div>
    </div>
    <Button size="lg" @click="$emit('done')">{{ t('play.finalVerdict.done') }}</Button>
  </div>
</template>

<style scoped>
.answer {
  font-family: var(--font-serif);
  font-size: 1.1em;
  color: var(--gold);
  overflow-wrap: anywhere;
  white-space: pre-line;
}
.answer.none {
  font-family: inherit;
  font-size: 0.85em;
  font-style: italic;
  color: var(--muted-foreground);
}
</style>
