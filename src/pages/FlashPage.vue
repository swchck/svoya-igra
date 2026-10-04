<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const label = String(route.query.label ?? '')
const detail = String(route.query.detail ?? '')
</script>

<template>
  <div class="flash" data-tauri-drag-region>
    <div class="label title-shine">{{ label }}</div>
    <div class="detail">{{ detail }}</div>
  </div>
</template>

<style scoped>
.flash {
  display: grid;
  place-content: center;
  gap: 8px;
  height: 100dvh;
  text-align: center;
  background: #1a1aa8;
  border: 6px solid var(--gold);
  user-select: none;
}
.label {
  font-family: var(--font-display);
  font-size: 160px;
  line-height: 1;
}
.detail {
  font-size: 22px;
  color: var(--gold);
}
</style>
