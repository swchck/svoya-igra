<script setup lang="ts">
import type { Player } from '../../types'

const players = defineModel<Player[]>({ required: true })
</script>

<template>
  <section class="players-strip">
    <div v-for="p in players" :key="p.id" class="player-card">
      <input v-model="p.name" class="player-name" aria-label="Имя игрока" />
      <div class="player-score">{{ p.score }}</div>
      <div class="player-controls">
        <button class="si-button ghost" @click="p.score -= 100">−100</button>
        <button class="si-button ghost" @click="p.score += 100">+100</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.players-strip {
  display: flex;
  gap: 10px;
  padding: 0 18px 8px;
  overflow-x: auto;
}
.player-card {
  background: var(--si-cell-bg);
  border: 1px solid var(--si-cell-border);
  border-radius: 12px;
  padding: 10px 14px;
  min-width: 160px;
}
.player-name {
  background: transparent;
  border: none;
  color: var(--si-white);
  font-family: var(--font-title);
  font-size: 16px;
  width: 100%;
  outline: none;
  border-bottom: 1px dashed transparent;
}
.player-name:focus { border-bottom-color: var(--si-gold); }
.player-score {
  color: var(--si-gold);
  font-weight: 700;
  font-size: 28px;
  text-align: center;
  margin: 4px 0;
}
.player-controls { display: flex; gap: 6px; }
.player-controls .si-button { flex: 1; padding: 4px 8px; font-size: 12px; }
</style>
