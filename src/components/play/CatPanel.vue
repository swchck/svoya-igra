<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Player } from '@/types'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
defineProps<{
  players: Player[]
  value: number
  /** What the host is asked; a cat-in-bag prompt by default. */
  prompt?: string
  /** The player the rules point at, drawn as the main choice. */
  suggestedId?: string | null
}>()
defineEmits<{ (e: 'give', playerId: string): void }>()
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <p class="text-lg text-muted-foreground">{{ prompt ?? t('play.cat.give', { value }) }}</p>
    <div class="flex flex-wrap justify-center gap-3">
      <Button v-for="p in players" :key="p.id" size="lg" :variant="p.id === suggestedId ? 'default' : 'secondary'" @click="$emit('give', p.id)">
        {{ p.name }}
      </Button>
    </div>
  </div>
</template>
