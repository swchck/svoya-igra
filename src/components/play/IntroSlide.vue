<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; hint: string }>()
defineEmits<{ (e: 'next'): void }>()
</script>

<template>
  <section class="slide intro" role="button" tabindex="0" @click="$emit('next')">
    <h1 class="si-title huge">{{ title }}</h1>
    <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    <p class="hint">{{ hint }}</p>
  </section>
</template>

<style scoped>
.intro { cursor: pointer; }
.huge { letter-spacing: 0.04em; }
.hint { color: var(--si-mute); font-style: italic; }
</style>
