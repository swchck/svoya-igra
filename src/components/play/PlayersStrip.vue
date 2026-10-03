<script setup lang="ts">
import { Minus, Plus } from '@lucide/vue'
import type { Player } from '@/types'
import IconButton from '@/components/IconButton.vue'

const players = defineModel<Player[]>('players', { required: true })
defineProps<{ step?: number }>()
defineEmits<{ (e: 'adjust', playerId: string, delta: number): void }>()
</script>

<template>
  <section class="flex gap-3 overflow-x-auto px-5 pb-2" aria-label="Счёт">
    <div
      v-for="p in players"
      :key="p.id"
      class="flex min-w-44 flex-col items-center gap-1 rounded-xl border border-border bg-board px-4 py-2"
    >
      <input
        v-model="p.name"
        class="w-full border-b border-dashed border-transparent bg-transparent text-center text-sm font-medium outline-none focus:border-gold"
        aria-label="Имя игрока"
      />
      <div class="flex items-center gap-2">
        <IconButton :label="`${p.name}: −${step ?? 100}`" size="icon-xs" @click="$emit('adjust', p.id, -(step ?? 100))">
          <Minus />
        </IconButton>
        <span class="min-w-16 text-center font-display text-3xl font-semibold text-gold tabular-nums">{{ p.score }}</span>
        <IconButton :label="`${p.name}: +${step ?? 100}`" size="icon-xs" @click="$emit('adjust', p.id, step ?? 100)">
          <Plus />
        </IconButton>
      </div>
    </div>
  </section>
</template>
