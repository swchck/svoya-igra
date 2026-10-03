<script setup lang="ts">
import { Plus, X } from '@lucide/vue'
import type { Player } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import IconButton from '@/components/IconButton.vue'

const players = defineModel<Player[]>({ required: true })
defineEmits<{ (e: 'add'): void; (e: 'remove', player: Player): void }>()
</script>

<template>
  <Card class="w-full max-w-md gap-3 px-5 text-left">
    <h3 class="font-display text-lg tracking-wide uppercase">Игроки</h3>
    <div v-for="p in players" :key="p.id" class="flex items-center gap-2">
      <Input v-model="p.name" aria-label="Имя игрока" />
      <IconButton label="Убрать игрока" :disabled="players.length <= 1" @click="$emit('remove', p)"><X /></IconButton>
    </div>
    <Button variant="outline" class="self-start" @click="$emit('add')"><Plus />Игрок</Button>
  </Card>
</template>
