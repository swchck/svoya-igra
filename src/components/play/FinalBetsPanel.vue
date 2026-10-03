<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Player } from '@/types'
import { Button } from '@/components/ui/button'
import NumberInput from '@/components/NumberInput.vue'

const { t } = useI18n()
defineProps<{ players: Player[]; bets: Record<string, number> }>()
defineEmits<{ (e: 'bet', playerId: string, amount: number): void; (e: 'done'): void }>()
</script>

<template>
  <div class="flex w-full max-w-xl flex-col items-center gap-4">
    <p class="text-muted-foreground">{{ t('play.finalBets.hint') }}</p>
    <div class="grid w-full gap-2">
      <div
        v-for="p in players"
        :key="p.id"
        class="flex items-center gap-3 rounded-xl border border-border bg-board px-4 py-2"
      >
        <span class="flex-1 text-left font-medium">{{ p.name }}</span>
        <span class="text-sm text-muted-foreground">{{ t('play.finalBets.outOf', { score: Math.max(p.score, 0) }) }}</span>
        <NumberInput
          class="w-40"
          :model-value="bets[p.id] ?? 0"
          :step="100"
          :disabled="p.score <= 0"
          @update:model-value="(v) => $emit('bet', p.id, v ?? 0)"
        />
      </div>
    </div>
    <Button size="lg" @click="$emit('done')">{{ t('play.finalBets.show') }}</Button>
  </div>
</template>
