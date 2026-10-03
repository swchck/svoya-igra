<script setup lang="ts">
import type { Player } from '@/types'
import { Button } from '@/components/ui/button'

defineProps<{ players: Player[]; value: number }>()
defineEmits<{ (e: 'give', playerId: string): void }>()
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <p class="text-lg text-muted-foreground">Кому отдать вопрос за {{ value }}?</p>
    <div class="flex flex-wrap justify-center gap-3">
      <Button v-for="p in players" :key="p.id" size="lg" variant="secondary" @click="$emit('give', p.id)">
        {{ p.name }}
      </Button>
    </div>
  </div>
</template>
