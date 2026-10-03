<script setup lang="ts">
import type { Player } from '../../types'

const players = defineModel<Player[]>({ required: true })
defineEmits<{ (e: 'add'): void; (e: 'remove', player: Player): void }>()
</script>

<template>
  <div class="setup si-card">
    <h3 class="setup-title">Игроки</h3>
    <div class="players-setup">
      <div v-for="p in players" :key="p.id" class="si-row player-row">
        <input v-model="p.name" class="si-input" aria-label="Имя игрока" />
        <button
          class="si-button danger ghost"
          :disabled="players.length <= 1"
          aria-label="Убрать игрока"
          @click="$emit('remove', p)"
        >×</button>
      </div>
      <button class="si-button" @click="$emit('add')">+ Игрок</button>
    </div>
  </div>
</template>

<style scoped>
.setup { width: min(520px, 100%); text-align: left; }
.setup-title { margin-top: 0; }
.players-setup { display: flex; flex-direction: column; gap: 10px; }
.player-row { flex-wrap: nowrap; }
</style>
