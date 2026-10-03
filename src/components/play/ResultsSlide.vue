<script setup lang="ts">
import type { Player } from '../../types'

defineProps<{ ranking: Player[] }>()
defineEmits<{ (e: 'home'): void }>()
</script>

<template>
  <section class="slide">
    <h1 class="si-title huge">ИТОГИ</h1>
    <ol class="results-list">
      <li v-for="(p, i) in ranking" :key="p.id" class="result-row" :class="{ winner: i === 0 }">
        <span class="rank">{{ i + 1 }}</span>
        <span class="name">{{ p.name }}</span>
        <span class="score">{{ p.score }}</span>
      </li>
    </ol>
    <p v-if="ranking[0]" class="winner-line">Победитель: <b>{{ ranking[0].name }}</b></p>
    <button class="si-button primary big" @click="$emit('home')">← На главную</button>
  </section>
</template>

<style scoped>
.results-list {
  width: min(640px, 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.result-row {
  display: grid;
  grid-template-columns: 50px 1fr 120px;
  gap: 12px;
  padding: 16px 18px;
  background: var(--si-cell-bg);
  border: 1px solid var(--si-cell-border);
  border-radius: 12px;
  align-items: center;
}
.result-row.winner {
  border-color: var(--si-gold);
  background: rgba(255, 192, 0, 0.18);
}
.rank { font-family: var(--font-title); font-size: 22px; color: var(--si-gold); }
.name { text-align: left; font-size: 22px; }
.score { text-align: right; font-weight: 700; color: var(--si-gold); font-size: 28px; }
.winner-line { font-size: 22px; }
</style>
