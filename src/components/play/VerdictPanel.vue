<script setup lang="ts">
import { Check, X } from '@lucide/vue'
import type { Player } from '@/types'
import type { Sign } from '@/composables/usePlaySession'
import { Button } from '@/components/ui/button'

defineProps<{
  players: Player[]
  value: number
  /** With a stake on the table only this player answers. */
  onlyPlayerId?: string
}>()
defineEmits<{ (e: 'verdict', playerId: string, sign: Sign): void; (e: 'nobody'): void }>()
</script>

<template>
  <div class="flex w-full flex-col items-center gap-4">
    <div class="grid w-full max-w-4xl grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      <div
        v-for="p in onlyPlayerId ? players.filter((x) => x.id === onlyPlayerId) : players"
        :key="p.id"
        class="flex flex-col gap-2 rounded-xl border border-border bg-board p-3"
      >
        <div class="font-medium">{{ p.name }}</div>
        <div class="flex gap-2">
          <Button class="flex-1" @click="$emit('verdict', p.id, 1)"><Check />+{{ value }}</Button>
          <Button class="flex-1" variant="destructive" @click="$emit('verdict', p.id, -1)"><X />−{{ value }}</Button>
        </div>
      </div>
    </div>
    <Button variant="ghost" @click="$emit('nobody')">Никто не ответил</Button>
  </div>
</template>
