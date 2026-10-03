<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; hint: string }>()
defineEmits<{ (e: 'next'): void }>()
</script>

<template>
  <section
    class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-6 p-8 text-center"
    role="button"
    tabindex="0"
    @click="$emit('next')"
  >
    <h1 class="title-gold text-6xl leading-none sm:text-8xl lg:text-9xl">{{ title }}</h1>
    <p v-if="subtitle" class="font-serif text-2xl text-muted-foreground italic">{{ subtitle }}</p>
    <p class="text-muted-foreground">{{ hint }}</p>
  </section>
</template>
