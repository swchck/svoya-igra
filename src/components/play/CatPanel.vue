<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Player } from '@/types'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
defineProps<{ players: Player[]; value: number }>()
defineEmits<{ (e: 'give', playerId: string): void }>()
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <p class="text-lg text-muted-foreground">{{ t('play.cat.give', { value }) }}</p>
    <div class="flex flex-wrap justify-center gap-3">
      <Button v-for="p in players" :key="p.id" size="lg" variant="secondary" @click="$emit('give', p.id)">
        {{ p.name }}
      </Button>
    </div>
  </div>
</template>
