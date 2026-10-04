<script setup lang="ts">
import { computed } from 'vue'
import { Check, X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import type { Player } from '@/types'
import type { Sign } from '@/composables/usePlaySession'
import { playerColor } from '@/play/palette'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
const props = defineProps<{
  players: Player[]
  value: number
  /** With a stake on the table only this player answers. */
  onlyPlayerId?: string
}>()

// colors follow the seats at the table, so a filtered list keeps each player's own
const shown = computed(() =>
  props.players
    .map((p, i) => ({ p, color: playerColor(p, i) }))
    .filter(({ p }) => !props.onlyPlayerId || p.id === props.onlyPlayerId),
)

defineEmits<{ (e: 'verdict', playerId: string, sign: Sign): void; (e: 'nobody'): void }>()
</script>

<template>
  <div class="flex w-full flex-col items-center gap-4">
    <div class="grid w-full max-w-4xl grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      <div
        v-for="{ p, color } in shown"
        :key="p.id"
        class="flex flex-col gap-2 rounded-xl border border-border border-t-4 border-t-(--pc) bg-board p-3"
        :style="{ '--pc': color }"
      >
        <div class="font-medium">{{ p.avatar }} {{ p.name }}</div>
        <div class="flex gap-2">
          <Button class="flex-1 bg-(--pc) text-night hover:bg-(--pc) hover:brightness-110" @click="$emit('verdict', p.id, 1)"><Check />+{{ value }}</Button>
          <Button class="flex-1" variant="destructive" @click="$emit('verdict', p.id, -1)"><X />−{{ value }}</Button>
        </div>
      </div>
    </div>
    <Button variant="ghost" @click="$emit('nobody')">{{ t('play.verdict.nobody') }}</Button>
  </div>
</template>
